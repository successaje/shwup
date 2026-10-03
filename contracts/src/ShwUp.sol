// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ShwUp — refundable RSVP deposits
/// @notice Attendees hold a spot by paying a deposit and get it back when they are checked in at
///         the door. Deposits of attendees who never arrive are forfeited, either split among the
///         people who did come or paid to the organizer.
/// @dev On Arc, USDC is the native currency, so deposits are plain `msg.value` (18 decimals).
///      Funds only ever leave the contract to: the attendee who paid them (refund / cancellation),
///      checked-in attendees (bonus share of forfeits), or the organizer (forfeits, rounding dust).
///
///      Invariant: address(this).balance ==
///          Σ deposits of Held tickets (unsettled, uncancelled events)
///        + Σ deposits of Held tickets in cancelled events (claimable refunds)
///        + Σ unclaimed bonuses
///        + Σ credits
contract ShwUp is ReentrancyGuard {
    // ───────────────────────────────────────────── types

    enum ForfeitPolicy {
        Attendees, // no-show deposits are split among checked-in attendees
        Organizer // no-show deposits are paid to the organizer
    }

    enum TicketStatus {
        None,
        Held, // deposit paid, not yet checked in
        CheckedIn, // deposit refunded at the door
        Released // attendee cancelled, or refunded after the event was cancelled
    }

    struct EventInfo {
        address organizer;
        uint96 deposit;
        uint64 startsAt;
        uint64 cancelCutoff;
        uint64 checkInEndsAt;
        uint32 capacity; // 0 = unlimited
        uint32 held; // tickets currently Held or CheckedIn
        uint32 checkedIn;
        ForfeitPolicy forfeitPolicy;
        bool cancelled;
        bool settled;
        uint128 bonusPerAttendee; // set at settlement
        string metadata; // JSON: name, location, description
    }

    struct Ticket {
        TicketStatus status;
        bool bonusClaimed;
    }

    // ───────────────────────────────────────────── constants

    /// @notice Check-in may open this long before the event's start time.
    uint64 public constant EARLY_CHECK_IN = 1 hours;
    /// @notice Upper bound on the check-in window so deposits can't be locked indefinitely.
    uint64 public constant MAX_CHECK_IN_WINDOW = 2 days;
    /// @notice Events can be scheduled at most this far ahead.
    uint64 public constant MAX_LEAD_TIME = 365 days;
    uint256 public constant MAX_METADATA_BYTES = 2048;
    uint256 public constant MAX_NAME_BYTES = 32;
    /// @dev Gas forwarded on push payments so a hostile receiver can't grief the caller.
    uint256 private constant PUSH_GAS = 50_000;

    // ───────────────────────────────────────────── storage

    uint256 public eventCount;

    mapping(uint256 eventId => EventInfo) private _events;
    mapping(uint256 eventId => mapping(address attendee => Ticket)) private _tickets;
    mapping(uint256 eventId => address[]) private _attendees;
    mapping(uint256 eventId => mapping(address => bool)) public isChecker;
    mapping(address organizer => uint256[]) private _organizerEvents;
    mapping(address attendee => uint256[]) private _attendeeEvents;

    /// @notice Payments that could not be pushed (e.g. to a contract that rejected them).
    mapping(address => uint256) public credits;

    /// @notice Optional public display name per wallet, shown to organizers on guest lists.
    mapping(address => string) public nameOf;

    // ───────────────────────────────────────────── events

    event EventCreated(
        uint256 indexed eventId,
        address indexed organizer,
        uint96 deposit,
        uint64 startsAt,
        uint64 cancelCutoff,
        uint64 checkInEndsAt,
        uint32 capacity,
        ForfeitPolicy forfeitPolicy
    );
    event SpotHeld(uint256 indexed eventId, address indexed attendee, uint96 deposit);
    event SpotReleased(uint256 indexed eventId, address indexed attendee, uint96 refund);
    event CheckedIn(uint256 indexed eventId, address indexed attendee, address indexed by, uint96 refund);
    event CheckerUpdated(uint256 indexed eventId, address indexed checker, bool allowed, uint256 funded);
    event EventCancelled(uint256 indexed eventId);
    event EventSettled(
        uint256 indexed eventId, uint32 noShows, uint256 forfeited, uint128 bonusPerAttendee, uint256 toOrganizer
    );
    event BonusClaimed(uint256 indexed eventId, address indexed attendee, uint128 amount);
    event EventUpdated(uint256 indexed eventId);
    event NameSet(address indexed account, string name);
    event PaymentDeferred(address indexed to, uint256 amount);
    event CreditWithdrawn(address indexed to, uint256 amount);

    // ───────────────────────────────────────────── errors

    error InvalidDeposit();
    error InvalidSchedule();
    error MetadataTooLarge();
    error EventNotFound();
    error NotOrganizer();
    error NotAuthorizedChecker();
    error EventIsCancelled();
    error EventIsSettled();
    error RsvpClosed();
    error WrongDepositAmount();
    error EventFull();
    error AlreadyHolding();
    error NoSpotHeld();
    error CancellationClosed();
    error CheckInNotOpen();
    error CheckInClosed();
    error EventAlreadyStarted();
    error AttendeesAlreadyCheckedIn();
    error SettlementNotOpen();
    error NothingToClaim();
    error TransferFailed();
    error NameTooLong();
    error EventClosed();

    // ───────────────────────────────────────────── modifiers

    modifier onlyOrganizer(uint256 eventId) {
        if (_events[eventId].organizer != msg.sender) revert NotOrganizer();
        _;
    }

    // ───────────────────────────────────────────── organizer

    /// @notice Create an event. The caller becomes its organizer.
    function createEvent(
        uint96 deposit,
        uint32 capacity,
        uint64 startsAt,
        uint64 cancelCutoff,
        uint64 checkInEndsAt,
        ForfeitPolicy forfeitPolicy,
        string calldata metadata
    ) external returns (uint256 eventId) {
        if (deposit == 0) revert InvalidDeposit();
        if (
            startsAt <= block.timestamp || startsAt > block.timestamp + MAX_LEAD_TIME || cancelCutoff > startsAt
                || checkInEndsAt <= startsAt || checkInEndsAt - startsAt > MAX_CHECK_IN_WINDOW
        ) revert InvalidSchedule();
        if (bytes(metadata).length > MAX_METADATA_BYTES) revert MetadataTooLarge();

        eventId = ++eventCount;
        EventInfo storage e = _events[eventId];
        e.organizer = msg.sender;
        e.deposit = deposit;
        e.startsAt = startsAt;
        e.cancelCutoff = cancelCutoff;
        e.checkInEndsAt = checkInEndsAt;
        e.capacity = capacity;
        e.forfeitPolicy = forfeitPolicy;
        e.metadata = metadata;
        _organizerEvents[msg.sender].push(eventId);

        emit EventCreated(eventId, msg.sender, deposit, startsAt, cancelCutoff, checkInEndsAt, capacity, forfeitPolicy);
    }

    /// @notice Authorize (or revoke) an address to check attendees in, e.g. a door-scanner key.
    /// @dev Any value sent is forwarded to the checker so it can pay its own gas in USDC.
    function setChecker(uint256 eventId, address checker, bool allowed)
        external
        payable
        onlyOrganizer(eventId)
        nonReentrant
    {
        isChecker[eventId][checker] = allowed;
        if (msg.value > 0) {
            (bool ok,) = checker.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }
        emit CheckerUpdated(eventId, checker, allowed, msg.value);
    }

    /// @notice Cancel an event before it starts. Every held deposit becomes claimable via `claim`.
    function cancelEvent(uint256 eventId) external onlyOrganizer(eventId) {
        EventInfo storage e = _events[eventId];
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.startsAt) revert EventAlreadyStarted();
        if (e.checkedIn > 0) revert AttendeesAlreadyCheckedIn();
        e.cancelled = true;
        emit EventCancelled(eventId);
    }

    /// @notice Edit an event's details (name, location, description) until check-in closes.
    /// @dev Money terms — deposit, schedule, capacity, forfeit policy — can't change once guests have
    ///      committed to them.
    function updateDetails(uint256 eventId, string calldata metadata) external onlyOrganizer(eventId) {
        EventInfo storage e = _events[eventId];
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.checkInEndsAt) revert EventClosed();
        if (bytes(metadata).length > MAX_METADATA_BYTES) revert MetadataTooLarge();
        e.metadata = metadata;
        emit EventUpdated(eventId);
    }

    // ───────────────────────────────────────────── profile

    /// @notice Set (or clear, with "") the public name organizers see next to your wallet.
    function setName(string calldata name) external {
        _setName(name);
    }

    // ───────────────────────────────────────────── attendee

    /// @notice Hold a spot by paying exactly the event's deposit.
    function rsvp(uint256 eventId) external payable nonReentrant {
        _rsvp(eventId);
    }

    /// @notice Hold a spot and set your public display name in one transaction.
    function rsvpAs(uint256 eventId, string calldata name) external payable nonReentrant {
        _setName(name);
        _rsvp(eventId);
    }

    /// @notice Give up a held spot before the cancellation cutoff for a full refund.
    function cancelRsvp(uint256 eventId) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.cancelCutoff) revert CancellationClosed();
        Ticket storage t = _tickets[eventId][msg.sender];
        if (t.status != TicketStatus.Held) revert NoSpotHeld();

        t.status = TicketStatus.Released;
        e.held -= 1;
        _pay(msg.sender, e.deposit);

        emit SpotReleased(eventId, msg.sender, e.deposit);
    }

    /// @notice Check an attendee in and refund their deposit. Organizer or authorized checker only.
    function checkIn(uint256 eventId, address attendee) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        if (msg.sender != e.organizer && !isChecker[eventId][msg.sender]) revert NotAuthorizedChecker();
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp + EARLY_CHECK_IN < e.startsAt) revert CheckInNotOpen();
        if (block.timestamp >= e.checkInEndsAt) revert CheckInClosed();
        Ticket storage t = _tickets[eventId][attendee];
        if (t.status != TicketStatus.Held) revert NoSpotHeld();

        t.status = TicketStatus.CheckedIn;
        e.checkedIn += 1;
        _pay(attendee, e.deposit);

        emit CheckedIn(eventId, attendee, msg.sender, e.deposit);
    }

    /// @notice After check-in closes, distribute forfeited deposits. Callable by anyone.
    function settle(uint256 eventId) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (e.settled) revert EventIsSettled();
        if (block.timestamp < e.checkInEndsAt) revert SettlementNotOpen();
        _settle(eventId, e);
    }

    /// @notice Claim what you're owed for an event: your deposit if the event was cancelled, or your
    ///         share of forfeited deposits once check-in has closed (settling the event if needed).
    function claim(uint256 eventId) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        Ticket storage t = _tickets[eventId][msg.sender];

        if (e.cancelled) {
            if (t.status != TicketStatus.Held) revert NothingToClaim();
            t.status = TicketStatus.Released;
            e.held -= 1;
            _pay(msg.sender, e.deposit);
            emit SpotReleased(eventId, msg.sender, e.deposit);
            return;
        }

        // Attendees shouldn't have to wait for someone to press "settle".
        if (!e.settled && block.timestamp >= e.checkInEndsAt) _settle(eventId, e);

        if (!e.settled || t.status != TicketStatus.CheckedIn || t.bonusClaimed || e.bonusPerAttendee == 0) {
            revert NothingToClaim();
        }
        t.bonusClaimed = true;
        _pay(msg.sender, e.bonusPerAttendee);
        emit BonusClaimed(eventId, msg.sender, e.bonusPerAttendee);
    }

    /// @notice Withdraw payments that could not be pushed to you earlier.
    function withdrawCredits() external nonReentrant {
        uint256 amount = credits[msg.sender];
        if (amount == 0) revert NothingToClaim();
        credits[msg.sender] = 0;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit CreditWithdrawn(msg.sender, amount);
    }

    // ───────────────────────────────────────────── views

    function getEvent(uint256 eventId) external view returns (EventInfo memory) {
        return _existing(eventId);
    }

    function ticketOf(uint256 eventId, address attendee) external view returns (Ticket memory) {
        return _tickets[eventId][attendee];
    }

    /// @notice Amount `attendee` could receive right now by calling `claim`.
    function claimable(uint256 eventId, address attendee) external view returns (uint256) {
        EventInfo storage e = _events[eventId];
        Ticket storage t = _tickets[eventId][attendee];
        if (e.cancelled) return t.status == TicketStatus.Held ? e.deposit : 0;
        if (t.status != TicketStatus.CheckedIn || t.bonusClaimed) return 0;
        if (e.settled) return e.bonusPerAttendee;
        // Closed but not yet settled: what `claim` would settle and pay.
        if (block.timestamp >= e.checkInEndsAt && e.forfeitPolicy == ForfeitPolicy.Attendees && e.checkedIn > 0) {
            return (uint256(e.held - e.checkedIn) * e.deposit) / e.checkedIn;
        }
        return 0;
    }

    function attendeeCount(uint256 eventId) external view returns (uint256) {
        return _attendees[eventId].length;
    }

    /// @notice Paginated attendee list with each attendee's ticket status.
    function getAttendees(uint256 eventId, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory attendees, TicketStatus[] memory statuses)
    {
        address[] storage all = _attendees[eventId];
        uint256 end = offset + limit > all.length ? all.length : offset + limit;
        uint256 n = end > offset ? end - offset : 0;
        attendees = new address[](n);
        statuses = new TicketStatus[](n);
        for (uint256 i; i < n; ++i) {
            address a = all[offset + i];
            attendees[i] = a;
            statuses[i] = _tickets[eventId][a].status;
        }
    }

    function eventsOrganizedBy(address organizer) external view returns (uint256[] memory) {
        return _organizerEvents[organizer];
    }

    function eventsAttendedBy(address attendee) external view returns (uint256[] memory) {
        return _attendeeEvents[attendee];
    }

    /// @notice Display names for a batch of wallets (empty string where none is set).
    function namesOf(address[] calldata accounts) external view returns (string[] memory names) {
        names = new string[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) {
            names[i] = nameOf[accounts[i]];
        }
    }

    // ───────────────────────────────────────────── internal

    function _rsvp(uint256 eventId) private {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.checkInEndsAt) revert RsvpClosed();
        if (msg.value != e.deposit) revert WrongDepositAmount();
        if (e.capacity != 0 && e.held >= e.capacity) revert EventFull();

        Ticket storage t = _tickets[eventId][msg.sender];
        if (t.status == TicketStatus.Held || t.status == TicketStatus.CheckedIn) revert AlreadyHolding();
        if (t.status == TicketStatus.None) {
            _attendees[eventId].push(msg.sender);
            _attendeeEvents[msg.sender].push(eventId);
        }
        t.status = TicketStatus.Held;
        e.held += 1;

        emit SpotHeld(eventId, msg.sender, e.deposit);
    }

    function _settle(uint256 eventId, EventInfo storage e) private {
        e.settled = true;
        uint32 noShows = e.held - e.checkedIn;
        uint256 forfeited = uint256(noShows) * e.deposit;
        uint256 toOrganizer = forfeited;
        uint128 bonus;

        if (e.forfeitPolicy == ForfeitPolicy.Attendees && e.checkedIn > 0) {
            // Safe: forfeited <= (2^32 - 1) * (2^96 - 1) < 2^128.
            // forge-lint: disable-next-line(unsafe-typecast)
            bonus = uint128(forfeited / e.checkedIn);
            toOrganizer = forfeited - uint256(bonus) * e.checkedIn; // rounding dust
            e.bonusPerAttendee = bonus;
        }
        if (toOrganizer > 0) _pay(e.organizer, toOrganizer);

        emit EventSettled(eventId, noShows, forfeited, bonus, toOrganizer);
    }

    function _setName(string calldata name) private {
        if (bytes(name).length > MAX_NAME_BYTES) revert NameTooLong();
        if (keccak256(bytes(name)) == keccak256(bytes(nameOf[msg.sender]))) return;
        nameOf[msg.sender] = name;
        emit NameSet(msg.sender, name);
    }

    function _existing(uint256 eventId) private view returns (EventInfo storage e) {
        e = _events[eventId];
        if (e.organizer == address(0)) revert EventNotFound();
    }

    /// @dev Push a payment; if the receiver rejects it, credit it for later withdrawal instead of
    ///      reverting, so one bad receiver can't block check-in or settlement.
    function _pay(address to, uint256 amount) private {
        (bool ok,) = to.call{value: amount, gas: PUSH_GAS}("");
        if (!ok) {
            credits[to] += amount;
            emit PaymentDeferred(to, amount);
        }
    }
}

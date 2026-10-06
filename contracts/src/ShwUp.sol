// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ShwUp — refundable commitments to show up
/// @notice Attendees hold a spot by paying a deposit and get it back when they are checked in at
///         the door. Deposits of attendees who never arrive are forfeited: split among the people
///         who did come, paid to the organizer, or sent to a beneficiary fixed when the event was
///         created. A held spot can be handed to someone else, who pays the deposit to the person
///         leaving. Organizers can post a bond that is split among guests if they cancel.
/// @dev On Arc, USDC is the native currency, so deposits are plain `msg.value` (18 decimals).
///      Funds only ever leave the contract to: the attendee who paid them (refund / cancellation /
///      hand-over), checked-in attendees (bonus share of forfeits), the organizer (forfeits,
///      rounding dust, their bond), the event's beneficiary (forfeits), or guests of a cancelled
///      event (the organizer's bond).
///
///      If check-in closes with nobody checked in, nothing is forfeited and the organizer's bond is
///      split among the guests, as if the event had been cancelled: a door that never opened (a dead
///      phone, an organizer who didn't turn up) shouldn't cost guests anything, and ghosting must not
///      pay the organizer better than cancelling.
///
///      Settlement never pushes funds: what the organizer or beneficiary is owed is credited, and
///      anyone can deliver credits to their owner with `withdrawCreditsFor`. So one blocklisted or
///      misbehaving recipient can't freeze an event's settlement, bonuses or refunds.
///
///      Invariant: address(this).balance ==
///          Σ deposits of Held tickets (unsettled, uncancelled events)
///        + Σ (deposit + bondPerGuest) of Held tickets in settled events nobody was checked in at
///        + Σ (deposit + bondPerGuest) of Held tickets in cancelled events (claimable)
///        + Σ bonds of unsettled, uncancelled events
///        + Σ unclaimed bonuses
///        + Σ credits
contract ShwUp is ReentrancyGuard {
    // ───────────────────────────────────────────── types

    enum ForfeitPolicy {
        Attendees, // no-show deposits are split among checked-in attendees
        Organizer, // no-show deposits are paid to the organizer
        Beneficiary // no-show deposits are paid to the event's beneficiary (e.g. a charity or community fund)
    }

    enum TicketStatus {
        None,
        Held, // deposit paid, not yet checked in
        CheckedIn, // deposit refunded at the door
        Released, // attendee cancelled, or refunded after the event was cancelled
        Transferred // handed to someone else, who paid the deposit back to this attendee
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
        address beneficiary; // receives forfeits under ForfeitPolicy.Beneficiary
        uint96 bond; // posted by the organizer; returned at settlement, or split among guests on cancel
        uint96 bondPerGuest; // set on cancellation
        string metadata; // JSON: name, location, description
    }

    struct Ticket {
        TicketStatus status;
        bool bonusClaimed;
        bool offered; // the holder has put this spot up for someone else to take
        address offeredTo; // address(0) = anyone may take it
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
    event SpotReleased(uint256 indexed eventId, address indexed attendee, uint256 refund);
    event CheckedIn(uint256 indexed eventId, address indexed attendee, address indexed by, uint96 refund);
    event CheckerUpdated(uint256 indexed eventId, address indexed checker, bool allowed, uint256 funded);
    event EventCancelled(uint256 indexed eventId);
    event RefundsOpened(uint256 indexed eventId, uint32 guests);
    event EventSettled(
        uint256 indexed eventId, uint32 noShows, uint256 forfeited, uint128 bonusPerAttendee, uint256 toOrganizer
    );
    event BonusClaimed(uint256 indexed eventId, address indexed attendee, uint128 amount);
    event EventUpdated(uint256 indexed eventId);
    event BondPosted(uint256 indexed eventId, uint96 amount);
    event BondReturned(uint256 indexed eventId, address indexed organizer, uint96 amount);
    event SpotOffered(uint256 indexed eventId, address indexed holder, address indexed to);
    event OfferWithdrawn(uint256 indexed eventId, address indexed holder);
    event SpotTransferred(uint256 indexed eventId, address indexed from, address indexed to, uint96 deposit);
    event NameSet(address indexed account, string name);
    event PaymentDeferred(address indexed to, uint256 amount);
    event Credited(address indexed to, uint256 amount);
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
    error InvalidBeneficiary();
    error InvalidBond();
    error NotOffered();
    error CannotTakeOwnSpot();
    error CannotCheckInSelf();
    error OrganizerCannotHoldSpot();

    // ───────────────────────────────────────────── modifiers

    modifier onlyOrganizer(uint256 eventId) {
        if (_events[eventId].organizer != msg.sender) revert NotOrganizer();
        _;
    }

    // ───────────────────────────────────────────── organizer

    /// @notice Create an event. The caller becomes its organizer. Any value sent is posted as a bond:
    ///         returned at settlement, or split among the guests holding spots if the event is cancelled.
    /// @param beneficiary Receives forfeits under `ForfeitPolicy.Beneficiary`; must be zero otherwise.
    function createEvent(
        uint96 deposit,
        uint32 capacity,
        uint64 startsAt,
        uint64 cancelCutoff,
        uint64 checkInEndsAt,
        ForfeitPolicy forfeitPolicy,
        address beneficiary,
        string calldata metadata
    ) external payable returns (uint256 eventId) {
        if (deposit == 0) revert InvalidDeposit();
        if ((forfeitPolicy == ForfeitPolicy.Beneficiary) != (beneficiary != address(0))) revert InvalidBeneficiary();
        if (msg.value > type(uint96).max) revert InvalidBond();
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
        e.beneficiary = beneficiary;
        // forge-lint: disable-next-line(unsafe-typecast)
        e.bond = uint96(msg.value); // bounded above
        e.metadata = metadata;
        _organizerEvents[msg.sender].push(eventId);

        _emitCreated(eventId, e);
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

    /// @notice Cancel an event before it starts. Every held deposit becomes claimable via `claim`,
    ///         together with an equal share of the organizer's bond.
    function cancelEvent(uint256 eventId) external onlyOrganizer(eventId) nonReentrant {
        EventInfo storage e = _events[eventId];
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.startsAt) revert EventAlreadyStarted();
        if (e.checkedIn > 0) revert AttendeesAlreadyCheckedIn();
        e.cancelled = true;
        uint96 dust = e.bond;
        if (e.held > 0) {
            e.bondPerGuest = e.bond / e.held;
            dust = e.bond - e.bondPerGuest * e.held;
        }
        emit EventCancelled(eventId);
        if (dust > 0) {
            _pay(e.organizer, dust);
            emit BondReturned(eventId, e.organizer, dust);
        }
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

    /// @notice Put your held spot up for someone else to take. Whoever takes it pays you the deposit,
    ///         so you get your money back even after the cancellation cutoff.
    /// @param to The only address allowed to take it, or address(0) for anyone.
    function offerSpot(uint256 eventId, address to) external {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.checkInEndsAt) revert EventClosed();
        if (to == msg.sender) revert CannotTakeOwnSpot();
        Ticket storage t = _tickets[eventId][msg.sender];
        if (t.status != TicketStatus.Held) revert NoSpotHeld();
        t.offered = true;
        t.offeredTo = to;
        emit SpotOffered(eventId, msg.sender, to);
    }

    /// @notice Take back an offer made with `offerSpot`.
    function withdrawOffer(uint256 eventId) external {
        Ticket storage t = _tickets[eventId][msg.sender];
        if (!t.offered) revert NotOffered();
        t.offered = false;
        t.offeredTo = address(0);
        emit OfferWithdrawn(eventId, msg.sender);
    }

    /// @notice Take a spot someone offered, paying exactly the deposit, which goes to them.
    function takeSpot(uint256 eventId, address from) external payable nonReentrant {
        _takeSpot(eventId, from);
    }

    /// @notice Take an offered spot and set your public display name in one transaction.
    function takeSpotAs(uint256 eventId, address from, string calldata name) external payable nonReentrant {
        _setName(name);
        _takeSpot(eventId, from);
    }

    /// @notice Give up a held spot before the cancellation cutoff for a full refund.
    function cancelRsvp(uint256 eventId) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.cancelCutoff) revert CancellationClosed();
        Ticket storage t = _tickets[eventId][msg.sender];
        if (t.status != TicketStatus.Held) revert NoSpotHeld();

        t.status = TicketStatus.Released;
        _clearOffer(t);
        e.held -= 1;
        _pay(msg.sender, e.deposit);

        emit SpotReleased(eventId, msg.sender, e.deposit);
    }

    /// @notice Check an attendee in and refund their deposit. Organizer or authorized checker only.
    function checkIn(uint256 eventId, address attendee) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        if (msg.sender != e.organizer && !isChecker[eventId][msg.sender]) revert NotAuthorizedChecker();
        // A door key checking itself in could collect a share of no-show deposits it never earned.
        if (attendee == msg.sender) revert CannotCheckInSelf();
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp + EARLY_CHECK_IN < e.startsAt) revert CheckInNotOpen();
        if (block.timestamp >= e.checkInEndsAt) revert CheckInClosed();
        Ticket storage t = _tickets[eventId][attendee];
        if (t.status != TicketStatus.Held) revert NoSpotHeld();

        t.status = TicketStatus.CheckedIn;
        _clearOffer(t);
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

    /// @notice Claim what you're owed for an event: your deposit plus a share of the organizer's bond
    ///         if the event was cancelled, your deposit if check-in closed with nobody checked in, or your
    ///         share of forfeited deposits once check-in has closed (settling the event if needed).
    function claim(uint256 eventId) external nonReentrant {
        EventInfo storage e = _existing(eventId);
        Ticket storage t = _tickets[eventId][msg.sender];

        if (e.cancelled) {
            if (t.status != TicketStatus.Held) revert NothingToClaim();
            t.status = TicketStatus.Released;
            _clearOffer(t);
            e.held -= 1;
            _pay(msg.sender, uint256(e.deposit) + e.bondPerGuest);
            emit SpotReleased(eventId, msg.sender, uint256(e.deposit) + e.bondPerGuest);
            return;
        }

        // Attendees shouldn't have to wait for someone to press "settle".
        if (!e.settled && block.timestamp >= e.checkInEndsAt) _settle(eventId, e);

        if (e.settled && e.checkedIn == 0 && t.status == TicketStatus.Held) {
            t.status = TicketStatus.Released;
            e.held -= 1;
            _pay(msg.sender, uint256(e.deposit) + e.bondPerGuest);
            emit SpotReleased(eventId, msg.sender, uint256(e.deposit) + e.bondPerGuest);
            return;
        }

        if (!e.settled || t.status != TicketStatus.CheckedIn || t.bonusClaimed || e.bonusPerAttendee == 0) {
            revert NothingToClaim();
        }
        t.bonusClaimed = true;
        _pay(msg.sender, e.bonusPerAttendee);
        emit BonusClaimed(eventId, msg.sender, e.bonusPerAttendee);
    }

    /// @notice Withdraw what you're owed: settlement payouts (forfeits, bond) and payments that
    ///         couldn't be pushed to you.
    function withdrawCredits() external nonReentrant {
        _withdrawCredits(msg.sender);
    }

    /// @notice Deliver `account`'s credits to `account`. Anyone can call it — the money can only go
    ///         to its owner — so an organizer can pay out a cause's share without the cause acting.
    function withdrawCreditsFor(address account) external nonReentrant {
        _withdrawCredits(account);
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
        if (e.cancelled) return t.status == TicketStatus.Held ? uint256(e.deposit) + e.bondPerGuest : 0;
        // Nobody was checked in: every held deposit comes back once check-in closes.
        if (t.status == TicketStatus.Held && e.checkedIn == 0 && (e.settled || block.timestamp >= e.checkInEndsAt)) {
            // Before settlement, preview the bond share `_settle` will set.
            return uint256(e.deposit) + (e.settled ? e.bondPerGuest : e.bond / e.held);
        }
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
        uint256 end = offset >= all.length ? offset : (limit > all.length - offset ? all.length : offset + limit);
        uint256 n = end > offset ? end - offset : 0;
        attendees = new address[](n);
        statuses = new TicketStatus[](n);
        for (uint256 i; i < n; ++i) {
            address a = all[offset + i];
            attendees[i] = a;
            statuses[i] = _tickets[eventId][a].status;
        }
    }

    /// @notice Spots on offer within a page of the attendee list (see `getAttendees`).
    /// @return holders Holders offering their spot. @return offeredTo Who may take each (0 = anyone).
    function getOffers(uint256 eventId, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory holders, address[] memory offeredTo)
    {
        address[] storage all = _attendees[eventId];
        uint256 end = offset >= all.length ? offset : (limit > all.length - offset ? all.length : offset + limit);
        uint256 n;
        for (uint256 i = offset; i < end; ++i) {
            Ticket storage t = _tickets[eventId][all[i]];
            if (t.offered && t.status == TicketStatus.Held) ++n;
        }
        holders = new address[](n);
        offeredTo = new address[](n);
        uint256 k;
        for (uint256 i = offset; i < end; ++i) {
            Ticket storage t = _tickets[eventId][all[i]];
            if (t.offered && t.status == TicketStatus.Held) {
                holders[k] = all[i];
                offeredTo[k++] = t.offeredTo;
            }
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

        _hold(eventId, msg.sender);
        e.held += 1;

        emit SpotHeld(eventId, msg.sender, e.deposit);
    }

    /// @dev Separate from `createEvent` to keep its stack shallow.
    function _emitCreated(uint256 eventId, EventInfo storage e) private {
        emit EventCreated(
            eventId, e.organizer, e.deposit, e.startsAt, e.cancelCutoff, e.checkInEndsAt, e.capacity, e.forfeitPolicy
        );
        if (e.bond > 0) emit BondPosted(eventId, e.bond);
    }

    function _takeSpot(uint256 eventId, address from) private {
        EventInfo storage e = _existing(eventId);
        if (e.cancelled) revert EventIsCancelled();
        if (block.timestamp >= e.checkInEndsAt) revert EventClosed();
        if (msg.value != e.deposit) revert WrongDepositAmount();
        if (from == msg.sender) revert CannotTakeOwnSpot();
        Ticket storage given = _tickets[eventId][from];
        if (given.status != TicketStatus.Held || !given.offered) revert NotOffered();
        if (given.offeredTo != address(0) && given.offeredTo != msg.sender) revert NotOffered();

        given.status = TicketStatus.Transferred;
        _clearOffer(given);
        _hold(eventId, msg.sender); // held count is unchanged: one spot changes hands
        _pay(from, e.deposit);

        emit SpotTransferred(eventId, from, msg.sender, e.deposit);
        emit SpotHeld(eventId, msg.sender, e.deposit);
    }

    /// @dev Marks `who`'s ticket Held, registering them on first contact with the event.
    function _hold(uint256 eventId, address who) private {
        // An organizer holding a spot could check themselves in and collect no-shows' deposits.
        if (who == _events[eventId].organizer) revert OrganizerCannotHoldSpot();
        Ticket storage t = _tickets[eventId][who];
        if (t.status == TicketStatus.Held || t.status == TicketStatus.CheckedIn) revert AlreadyHolding();
        if (t.status == TicketStatus.None) {
            _attendees[eventId].push(who);
            _attendeeEvents[who].push(eventId);
        }
        t.status = TicketStatus.Held;
    }

    function _clearOffer(Ticket storage t) private {
        if (t.offered) {
            t.offered = false;
            t.offeredTo = address(0);
        }
    }

    function _settle(uint256 eventId, EventInfo storage e) private {
        e.settled = true;
        if (e.checkedIn == 0) {
            // The door never checked anyone in: refund instead of forfeiting (claimed via `claim`),
            // and the bond goes to the guests, as on cancellation.
            emit RefundsOpened(eventId, e.held);
            emit EventSettled(eventId, 0, 0, 0, 0);
            uint96 dust = e.bond;
            if (e.held > 0) {
                e.bondPerGuest = e.bond / e.held;
                dust = e.bond - e.bondPerGuest * e.held;
            }
            if (dust > 0) {
                _credit(e.organizer, dust);
                emit BondReturned(eventId, e.organizer, dust);
            }
            return;
        }
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
        } else if (e.forfeitPolicy == ForfeitPolicy.Beneficiary && forfeited > 0) {
            toOrganizer = 0;
            _credit(e.beneficiary, forfeited);
        }
        if (toOrganizer > 0) _credit(e.organizer, toOrganizer);

        emit EventSettled(eventId, noShows, forfeited, bonus, toOrganizer);
        _returnBond(eventId, e);
    }

    function _returnBond(uint256 eventId, EventInfo storage e) private {
        if (e.bond > 0) {
            _credit(e.organizer, e.bond);
            emit BondReturned(eventId, e.organizer, e.bond);
        }
    }

    /// @dev Settlement credits instead of pushing, so it never depends on a recipient accepting funds.
    function _credit(address to, uint256 amount) private {
        credits[to] += amount;
        emit Credited(to, amount);
    }

    function _withdrawCredits(address account) private {
        uint256 amount = credits[account];
        if (amount == 0) revert NothingToClaim();
        credits[account] = 0;
        (bool ok,) = account.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit CreditWithdrawn(account, amount);
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

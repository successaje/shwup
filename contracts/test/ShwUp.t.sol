// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ShwUp} from "../src/ShwUp.sol";

contract RejectingReceiver {
    ShwUp internal immutable shwup;

    constructor(ShwUp _shwup) {
        shwup = _shwup;
    }

    function rsvp(uint256 id) external payable {
        shwup.rsvp{value: msg.value}(id);
    }

    receive() external payable {
        revert("no thanks");
    }
}

contract ShwUpTest is Test {
    ShwUp internal shwup;

    address internal organizer = makeAddr("organizer");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal door = makeAddr("door");

    uint96 internal constant DEPOSIT = 5 ether; // $5.00 — native USDC has 18 decimals on Arc
    uint64 internal startsAt;
    uint64 internal cancelCutoff;
    uint64 internal checkInEndsAt;

    function setUp() public {
        vm.warp(1_760_000_000);
        shwup = new ShwUp();
        startsAt = uint64(block.timestamp + 7 days);
        cancelCutoff = startsAt - 1 days;
        checkInEndsAt = startsAt + 3 hours;
        for (uint256 i; i < 3; ++i) {
            vm.deal([alice, bob, carol][i], 100 ether);
        }
        vm.deal(organizer, 100 ether);
    }

    // ───────────────────────────── helpers

    function _create(ShwUp.ForfeitPolicy policy, uint32 capacity) internal returns (uint256) {
        vm.prank(organizer);
        return shwup.createEvent(DEPOSIT, capacity, startsAt, cancelCutoff, checkInEndsAt, policy, '{"name":"Meetup"}');
    }

    function _create() internal returns (uint256) {
        return _create(ShwUp.ForfeitPolicy.Attendees, 0);
    }

    function _rsvp(uint256 id, address who) internal {
        vm.prank(who);
        shwup.rsvp{value: DEPOSIT}(id);
    }

    function _checkIn(uint256 id, address who) internal {
        vm.prank(organizer);
        shwup.checkIn(id, who);
    }

    function _status(uint256 id, address who) internal view returns (ShwUp.TicketStatus) {
        return shwup.ticketOf(id, who).status;
    }

    // ───────────────────────────── createEvent

    function test_createEvent_storesEvent() public {
        uint256 id = _create();
        assertEq(id, 1);
        ShwUp.EventInfo memory e = shwup.getEvent(id);
        assertEq(e.organizer, organizer);
        assertEq(e.deposit, DEPOSIT);
        assertEq(e.startsAt, startsAt);
        assertEq(e.metadata, '{"name":"Meetup"}');
        assertEq(shwup.eventsOrganizedBy(organizer).length, 1);
    }

    function test_createEvent_revertsOnZeroDeposit() public {
        vm.expectRevert(ShwUp.InvalidDeposit.selector);
        shwup.createEvent(0, 0, startsAt, cancelCutoff, checkInEndsAt, ShwUp.ForfeitPolicy.Attendees, "");
    }

    function test_createEvent_revertsOnBadSchedule() public {
        uint64 nowTs = uint64(block.timestamp);
        ShwUp.ForfeitPolicy p = ShwUp.ForfeitPolicy.Attendees;

        vm.expectRevert(ShwUp.InvalidSchedule.selector); // starts in the past
        shwup.createEvent(DEPOSIT, 0, nowTs, nowTs, nowTs + 1, p, "");

        vm.expectRevert(ShwUp.InvalidSchedule.selector); // cutoff after start
        shwup.createEvent(DEPOSIT, 0, startsAt, startsAt + 1, checkInEndsAt, p, "");

        vm.expectRevert(ShwUp.InvalidSchedule.selector); // check-in ends before start
        shwup.createEvent(DEPOSIT, 0, startsAt, cancelCutoff, startsAt, p, "");

        vm.expectRevert(ShwUp.InvalidSchedule.selector); // check-in window too long
        shwup.createEvent(DEPOSIT, 0, startsAt, cancelCutoff, startsAt + 3 days, p, "");

        vm.expectRevert(ShwUp.InvalidSchedule.selector); // too far ahead
        shwup.createEvent(DEPOSIT, 0, nowTs + 400 days, nowTs, nowTs + 400 days + 1, p, "");
    }

    function test_createEvent_revertsOnOversizedMetadata() public {
        string memory big = string(new bytes(2049));
        vm.expectRevert(ShwUp.MetadataTooLarge.selector);
        shwup.createEvent(DEPOSIT, 0, startsAt, cancelCutoff, checkInEndsAt, ShwUp.ForfeitPolicy.Attendees, big);
    }

    // ───────────────────────────── rsvp

    function test_rsvp_holdsSpot() public {
        uint256 id = _create();
        vm.expectEmit(true, true, false, true);
        emit ShwUp.SpotHeld(id, alice, DEPOSIT);
        _rsvp(id, alice);

        assertEq(uint8(_status(id, alice)), uint8(ShwUp.TicketStatus.Held));
        assertEq(shwup.getEvent(id).held, 1);
        assertEq(address(shwup).balance, DEPOSIT);
        assertEq(shwup.eventsAttendedBy(alice)[0], id);
    }

    function test_rsvp_revertsOnWrongAmount() public {
        uint256 id = _create();
        vm.prank(alice);
        vm.expectRevert(ShwUp.WrongDepositAmount.selector);
        shwup.rsvp{value: DEPOSIT - 1}(id);
    }

    function test_rsvp_revertsWhenAlreadyHolding() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.prank(alice);
        vm.expectRevert(ShwUp.AlreadyHolding.selector);
        shwup.rsvp{value: DEPOSIT}(id);
    }

    function test_rsvp_respectsCapacity() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 1);
        _rsvp(id, alice);
        vm.prank(bob);
        vm.expectRevert(ShwUp.EventFull.selector);
        shwup.rsvp{value: DEPOSIT}(id);
    }

    function test_rsvp_freedSpotCanBeTaken() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 1);
        _rsvp(id, alice);
        vm.prank(alice);
        shwup.cancelRsvp(id);
        _rsvp(id, bob);
        assertEq(shwup.getEvent(id).held, 1);
    }

    function test_rsvp_allowedAfterStartForWalkIns() public {
        uint256 id = _create();
        vm.warp(startsAt + 1 hours);
        _rsvp(id, alice);
        assertEq(uint8(_status(id, alice)), uint8(ShwUp.TicketStatus.Held));
    }

    function test_rsvp_revertsAfterCheckInCloses() public {
        uint256 id = _create();
        vm.warp(checkInEndsAt);
        vm.prank(alice);
        vm.expectRevert(ShwUp.RsvpClosed.selector);
        shwup.rsvp{value: DEPOSIT}(id);
    }

    function test_rsvp_revertsForUnknownEvent() public {
        vm.prank(alice);
        vm.expectRevert(ShwUp.EventNotFound.selector);
        shwup.rsvp{value: DEPOSIT}(42);
    }

    // ───────────────────────────── cancelRsvp

    function test_cancelRsvp_refundsBeforeCutoff() public {
        uint256 id = _create();
        _rsvp(id, alice);
        uint256 before = alice.balance;
        vm.prank(alice);
        shwup.cancelRsvp(id);

        assertEq(alice.balance, before + DEPOSIT);
        assertEq(uint8(_status(id, alice)), uint8(ShwUp.TicketStatus.Released));
        assertEq(shwup.getEvent(id).held, 0);
    }

    function test_cancelRsvp_canRejoinWithoutDuplicateListing() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.prank(alice);
        shwup.cancelRsvp(id);
        _rsvp(id, alice);
        assertEq(shwup.attendeeCount(id), 1);
        assertEq(shwup.eventsAttendedBy(alice).length, 1);
    }

    function test_cancelRsvp_revertsAfterCutoff() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(cancelCutoff);
        vm.prank(alice);
        vm.expectRevert(ShwUp.CancellationClosed.selector);
        shwup.cancelRsvp(id);
    }

    // ───────────────────────────── checkIn

    function test_checkIn_refundsDepositImmediately() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(startsAt);
        uint256 before = alice.balance;

        vm.expectEmit(true, true, true, true);
        emit ShwUp.CheckedIn(id, alice, organizer, DEPOSIT);
        _checkIn(id, alice);

        assertEq(alice.balance, before + DEPOSIT);
        assertEq(uint8(_status(id, alice)), uint8(ShwUp.TicketStatus.CheckedIn));
        assertEq(shwup.getEvent(id).checkedIn, 1);
    }

    function test_checkIn_opensOneHourEarly() public {
        uint256 id = _create();
        _rsvp(id, alice);

        vm.warp(startsAt - 1 hours - 1);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.CheckInNotOpen.selector);
        shwup.checkIn(id, alice);

        vm.warp(startsAt - 1 hours);
        _checkIn(id, alice);
    }

    function test_checkIn_revertsAfterWindow() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(checkInEndsAt);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.CheckInClosed.selector);
        shwup.checkIn(id, alice);
    }

    function test_checkIn_revertsForStranger() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(startsAt);
        vm.prank(bob);
        vm.expectRevert(ShwUp.NotAuthorizedChecker.selector);
        shwup.checkIn(id, alice);
    }

    function test_checkIn_cannotDoubleRefund() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(startsAt);
        _checkIn(id, alice);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.NoSpotHeld.selector);
        shwup.checkIn(id, alice);
    }

    function test_checkIn_revertsForNonAttendee() public {
        uint256 id = _create();
        vm.warp(startsAt);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.NoSpotHeld.selector);
        shwup.checkIn(id, bob);
    }

    // ───────────────────────────── door checkers

    function test_setChecker_authorizesAndFundsDoorKey() public {
        uint256 id = _create();
        _rsvp(id, alice);

        vm.prank(organizer);
        shwup.setChecker{value: 0.25 ether}(id, door, true);
        assertTrue(shwup.isChecker(id, door));
        assertEq(door.balance, 0.25 ether);

        vm.warp(startsAt);
        vm.prank(door);
        shwup.checkIn(id, alice);
        assertEq(uint8(_status(id, alice)), uint8(ShwUp.TicketStatus.CheckedIn));
    }

    function test_setChecker_revoked() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.startPrank(organizer);
        shwup.setChecker(id, door, true);
        shwup.setChecker(id, door, false);
        vm.stopPrank();

        vm.warp(startsAt);
        vm.prank(door);
        vm.expectRevert(ShwUp.NotAuthorizedChecker.selector);
        shwup.checkIn(id, alice);
    }

    function test_setChecker_onlyOrganizer() public {
        uint256 id = _create();
        vm.prank(alice);
        vm.expectRevert(ShwUp.NotOrganizer.selector);
        shwup.setChecker(id, alice, true);
    }

    function test_checkerIsScopedToEvent() public {
        uint256 a = _create();
        uint256 b = _create();
        _rsvp(b, alice);
        vm.prank(organizer);
        shwup.setChecker(a, door, true);

        vm.warp(startsAt);
        vm.prank(door);
        vm.expectRevert(ShwUp.NotAuthorizedChecker.selector);
        shwup.checkIn(b, alice);
    }

    // ───────────────────────────── settle

    function test_settle_splitsForfeitsAmongAttendees() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 0);
        _rsvp(id, alice);
        _rsvp(id, bob);
        _rsvp(id, carol); // no-show
        vm.warp(startsAt);
        _checkIn(id, alice);
        _checkIn(id, bob);

        vm.warp(checkInEndsAt);
        shwup.settle(id);

        ShwUp.EventInfo memory e = shwup.getEvent(id);
        assertTrue(e.settled);
        assertEq(e.bonusPerAttendee, DEPOSIT / 2);
        assertEq(shwup.claimable(id, alice), DEPOSIT / 2);
        assertEq(shwup.claimable(id, carol), 0);

        uint256 before = alice.balance;
        vm.prank(alice);
        shwup.claim(id);
        assertEq(alice.balance, before + DEPOSIT / 2);

        vm.prank(alice);
        vm.expectRevert(ShwUp.NothingToClaim.selector);
        shwup.claim(id);
    }

    function test_settle_sendsRoundingDustToOrganizer() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 0);
        address[3] memory came = [alice, bob, carol];
        for (uint256 i; i < 3; ++i) _rsvp(id, came[i]);
        address noShow = makeAddr("noShow");
        vm.deal(noShow, DEPOSIT);
        _rsvp(id, noShow);

        vm.warp(startsAt);
        for (uint256 i; i < 3; ++i) _checkIn(id, came[i]);
        vm.warp(checkInEndsAt);
        uint256 before = organizer.balance;
        shwup.settle(id);

        uint128 bonus = shwup.getEvent(id).bonusPerAttendee;
        assertEq(bonus, uint128(DEPOSIT / 3));
        assertEq(organizer.balance - before, DEPOSIT - uint256(bonus) * 3);
    }

    function test_settle_paysOrganizerUnderOrganizerPolicy() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Organizer, 0);
        _rsvp(id, alice);
        _rsvp(id, bob);
        vm.warp(startsAt);
        _checkIn(id, alice);
        vm.warp(checkInEndsAt);

        uint256 before = organizer.balance;
        shwup.settle(id);
        assertEq(organizer.balance, before + DEPOSIT);
        assertEq(shwup.claimable(id, alice), 0);
    }

    function test_settle_nobodyCameGoesToOrganizer() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 0);
        _rsvp(id, alice);
        vm.warp(checkInEndsAt);
        uint256 before = organizer.balance;
        shwup.settle(id);
        assertEq(organizer.balance, before + DEPOSIT);
    }

    function test_settle_revertsBeforeCheckInCloses() public {
        uint256 id = _create();
        vm.warp(checkInEndsAt - 1);
        vm.expectRevert(ShwUp.SettlementNotOpen.selector);
        shwup.settle(id);
    }

    function test_settle_onlyOnce() public {
        uint256 id = _create();
        vm.warp(checkInEndsAt);
        shwup.settle(id);
        vm.expectRevert(ShwUp.EventIsSettled.selector);
        shwup.settle(id);
    }

    function test_settle_emptiesContract() public {
        uint256 id = _create(ShwUp.ForfeitPolicy.Attendees, 0);
        _rsvp(id, alice);
        _rsvp(id, bob);
        vm.warp(startsAt);
        _checkIn(id, alice);
        vm.warp(checkInEndsAt);
        shwup.settle(id);
        vm.prank(alice);
        shwup.claim(id);
        assertEq(address(shwup).balance, 0);
    }

    // ───────────────────────────── cancelEvent

    function test_cancelEvent_makesDepositsClaimable() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.prank(organizer);
        shwup.cancelEvent(id);

        assertEq(shwup.claimable(id, alice), DEPOSIT);
        uint256 before = alice.balance;
        vm.prank(alice);
        shwup.claim(id);
        assertEq(alice.balance, before + DEPOSIT);
        assertEq(address(shwup).balance, 0);

        vm.prank(alice);
        vm.expectRevert(ShwUp.NothingToClaim.selector);
        shwup.claim(id);
    }

    function test_cancelEvent_blocksRsvpAndSettle() public {
        uint256 id = _create();
        vm.prank(organizer);
        shwup.cancelEvent(id);

        vm.prank(alice);
        vm.expectRevert(ShwUp.EventIsCancelled.selector);
        shwup.rsvp{value: DEPOSIT}(id);

        vm.warp(checkInEndsAt);
        vm.expectRevert(ShwUp.EventIsCancelled.selector);
        shwup.settle(id);
    }

    function test_cancelEvent_revertsOnceStarted() public {
        uint256 id = _create();
        vm.warp(startsAt);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.EventAlreadyStarted.selector);
        shwup.cancelEvent(id);
    }

    function test_cancelEvent_revertsAfterEarlyCheckIns() public {
        uint256 id = _create();
        _rsvp(id, alice);
        vm.warp(startsAt - 30 minutes);
        _checkIn(id, alice);
        vm.prank(organizer);
        vm.expectRevert(ShwUp.AttendeesAlreadyCheckedIn.selector);
        shwup.cancelEvent(id);
    }

    function test_cancelEvent_onlyOrganizer() public {
        uint256 id = _create();
        vm.prank(alice);
        vm.expectRevert(ShwUp.NotOrganizer.selector);
        shwup.cancelEvent(id);
    }

    // ───────────────────────────── rejecting receivers

    function test_rejectedRefundBecomesCredit() public {
        uint256 id = _create();
        RejectingReceiver r = new RejectingReceiver(shwup);
        vm.deal(address(this), DEPOSIT);
        r.rsvp{value: DEPOSIT}(id);

        vm.warp(startsAt);
        _checkIn(id, address(r)); // must not revert
        assertEq(shwup.credits(address(r)), DEPOSIT);
        assertEq(uint8(_status(id, address(r))), uint8(ShwUp.TicketStatus.CheckedIn));
    }

    // ───────────────────────────── views

    function test_getAttendees_paginates() public {
        uint256 id = _create();
        _rsvp(id, alice);
        _rsvp(id, bob);
        _rsvp(id, carol);
        vm.warp(startsAt);
        _checkIn(id, bob);

        (address[] memory a, ShwUp.TicketStatus[] memory s) = shwup.getAttendees(id, 1, 10);
        assertEq(a.length, 2);
        assertEq(a[0], bob);
        assertEq(uint8(s[0]), uint8(ShwUp.TicketStatus.CheckedIn));
        assertEq(a[1], carol);

        (a,) = shwup.getAttendees(id, 5, 10);
        assertEq(a.length, 0);
    }

    // ───────────────────────────── fuzz

    function testFuzz_settlementConservesFunds(uint8 rsvps, uint8 arrivals, uint96 deposit) public {
        rsvps = uint8(bound(rsvps, 1, 40));
        arrivals = uint8(bound(arrivals, 0, rsvps));
        deposit = uint96(bound(deposit, 1, 1_000 ether));

        vm.prank(organizer);
        uint256 id = shwup.createEvent(
            deposit, 0, startsAt, cancelCutoff, checkInEndsAt, ShwUp.ForfeitPolicy.Attendees, ""
        );
        address[] memory people = new address[](rsvps);
        for (uint256 i; i < rsvps; ++i) {
            people[i] = address(uint160(0x1000 + i));
            vm.deal(people[i], deposit);
            vm.prank(people[i]);
            shwup.rsvp{value: deposit}(id);
        }
        vm.warp(startsAt);
        for (uint256 i; i < arrivals; ++i) _checkIn(id, people[i]);
        vm.warp(checkInEndsAt);
        shwup.settle(id);
        for (uint256 i; i < arrivals; ++i) {
            if (shwup.claimable(id, people[i]) > 0) {
                vm.prank(people[i]);
                shwup.claim(id);
            }
        }
        assertEq(address(shwup).balance, 0, "all funds distributed");
    }
}

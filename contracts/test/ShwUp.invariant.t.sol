// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test} from "forge-std/Test.sol";
import {ShwUp} from "../src/ShwUp.sol";

/// @dev Drives random sequences of RSVPs, cancellations, check-ins, event cancellations, settlement and
///      claims across a handful of events while tracking what the contract owes.
contract ShwUpHandler is Test {
    ShwUp public immutable shwup;
    address[] public actors;
    uint256[] public eventIds;
    address internal organizer = address(0xBEEF);

    constructor(ShwUp _shwup) {
        shwup = _shwup;
        for (uint256 i; i < 6; ++i) {
            address a = address(uint160(0xA000 + i));
            actors.push(a);
            vm.deal(a, 1_000 ether);
        }
        vm.deal(organizer, 1_000 ether);
        uint64 startsAt = uint64(block.timestamp + 1 days);
        for (uint256 i; i < 3; ++i) {
            vm.prank(organizer);
            eventIds.push(
                shwup.createEvent(
                    uint96(1 ether + i * 0.37 ether),
                    0,
                    startsAt,
                    startsAt - 6 hours,
                    startsAt + 2 hours,
                    ShwUp.ForfeitPolicy(i % 2),
                    ""
                )
            );
        }
    }

    function _event(uint256 seed) internal view returns (uint256) {
        return eventIds[seed % eventIds.length];
    }

    function _actor(uint256 seed) internal view returns (address) {
        return actors[seed % actors.length];
    }

    function rsvp(uint256 e, uint256 a) external {
        uint256 id = _event(e);
        uint96 deposit = shwup.getEvent(id).deposit; // read first: vm.prank applies to the next call
        vm.prank(_actor(a));
        shwup.rsvp{value: deposit}(id);
    }

    function cancelRsvp(uint256 e, uint256 a) external {
        vm.prank(_actor(a));
        shwup.cancelRsvp(_event(e));
    }

    /// @dev Prefers an actor who actually holds a spot so check-ins aren't mostly no-ops.
    function checkIn(uint256 e, uint256 a) external {
        uint256 id = _event(e);
        address who = _actor(a);
        for (uint256 i; i < actors.length; ++i) {
            address candidate = _actor(a + i);
            if (shwup.ticketOf(id, candidate).status == ShwUp.TicketStatus.Held) {
                who = candidate;
                break;
            }
        }
        vm.prank(organizer);
        shwup.checkIn(id, who);
    }

    /// @dev Rare, so most runs reach check-in and settlement.
    function cancelEvent(uint256 e) external {
        if (e % 8 != 0) return;
        vm.prank(organizer);
        shwup.cancelEvent(_event(e));
    }

    function settle(uint256 e) external {
        shwup.settle(_event(e));
    }

    function claim(uint256 e, uint256 a) external {
        vm.prank(_actor(a));
        shwup.claim(_event(e));
    }

    function warp(uint256 secs) external {
        vm.warp(block.timestamp + bound(secs, 1, 8 hours));
    }

    /// @notice Sum of everything the contract currently owes anyone.
    function liabilities() external view returns (uint256 owed) {
        for (uint256 i; i < eventIds.length; ++i) {
            uint256 id = eventIds[i];
            ShwUp.EventInfo memory info = shwup.getEvent(id);
            for (uint256 j; j < actors.length; ++j) {
                ShwUp.Ticket memory t = shwup.ticketOf(id, actors[j]);
                if (t.status == ShwUp.TicketStatus.Held && !info.settled) owed += info.deposit;
                if (t.status == ShwUp.TicketStatus.CheckedIn && info.settled && !t.bonusClaimed) {
                    owed += info.bonusPerAttendee;
                }
            }
        }
    }
}

contract ShwUpInvariantTest is Test {
    ShwUp internal shwup;
    ShwUpHandler internal handler;

    function setUp() public {
        vm.warp(1_760_000_000);
        shwup = new ShwUp();
        handler = new ShwUpHandler(shwup);
        targetContract(address(handler));
    }

    /// @dev The contract holds exactly what it owes: no stuck funds, no shortfall.
    function invariant_solvent() public view {
        assertEq(address(shwup).balance, handler.liabilities());
    }
}

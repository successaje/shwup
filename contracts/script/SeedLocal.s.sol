// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ShwUp} from "../src/ShwUp.sol";

/// @notice LOCAL DEVELOPMENT ONLY. Deploys ShwUp to anvil and creates a few events with RSVPs from
///         anvil's well-known test accounts, so the UI has realistic state to render.
contract SeedLocal is Script {
    // anvil default accounts 0–3 (public test keys)
    uint256 constant ORGANIZER = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256[3] internal guests = [
        0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d,
        0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a,
        0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6
    ];

    function run() external {
        require(block.chainid == 31337, "local only");

        vm.startBroadcast(ORGANIZER);
        ShwUp shwup = new ShwUp();
        uint64 nowTs = uint64(block.timestamp);

        // Doors open now: starts in 30 minutes, check-in runs 3 hours. The host posted a $50 bond.
        uint256 tonight = shwup.createEvent{value: 50 ether}(
            5 ether,
            40,
            nowTs + 30 minutes,
            nowTs + 20 minutes,
            nowTs + 3 hours + 30 minutes,
            ShwUp.ForfeitPolicy.Attendees,
            address(0),
            '{"name":"Arc Builders Night","location":"The Workshop, 14 Herbert Macaulay Way","description":"Lightning demos from people shipping on Arc, then pizza. Bring a laptop if you want to show something."}'
        );
        // Full class: two stations, both taken. One guest will offer theirs up.
        uint256 nextWeek = shwup.createEvent(
            10 ether,
            2,
            nowTs + 6 days,
            nowTs + 5 days,
            nowTs + 6 days + 2 hours,
            ShwUp.ForfeitPolicy.Organizer,
            address(0),
            '{"name":"Sourdough 101","location":"Common Kitchen","description":"Hands-on class. Two stations, so every spot counts."}'
        );
        // No-show deposits go to a cause.
        uint256 cleanup = shwup.createEvent(
            3 ether,
            0,
            nowTs + 3 days,
            nowTs + 2 days,
            nowTs + 3 days + 3 hours,
            ShwUp.ForfeitPolicy.Beneficiary,
            address(0xF00D),
            '{"name":"Beach Cleanup","location":"Elegushi Beach, Lekki","description":"Gloves and bags provided.","cause":"Lagos Food Bank"}'
        );
        // Same contract, other doors: a restaurant booking and an appointment.
        uint256 table = shwup.createEvent(
            20 ether,
            1,
            nowTs + 2 days,
            nowTs + 2 days - 4 hours,
            nowTs + 2 days + 1 hours,
            ShwUp.ForfeitPolicy.Organizer,
            address(0),
            '{"name":"Table for 4","location":"Maison Lagos, Victoria Island","description":"Saturday dinner. Your deposit comes back when you are seated."}'
        );
        shwup.createEvent(
            10 ether,
            1,
            nowTs + 4 days,
            nowTs + 3 days,
            nowTs + 4 days + 1 hours,
            ShwUp.ForfeitPolicy.Organizer,
            address(0),
            '{"name":"Consultation \u00b7 30 min","location":"Studio 4, Yaba","description":"One-to-one session. Back when you check in; cancel a day ahead and it is back too."}'
        );
        vm.stopBroadcast();

        for (uint256 i; i < guests.length; ++i) {
            vm.startBroadcast(guests[i]);
            shwup.rsvp{value: 5 ether}(tonight);
            if (i < 2) shwup.rsvp{value: 10 ether}(nextWeek);
            if (i == 0) shwup.offerSpot(nextWeek, address(0));
            if (i == 2) shwup.rsvp{value: 3 ether}(cleanup);
            if (i == 2) shwup.rsvp{value: 20 ether}(table);
            vm.stopBroadcast();
        }

        console2.log("SHWUP_ADDRESS", address(shwup));
    }
}

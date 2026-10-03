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

        // Doors open now: starts in 30 minutes, check-in runs 3 hours.
        uint256 tonight = shwup.createEvent(
            5 ether,
            40,
            nowTs + 30 minutes,
            nowTs + 20 minutes,
            nowTs + 3 hours + 30 minutes,
            ShwUp.ForfeitPolicy.Attendees,
            '{"name":"Arc Builders Night","location":"The Workshop, 14 Herbert Macaulay Way","description":"Lightning demos from people shipping on Arc, then pizza. Bring a laptop if you want to show something."}'
        );
        uint256 nextWeek = shwup.createEvent(
            10 ether,
            12,
            nowTs + 6 days,
            nowTs + 5 days,
            nowTs + 6 days + 2 hours,
            ShwUp.ForfeitPolicy.Organizer,
            '{"name":"Sourdough 101","location":"Common Kitchen","description":"Hands-on class. Twelve stations, so every spot counts."}'
        );
        vm.stopBroadcast();

        for (uint256 i; i < guests.length; ++i) {
            vm.startBroadcast(guests[i]);
            shwup.rsvp{value: 5 ether}(tonight);
            if (i < 2) shwup.rsvp{value: 10 ether}(nextWeek);
            vm.stopBroadcast();
        }

        console2.log("SHWUP_ADDRESS", address(shwup));
    }
}

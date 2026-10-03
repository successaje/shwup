// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {ShwUp} from "../src/ShwUp.sol";

/// @notice Deploys ShwUp and records the address in deployments/<chainId>.json.
/// @dev Usage (Arc testnet):
///      forge script script/Deploy.s.sol --rpc-url arc_testnet --account shwup-deployer --broadcast
contract Deploy is Script {
    function run() external returns (ShwUp shwup) {
        vm.startBroadcast();
        shwup = new ShwUp();
        vm.stopBroadcast();

        string memory obj = "deployment";
        vm.serializeUint(obj, "chainId", block.chainid);
        vm.serializeUint(obj, "blockNumber", block.number);
        string memory json = vm.serializeAddress(obj, "ShwUp", address(shwup));
        vm.writeJson(json, string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json"));

        console2.log("ShwUp deployed at", address(shwup));
    }
}

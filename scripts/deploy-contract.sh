#!/usr/bin/env bash
# Deploy ShwUp to Arc and print the env vars the web app needs.
#
#   ./scripts/deploy-contract.sh arcTestnet <foundry-keystore-account>
#   ./scripts/deploy-contract.sh arc        <foundry-keystore-account>
#
# Create a keystore account once with:  cast wallet import <name> --interactive
# Fund it with a little USDC (testnet: https://faucet.circle.com). Foundry prompts for the password.
set -euo pipefail
cd "$(dirname "$0")/../contracts"

NETWORK="${1:?usage: deploy-contract.sh <arcTestnet|arc> <keystore-account>}"
ACCOUNT="${2:?usage: deploy-contract.sh <arcTestnet|arc> <keystore-account>}"

case "$NETWORK" in
  arcTestnet) RPC="${ARC_TESTNET_RPC_URL:-https://rpc.testnet.arc.io}"; CHAIN_ID=5042002 ;;
  arc)        RPC="${ARC_RPC_URL:-https://rpc.mainnet.arc.io}";        CHAIN_ID=5042 ;;
  *) echo "network must be arcTestnet or arc" >&2; exit 1 ;;
esac

FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge script script/Deploy.s.sol --rpc-url "$RPC" --account "$ACCOUNT" --broadcast

DEPLOYMENT="deployments/$CHAIN_ID.json"
ADDRESS=$(node -e "console.log(require('./$DEPLOYMENT').ShwUp)")
BLOCK=$(node -e "console.log(require('./$DEPLOYMENT').blockNumber)")

cat <<OUT

Deployed ShwUp on $NETWORK
  address: $ADDRESS
  block:   $BLOCK

Web app environment:
  NEXT_PUBLIC_SHWUP_CHAIN=$NETWORK
  NEXT_PUBLIC_SHWUP_ADDRESS=$ADDRESS
  NEXT_PUBLIC_SHWUP_DEPLOY_BLOCK=$BLOCK
OUT

#!/usr/bin/env bash
# Deploy ShwUp to Arc, verify its source on the explorer, and print the env vars the web app needs.
#
#   ./scripts/deploy-contract.sh <arcTestnet|arc> <signer>
#
# <signer> is how the deploy is signed — never a private key in a file:
#   browser   your browser wallet (MetaMask, Rabby…) signs in a page Foundry opens   (recommended)
#   ledger    a Ledger hardware wallet
#   trezor    a Trezor hardware wallet
#   <name>    an encrypted Foundry keystore (create one with: cast wallet new ~/.foundry/keystores <name>)
#
# The signing wallet needs a little USDC on the target network for gas (testnet:
# https://faucet.circle.com). It gets no special powers: ShwUp has no owner or admin.
set -euo pipefail
cd "$(dirname "$0")/../contracts"

USAGE="usage: deploy-contract.sh <arcTestnet|arc> <browser|ledger|trezor|keystore-name>"
NETWORK="${1:?$USAGE}"
SIGNER="${2:?$USAGE}"

case "$SIGNER" in
  browser) SIGN=(--browser) ;;
  ledger) SIGN=(--ledger) ;;
  trezor) SIGN=(--trezor) ;;
  *) SIGN=(--account "$SIGNER") ;;
esac

case "$NETWORK" in
  arcTestnet) RPC="${ARC_TESTNET_RPC_URL:-https://rpc.testnet.arc.io}"; CHAIN_ID=5042002; EXPLORER=https://explorer.testnet.arc.io ;;
  arc)        RPC="${ARC_RPC_URL:-https://rpc.mainnet.arc.io}";        CHAIN_ID=5042;    EXPLORER=https://explorer.arc.io ;;
  *) echo "network must be arcTestnet or arc" >&2; exit 1 ;;
esac

FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge script script/Deploy.s.sol --rpc-url "$RPC" "${SIGN[@]}" --broadcast

DEPLOYMENT="deployments/$CHAIN_ID.json"
ADDRESS=$(node -e "console.log(require('./$DEPLOYMENT').ShwUp)")
BLOCK=$(node -e "console.log(require('./$DEPLOYMENT').blockNumber)")

# The script writes the deployment record during its dry run, so make sure the broadcast actually
# landed (e.g. it fails silently-looking when the deployer has no USDC for gas).
if [ "$(FOUNDRY_DISABLE_NIGHTLY_WARNING=1 cast code "$ADDRESS" --rpc-url "$RPC")" = "0x" ]; then
  git checkout -- "$DEPLOYMENT" 2>/dev/null || rm -f "$DEPLOYMENT"
  echo "No contract at $ADDRESS on $NETWORK — the deploy didn't land. Is the deployer funded with USDC on this network?" >&2
  exit 1
fi

# Publish the source on Arc's Blockscout explorer.
FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge verify-contract "$ADDRESS" src/ShwUp.sol:ShwUp \
  --chain-id "$CHAIN_ID" --verifier blockscout --verifier-url "$EXPLORER/api/" --watch

cat <<OUT

Deployed ShwUp on $NETWORK
  address: $ADDRESS
  block:   $BLOCK
  source:  $EXPLORER/address/$ADDRESS?tab=contract

Web app environment:
  NEXT_PUBLIC_SHWUP_CHAIN=$NETWORK
  NEXT_PUBLIC_SHWUP_ADDRESS=$ADDRESS
  NEXT_PUBLIC_SHWUP_DEPLOY_BLOCK=$BLOCK
OUT

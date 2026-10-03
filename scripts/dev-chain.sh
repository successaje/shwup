#!/usr/bin/env bash
# Local development chain: anvil + a seeded ShwUp deployment.
# Writes web/.env.local so `pnpm dev` talks to it. Not used in production.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8545}"
anvil --port "$PORT" --chain-id 31337 --block-time 1 --silent &
ANVIL_PID=$!
trap 'kill $ANVIL_PID 2>/dev/null' EXIT

until cast chain-id --rpc-url "http://127.0.0.1:$PORT" >/dev/null 2>&1; do sleep 0.2; done

ADDRESS=$(cd contracts && FOUNDRY_DISABLE_NIGHTLY_WARNING=1 forge script script/SeedLocal.s.sol \
  --rpc-url "http://127.0.0.1:$PORT" --broadcast 2>/dev/null | awk '/SHWUP_ADDRESS/ {print $2}')

cat > web/.env.local <<ENV
NEXT_PUBLIC_SHWUP_CHAIN=local
NEXT_PUBLIC_SHWUP_ADDRESS=$ADDRESS
ENV

echo "anvil on :$PORT — ShwUp at $ADDRESS (written to web/.env.local)"
wait $ANVIL_PID

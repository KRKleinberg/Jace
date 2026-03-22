#!/bin/bash

set -e

ENV_FILE=""
BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build) BUILD=true; shift ;;
        --env-file) ENV_FILE="$2"; shift 2 ;;
        *) echo "[Error] Unknown option: $1"; exit 1 ;;
    esac
done

DC="docker compose${ENV_FILE:+ --env-file $ENV_FILE}"

if [ "$BUILD" = true ]; then
    echo "[Build] Starting"
    $DC build client
fi

OLD=$($DC ps client --status running --format '{{.Name}}' 2>/dev/null | head -1)

echo "[Deploy] Starting"

if [ -z "$OLD" ]; then
    $DC up -d
    echo "[Deploy] Complete"
    exit 0
fi

echo "[Deploy] Replacing $OLD"
$DC up -d --no-recreate --scale client=2 client

NEW=""
for i in $(seq 1 15); do
    NEW=$($DC ps client --format '{{.Name}}' 2>/dev/null | grep -v "^${OLD}$" | head -1)
    [ -n "$NEW" ] && break
    sleep 1
done

if [ -z "$NEW" ]; then
    echo "[Error] New instance failed to start"
    $DC ps client --status exited --format '{{.Name}}' 2>/dev/null | xargs -r docker rm
    exit 1
fi

sleep 5
RESTARTS=$(docker inspect --format '{{.RestartCount}}' "$NEW" 2>/dev/null || echo "0")

if [ "$RESTARTS" -gt 0 ]; then
    echo "[Error] New instance crash-looping (${RESTARTS} restarts)"
    docker stop "$NEW" >/dev/null 2>&1 || true
    docker rm "$NEW" >/dev/null 2>&1 || true
    exit 1
fi

for i in $(seq 1 30); do
    if ! docker ps --format '{{.Names}}' | grep -q "^${OLD}$"; then
        break
    fi
    sleep 1
done

if docker ps --format '{{.Names}}' | grep -q "^${OLD}$"; then
    echo "[Handoff] Timed out, forcing stop"
    docker stop "$OLD"
fi

docker rm "$OLD" >/dev/null 2>&1 || true
echo "[Deploy] Complete"
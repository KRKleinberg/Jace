#!/bin/bash

set -e

ENV_FILE=""
BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build) BUILD=true; shift ;;
        --env-file) ENV_FILE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

DC="docker compose${ENV_FILE:+ --env-file $ENV_FILE}"

if [ "$BUILD" = true ]; then
    echo "Building image..."
    $DC build jace
fi

OLD=$($DC ps jace --status running --format '{{.Name}}' 2>/dev/null | head -1)

if [ -n "$OLD" ]; then
    echo "Performing blue/green deploy..."
    echo "Old instance: $OLD"

    $DC up -d --no-recreate --scale jace=2 jace

    # Wait for new instance to appear
    NEW=""
    for i in $(seq 1 15); do
        NEW=$($DC ps jace --format '{{.Name}}' 2>/dev/null | grep -v "^${OLD}$" | head -1)
        if [ -n "$NEW" ]; then
            break
        fi
        sleep 1
    done

    if [ -z "$NEW" ]; then
        echo "New instance failed to start, keeping old instance"
        $DC ps jace --status exited --format '{{.Name}}' 2>/dev/null | xargs -r docker rm
        exit 1
    fi

    echo "New instance: $NEW"

    # Wait and check for crash-looping
    sleep 5
    RESTARTS=$(docker inspect --format '{{.RestartCount}}' "$NEW" 2>/dev/null || echo "0")

    if [ "$RESTARTS" -gt 0 ]; then
        echo "New instance is crash-looping (${RESTARTS} restarts), keeping old instance"
        docker stop "$NEW" 2>/dev/null || true
        docker rm "$NEW" 2>/dev/null || true
        exit 1
    fi

    echo "Waiting for old instance to exit..."
    for i in $(seq 1 30); do
        if ! docker ps --format '{{.Names}}' | grep -q "^${OLD}$"; then
            echo "Handoff complete"
            break
        fi
        sleep 1
    done

    if docker ps --format '{{.Names}}' | grep -q "^${OLD}$"; then
        echo "Handoff timed out, forcing old instance down..."
        docker stop "$OLD"
    fi

    docker rm "$OLD" 2>/dev/null || true
else
    echo "No existing instance, starting fresh..."
    $DC up -d
fi
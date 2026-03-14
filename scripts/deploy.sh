#!/bin/bash

set -e

ENV_FILE=".env"
BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build) BUILD=true; shift ;;
        --env-file) ENV_FILE="$2"; shift 2 ;;
        *) shift ;;
    esac
done

DC="docker compose --env-file $ENV_FILE"

if [ "$BUILD" = true ]; then
    echo "Building image..."
    $DC build jace
fi

OLD=$($DC ps jace --status running -q 2>/dev/null | head -1 | cut -c1-12)

if [ -n "$OLD" ]; then
    echo "Performing blue/green deploy..."

    $DC up -d --no-recreate --scale jace=2 jace

    echo "Waiting for old instance to exit..."
    for i in $(seq 1 30); do
        if ! docker ps -q | grep -q "$OLD"; then
            echo "Handoff complete"
            break
        fi
        sleep 1
    done

    if docker ps -q | grep -q "$OLD"; then
        echo "Handoff timed out, forcing old instance down..."
        docker stop "$OLD"
    fi

    $DC up -d --scale jace=1 jace
else
    echo "No existing instance, starting fresh..."
    $DC up -d jace
fi
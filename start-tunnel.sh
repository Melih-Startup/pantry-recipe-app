#!/bin/bash
# Starts the Pantry Pal server and creates a public tunnel link
# so you can access the app from any browser.

set -e

echo "Installing dependencies..."
npm install --silent

echo ""
echo "Starting Pantry Pal server on port 3000..."
node server.js &
SERVER_PID=$!

sleep 2

if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo "Error: Server failed to start."
  exit 1
fi

echo "Server running (PID $SERVER_PID)."
echo ""
echo "Creating public tunnel..."
npx --yes localtunnel --port 3000 &
TUNNEL_PID=$!

cleanup() {
  echo ""
  echo "Shutting down..."
  kill $TUNNEL_PID 2>/dev/null || true
  kill $SERVER_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

wait $TUNNEL_PID

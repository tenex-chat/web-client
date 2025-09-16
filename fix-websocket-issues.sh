#!/bin/bash

echo "🔧 Fixing WebSocket and Port Issues for TENEX-web"
echo "================================================"

# Kill any processes using ports 3000-3004
echo "Checking for processes on ports 3000-3004..."
for port in 3000 3001 3002 3003 3004; do
  PID=$(lsof -t -i:$port)
  if [ ! -z "$PID" ]; then
    echo "Found process $PID on port $port, killing it..."
    kill -9 $PID 2>/dev/null
    echo "✅ Killed process on port $port"
  fi
done

# Clear node_modules and reinstall if needed
if [ "$1" == "--clean" ]; then
  echo "Performing clean install..."
  rm -rf node_modules package-lock.json
  npm install
  echo "✅ Clean install completed"
fi

# Clear Vite cache
echo "Clearing Vite cache..."
rm -rf node_modules/.vite
echo "✅ Vite cache cleared"

# Start the dev server with explicit port
echo "Starting development server on port 3000..."
PORT=3000 npm run dev


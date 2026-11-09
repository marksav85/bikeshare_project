#!/usr/bin/env bash

set -uo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd -- "$script_dir/.." && pwd -P)"

fail() {
  printf 'BikeShare development launcher: %s\n' "$1" >&2
  exit 1
}

[[ -d "$repo_root/backend" ]] || fail "backend/ directory not found at $repo_root/backend"
[[ -d "$repo_root/frontend" ]] || fail "frontend/ directory not found at $repo_root/frontend"
[[ -x "$repo_root/backend/.venv/bin/python" ]] ||
  fail "Python environment is missing. Create backend/.venv and install backend dependencies first."
[[ -x "$repo_root/frontend/node_modules/.bin/vite" ]] ||
  fail "Frontend dependencies are missing. Run npm ci from $repo_root/frontend first."
command -v npm >/dev/null 2>&1 || fail "npm was not found on PATH. Install Node.js and npm first."

if ! (cd "$repo_root/backend" && .venv/bin/python -c 'import bikeshare.api, uvicorn' >/dev/null 2>&1); then
  fail "Backend dependencies are unavailable. Install the project dependencies into backend/.venv first."
fi

backend_pid=""
frontend_pid=""

stop_servers() {
  local pid
  for pid in "$backend_pid" "$frontend_pid"; do
    if [[ -n "$pid" ]]; then
      kill -TERM -- "-$pid" 2>/dev/null || true
    fi
  done

  for pid in "$backend_pid" "$frontend_pid"; do
    if [[ -n "$pid" ]]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}

finish() {
  local status=$?
  trap - EXIT INT TERM
  stop_servers
  exit "$status"
}

trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Monitor mode gives each background job a process group so child servers stop with it.
set -m

(
  cd "$repo_root/backend"
  exec .venv/bin/python -m uvicorn bikeshare.api:app --host 127.0.0.1 --port 8000 --reload
) &
backend_pid=$!

(
  cd "$repo_root/frontend"
  exec npm run dev
) &
frontend_pid=$!

printf 'BikeShare development servers started.\n'
printf 'Backend:  http://127.0.0.1:8000\n'
printf 'Frontend: http://127.0.0.1:5173\n'
printf 'Press Ctrl+C to stop both servers.\n'

wait -n "$backend_pid" "$frontend_pid"
status=$?
if (( status != 0 )); then
  printf 'A development server exited with status %d; stopping the other server.\n' "$status" >&2
fi
exit "$status"

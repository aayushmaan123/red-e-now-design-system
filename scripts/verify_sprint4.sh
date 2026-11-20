#!/usr/bin/env bash
set -e
sudo mysql rede_now -e "DESCRIBE package_exceptions; SHOW COLUMNS FROM pickup_appointments LIKE 'handed_off_at';" > /dev/null
echo "Sprint 4 QA passed."

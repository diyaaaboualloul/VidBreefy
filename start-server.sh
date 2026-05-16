#!/bin/bash
cd /vidbreefy/backend
node server.js > /tmp/vidbreefy.log 2>&1 &
echo "Started PID: $!"
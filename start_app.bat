@echo off
title NDIS Contractor Invoice App - Top End Support Collective
cd /d "%~dp0"
echo ======================================================================
echo Starting NDIS Support Coordinator Invoice Application...
echo Open your browser at: http://localhost:5000
echo Press Ctrl+C in this terminal window to stop the server.
echo ======================================================================

start http://localhost:5000
python app.py
pause

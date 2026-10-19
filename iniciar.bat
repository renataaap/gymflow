@echo off
cd /d "%~dp0"
py -3 app\server.py --seed-demo
pause

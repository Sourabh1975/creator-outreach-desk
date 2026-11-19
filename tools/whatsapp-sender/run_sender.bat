@echo off
title WhatsApp Creator Outreach Auto-Sender
cd /d "%~dp0"
echo ========================================================
echo   WhatsApp Creator Outreach Auto-Sender
echo ========================================================
echo.
node send_messages.mjs
echo.
echo ========================================================
echo Process finished. Press any key to close this window...
echo ========================================================
pause >nul

@echo off
setlocal enabledelayedexpansion

REM ===========================================================================
REM  One-time setup for the Discord announcer.
REM
REM  This walks through the whole thing and explains each step as it goes. You
REM  only ever need to run it once. After that, use redeploy-discord-worker.bat
REM  if you change a setting.
REM
REM  What you are setting up: a small program that lives on Cloudflare's servers
REM  and wakes up every 10 minutes to check whether you have published a new
REM  announcement. If you have, it posts it to Discord. If not, it goes back to
REM  sleep. There is no server to keep running and nothing on your PC.
REM
REM  Administrator is NOT required.
REM ===========================================================================

cd /d "%~dp0workers\comms-discord"

echo.
echo  Surface Labs -- Discord announcer setup
echo  =======================================
echo.
echo  Before you start, have this ready:
echo.
echo    Your Discord webhook URL. In Discord: Server Settings, then
echo    Integrations, then Webhooks, then New Webhook. Pick the channel you
echo    want announcements in, then Copy Webhook URL.
echo.
echo    It looks like:  https://discord.com/api/webhooks/1234.../abcd...
echo.
pause

where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js was not found. Install the LTS build from https://nodejs.org
    goto :fail
)

if not exist "%~dp0node_modules" (
    echo.
    echo  [..] Installing packages first. This only happens once.
    pushd "%~dp0"
    call npm install
    popd
    if errorlevel 1 goto :fail
)

REM --- 1. Sign in --------------------------------------------------------------
echo.
echo  ---------------------------------------------------------------
echo   STEP 1 of 4 - Sign in to Cloudflare
echo  ---------------------------------------------------------------
echo   A browser window will open. Approve it, then come back here.
echo   If you have already done this on this PC it will just say so.
echo.
call npx wrangler login
if errorlevel 1 goto :fail

REM --- 2. KV -------------------------------------------------------------------
echo.
echo  ---------------------------------------------------------------
echo   STEP 2 of 4 - Create the "already posted" list
echo  ---------------------------------------------------------------
echo   This is a tiny storage area on Cloudflare that remembers which
echo   announcements have already gone to Discord.
echo.
echo   Without it, the announcer has no memory and would repost
echo   everything every 10 minutes, forever.
echo.
echo   The command below prints a line containing  id = "......"
echo   Copy just the long code between the quotes.
echo.
pause
echo.
call npx wrangler kv namespace create COMMS_STATE
if errorlevel 1 goto :fail

echo.
set "KVID="
set /p KVID=" Paste the id here and press Enter: "
if "!KVID!"=="" (
    echo.
    echo  [X] Nothing was pasted. Run this script again.
    goto :fail
)

powershell -NoProfile -Command ^
  "$p='wrangler.jsonc'; $c=Get-Content $p -Raw;" ^
  "if ($c -notmatch 'REPLACE_WITH_KV_NAMESPACE_ID') { Write-Host ' [!] Already filled in - leaving it alone.'; exit 0 }" ^
  "Set-Content $p ($c -replace 'REPLACE_WITH_KV_NAMESPACE_ID', '%KVID%'.Trim()) -NoNewline; Write-Host ' [ok] Saved.'"
if errorlevel 1 goto :fail

REM --- 3. Secret ---------------------------------------------------------------
echo.
echo  ---------------------------------------------------------------
echo   STEP 3 of 4 - Hand over the Discord webhook URL
echo  ---------------------------------------------------------------
echo   Treat this URL like a password: anyone who has it can post to
echo   your channel. That is why it is stored encrypted in your
echo   Cloudflare account instead of in a file in the project.
echo.
echo   Paste it when prompted. Nothing will appear as you paste - that
echo   is normal for a secret. Press Enter afterwards.
echo.
pause
echo.
call npx wrangler secret put DISCORD_WEBHOOK_URL
if errorlevel 1 goto :fail

REM --- 4. Deploy ---------------------------------------------------------------
echo.
echo  ---------------------------------------------------------------
echo   STEP 4 of 4 - Upload it
echo  ---------------------------------------------------------------
echo.
call npx wrangler deploy
if errorlevel 1 goto :fail

echo.
echo  ===============================================================
echo   Set up. It is running, but it is MUTED on purpose.
echo.
echo   Right now it writes into its log what it *would* post, and
echo   sends nothing to Discord. Watch it with:
echo.
echo       cd workers\comms-discord
echo       npx wrangler tail
echo.
echo   You will see a line every 10 minutes. When you are happy:
echo.
echo     1. Open  workers\comms-discord\wrangler.jsonc
echo     2. Change  "DRY_RUN": "true"   to   "DRY_RUN": "false"
echo     3. Run  redeploy-discord-worker.bat
echo.
echo   The first live run stays quiet too. It writes down every
echo   announcement that already exists as "already posted" and stops,
echo   so switching it on does not dump your whole back catalogue into
echo   the channel. Only posts published after that get announced.
echo  ===============================================================
echo.
pause
exit /b 0

:fail
echo.
echo  Setup stopped. Nothing is broken - run this script again to pick
echo  up from the start. Steps you already finished will say so.
echo.
pause
exit /b 1

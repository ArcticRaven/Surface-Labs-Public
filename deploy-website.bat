@echo off
setlocal

REM ===========================================================================
REM  Builds the website and publishes it to Cloudflare.
REM
REM  Run this whenever you have written or edited an announcement, a blog post,
REM  a changelog entry, or anything else on the site. It is safe to run as often
REM  as you like.
REM
REM  Double-click it, or right-click and Run as administrator. Administrator is
REM  NOT required -- but if you do elevate, Windows starts you in system32, so
REM  the line below moves back to this script's own folder first.
REM ===========================================================================

cd /d "%~dp0"

echo.
echo  Surface Labs -- publish website
echo  ===============================
echo  Folder: %CD%
echo.

REM --- Is Node installed? ----------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js was not found.
    echo.
    echo      Install the LTS build from https://nodejs.org and run this again.
    goto :fail
)
for /f "delims=" %%v in ('node --version') do echo  [ok] Node %%v

REM --- Are the project's packages installed? ---------------------------------
if not exist "node_modules" (
    echo.
    echo  [..] First run in this folder - installing packages. This takes a
    echo       few minutes and only happens once.
    call npm install
    if errorlevel 1 goto :fail
)

REM --- Build ------------------------------------------------------------------
REM  Three steps in one: the website itself, the in-app documentation bundle,
REM  and the announcement feed. The feed build refuses to finish if any post is
REM  malformed, so an error here means a content problem, not a deploy problem.
echo.
echo  [..] Building the site, the docs bundle and the announcement feed...
echo.
call npm run build
if errorlevel 1 (
    echo.
    echo  [X] The build stopped. Read the message above - it names the file and
    echo      the problem. Nothing has been published; the live site is untouched.
    goto :fail
)

REM --- Publish ----------------------------------------------------------------
echo.
echo  [..] Publishing to Cloudflare...
echo.
echo       If this is the first time on this machine, a browser window will
echo       open asking you to sign in to Cloudflare. Approve it and this will
echo       carry on by itself.
echo.
call npx wrangler deploy
if errorlevel 1 (
    echo.
    echo  [X] Publishing failed. The build was fine, so this is a Cloudflare
    echo      problem - usually not being signed in. Try:  npx wrangler login
    goto :fail
)

echo.
echo  ===============================================================
echo   Done. The site is live.
echo.
echo   Announcements are at:
echo     https://surfacelabs.app/app/comms.json
echo.
echo   The app picks up changes the next time it starts, or when you
echo   press the refresh arrows on the News panel.
echo  ===============================================================
echo.
pause
exit /b 0

:fail
echo.
echo  Nothing was published.
echo.
pause
exit /b 1

@echo off
setlocal

REM ===========================================================================
REM  Re-uploads the Discord announcer after you have changed a setting.
REM
REM  The usual reason to run this is switching DRY_RUN from "true" to "false"
REM  in workers\comms-discord\wrangler.jsonc, which is what arms it.
REM
REM  Run setup-discord-worker.bat first if you have not set it up yet.
REM  Administrator is NOT required.
REM ===========================================================================

cd /d "%~dp0workers\comms-discord"

echo.
echo  Surface Labs -- redeploy the Discord announcer
echo  ==============================================
echo.

findstr /c:"REPLACE_WITH_KV_NAMESPACE_ID" wrangler.jsonc >nul 2>nul
if not errorlevel 1 (
    echo  [X] This has not been set up yet - the storage id is still a
    echo      placeholder.
    echo.
    echo      Run setup-discord-worker.bat instead.
    goto :fail
)

REM Report the current mode, so running this never leaves you unsure whether
REM the thing is armed. This is the single most important fact about it.
findstr /c:"\"DRY_RUN\": \"false\"" wrangler.jsonc >nul 2>nul
if errorlevel 1 (
    echo  Mode: MUTED  ^(DRY_RUN is "true"^)
    echo        It will log what it would post and send nothing to Discord.
) else (
    echo  Mode: LIVE  ^(DRY_RUN is "false"^)
    echo        It WILL post new announcements to your Discord channel.
)
echo.
pause

echo.
call npx wrangler deploy
if errorlevel 1 goto :fail

echo.
echo  ===============================================================
echo   Uploaded. Watch what it does with:
echo.
echo       cd workers\comms-discord
echo       npx wrangler tail
echo  ===============================================================
echo.
pause
exit /b 0

:fail
echo.
pause
exit /b 1

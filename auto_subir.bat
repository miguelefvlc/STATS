@echo off
title STATS Auto-Sync
echo =========================================
echo  Vigilante de GitHub (Auto-Sync) Activado
echo =========================================
echo.
echo Deje esta ventana minimizada o abierta.
echo Cada 10 segundos comprobara si hay cambios.
echo Pulse Ctrl+C para detenerlo.
echo.

:loop
timeout /t 10 /nobreak >nul
git status --porcelain >nul 2>&1
for /f "tokens=*" %%a in ('git status --porcelain') do (
    echo.
    echo [ %time% ] Modificacion detectada. Subiendo a GitHub...
    git add .
    git commit -m "Auto-Sync %date% %time%"
    git push
    echo.
    echo [ %time% ] Subida completada. Esperando nuevos cambios...
    goto loop
)
goto loop

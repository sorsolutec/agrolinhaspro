@echo off
title AgroLinhas Pro - Servidor Local
echo ===================================================
echo     Iniciando AgroLinhas Pro - Servidor Web
echo ===================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause

@echo off
setlocal
set "DIR=%~dp0"
echo ========================================================
echo Starting ParkFind MySQL Server 9.7 on Port 3307...
echo ========================================================
"%DIR%mysql-server\bin\mysqld.exe" --defaults-file="%DIR%my.ini" --console
pause

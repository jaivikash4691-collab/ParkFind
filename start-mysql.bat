@echo off
setlocal
set "ROOT_DIR=%~dp0"
echo ========================================================
echo Starting ParkFind MySQL Server 9.7 on Port 3307...
echo ========================================================
"%ROOT_DIR%Database\mysql-server\bin\mysqld.exe" --defaults-file="%ROOT_DIR%Database\my.ini" --console
pause

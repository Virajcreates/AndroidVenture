@echo off
echo Adding firewall rule for AndroidVenture server...
netsh advfirewall firewall add rule name="AndroidVenture HTTP Server" dir=in action=allow protocol=TCP localport=9000
netsh advfirewall firewall add rule name="AndroidVenture WebSocket Server" dir=in action=allow protocol=TCP localport=8081
echo.
echo Firewall rules added successfully!
echo Press any key to close...
pause >nul

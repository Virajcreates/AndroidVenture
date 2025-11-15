#  Network Upload Guide - Edge Vision Pro

Complete guide for setting up frame streaming from Android to Web Viewer

---

##  Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup Steps](#setup-steps)
- [Firewall Configuration](#firewall-configuration)
- [Troubleshooting](#troubleshooting)
- [Advanced Configuration](#advanced-configuration)

---

##  Overview

The network upload feature enables real-time streaming of processed frames from your Android device to a web browser dashboard. This is useful for:

- **Remote Monitoring**: View camera feed from any browser on your network
- **Debugging**: Inspect processed frames without ADB/USB connection
- **Demonstrations**: Show live edge detection to multiple viewers
- **Development**: Test processing without constant device handling

### How It Works

\\\
Android Device                    PC/Laptop                    Web Browser
                             
                HTTP POST                     WebSocket                
  Camera +      (Port 9000)     Node.js       (Port 8081)  Canvas      
  OpenCV      >  Server      >  Renderer    
  Processing    JPEG/Base64     Express+WS    JSON Frame               
                ~1 FPS                        Real-time                
                             
                                                                 
                                                                 
      Same WiFi Network 
\\\

**Key Points**:
- Android uploads JPEG frames via HTTP POST
- Node.js server receives and broadcasts via WebSocket
- Web viewer displays frames on HTML5 Canvas
- Upload rate limited to ~1 FPS to conserve bandwidth

---

##  Architecture

### Components

#### 1. Android Client (FrameUploader.kt)
- **Technology**: OkHttp 4.12.0
- **Function**: HTTP POST client
- **Port**: Sends to 9000
- **Format**: JSON with base64-encoded JPEG

`kotlin
{
  \"image\": \"data:image/jpeg;base64,/9j/4AAQSkZJRg...\"
}
`

#### 2. Backend Server (server.js)
- **Technology**: Node.js, Express, ws (WebSocket library)
- **HTTP Server**: Port 9000 - receives frames
- **WebSocket Server**: Port 8081 - broadcasts frames
- **Binding**: 0.0.0.0 (accessible from network)

#### 3. Web Viewer (network-receiver.html)
- **Technology**: HTML5 Canvas, JavaScript
- **Connection**: WebSocket client on port 8081
- **Rendering**: Decodes base64  Image  Canvas
- **Stats**: FPS, resolution, frame count tracking

---

##  Setup Steps

### Step 1: Find Your PC's IP Address

#### Windows
\\\powershell
ipconfig
\\\
Look for \"IPv4 Address\" under your WiFi adapter:
\\\
Wireless LAN adapter Wi-Fi:
   IPv4 Address. . . . . . . . . . . : 192.168.1.3
\\\

#### macOS/Linux
\\\ash
ifconfig
# or
ip addr show
\\\
Look for inet address under your WiFi interface (wlan0/en0):
\\\
inet 192.168.1.3 netmask 0xffffff00
\\\

**Note your IP address** (e.g., 192.168.1.3)

### Step 2: Update Android App

Edit \pp/src/main/java/com/androidventure/edgedetector/MainActivity.kt\:

`kotlin
// Line ~85 - Replace with YOUR PC's IP
val serverIp = \"192.168.1.3\"  // Change this!
val serverPort = 9000
`

**Important**: Use your actual IP, not localhost or 127.0.0.1

### Step 3: Start Backend Server

Navigate to web directory and start servers:

\\\ash
cd web
npm install  # First time only
npm run dev
\\\

You should see:
\\\
HTTP upload server listening on http://0.0.0.0:9000
Server accessible at:
  - http://localhost:9000
  - http://192.168.1.3:9000
WebSocket server listening on ws://0.0.0.0:8081
\\\

### Step 4: Configure Firewall

See [Firewall Configuration](#firewall-configuration) section below.

### Step 5: Test Connection

1. **Open web viewer**: http://localhost:8080/network-receiver.html
2. **Click \"Start WebSocket\"** - Status should show \"Connected\" (cyan)
3. **Build and install Android app** with updated IP
4. **Tap \"Upload Frame\"** button (green)
5. **Frames appear** in web viewer

---

##  Firewall Configuration

### Windows

#### Option A: Using Batch Script (Recommended)

1. Right-click \dd-firewall-rule.bat\ in project root
2. Select **\"Run as administrator\"**
3. Rules will be added automatically

#### Option B: PowerShell Commands

Run PowerShell as Administrator:

\\\powershell
# Allow HTTP upload port
netsh advfirewall firewall add rule name=\"Edge Vision HTTP\" dir=in action=allow protocol=TCP localport=9000

# Allow WebSocket port
netsh advfirewall firewall add rule name=\"Edge Vision WebSocket\" dir=in action=allow protocol=TCP localport=8081
\\\

#### Option C: Windows Defender GUI

1. Open **Windows Defender Firewall**  **Advanced settings**
2. Click **Inbound Rules**  **New Rule**
3. Select **Port**  Next
4. Enter **TCP** and **9000**  Next
5. Select **Allow the connection**  Next
6. Check all profiles  Next
7. Name: \"Edge Vision HTTP\"  Finish
8. **Repeat for port 8081** (WebSocket)

#### Option D: Temporary Testing (Disable Firewall)

 **Not recommended for production**

1. Open **Windows Defender Firewall**
2. Click **Turn Windows Defender Firewall on or off**
3. Select **Turn off** for Private networks
4. Test the app
5. **Turn firewall back on** after testing

### macOS

\\\ash
# Allow Node.js through firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/local/bin/node
\\\

### Linux (Ubuntu/Debian)

\\\ash
# Using ufw
sudo ufw allow 9000/tcp
sudo ufw allow 8081/tcp
sudo ufw reload

# Or using iptables
sudo iptables -A INPUT -p tcp --dport 9000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8081 -j ACCEPT
\\\

---

##  Troubleshooting

### Issue: \"Upload failed: Failed to connect\"

**Symptoms**: Android Logcat shows connection errors

**Solutions**:

1. **Verify Same Network**
   - Android device and PC must be on **same WiFi**
   - Not using mobile data on Android
   - Not using VPN on either device

2. **Check Server Running**
   \\\ash
   # In web directory
   npm run dev
   # Should show \"listening on...\" messages
   \\\

3. **Verify IP Address**
   - Run \ipconfig\ (Windows) or \ifconfig\ (Mac/Linux)
   - Update MainActivity.kt with correct IP
   - Rebuild Android app

4. **Test Server Reachability**
   - On Android browser, visit: \http://192.168.1.3:9000\
   - Should show server response (not error)
   - If fails, firewall is blocking

5. **Add Firewall Rules** (see Firewall Configuration above)

6. **Check Ports Not In Use**
   \\\powershell
   # Windows
   netstat -ano | findstr :9000
   netstat -ano | findstr :8081
   
   # Should be empty or show Node.js process
   \\\

### Issue: \"CLEARTEXT communication not permitted\"

**Symptoms**: Logcat shows cleartext error

**Solution**: Already fixed in app! File \
etwork_security_config.xml\ exists.

If still occurs:
1. Check AndroidManifest.xml has:
   \\\xml
   android:networkSecurityConfig=\"@xml/network_security_config\"
   \\\
2. Rebuild app completely:
   \\\ash
   ./gradlew clean assembleDebug
   \\\

### Issue: \"executor rejected\"

**Symptoms**: Logcat shows \"RejectedExecutionException\"

**Solution**: Already fixed! Upload rate limited to every 30th frame.

If still occurs:
- Increase \UPLOAD_EVERY_N_FRAMES\ to 60 in MainActivity.kt
- Rebuild app

### Issue: Web Viewer Shows \"Disconnected\"

**Symptoms**: Status indicator red/gray

**Solutions**:

1. **Start WebSocket**
   - Click \"Start WebSocket\" button
   - Wait for \"Connected\" status (cyan)

2. **Check Server Logs**
   - Server terminal should show \"WebSocket client connected\"
   - If not, server may have crashed

3. **Restart Server**
   \\\ash
   # Kill all Node processes
   pkill node  # Mac/Linux
   taskkill /F /IM node.exe  # Windows
   
   # Restart
   cd web && npm run dev
   \\\

4. **Check Browser Console**
   - Press F12  Console tab
   - Look for WebSocket errors
   - Common: \"Connection refused\" means server not running

5. **Try Different Browser**
   - Chrome/Edge recommended
   - Some browsers block WebSocket on localhost

### Issue: Frames Not Appearing

**Symptoms**: WebSocket connected but no images

**Solutions**:

1. **Verify Android Uploading**
   \\\ash
   adb logcat | grep Upload
   # Should show \"Upload successful\" messages
   \\\

2. **Check Server Receiving**
   - Server console should log \"Received frame\"
   - If not, Android not reaching server

3. **Test with \"Send Test Frame\"**
   - Click test button on web page
   - If works, issue is Android  Server
   - If fails, issue is WebSocket  Canvas

4. **Verify Image Format**
   - Server expects: \{\"image\": \"data:image/jpeg;base64,...\"}\
   - Check Network tab in browser DevTools

5. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

### Issue: Slow Frame Rate

**Symptoms**: < 0.5 FPS on web viewer

**Solutions**:

1. **Normal Behavior**: Upload intentionally limited to ~1 FPS
   
2. **To Increase Rate**: Edit MainActivity.kt
   \\\kotlin
   UPLOAD_EVERY_N_FRAMES = 15  // ~2 FPS
   \\\

3. **Network Congestion**: Check WiFi signal strength

4. **Server Overload**: Restart server, close other viewers

---

##  Advanced Configuration

### Customize Upload Quality

Edit \FrameUploader.kt\:

\\\kotlin
// Line ~18-19
private const val JPEG_QUALITY = 80           // 0-100 (higher = better quality, larger file)
private const val MAX_FRAME_DIMENSION = 640   // Max width/height in pixels
\\\

**Recommendations**:
- **High Quality**: JPEG_QUALITY=95, MAX_FRAME_DIMENSION=1024 (more bandwidth)
- **Low Bandwidth**: JPEG_QUALITY=60, MAX_FRAME_DIMENSION=480 (faster upload)
- **Balanced**: JPEG_QUALITY=80, MAX_FRAME_DIMENSION=640 (default)

### Change Server Ports

Edit \server.js\:

\\\javascript
const HTTP_PORT = 9000;   // Change HTTP upload port
const WS_PORT = 8081;     // Change WebSocket port
\\\

Then update MainActivity.kt and firewall rules accordingly.

### Enable HTTPS (Advanced)

For secure connections over internet:

1. Generate SSL certificate
2. Modify server.js to use https module
3. Update Android OkHttp to trust certificate
4. Remove cleartext config from AndroidManifest

See Node.js HTTPS documentation for details.

### Multi-Device Streaming

Server already supports multiple viewers!

- Open network-receiver.html on multiple browsers
- All receive same frames simultaneously
- Each maintains independent FPS counter

### Remote Access (Outside Local Network)

 **Advanced users only**

1. **Port Forwarding**: Configure router to forward ports 9000 and 8081
2. **Dynamic DNS**: Use service like No-IP or DuckDNS
3. **Update Android**: Use public IP instead of local IP
4. **Security**: Implement authentication (not included)

---

##  Network Requirements

| Aspect | Requirement |
|--------|-------------|
| **WiFi Standard** | 802.11n or better |
| **Bandwidth** | ~500 Kbps (at 1 FPS, JPEG 80%) |
| **Latency** | < 200ms recommended |
| **Ports** | 9000 (HTTP), 8081 (WebSocket) |
| **Protocol** | HTTP/1.1, WebSocket (RFC 6455) |

---

##  Security Notes

 **This implementation is for development/testing only**

**Current Security**:
-  No authentication
-  No encryption (cleartext HTTP)
-  No rate limiting beyond client-side
-  Local network only (not internet-exposed by default)

**For Production**:
- Implement user authentication
- Use HTTPS with valid certificates
- Add server-side rate limiting
- Implement access control lists
- Consider VPN for remote access

---

##  Support

If issues persist after trying above solutions:

1. **Check Logs**:
   \\\ash
   # Android
   adb logcat | grep -E \"Upload|Camera|OpenCV\"
   
   # Server
   # Check terminal running npm run dev
   \\\

2. **Test Individual Components**:
   - Can you access http://YOUR_PC_IP:9000 from Android browser?
   - Does web viewer \"Send Test Frame\" work?
   - Does webcam demo (index.html) work?

3. **Report Issue** with:
   - Android device model and OS version
   - PC OS and Node.js version
   - Complete error messages from Logcat
   - Server console output
   - Browser console errors (F12)

---

##  Success Checklist

Before reporting issues, verify:

- [ ] Server running (\
pm run dev\ shows \"listening\" messages)
- [ ] Firewall rules added for ports 9000 and 8081
- [ ] Android and PC on same WiFi network
- [ ] MainActivity.kt has correct PC IP address
- [ ] Android app rebuilt after IP change
- [ ] Web viewer shows \"WebSocket Connected\" (cyan)
- [ ] Android Logcat shows \"Upload successful\" (or similar)
- [ ] Browser console (F12) shows no errors

---

<div align=\"center\">

**Need more help?** See main [README.md](README.md) or open an issue on GitHub.

Made with  for Edge Vision Pro

</div>

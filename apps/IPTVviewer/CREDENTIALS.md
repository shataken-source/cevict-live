# IPTV Credentials & Configuration

Your IPTV service credentials are now integrated into the app!

## Pre-configured Credentials

```
Username: COCHJNAR01
Password: VYa7uMUeFT
Main Server: http://link4tv.me:80
Alt Server: http://ky-iptv.com:80
```

## Features

### Automatic Playlist Loading
- App automatically loads your IPTV playlist on first launch
- Uses main server by default
- Falls back to alternate server if main fails
- Credentials are built into the code (no manual entry needed)

### Settings Screen - Credential Management
Located in Settings → IPTV Credentials:

1. **View/Edit Credentials**
   - Tap "Show" to reveal credential fields
   - Username, password, and servers are pre-filled
   - Edit if your credentials change

2. **Test Connection**
   - Tests both main and alternate servers
   - Shows which server is working
   - Useful for troubleshooting

3. **Load Playlist**
   - Fetches fresh playlist with current credentials
   - Updates channel list
   - Adds as new playlist (keeps old ones)

### EPG (Electronic Program Guide)
- Auto-generated EPG URL based on credentials
- Format: `http://link4tv.me:80/xmltv.php?username=COCHJNAR01&password=VYa7uMUeFT`
- Can override with custom XMLTV URL if needed

### Server Failover
- If main server (`link4tv.me`) fails, automatically tries alt server (`ky-iptv.com`)
- Seamless fallback for better reliability
- Both servers use same credentials

## Usage

### First Launch
1. App loads automatically with your credentials
2. Fetches playlist from main server
3. If main fails, tries alternate server
4. Channels ready to watch immediately

### Change Credentials
1. Open Settings
2. Tap IPTV Credentials → Show
3. Edit username/password/servers
4. Tap "Test Connection" to verify
5. Tap "Load Playlist" to fetch channels

### EPG Setup
Your EPG URL is auto-generated:
```
http://link4tv.me:80/xmltv.php?username=COCHJNAR01&password=VYa7uMUeFT
```
This provides program guide data for your channels.

## Security Notes

⚠️ **Credentials in Code**
- Your credentials are stored in `IPTVService.ts` as default values
- `.env` files are blocked for security (gitignored)
- Credentials are **not** sent to any external service except your IPTV provider
- For production use, consider implementing secure credential storage

## Technical Details

### IPTVService Class
Handles all IPTV-related operations:
- Generate playlist URLs
- Generate EPG URLs
- Test server connections
- Handle failover logic
- Logo URL resolution

### Playlist URL Format
```
http://{server}/playlist/{username}/{password}/m3u_plus?output=hls
```

### EPG URL Format
```
http://{server}/xmltv.php?username={username}&password={password}
```

## Troubleshooting

**Playlist not loading?**
1. Check Settings → IPTV Credentials
2. Tap "Test Connection"
3. Verify credentials are correct
4. Try alternate server if main fails

**Channels not playing?**
- Ensure internet connection is stable
- Some channels may be geo-restricted
- Try different channels to isolate issue

**Want to use different credentials?**
- Edit in Settings → IPTV Credentials
- Or modify `IPTVService.ts` default values

Your IPTV setup is ready to use! Launch the app and start watching.

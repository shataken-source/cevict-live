# IPTV Services - Credentials & Setup

Your NextTV Viewer now supports **three IPTV services** out of the box!

---

## Pre-configured IPTV Services

### 1. Link4TV IPTV

**Credentials:**
```
Username: COCHJNAR01
Password: VYa7uMUeFT
Main Server: http://link4tv.me:80
Alt Server: http://ky-iptv.com:80
```

**Features:**
- Hundreds of live channels
- Auto-failover to alternate server
- EPG support included
- Multiple countries and languages

**Playlist URL:**
```
http://link4tv.me:80/playlist/COCHJNAR01/VYa7uMUeFT/m3u_plus?output=hls
```

**EPG URL:**
```
http://link4tv.me:80/xmltv.php?username=COCHJNAR01&password=VYa7uMUeFT
```

---

### 2. Dezor IPTV

**Credentials:**
```
Playlist Name: DezorIPTv
Username: jascodezoripty
Password: 19e993b7f5
Server: http://cf.like-cdn.com
```

**Features:**
- Premium channel selection
- High-quality streams
- Sports, movies, international content
- Stable server infrastructure

**Playlist URL:**
```
http://cf.like-cdn.com/get.php?username=jascodezoripty&password=19e993b7f5&type=m3u_plus&output=ts
```

---

### 3. Sample Channels (Built-in)

**Features:**
- 30+ test/demo channels
- No login required
- Organized by category
- Free HLS test streams

**Categories:**
- UK, News, Sports, Entertainment
- Documentary, Kids, Music

---

## Automatic Setup

### First Launch

When you launch the app for the first time, **all three playlists** load automatically:

1. **Sample Channels** (loads first)
2. **Link4TV IPTV** (loads second)
3. **Dezor IPTV** (loads third, set as default)

You'll see hundreds of channels immediately available!

### Loading Indicator

While playlists load:
- Home screen shows channel count
- Loading happens in background
- Channels appear as they load
- Default playlist (Dezor) activates last

---

## Managing Playlists

### Switch Between Services

**Settings → Playlists:**
1. See all loaded playlists
2. Tap playlist name to switch
3. Current playlist marked with "(Current)"
4. Channel count displayed for each

### Delete Unwanted Playlists

1. Open Settings → Playlists
2. Find playlist to remove
3. Tap "Delete" button
4. Confirms deletion

### Reload Playlists

**Link4TV:**
1. Settings → IPTV Credentials → Show
2. Verify credentials
3. Tap "Load Playlist"

**Dezor:**
1. Settings → Dezor IPTV Credentials → Show
2. Verify credentials
3. Tap "Load Dezor Playlist"

---

## Editing Credentials

### Link4TV Credentials

**Settings → IPTV Credentials:**

1. Tap **"Show"** to reveal fields
2. Edit any field:
   - Username
   - Password
   - Main Server
   - Alternate Server
3. Tap **"Test Connection"** to verify
4. Tap **"Load Playlist"** to refresh

### Dezor Credentials

**Settings → Dezor IPTV Credentials:**

1. Tap **"Show"** to reveal fields
2. Edit any field:
   - Username
   - Password
   - Server
3. Tap **"Load Dezor Playlist"** to refresh

---

## Playlist URLs Explained

### Link4TV Format
```
http://{server}/playlist/{username}/{password}/m3u_plus?output=hls
```

**Parameters:**
- `server`: Main or alt server address
- `username`: Your Link4TV username
- `password`: Your Link4TV password
- `output=hls`: Request HLS format streams

### Dezor Format
```
http://{server}/get.php?username={username}&password={password}&type=m3u_plus&output=ts
```

**Parameters:**
- `server`: Dezor server address
- `username`: Your Dezor username
- `password`: Your Dezor password
- `type=m3u_plus`: Extended M3U format
- `output=ts`: Transport stream output

---

## Troubleshooting

### Playlist Not Loading

**Link4TV:**
1. Check internet connection
2. Verify credentials are correct
3. Try alternate server
4. Test connection in Settings

**Dezor:**
1. Check server address (cf.like-cdn.com)
2. Verify username/password
3. Check if service is active
4. Try reloading playlist

### Channels Not Playing

**Common Issues:**
- Channel stream may be offline
- Geo-restriction (use VPN)
- Server maintenance
- Internet connection issue

**Solutions:**
1. Try different channel
2. Connect VPN (Settings → VPN)
3. Switch to alternate playlist
4. Check service status page

### Server Failover (Link4TV Only)

If main server fails:
1. App automatically tries alternate server
2. Seamless fallback
3. No user intervention needed
4. Channels load from backup server

### Credentials Expired

**Symptoms:**
- Playlist won't load
- "Authentication failed" error
- Empty channel list

**Solutions:**
1. Contact your IPTV provider
2. Verify subscription is active
3. Update credentials in Settings
4. Reload playlist

---

## Adding More IPTV Services

### Via URL

**Home Screen:**
1. Enter M3U playlist URL in input field
2. Tap "Add" button
3. Playlist loads and saves automatically

### Via Settings

**Settings → IPTV Credentials or Dezor Credentials:**
1. Update credentials
2. Tap "Load Playlist"
3. New playlist appears in list

### Manual Configuration

If you have a different IPTV service:
1. Get M3U playlist URL from provider
2. Add via home screen URL input
3. Or create custom credentials in Settings
4. Playlist saves for future use

---

## Playlist Comparison

| Feature | Link4TV | Dezor | Sample |
|---------|---------|-------|--------|
| **Channels** | 100+ | 100+ | 30+ |
| **Quality** | HD/SD | HD/SD | SD |
| **EPG** | ✅ Yes | ⚠️ TBD | ❌ No |
| **Cost** | Paid | Paid | Free |
| **Geo-restrict** | Some | Some | None |
| **Failover** | ✅ Yes | ❌ No | N/A |
| **Auto-load** | ✅ Yes | ✅ Yes | ✅ Yes |

---

## Server Information

### Link4TV Servers

**Main Server:**
- URL: link4tv.me:80
- Location: TBD
- Uptime: High
- Failover: Available

**Alternate Server:**
- URL: ky-iptv.com:80
- Location: TBD
- Uptime: High
- Automatic fallback

### Dezor Server

**Primary Server:**
- URL: cf.like-cdn.com
- Location: CDN-distributed
- Uptime: High
- Failover: Not configured

---

## Best Practices

### Multiple Playlists

**Recommended Setup:**
1. Keep all three playlists active
2. Use Dezor for primary viewing
3. Link4TV as backup
4. Sample for testing features

### Credential Security

**Tips:**
- Don't share your credentials
- Change passwords periodically
- Use VPN for added privacy
- Credentials stored securely in app

### Playlist Refresh

**When to Reload:**
- Channels not loading
- Outdated channel list
- After credential change
- Service adds new channels

**How Often:**
- Weekly: Check for updates
- Monthly: Full reload recommended
- As needed: If issues arise

---

## FAQ

**Q: Which playlist should I use?**
A: Dezor is set as default and loads last. All three are available.

**Q: Can I have more than 3 playlists?**
A: Yes! Add unlimited playlists via URL input.

**Q: What if my credentials expire?**
A: Contact IPTV provider, update in Settings, reload playlist.

**Q: Do I need VPN?**
A: Optional, but recommended for geo-restricted channels.

**Q: Which server is faster - Link4TV main or alt?**
A: Try both, use whichever performs better in your region.

**Q: Can I use Dezor on multiple devices?**
A: Check with Dezor IPTV terms of service.

**Q: How do I know which playlist is active?**
A: Settings → Playlists shows "(Current)" next to active one.

**Q: Can I rename playlists?**
A: Not currently, feature planned for future update.

---

## Support

**For App Issues:**
- Check documentation files
- Verify internet connection
- Try VPN if geo-restricted

**For IPTV Service Issues:**
- Contact Link4TV support
- Contact Dezor IPTV support
- Check service status pages

Enjoy your triple IPTV setup with NextTV Viewer!

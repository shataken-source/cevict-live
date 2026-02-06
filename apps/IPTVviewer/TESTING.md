# Sample Test Instructions

## Testing the NextTV Viewer

The app now comes pre-loaded with sample IPTV channels for immediate testing!

### Automatic Sample Data

When you first launch the app:
- **30+ sample channels** automatically load if no playlists exist
- Channels are organized into groups:
  - UK (BBC One, BBC Two, ITV, Channel 4, Sky One)
  - News (CNN, BBC News, Sky News, Fox News)
  - Sports (ESPN, Sky Sports, Eurosport, BT Sport)
  - Entertainment (HBO, Netflix Demo, Comedy Central, MTV)
  - Documentary (Discovery, National Geographic, History, Animal Planet)
  - Kids (Cartoon Network, Disney, Nickelodeon, CBBC)
  - Music (Music Hits, Rock Channel, Jazz Radio, Classical FM)

### Manual Sample Data Load

If you need to reload sample channels:
1. Tap the **"Sample Data"** button (green button in header)
2. Confirm the dialog
3. Sample channels will load immediately

### Testing Features

#### 1. Basic Playback
- Tap any channel to start playing
- Video player opens with controls
- Controls auto-hide after 5 seconds
- Tap screen to show controls again

#### 2. Previous Channel (Key Feature!)
- Play one channel
- Go back and play another channel
- Press **"Previous"** button to return to first channel
- Or press **Select/Enter** on TV remote

#### 3. Favorites
- Tap the ★/☆ icon next to any channel
- Switch to "Favorites" filter to see only favorites
- Favorites persist across app restarts

#### 4. Search & Filter
- Use search box to find channels by name
- Filter by "All Channels" or "Favorites"
- Search also works within groups

#### 5. Channel Groups
- Channels are organized by group (UK, News, Sports, etc.)
- Groups shown below channel names
- Can search by group name

#### 6. Volume Control
- Use Vol +/- buttons in player
- Mute/Unmute button available
- Volume indicator shows current level

#### 7. Settings
- View all loaded playlists
- Delete playlists
- Switch between playlists
- View keyboard shortcuts

### Test Workflow

1. **Launch app** → Sample channels load automatically
2. **Browse channels** → Scroll through 30+ channels
3. **Play channel** → Tap "BBC One" (or any channel)
4. **Switch channels** → Go back, play "CNN"
5. **Test previous** → Press "Previous" button → returns to BBC One
6. **Add favorites** → Star some channels
7. **Filter favorites** → Tap "Favorites" filter
8. **Search** → Type "sport" to find sports channels
9. **Volume test** → Adjust volume in player
10. **Settings** → Check playlist management

### Sample Streams

The sample playlist uses **free test HLS streams** from:
- Demo servers (Unified Streaming, Akamai)
- Big Buck Bunny test content
- Sintel demo video
- Tears of Steel test stream

These are legitimate test streams used for development.

### Adding Real Channels

To add your own M3U playlist:
1. Enter URL in the text input
2. Tap "Add" button
3. Channels load from your playlist
4. Switch between playlists in Settings

### Troubleshooting

**No channels showing?**
- Tap "Sample Data" button to reload

**Video not playing?**
- Test streams are demos; some may be offline
- Try different channels

**Previous channel not working?**
- Play at least 2 channels first
- Button only appears after second channel

**Favorites not saving?**
- Check file permissions in Android settings
- Try restarting app

### Next Steps

After testing with sample data:
1. Add your own M3U playlist URL
2. Customize with real IPTV channels
3. Build custom modules (see MODULE_DEVELOPMENT.md)
4. Deploy to Android TV device

Enjoy testing NextTV Viewer!

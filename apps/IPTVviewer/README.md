# NextTV Viewer

IPTV viewer with previous-channel support and extensible architecture for Android TV and TV platforms.

## Features

### Core Functionality
- **Previous Channel Button**: Quickly switch back to the last watched channel (the #1 requested feature in IPTV apps)
- **M3U Playlist Support**: Load and manage multiple IPTV playlists
- **Channel Favorites**: Mark and filter your favorite channels
- **EPG Integration**: Electronic Program Guide support via XMLTV
- **Channel History**: Tracks your viewing history
- **Search & Filter**: Find channels by name or group

### TV Optimized
- **Remote Control Support**: Full TV remote navigation
- **Clean UI**: Designed for 10-foot viewing distance
- **Auto-hide Controls**: Controls fade out during playback
- **Volume Control**: On-screen volume indicator

### Extensible Architecture
- **Module System**: Drop in new features without rebuilding the app
- **Plugin Support**: Load custom modules from file system
- **Update Ready**: Architecture designed for agent/cursor-driven updates

## Tech Stack

- React Native 0.73.2
- TypeScript
- Zustand (state management)
- react-native-video (playback)
- React Navigation

## Installation

> **Note:** The `package.json` originally included `react-native-tvos` which is Apple TV specific and not available via npm. This has been removed. The app works perfectly on Android devices (phones, tablets, and Android TV) using standard `react-native`.

\`\`\`bash
npm install
\`\`\`

## Running

### Android (Phone, Tablet, Android TV)
\`\`\`bash
npm run android
\`\`\`

> **TV:** Back button returns to the list. Use the on-screen **Previous** button for previous channel; D-pad Select is not wired. See [FEATURES.md](./FEATURES.md) for what's implemented vs placeholder.

## Project Structure

\`\`\`
src/
├── screens/           # Main app screens
│   ├── HomeScreen.tsx      # Channel list and playlist management
│   ├── PlayerScreen.tsx    # Video player with controls
│   └── SettingsScreen.tsx  # App settings
├── services/          # Core services
│   ├── M3UParser.ts        # M3U playlist parser
│   ├── PlaylistManager.ts  # Playlist storage
│   └── EPGService.ts       # EPG data handling
├── store/            # State management
│   └── useStore.ts         # Zustand store
├── modules/          # Extensible module system
│   ├── ModuleInterface.ts  # Base module class
│   ├── ModuleManager.ts    # Module loader
│   └── examples/           # Example modules
└── types/            # TypeScript types
\`\`\`

## Usage

### Adding a Playlist

1. Launch the app
2. Enter an M3U playlist URL in the input field
3. Tap "Add" to load the playlist
4. Channels will appear in the list

### Watching Channels

1. Select a channel from the list
2. Player will open and start playback
3. Use remote control to show/hide controls
4. Press "Select/Enter" on remote to go to previous channel

### Keyboard/Remote Shortcuts

- **Back** (hardware or on-screen): Return to channel list
- **Previous** (on-screen button): Return to previous channel
- **Tap screen**: Show/hide controls; **Vol +/- / Mute**: On-screen when controls visible

## Module System

The app supports loading external modules for extending functionality:

### Module Structure

\`\`\`
module-folder/
├── manifest.json     # Module metadata
└── ModuleName.tsx    # Module implementation
\`\`\`

### Example manifest.json

\`\`\`json
{
  "id": "my-module",
  "name": "My Custom Module",
  "version": "1.0.0",
  "description": "Module description",
  "author": "Your Name",
  "entryPoint": "ModuleName.tsx",
  "permissions": ["navigation", "storage"]
}
\`\`\`

### Creating a Module

Extend the \`TVModule\` base class:

\`\`\`typescript
import {TVModule, ModuleManifest, ModuleContext} from './ModuleInterface';

export default class MyModule extends TVModule {
  async initialize(): Promise<void> {
    // Setup code
  }

  render(): React.ReactNode {
    // Return React component
  }

  async cleanup(): Promise<void> {
    // Cleanup code
  }
}
\`\`\`

## Roadmap

- [ ] Multi-platform support (Apple TV, Fire TV, LG webOS, Samsung Tizen)
- [ ] Cloud playlist sync
- [ ] Parental controls
- [ ] Picture-in-Picture mode
- [ ] Voice control integration
- [ ] Chromecast support
- [ ] Recording capabilities
- [ ] Advanced EPG with reminders
- [ ] Multi-audio/subtitle support
- [ ] Time-shift buffer

## License

MIT

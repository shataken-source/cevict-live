# NextTV Viewer - Development Guide

## Architecture Overview

### Core Principles

1. **Separation of Concerns**: UI, business logic, and data access are separated
2. **Extensibility**: Module system allows adding features without modifying core
3. **TV-First**: Designed for 10-foot UI and remote control navigation
4. **Offline-First**: Playlists and favorites stored locally

### State Management

Using Zustand for lightweight, type-safe state:

\`\`\`typescript
const {currentChannel, goToPreviousChannel} = useStore();
\`\`\`

Key state slices:
- **Player State**: Current/previous channel, playback status
- **Playlist State**: Loaded playlists, current playlist
- **User Preferences**: Favorites, settings

### Service Layer

#### M3UParser
Parses M3U/M3U8 playlists:
- Supports EXTINF tags
- Extracts metadata (tvg-logo, group-title, tvg-id)
- Generates channel objects

#### PlaylistManager
Handles playlist persistence:
- JSON file storage in DocumentDirectory
- Load/save playlists and favorites
- Error handling and recovery

#### EPGService
Electronic Program Guide integration:
- XMLTV format parsing
- Program caching (1 hour TTL)
- Current/upcoming program queries

### Module System

#### Architecture

Modules are self-contained React Native components that can be dynamically loaded:

\`\`\`
ModuleManager
    ├── Load manifest.json
    ├── Validate permissions
    ├── Evaluate module code
    ├── Initialize module
    └── Inject context
\`\`\`

#### Module Lifecycle

1. **Install**: Copy module to app directory
2. **Load**: Parse manifest, evaluate code
3. **Initialize**: Call module.initialize()
4. **Render**: Module returns React component
5. **Cleanup**: Call module.cleanup() on unload

#### Module Context

Modules receive context with access to:
- Navigation (screen transitions)
- Store (app state)
- Services (M3U, EPG, Playlist)

#### Security

- Modules declare required permissions
- Sandboxed execution environment
- No access to native APIs without permission

## Adding Features

### Adding a New Screen

1. Create screen component in \`src/screens/\`
2. Add route to Stack.Navigator in \`App.tsx\`
3. Update navigation types if using TypeScript

### Adding a Service

1. Create service class in \`src/services/\`
2. Export as singleton or static methods
3. Add to ModuleContext for module access

### Extending the Store

1. Add state and actions to \`useStore.ts\`
2. Use TypeScript interfaces for type safety
3. Consider persistence needs

## Building for Production

### Android TV

\`\`\`bash
cd android
./gradlew assembleRelease
\`\`\`

Output: \`android/app/build/outputs/apk/release/app-release.apk\`

## Testing

### Manual Testing Checklist

- [ ] Load M3U playlist from URL
- [ ] Load M3U playlist from file
- [ ] Switch channels
- [ ] Use previous channel button
- [ ] Add/remove favorites
- [ ] Search channels
- [ ] Filter by group
- [ ] Volume controls
- [ ] Mute/unmute
- [ ] Remote control navigation
- [ ] Settings persistence

## Performance Optimization

### Video Playback
- Use react-native-video hardware acceleration
- Implement adaptive bitrate when available
- Cache thumbnails locally

### UI Rendering
- FlatList for channel lists (virtualization)
- Memoize components where appropriate
- Minimize re-renders with shallow comparison

### Memory Management
- Cleanup video resources on unmount
- Limit channel history size (MAX_HISTORY = 50)
- Clear EPG cache periodically

## Troubleshooting

### Video Not Playing
- Check URL format (must be direct stream)
- Verify codec support (H.264/AAC recommended)
- Test with VLC to confirm stream works

### Remote Control Not Working
- TVEventHandler only works on TV platforms
- Test on physical Android TV device
- Check AndroidManifest.xml for TV flags

### Module Not Loading
- Verify manifest.json structure
- Check entryPoint file exists
- Review module code for syntax errors
- Check console for error messages

## Future Enhancements

### AI Integration
- Voice control via speech recognition
- Content recommendations based on viewing history
- Smart EPG with personalized suggestions

### Multi-Device Sync
- Cloud playlist storage
- Watch history across devices
- Favorites synchronization

### Advanced Features
- Multiple audio tracks
- Subtitle support
- Parental controls with PIN
- Picture-in-Picture
- Screen mirroring

## Contributing

When adding features:
1. Maintain TypeScript types
2. Follow existing code style
3. Test on TV platform
4. Update README with new features
5. Consider module system for extensibility

# NextTV Viewer - Module Development

This document describes how to create custom modules for NextTV Viewer.

## Module Basics

Modules extend the functionality of NextTV Viewer without modifying the core app. They run in a sandboxed environment and can:

- Add new UI components
- Access navigation
- Read/write app state
- Use core services (M3U parser, EPG, playlists)

## Creating a Module

### 1. Create Module Structure

\`\`\`
my-module/
├── manifest.json
└── index.tsx
\`\`\`

### 2. Define manifest.json

\`\`\`json
{
  "id": "my-custom-module",
  "name": "My Custom Module",
  "version": "1.0.0",
  "description": "Adds awesome feature X",
  "author": "Your Name",
  "entryPoint": "index.tsx",
  "permissions": [
    "navigation",
    "storage",
    "network"
  ],
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.73.2"
  }
}
\`\`\`

### 3. Implement Module Class

\`\`\`typescript
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {TVModule, ModuleManifest, ModuleContext} from '@/modules/ModuleInterface';

export default class MyCustomModule extends TVModule {
  constructor(manifest: ModuleManifest, context: ModuleContext) {
    super(manifest, context);
  }

  async initialize(): Promise<void> {
    // Setup: load data, register listeners, etc.
    console.log('Module initializing...');
    
    // Access store
    const {store} = this.context;
    console.log('Current channel:', store.getState().currentChannel);
    
    // Access services
    const {services} = this.context;
    // services.m3u, services.epg, services.playlist
  }

  render(): React.ReactNode {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Custom Module</Text>
        <Text style={styles.text}>Module is active!</Text>
      </View>
    );
  }

  async cleanup(): Promise<void> {
    // Cleanup: remove listeners, save state, etc.
    console.log('Module cleaning up...');
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  text: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
});
\`\`\`

## Available Permissions

| Permission | Description |
|------------|-------------|
| \`navigation\` | Access to React Navigation |
| \`storage\` | Read/write to app storage |
| \`network\` | Make network requests |
| \`player\` | Control video player |
| \`state\` | Read/write app state |

## Module Context API

### Navigation

\`\`\`typescript
this.context.navigation.navigate('Player', {channel});
this.context.navigation.goBack();
\`\`\`

### Store

\`\`\`typescript
const state = this.context.store.getState();
this.context.store.setState({...});

// Subscribe to changes
const unsubscribe = this.context.store.subscribe((state) => {
  console.log('State changed:', state);
});
\`\`\`

### Services

\`\`\`typescript
// M3U Parser
const playlist = await this.context.services.m3u.parse(content);

// EPG Service
const programs = await this.context.services.epg.fetchEPG(url);

// Playlist Manager
await this.context.services.playlist.savePlaylists(playlists);
\`\`\`

## Installation

### Via File

1. Package module as ZIP: \`my-module.zip\`
2. Copy to device
3. Open NextTV Settings → Modules → Install from File
4. Select ZIP file

### Via URL

1. Host module ZIP online
2. Open NextTV Settings → Modules → Install from URL
3. Enter URL

## Example Modules

### Channel Statistics Module

Tracks viewing time per channel:

\`\`\`typescript
export default class ChannelStatsModule extends TVModule {
  private stats: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    const {store} = this.context;
    
    // Track channel changes
    store.subscribe((state) => {
      if (state.currentChannel) {
        const id = state.currentChannel.id;
        const current = this.stats.get(id) || 0;
        this.stats.set(id, current + 1);
      }
    });
  }

  render(): React.ReactNode {
    return (
      <View>
        <Text>Most Watched:</Text>
        {Array.from(this.stats.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id, count]) => (
            <Text key={id}>{id}: {count} views</Text>
          ))}
      </View>
    );
  }

  async cleanup(): Promise<void> {
    // Save stats to storage
  }
}
\`\`\`

### Channel Recommendations Module

Suggests channels based on viewing history:

\`\`\`typescript
export default class RecommendationsModule extends TVModule {
  render(): React.ReactNode {
    const {store} = this.context;
    const history = store.getState().channelHistory;
    
    // Analyze history and suggest channels
    const recommendations = this.analyzeHistory(history);
    
    return (
      <View>
        <Text>Recommended for You:</Text>
        {recommendations.map(channel => (
          <TouchableOpacity
            key={channel.id}
            onPress={() => this.playChannel(channel)}>
            <Text>{channel.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }
  
  private playChannel(channel: Channel): void {
    this.context.navigation.navigate('Player', {channel});
  }
}
\`\`\`

## Best Practices

1. **Cleanup Resources**: Always cleanup in \`cleanup()\`
2. **Error Handling**: Wrap async operations in try-catch
3. **Permissions**: Request minimum permissions needed
4. **Performance**: Avoid heavy computations in render
5. **State**: Use module-local state when possible
6. **Testing**: Test on actual TV hardware

## Distribution

Modules can be distributed via:
- Direct file sharing (ZIP)
- Web hosting (URL install)
- Future: Module marketplace

## Troubleshooting

### Module Won't Load

- Check manifest.json syntax
- Verify entryPoint filename matches
- Review console logs for errors

### Permission Denied

- Add required permission to manifest.json
- Check if permission exists in available list

### Rendering Issues

- Use TV-safe fonts and sizes
- Test on 10-foot display
- Ensure focus states are visible

## Future Features

- Hot reload during development
- Module debugging tools
- Visual module builder
- Module marketplace
- Version management
- Automatic updates

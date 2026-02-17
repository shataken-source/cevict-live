export interface VoiceCommand {
  phrase: string;
  action: string;
  parameters?: Record<string, any>;
}

export class VoiceControlService {
  private isListening: boolean = false;
  private commands: Map<string, (params?: any) => void> = new Map();

  // Register voice commands
  registerCommands(commandMap: Record<string, (params?: any) => void>) {
    Object.entries(commandMap).forEach(([command, action]) => {
      this.commands.set(command.toLowerCase(), action);
    });
  }

  // Start listening for voice commands
  async startListening(_onCommand: (command: string) => void) {
    this.isListening = true;
    console.log('🎤 Voice control activated - say a command!');

    // In production, use @react-native-voice/voice
    // Voice.start('en-US');
    // Voice.onSpeechResults = (e) => this.processCommand(e.value[0], onCommand);
  }

  stopListening() {
    this.isListening = false;
    console.log('🔇 Voice control deactivated');

    // Voice.stop();
  }

  // Process voice command
  processCommand(spokenText: string, onCommand: (command: string) => void) {
    const text = spokenText.toLowerCase().trim();
    console.log(`🎤 Heard: "${text}"`);

    // Simple command matching
    if (text.includes('previous channel') || text.includes('go back')) {
      onCommand('previous-channel');
    } else if (text.includes('next channel')) {
      onCommand('next-channel');
    } else if (text.includes('mute')) {
      onCommand('mute');
    } else if (text.includes('unmute')) {
      onCommand('unmute');
    } else if (text.includes('volume up') || text.includes('louder')) {
      onCommand('volume-up');
    } else if (text.includes('volume down') || text.includes('quieter')) {
      onCommand('volume-down');
    } else if (text.includes('show sports')) {
      onCommand('filter-sports');
    } else if (text.includes('show news')) {
      onCommand('filter-news');
    } else if (text.includes('show favorites') || text.includes('my favorites')) {
      onCommand('show-favorites');
    } else if (text.includes('search for')) {
      const query = text.replace('search for', '').trim();
      onCommand(`search:${query}`);
    } else if (text.match(/channel (\d+)/)) {
      const number = text.match(/channel (\d+)/)?.[1];
      onCommand(`goto-channel:${number}`);
    } else if (text.includes('what\'s playing')) {
      onCommand('show-info');
    } else if (text.includes('random channel')) {
      onCommand('random-channel');
    } else if (text.includes('pause') || text.includes('stop')) {
      onCommand('pause');
    } else if (text.includes('play') || text.includes('resume')) {
      onCommand('play');
    } else {
      console.log('❓ Command not recognized');
    }
  }

  // Get available commands
  getAvailableCommands(): string[] {
    return [
      'Previous channel',
      'Next channel',
      'Mute / Unmute',
      'Volume up / Volume down',
      'Show sports / Show news',
      'Show favorites',
      'Search for [name]',
      'Channel [number]',
      'What\'s playing',
      'Random channel',
      'Pause / Play',
    ];
  }
}

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {TVModule, ModuleManifest, ModuleContext} from '../ModuleInterface';

export default class ExampleModule extends TVModule {
  constructor(manifest: ModuleManifest, context: ModuleContext) {
    super(manifest, context);
  }

  async initialize(): Promise<void> {
    console.log('Example module initialized');
  }

  render(): React.ReactNode {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Example Module Active</Text>
        <Text style={styles.description}>
          This is a sample module demonstrating the extensible architecture.
        </Text>
      </View>
    );
  }

  async cleanup(): Promise<void> {
    console.log('Example module cleaned up');
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    margin: 10,
  },
  text: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#999',
  },
});

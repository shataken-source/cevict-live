import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import EPGScreen from './src/screens/EPGScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ChannelHistoryScreen } from './src/screens/ChannelHistoryScreen';

const Stack = createNativeStackNavigator();

// Wrap modal-style screens for navigation
function FavoritesWrapper({ navigation }: any) {
  return (
    <FavoritesScreen
      onChannelSelect={(channel) => navigation.navigate('Player', { channel })}
      onClose={() => navigation.goBack()}
    />
  );
}

function HistoryWrapper({ navigation }: any) {
  return (
    <ChannelHistoryScreen
      onChannelSelect={(channel) => navigation.navigate('Player', { channel })}
      onClose={() => navigation.goBack()}
    />
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 200,
        }}>
        <Stack.Screen name="Home" component={HomeScreen as any} />
        <Stack.Screen name="Player" component={PlayerScreen as any} />
        <Stack.Screen name="Settings" component={SettingsScreen as any} />
        <Stack.Screen name="EPG" component={EPGScreen as any} />
        <Stack.Screen name="Favorites" component={FavoritesWrapper as any} />
        <Stack.Screen name="History" component={HistoryWrapper as any} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

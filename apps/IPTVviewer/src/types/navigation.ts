import { Channel } from '@/types';

export type RootStackParamList = {
  Home: undefined;
  Player: {
    channel: Channel;
    fromChannel?: Channel;
  };
  Settings: undefined;
  EPG: undefined;
  Favorites: undefined;
  History: undefined;
  Pricing: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

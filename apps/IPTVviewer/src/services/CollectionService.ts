export interface ChannelCollection {
  id: string;
  name: string;
  icon: string;
  channels: string[];
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CollectionService {
  private collections: Map<string, ChannelCollection> = new Map();
  
  // Predefined smart collections
  static readonly SMART_COLLECTIONS = [
    {
      id: 'morning',
      name: 'Morning Routine',
      icon: '☀️',
      color: '#FFD700',
      auto: true,
      filter: (channel: any) => ['news', 'weather', 'business'].some(tag => 
        channel.group?.toLowerCase().includes(tag)
      ),
    },
    {
      id: 'weekend',
      name: 'Weekend Sports',
      icon: '🏈',
      color: '#FF6347',
      auto: true,
      filter: (channel: any) => channel.group?.toLowerCase().includes('sport'),
    },
    {
      id: 'kids',
      name: 'Kids Safe',
      icon: '👶',
      color: '#87CEEB',
      auto: true,
      filter: (channel: any) => channel.group?.toLowerCase().includes('kids'),
    },
    {
      id: 'latenight',
      name: 'Late Night',
      icon: '🌙',
      color: '#9370DB',
      auto: true,
      filter: (channel: any) => ['comedy', 'entertainment'].some(tag => 
        channel.group?.toLowerCase().includes(tag)
      ),
    },
  ];
  
  createCollection(name: string, icon: string, color: string): ChannelCollection {
    const collection: ChannelCollection = {
      id: `collection-${Date.now()}`,
      name,
      icon,
      color,
      channels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.collections.set(collection.id, collection);
    return collection;
  }
  
  addChannelToCollection(collectionId: string, channelId: string) {
    const collection = this.collections.get(collectionId);
    if (collection && !collection.channels.includes(channelId)) {
      collection.channels.push(channelId);
      collection.updatedAt = new Date();
    }
  }
  
  removeChannelFromCollection(collectionId: string, channelId: string) {
    const collection = this.collections.get(collectionId);
    if (collection) {
      collection.channels = collection.channels.filter(id => id !== channelId);
      collection.updatedAt = new Date();
    }
  }
  
  deleteCollection(collectionId: string) {
    this.collections.delete(collectionId);
  }
  
  getAllCollections(): ChannelCollection[] {
    return Array.from(this.collections.values());
  }
  
  getCollection(collectionId: string): ChannelCollection | undefined {
    return this.collections.get(collectionId);
  }
}

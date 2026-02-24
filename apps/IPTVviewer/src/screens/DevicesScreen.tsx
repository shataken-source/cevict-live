import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { MultiDeviceService, Device, DeviceSession } from '@/services/MultiDeviceService';

interface DevicesScreenProps {
  navigation: any;
}

const DEVICE_ICONS: Record<Device['type'], string> = {
  tv: 'TV',
  phone: 'Phone',
  tablet: 'Tablet',
  firestick: 'Fire TV',
  web: 'Web',
};

export default function DevicesScreen({ navigation }: DevicesScreenProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [connectionUsage, setConnectionUsage] = useState({
    active: 0,
    max: 5,
    available: 5,
    percentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState<Device['type']>('tv');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await MultiDeviceService.cleanupStaleSessions();
      const [deviceList, sessionList, usage] = await Promise.all([
        MultiDeviceService.getDevices(),
        MultiDeviceService.getActiveSessions(),
        MultiDeviceService.getConnectionUsage(),
      ]);
      setDevices(deviceList);
      setSessions(sessionList);
      setConnectionUsage(usage);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDevice = useCallback(async () => {
    if (!newDeviceName.trim()) {
      Alert.alert('Error', 'Please enter a device name.');
      return;
    }
    await MultiDeviceService.registerDevice(newDeviceName.trim(), newDeviceType);
    setNewDeviceName('');
    setShowAddDevice(false);
    await loadData();
  }, [newDeviceName, newDeviceType]);

  const handleRemoveDevice = useCallback((device: Device) => {
    Alert.alert(
      'Remove Device',
      `Remove "${device.name}"? Any active session will be disconnected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await MultiDeviceService.removeDevice(device.id);
            await loadData();
          },
        },
      ]
    );
  }, []);

  const handleEndSession = useCallback(async (session: DeviceSession) => {
    await MultiDeviceService.endSession(session.sessionId);
    await loadData();
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Devices',
      'Remove all registered devices and sessions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await MultiDeviceService.clearAllDevices();
            await loadData();
          },
        },
      ]
    );
  }, []);

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getSessionForDevice = (deviceId: string) => {
    return sessions.find(s => s.deviceId === deviceId);
  };

  const renderDevice = ({ item }: { item: Device }) => {
    const session = getSessionForDevice(item.id);
    const isActive = item.isActive && session;

    return (
      <View style={[styles.deviceItem, isActive && styles.deviceItemActive]}>
        <View style={styles.deviceIcon}>
          <Text style={styles.deviceIconText}>{DEVICE_ICONS[item.type]}</Text>
        </View>
        <View style={styles.deviceInfo}>
          <View style={styles.deviceHeader}>
            <Text style={styles.deviceName} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.statusDot, isActive ? styles.statusOnline : styles.statusOffline]} />
          </View>
          <Text style={styles.deviceType}>{DEVICE_ICONS[item.type]}</Text>
          <Text style={styles.deviceLastActive}>
            {isActive ? 'Connected now' : `Last active ${formatLastActive(item.lastActive)}`}
          </Text>
          {session?.channelId && (
            <Text style={styles.deviceChannel}>Watching: {session.channelId}</Text>
          )}
        </View>
        <View style={styles.deviceActions}>
          {isActive && session && (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => handleEndSession(session)}>
              <Text style={styles.disconnectText}>End</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveDevice(item)}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Devices</Text>
          <Text style={styles.headerSubtitle}>
            {devices.length} registered, {connectionUsage.active} active
          </Text>
        </View>
        {devices.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Connection Usage */}
      <View style={styles.usageSection}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageLabel}>Connections</Text>
          <Text style={styles.usageValue}>
            {connectionUsage.active} / {connectionUsage.max}
          </Text>
        </View>
        <View style={styles.usageBar}>
          <View
            style={[
              styles.usageFill,
              { width: `${Math.min(connectionUsage.percentage, 100)}%` },
              connectionUsage.percentage > 80 && styles.usageFillWarning,
              connectionUsage.percentage >= 100 && styles.usageFillFull,
            ]}
          />
        </View>
        <Text style={styles.usageAvailable}>
          {connectionUsage.available > 0
            ? `${connectionUsage.available} connection${connectionUsage.available !== 1 ? 's' : ''} available`
            : 'All connections in use'}
        </Text>
      </View>

      {/* Add Device */}
      {showAddDevice ? (
        <View style={styles.addDeviceForm}>
          <TextInput
            style={styles.input}
            placeholder="Device name"
            placeholderTextColor="#666"
            value={newDeviceName}
            onChangeText={setNewDeviceName}
            autoFocus
          />
          <View style={styles.typeRow}>
            {(['tv', 'phone', 'tablet', 'firestick', 'web'] as Device['type'][]).map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, newDeviceType === type && styles.typeChipActive]}
                onPress={() => setNewDeviceType(type)}>
                <Text style={[styles.typeChipText, newDeviceType === type && styles.typeChipTextActive]}>
                  {DEVICE_ICONS[type]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddDevice(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
              <Text style={styles.addButtonText}>Add Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addDeviceTrigger}
          onPress={() => setShowAddDevice(true)}>
          <Text style={styles.addDeviceTriggerText}>+ Add Device</Text>
        </TouchableOpacity>
      )}

      {/* Device List */}
      {devices.length > 0 ? (
        <FlatList
          data={devices}
          renderItem={renderDevice}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No Devices</Text>
          <Text style={styles.emptySubtitle}>
            Register devices to manage your household connections.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 16,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  clearButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  clearText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  usageSection: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  usageLabel: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  usageValue: {
    color: '#aaa',
    fontSize: 13,
  },
  usageBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    backgroundColor: '#a78bfa',
    borderRadius: 3,
  },
  usageFillWarning: {
    backgroundColor: '#fbbf24',
  },
  usageFillFull: {
    backgroundColor: '#FF3B30',
  },
  usageAvailable: {
    color: '#666',
    fontSize: 12,
    marginTop: 6,
  },
  addDeviceTrigger: {
    margin: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    borderRadius: 12,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addDeviceTriggerText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '600',
  },
  addDeviceForm: {
    margin: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  typeChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  typeChipActive: {
    backgroundColor: '#a78bfa',
  },
  typeChipText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelText: {
    color: '#888',
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#a78bfa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  deviceItemActive: {
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    backgroundColor: 'rgba(167, 139, 250, 0.06)',
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  deviceIconText: {
    color: '#aaa',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusOnline: {
    backgroundColor: '#34C759',
  },
  statusOffline: {
    backgroundColor: '#555',
  },
  deviceType: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  deviceLastActive: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  deviceChannel: {
    color: '#a78bfa',
    fontSize: 12,
    marginTop: 2,
  },
  deviceActions: {
    marginLeft: 12,
    gap: 8,
    alignItems: 'center',
  },
  disconnectButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disconnectText: {
    color: '#FF3B30',
    fontSize: 13,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  removeText: {
    color: '#888',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
});

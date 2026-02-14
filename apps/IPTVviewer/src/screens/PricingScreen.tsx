import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

interface Tier {
  id: string;
  name: string;
  price: number;
  period: string;
  type: 'subscription' | 'onetime';
  features: string[];
  maxDevices: number;
  isHighlighted?: boolean;
  badge?: string;
  badgeColor?: string;
}

interface PricingScreenProps {
  onSelectTier: (tierId: string) => void;
  onClose: () => void;
}

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    period: '1 Month',
    type: 'subscription',
    features: ['Basic EPG', '3 Channels', '720p Quality'],
    maxDevices: 1,
    badge: 'START FREE',
    badgeColor: '#007AFF',
  },
  {
    id: 'lifetime',
    name: 'Lifetime License',
    price: 79.99,
    period: 'Pay Once, Own Forever',
    type: 'onetime',
    features: [
      'All Channels',
      '4K Quality',
      '10hrs Cloud Recording',
      'No Ads',
      'Priority Support',
      'Forever Updates'
    ],
    maxDevices: 5,
    isHighlighted: true,
    badge: 'BEST VALUE',
    badgeColor: '#FFD700',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 14.99,
    period: 'Monthly',
    type: 'subscription',
    features: ['All Channels', '4K Quality', 'Cloud Recording', 'No Ads', 'Multi-Device'],
    maxDevices: 3,
  },
  {
    id: 'provider',
    name: 'Provider Partner',
    price: 7.99,
    period: 'Requires Provider Code',
    type: 'subscription',
    features: ['All Channels', 'HD Quality', 'Basic Recording', 'Provider Support'],
    maxDevices: 1,
    badge: 'WITH PROVIDER',
    badgeColor: '#34C759',
  },
];

export function PricingScreen({ onSelectTier, onClose }: PricingScreenProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          One device per license • No account sharing
        </Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.pricingGrid}>
        {TIERS.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles.card,
              tier.isHighlighted && styles.cardHighlighted,
              selectedTier === tier.id && styles.cardSelected,
            ]}
            onPress={() => {
              setSelectedTier(tier.id);
              onSelectTier(tier.id);
            }}
          >
            {tier.badge && (
              <View style={[styles.badge, { backgroundColor: tier.badgeColor }]}>
                <Text style={styles.badgeText}>{tier.badge}</Text>
              </View>
            )}

            <Text style={styles.tierName}>{tier.name}</Text>
            <Text style={styles.period}>{tier.period}</Text>

            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                ${tier.price.toFixed(tier.price % 1 === 0 ? 0 : 2)}
              </Text>
              {tier.type === 'onetime' && (
                <Text style={styles.oneTime}>ONE-TIME</Text>
              )}
            </View>

            <View style={styles.features}>
              {tier.features.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.deviceLimit}>
              Up to {tier.maxDevices} Device{tier.maxDevices > 1 ? 's' : ''}
            </Text>

            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: tier.badgeColor || '#007AFF' }]}
              onPress={() => {
                setSelectedTier(tier.id);
                onSelectTier(tier.id);
              }}
            >
              <Text style={styles.selectButtonText}>
                {tier.id === 'free' && 'Start Free Trial'}
                {tier.id === 'lifetime' && 'Buy Lifetime License'}
                {tier.id === 'premium' && 'Subscribe Monthly'}
                {tier.id === 'provider' && 'Enter Provider Code'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Device limits enforced • Cancel anytime (monthly plans)
        </Text>
        <Text style={styles.footerSubtext}>
          Lifetime license includes 5 device transfers free
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
  },
  scrollContent: {
    flex: 1,
  },
  pricingGrid: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  cardHighlighted: {
    borderColor: '#FFD700',
    backgroundColor: '#1a1500',
  },
  cardSelected: {
    borderWidth: 3,
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tierName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  period: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  price: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  oneTime: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  features: {
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkIcon: {
    color: '#007AFF',
    fontSize: 16,
    marginRight: 10,
    width: 20,
  },
  featureText: {
    color: '#ccc',
    fontSize: 14,
  },
  deviceLimit: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  selectButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
  footerSubtext: {
    color: '#444',
    fontSize: 11,
    marginTop: 4,
  },
});

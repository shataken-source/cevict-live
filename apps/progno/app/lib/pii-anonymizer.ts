/**
 * PII Anonymizer
 * Protects Personally Identifiable Information in betting data
 */

import { createHash } from 'crypto';

/**
 * Generate anonymized user ID
 */
export function anonymizeUserId(userId: string): string {
  const hash = createHash('sha256');
  hash.update(userId);
  return `user_${hash.digest('hex').substring(0, 16)}`;
}

/**
 * Generate anonymized bet ID
 */
export function anonymizeBetId(betId: string, userId: string): string {
  const hash = createHash('sha256');
  hash.update(`${betId}-${userId}`);
  return `bet_${hash.digest('hex').substring(0, 16)}`;
}

/**
 * Generate anonymized event ID
 */
export function anonymizeEventId(gameId: string): string {
  const hash = createHash('sha256');
  hash.update(gameId);
  return `event_${hash.digest('hex').substring(0, 16)}`;
}

/**
 * Anonymize betting record
 */
export interface BettingRecord {
  userId: string;
  betId: string;
  gameId: string;
  amount: number;
  odds: number;
  team?: string;
  sportsbook?: string;
  timestamp: Date;
}

export interface AnonymizedBettingRecord {
  anonymizedUserId: string;
  anonymizedBetId: string;
  anonymizedEventId: string;
  amount: number;
  odds: number;
  team?: string; // Keep team name (not PII)
  sportsbook?: string; // Keep sportsbook (not PII)
  timestamp: Date;
  // Removed: userId, betId, gameId (replaced with anonymized versions)
}

export function anonymizeBettingRecord(record: BettingRecord): AnonymizedBettingRecord {
  return {
    anonymizedUserId: anonymizeUserId(record.userId),
    anonymizedBetId: anonymizeBetId(record.betId, record.userId),
    anonymizedEventId: anonymizeEventId(record.gameId),
    amount: record.amount,
    odds: record.odds,
    team: record.team,
    sportsbook: record.sportsbook,
    timestamp: record.timestamp,
  };
}

/**
 * Anonymize performance tracking data
 */
export interface PerformanceData {
  userId: string;
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalReturns: number;
}

export interface AnonymizedPerformanceData {
  anonymizedUserId: string;
  totalBets: number;
  wins: number;
  losses: number;
  totalWagered: number;
  totalReturns: number;
  winRate: number;
  roi: number;
  // Removed: userId (replaced with anonymizedUserId)
}

export function anonymizePerformanceData(data: PerformanceData): AnonymizedPerformanceData {
  return {
    anonymizedUserId: anonymizeUserId(data.userId),
    totalBets: data.totalBets,
    wins: data.wins,
    losses: data.losses,
    totalWagered: data.totalWagered,
    totalReturns: data.totalReturns,
    winRate: data.totalBets > 0 ? data.wins / data.totalBets : 0,
    roi: data.totalWagered > 0 ? (data.totalReturns - data.totalWagered) / data.totalWagered : 0,
  };
}


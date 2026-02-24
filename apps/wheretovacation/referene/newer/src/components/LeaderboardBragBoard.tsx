'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Star, Crown, Target, Fish, Anchor, Calendar, MapPin, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import GamifiedLeaderboards, { LeaderboardEntry, Tournament } from '@/lib/gamifiedLeaderboards';

interface LeaderboardBragBoardProps {
  showUserRank?: boolean;
  maxEntries?: number;
  geographicScope?: 'global' | 'regional' | 'local';
}

export default function LeaderboardBragBoard({ 
  showUserRank = true, 
  maxEntries = 20,
  geographicScope = 'global'
}: LeaderboardBragBoardProps) {
  const [leaderboards, setLeaderboards] = new useState<Map<string, LeaderboardEntry[]>>(new Map());
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTab, setActiveTab] = useState('biggest-catch');
  const [userRankings, setUserRankings] = useState<Map<string, LeaderboardEntry>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboards();
  }, [geographicScope]);

  const loadLeaderboards = async () => {
    setIsLoading(true);
    try {
      const boards = new GamifiedLeaderboards();
      const activeTournaments = boards.getActiveTournaments();
      
      setTournaments(activeTournaments);

      // Load data for each tournament
      const leaderboardData = new Map<string, LeaderboardEntry[]>();
      
      for (const tournament of activeTournaments) {
        const entries = await boards.getLeaderboard(tournament.id, maxEntries);
        leaderboardData.set(tournament.id, entries);
      }

      setLeaderboards(leaderboardData);

      // Load user rankings if needed
      if (showUserRank) {
        // This would get current user ID from auth context
        const userId = 'current-user-id'; // Placeholder
        const rankings = await boards.getUserRankings(userId);
        setUserRankings(rankings);
      }

    } catch (error) {
      console.error('Error loading leaderboards:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTrustLevelIcon = (level: string) => {
    switch (level) {
      case 'elite':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'veteran':
        return <Star className="w-4 h-4 text-yellow-600" />;
      case 'verified':
        return <Award className="w-4 h-4 text-blue-600" />;
      default:
        return <Anchor className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="text-lg font-bold text-gray-600 w-6 text-center">{rank}</span>;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const renderLeaderboardEntry = (entry: LeaderboardEntry, tournamentType: string) => {
    const isCurrentUser = entry.userId === 'current-user-id'; // Placeholder
    const userRank = userRankings.get(tournamentType);

    return (
      <div 
        key={entry.id}
        className={`flex items-center p-4 rounded-lg border transition-all ${
          isCurrentUser 
            ? 'bg-blue-50 border-blue-300 shadow-md' 
            : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Rank */}
        <div className="flex items-center justify-center w-12">
          {getRankIcon(entry.rank)}
        </div>

        {/* User Info */}
        <div className="flex items-center flex-1 ml-4">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.userAvatar} alt={entry.userName} />
              <AvatarFallback>{entry.userName.charAt(0)}</AvatarFallback>
            </Avatar>
            {/* Trust Level Badge */}
            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
              {getTrustLevelIcon(entry.trustLevel)}
            </div>
          </div>
          
          <div className="ml-3 flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900">
                {entry.userName}
              </span>
              {isCurrentUser && (
                <Badge variant="secondary" className="text-xs">You</Badge>
              )}
            </div>
            
            {/* Badges */}
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.badges.map((badge, index) => (
                <Badge key={index} variant="outline" className="text-xs px-1.5 py-0.5">
                  {badge}
                </Badge>
              ))}
            </div>

            {/* Metadata */}
            <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
              {entry.metadata.species && (
                <span className="flex items-center">
                  <Fish className="w-3 h-3 mr-1" />
                  {entry.metadata.species}
                </span>
              )}
              {entry.metadata.weight && (
                <span className="flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  {entry.metadata.weight}lb
                </span>
              )}
              {entry.metadata.location && (
                <span className="flex items-center">
                  <MapPin className="w-3 h-3 mr-1" />
                  {entry.metadata.location}
                </span>
              )}
              {entry.metadata.date && (
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(entry.metadata.date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Score and Trend */}
        <div className="flex flex-col items-end mr-4">
          <div className="text-2xl font-bold text-gray-900">
            {entry.score.toLocaleString()}
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            {getTrendIcon(entry.trend)}
            <span>#{entry.rank}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-2">
          {entry.metadata.photo && (
            <Button variant="outline" size="sm" className="h-8">
              <Camera className="w-3 h-3 mr-1" />
              Photo
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8">
            View Profile
          </Button>
        </div>
      </div>
    );
  };

  const renderTournamentHeader = (tournament: Tournament) => {
    const daysLeft = Math.ceil((tournament.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isEndingSoon = daysLeft <= 7;

    return (
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{tournament.name}</h3>
          <p className="text-sm text-gray-600">{tournament.description}</p>
          <div className="flex items-center space-x-4 mt-2">
            <span className="text-sm text-gray-500">
              <Calendar className="w-4 h-4 inline mr-1" />
              {daysLeft} days left
            </span>
            <span className="text-sm text-gray-500">
              <Target className="w-4 h-4 inline mr-1" />
              {tournament.participants} participants
            </span>
            {tournament.prizePool && (
              <span className="text-sm font-semibold text-green-600">
                ${tournament.prizePool.toLocaleString()} prize pool
              </span>
            )}
          </div>
        </div>
        
        {isEndingSoon && (
          <Badge variant="destructive" className="animate-pulse">
            Ending Soon!
          </Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* User's Current Rankings */}
      {showUserRank && userRankings.size > 0 && (
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center">
            <Trophy className="w-5 h-5 mr-2" />
            Your Rankings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from(userRankings.entries()).map(([tournamentId, entry]) => (
              <div key={tournamentId} className="bg-white p-3 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    {tournaments.find(t => t.id === tournamentId)?.name || 'Tournament'}
                  </span>
                  <Badge variant="secondary">#{entry.rank}</Badge>
                </div>
                <div className="text-lg font-bold text-blue-600 mt-1">
                  {entry.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Leaderboard */}
      <Card className="overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {tournaments.slice(0, 3).map((tournament) => (
              <TabsTrigger key={tournament.id} value={tournament.id} className="text-sm">
                {tournament.config.type === 'biggest_catch' && 'Biggest Catch'}
                {tournament.config.type === 'most_species' && 'Species Hunter'}
                {tournament.config.type === 'daily_points' && 'Daily Points'}
              </TabsTrigger>
            ))}
          </TabsList>

          {tournaments.map((tournament) => (
            <TabsContent key={tournament.id} value={tournament.id} className="mt-0">
              {renderTournamentHeader(tournament)}
              
              <div className="p-4">
                <div className="space-y-3">
                  {leaderboards.get(tournament.id)?.map((entry) => 
                    renderLeaderboardEntry(entry, tournament.id)
                  )}
                </div>

                {leaderboards.get(tournament.id)?.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Fish className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No entries yet. Be the first to compete!</p>
                  </div>
                )}

                {/* Load More */}
                {leaderboards.get(tournament.id)?.length >= maxEntries && (
                  <div className="text-center mt-6">
                    <Button variant="outline">
                      Load More Entries
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Tournament Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Crown className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold">Elite Anglers</h4>
          </div>
          <p className="text-sm text-gray-600">
            Trust level distinctions give veteran anglers special recognition and their reports carry more weight in the community.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="w-5 h-5 text-yellow-600" />
            <h4 className="font-semibold">Prize Distribution</h4>
          </div>
          <p className="text-sm text-gray-600">
            Win cash prizes, gear packages, and exclusive badges. Top performers get featured on our social media channels.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <h4 className="font-semibold">Fair Competition</h4>
          </div>
          <p className="text-sm text-gray-600">
            All catches are verified by captains and require photo documentation. Anti-cheat measures ensure fair play.
          </p>
        </Card>
      </div>
    </div>
  );
}

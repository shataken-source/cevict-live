import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { Shield, Users, Database, Phone, Download, Upload, Mail, BarChart, GitMerge, Clock, Trophy, KeyRound, FileCheck, Send, List, MessageSquare, UserCog, LineChart, ShoppingBag, TrendingUp, Settings, DollarSign, Activity, Link, TestTube } from 'lucide-react';












import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import FeatureFlagManager from './FeatureFlagManager';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DeduplicationTool from './DeduplicationTool';
import EmailNotificationManager from './EmailNotificationManager';
import { ReminderSchedulerPanel } from './ReminderSchedulerPanel';
import PhotoContestVoteAnalytics from './PhotoContestVoteAnalytics';
import ConfigurationManager from './ConfigurationManager';
import AffiliateCredentialsManager from './admin/AffiliateCredentialsManager';
import AffiliateLinkTester from './admin/AffiliateLinkTester';










export default function AdminPanel() {
  const { user } = useUser();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<Array<{ email: string; level: number }>>([]);

  const [newEmail, setNewEmail] = useState('');
  const [newLevel, setNewLevel] = useState(10);
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  
  // Backup states
  const [backupPhone, setBackupPhone] = useState('');
  const [backupSchedule, setBackupSchedule] = useState('manual');
  const [backupLoading, setBackupLoading] = useState(false);
  const [backups, setBackups] = useState<any[]>([]);


  
  // Weekly report states
  const [reportLoading, setReportLoading] = useState(false);
  const [lastReportDate, setLastReportDate] = useState<string | null>(null);



  useEffect(() => {
    if (user?.level === 1) {
      loadUsers();
      loadBackups();
    }
  }, [user]);


  const loadUsers = async () => {
    try {
      const { data } = await supabase.functions.invoke('user-level-manager', {
        body: { action: 'list', requestorEmail: user?.email }
      });
      if (data?.users) setUsers(data.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const updateLevel = async (email: string, level: number) => {
    setLoading(true);
    try {
      await supabase.functions.invoke('user-level-manager', {
        body: { action: 'set', email, level, requestorEmail: user?.email }
      });
      await loadUsers();
    } catch (error) {
      console.error('Failed to update level:', error);
    }
    setLoading(false);
  };

  const loadBackups = async () => {
    try {
      const { data } = await supabase.functions.invoke('database-backup', {
        body: { action: 'list' }
      });
      if (data?.backups) setBackups(data.backups);
    } catch (error) {
      console.error('Failed to load backups:', error);
    }
  };

  const triggerBackup = async () => {
    if (!backupPhone) {
      toast({ title: 'Phone number required', description: 'Please enter a phone number for notifications', variant: 'destructive' });
      return;
    }
    
    setBackupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('database-backup', {
        body: { action: 'backup', phone: backupPhone, schedule: backupSchedule }
      });
      
      if (error) throw error;
      
      toast({ title: 'Backup completed', description: `${data.recordCount} records backed up successfully` });
      loadBackups();
    } catch (error) {
      console.error('Backup failed:', error);
      toast({ title: 'Backup failed', description: 'Failed to complete backup', variant: 'destructive' });
    }
    setBackupLoading(false);
  };

  const downloadBackup = async (fileName: string) => {
    try {
      const { data } = await supabase.storage.from('database-backups').download(fileName);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Download started', description: 'Backup file is downloading' });
      }
    } catch (error) {
      toast({ title: 'Download failed', description: 'Failed to download backup', variant: 'destructive' });
    }
  };

  const restoreBackup = async (fileName: string) => {
    if (!confirm('Are you sure you want to restore this backup? This will overwrite current data.')) return;
    
    setRestoreLoading(true);
    try {
      const { data: fileData } = await supabase.storage.from('database-backups').download(fileName);
      if (fileData) {
        const text = await fileData.text();
        const backupData = JSON.parse(text);
        
        const { data, error } = await supabase.functions.invoke('database-backup', {
          body: { action: 'restore', backupData }
        });
        
        if (error) throw error;
        
        toast({ title: 'Restore completed', description: `${data.restoredCount} records restored` });
      }
    } catch (error) {
      toast({ title: 'Restore failed', description: 'Failed to restore backup', variant: 'destructive' });
    }
    setRestoreLoading(false);
  };

  const triggerWeeklyReport = async () => {
    setReportLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-admin-report');
      
      if (error) throw error;
      
      setLastReportDate(new Date().toISOString());
      toast({ 
        title: 'Weekly report sent', 
        description: `Report with ${data.metrics.totalBookings} bookings sent to jason@gulfcoastcharters.com` 
      });
    } catch (error) {
      console.error('Report failed:', error);
      toast({ title: 'Report failed', description: 'Failed to generate and send report', variant: 'destructive' });
    }
    setReportLoading(false);
  };




  if (user?.level !== 1) return null;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Admin Panel - User Level Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Current Users
          </h3>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.email} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{u.email}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Level: {u.level}</span>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={u.level}
                    onChange={(e) => updateLevel(u.email, parseInt(e.target.value))}
                    className="w-20"
                    disabled={loading}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold">Add/Update User Level</h3>
          <div className="grid gap-4">
            <div>
              <Label>Email</Label>
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>Level (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={newLevel}
                onChange={(e) => setNewLevel(parseInt(e.target.value))}
              />
            </div>
            <Button onClick={() => updateLevel(newEmail, newLevel)} disabled={loading}>
              Set Level
            </Button>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration Variables Manager
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900">Manage API Keys & Environment Variables</p>
                <p className="text-sm text-purple-700 mt-1">
                  Add, edit, and delete configuration variables like Firebase Server Key, APNS Key ID, and other API credentials. All variables are stored securely and can be marked as secret to hide values.
                </p>
                <p className="text-xs text-purple-600 mt-2">
                  Features: Add/edit/delete configs, mark as secret, secure storage, easy management
                </p>
              </div>
            </div>
          </div>
          <ConfigurationManager />
        </div>



        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            OAuth Configuration
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Configure Authentication Providers</p>
                <p className="text-sm text-green-700 mt-1">
                  Set up Google and GitHub OAuth authentication with step-by-step guidance and validation tests
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/oauth-setup')} 
            className="w-full"
            variant="default"
          >
            Open OAuth Setup Wizard
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database Backup
          </h3>
          <div className="grid gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                SMS Notification Number
              </Label>
              <Input
                type="tel"
                value={backupPhone}
                onChange={(e) => setBackupPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <div>
              <Label>Backup Schedule</Label>
              <Select value={backupSchedule} onValueChange={setBackupSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Only</SelectItem>
                  <SelectItem value="daily">Daily at 2 AM</SelectItem>
                  <SelectItem value="weekly">Weekly (Sunday 2 AM)</SelectItem>
                  <SelectItem value="monthly">Monthly (1st at 2 AM)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={triggerBackup} disabled={backupLoading}>
              {backupLoading ? 'Processing...' : 'Trigger Backup Now'}
            </Button>

            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Available Backups</h4>
              <div className="space-y-2">
                {backups.length === 0 ? (
                  <p className="text-sm text-gray-500">No backups available</p>
                ) : (
                  backups.map((backup) => (
                    <div key={backup.name} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium text-sm">{backup.name}</p>
                        <p className="text-xs text-gray-500">{new Date(backup.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => downloadBackup(backup.name)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => restoreBackup(backup.name)} disabled={restoreLoading}>
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart className="w-4 h-4" />
            Weekly Analytics Report
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Automated Weekly Reports</p>
                <p className="text-sm text-blue-700 mt-1">
                  Every Monday at 9:00 AM, a comprehensive analytics report is automatically sent to jason@gulfcoastcharters.com
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  Report includes: booking summaries, revenue data, top destinations, captain performance, and user activity metrics
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            {lastReportDate && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                Last report sent: {new Date(lastReportDate).toLocaleString()}
              </div>
            )}
            <Button onClick={triggerWeeklyReport} disabled={reportLoading} className="w-full">
              {reportLoading ? 'Generating Report...' : 'Send Weekly Report Now'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Click to manually trigger the weekly report email
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <GitMerge className="w-4 h-4" />
            Duplicate Listings Management
          </h3>
          <DeduplicationTool />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Notification System
          </h3>
          <EmailNotificationManager />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Photo Contest Analytics
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-700">
              View voting statistics and performance metrics for all photo contests across events
            </p>
          </div>
          <div className="space-y-4">
            <Input 
              type="text" 
              placeholder="Enter Event ID to view contest analytics" 
              id="contestEventId"
            />
            <Button 
              onClick={() => {
                const eventId = (document.getElementById('contestEventId') as HTMLInputElement)?.value;
                if (eventId) {
                  const analyticsDiv = document.getElementById('contest-analytics-display');
                  if (analyticsDiv) analyticsDiv.style.display = 'block';
                }
              }}
            >
              Load Contest Analytics
            </Button>
            <div id="contest-analytics-display" style={{ display: 'none' }}>
              <PhotoContestVoteAnalytics eventId={(document.getElementById('contestEventId') as HTMLInputElement)?.value || 'default'} />
            </div>
          </div>
        </div>


        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Captain Document & Profile Reminders
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Automated Captain Reminders</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Automatically send email reminders to captains when documents (licenses, insurance, certifications) are expiring in 30, 14, or 7 days. Also reminds captains to update their profile every 90 days.
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Features: Document expiration tracking, profile update reminders, automated daily checks, manual trigger option
                </p>
              </div>
            </div>
          </div>
          <ReminderSchedulerPanel />
        </div>


        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Send className="w-4 h-4" />
            Email Campaign Manager
          </h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Send className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium text-indigo-900">Automated Captain Marketing Campaigns</p>
                <p className="text-sm text-indigo-700 mt-1">
                  Send targeted email campaigns to captain leads with A/B testing, open/click tracking, and automated follow-up sequences
                </p>
                <p className="text-xs text-indigo-600 mt-2">
                  Features: Lead management, campaign analytics, behavioral triggers, conversion tracking
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/email-campaigns')} 
            className="w-full"
            variant="default"
          >
            Open Campaign Manager
          </Button>

        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <List className="w-4 h-4" />
            Mailing List Manager
          </h3>
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <List className="w-5 h-5 text-teal-600 mt-0.5" />
              <div>
                <p className="font-medium text-teal-900">Subscriber Management</p>
                <p className="text-sm text-teal-700 mt-1">
                  Manage newsletter subscribers who signed up via email or phone. Moderate, export, and communicate with your mailing list.
                </p>
                <p className="text-xs text-teal-600 mt-2">
                  Features: Subscriber moderation, CSV export, status management, contact preferences
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/mailing-list')} 
            className="w-full"
            variant="default"
          >
            Manage Mailing List
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS Campaign Manager
          </h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900">Bulk SMS Campaigns</p>
                <p className="text-sm text-orange-700 mt-1">
                  Send targeted SMS campaigns to mailing list subscribers who opted in for text messages. Track delivery, clicks, and opt-outs.
                </p>
                <p className="text-xs text-orange-600 mt-2">
                  Features: Message templates, scheduling, link shortening, delivery analytics, opt-out tracking
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/sms-campaigns')} 
            className="w-full"
            variant="default"
          >
            Manage SMS Campaigns
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            User Management System
          </h3>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <UserCog className="w-5 h-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="font-medium text-cyan-900">Complete User Administration</p>
                <p className="text-sm text-cyan-700 mt-1">
                  View all registered users, reset passwords, enable/disable accounts, manage roles and permissions, and view login history.
                </p>
                <p className="text-xs text-cyan-600 mt-2">
                  Features: User search, bulk actions, role assignment, permission management, account status control
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/user-management')} 
            className="w-full"
            variant="default"
          >
            Open User Management Panel
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <LineChart className="w-4 h-4" />
            User Activity Analytics Dashboard
          </h3>
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <LineChart className="w-5 h-5 text-violet-600 mt-0.5" />
              <div>
                <p className="font-medium text-violet-900">Comprehensive Analytics & Reporting</p>
                <p className="text-sm text-violet-700 mt-1">
                  View detailed metrics on daily/weekly/monthly active users, registration trends, user retention rates, session duration, and feature usage statistics.
                </p>
                <p className="text-xs text-violet-600 mt-2">
                  Features: Interactive charts, date range filters, top users by activity, export to CSV/PDF, retention cohort analysis
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/analytics')} 
            className="w-full"
            variant="default"
          >
            Open Analytics Dashboard
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Marine Products Management
          </h3>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <ShoppingBag className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900">Manage Marine Gear Shop Products</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Add, edit, and manage marine products with affiliate links to Amazon, BoatUS, and Walmart. Configure pricing, categories, and inventory.
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Features: Product CRUD operations, affiliate link management, category assignment, pricing controls, stock management
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/marine-products')} 
            className="w-full"
            variant="default"
          >
            Manage Marine Products
          </Button>

        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Link className="w-4 h-4" />
            Affiliate Credentials Manager
          </h3>
          <div className="bg-lime-50 border border-lime-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Link className="w-5 h-5 text-lime-600 mt-0.5" />
              <div>
                <p className="font-medium text-lime-900">Configure Affiliate IDs & API Keys</p>
                <p className="text-sm text-lime-700 mt-1">
                  Manage affiliate credentials for Amazon, Walmart, Temu, and BoatUS. Set affiliate IDs, API keys, and commission rates for all retailers.
                </p>
                <p className="text-xs text-lime-600 mt-2">
                  Features: Secure credential storage, show/hide sensitive data, commission tracking, enable/disable retailers
                </p>
              </div>
            </div>
          </div>
          <AffiliateCredentialsManager />
        </div>


        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Affiliate Link Tester
          </h3>
          <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <TestTube className="w-5 h-5 text-fuchsia-600 mt-0.5" />
              <div>
                <p className="font-medium text-fuchsia-900">Test All Affiliate Links</p>
                <p className="text-sm text-fuchsia-700 mt-1">
                  Automatically test affiliate links for Amazon, Walmart, Temu, and BoatUS to verify they're working correctly. Check if affiliate IDs are properly appended, test redirects, and validate tracking.
                </p>
                <p className="text-xs text-fuchsia-600 mt-2">
                  Features: Link validation, affiliate ID verification, redirect testing, response time monitoring, error detection
                </p>
              </div>
            </div>
          </div>
          <AffiliateLinkTester />
        </div>



        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Affiliate Analytics Dashboard
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">Track Affiliate Performance & Revenue</p>
                <p className="text-sm text-amber-700 mt-1">
                  Monitor affiliate link clicks, conversions, commission earnings by retailer (Amazon, BoatUS, Walmart), top-performing products, and revenue trends with export functionality.
                </p>
                <p className="text-xs text-amber-600 mt-2">
                  Features: Real-time analytics, revenue charts, retailer comparison, product performance, CSV export, API credential management
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/affiliate-analytics')} 
            className="w-full"
            variant="default"
          >
            Open Affiliate Analytics
          </Button>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Feature Flags Manager
          </h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-indigo-600 mt-0.5" />
              <div>
                <p className="font-medium text-indigo-900">Control All Website Sections</p>
                <p className="text-sm text-indigo-700 mt-1">
                  Turn on/off any section of the website including promotions page, hero section, featured charters, weather widgets, message board, and more.
                </p>
                <p className="text-xs text-indigo-600 mt-2">
                  Features: Toggle visibility of pages, homepage sections, features, community tools, marketing elements, and monetization components
                </p>
              </div>
            </div>
          </div>
          <FeatureFlagManager />
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Site Settings & Links Manager
          </h3>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-slate-600 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Manage All Site Links & Contact Info</p>
                <p className="text-sm text-slate-700 mt-1">
                  Configure company name, tagline, contact information (email, phone, address), and all social media links (Facebook, Twitter, Instagram, LinkedIn, YouTube) used throughout the site.
                </p>
                <p className="text-xs text-slate-600 mt-2">
                  Features: Company branding, contact details, social media URLs - all configurable from one place
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/site-settings')} 
            className="w-full"
            variant="default"
          >
            Manage Site Settings
          </Button>
        </div>


        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Photo Gallery Moderation
          </h3>
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <FileCheck className="w-5 h-5 text-rose-600 mt-0.5" />
              <div>
                <p className="font-medium text-rose-900">Trip Photo Gallery Moderation System</p>
                <p className="text-sm text-rose-700 mt-1">
                  Review and moderate user-uploaded fishing trip photos. Approve, reject, or flag content with automated quality checks, duplicate detection, and user reporting.
                </p>
                <p className="text-xs text-rose-600 mt-2">
                  Features: Moderation queue, bulk actions, quality scoring, duplicate detection, user reports, photo guidelines, automated notifications
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/photo-moderation')} 
            className="w-full"
            variant="default"
          >
            Open Photo Moderation Panel
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4" />
            Membership & Permissions Manager
          </h3>
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-pink-600 mt-0.5" />
              <div>
                <p className="font-medium text-pink-900">Manage User & Captain Memberships</p>
                <p className="text-sm text-pink-700 mt-1">
                  Control membership status and permissions for all users and captains. Grant or revoke access to video uploads, featured listings, and priority support.
                </p>
                <p className="text-xs text-pink-600 mt-2">
                  Features: Membership status, permission toggles, user search, role management
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/memberships')} 
            className="w-full"
            variant="default"
          >
            Manage Memberships
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Default Ads Manager
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Manage Fallback Advertisements</p>
                <p className="text-sm text-blue-700 mt-1">
                  Create and manage default ads that display when no captain ads are active. Priority: Captain Ads → Google Ads → Default Ads
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/default-ads')} 
            className="w-full"
            variant="default"
          >
            Manage Default Ads
          </Button>
        </div>
        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Revenue & Commission System
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Platform Monetization Dashboard</p>
                <p className="text-sm text-green-700 mt-1">
                  Manage commission rates (12% platform fee), service fees (8% customer fee), premium captain subscriptions ($49-$149/mo), and featured listing purchases. Track all revenue streams with comprehensive analytics.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  Features: Revenue analytics, commission calculator, subscription plans, featured listing manager, payout tracking
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/monetization')} 
            className="w-full"
            variant="default"
          >
            Open Monetization Dashboard
          </Button>
        </div>


        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Enterprise Security Dashboard
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Security Monitoring & Compliance</p>
                <p className="text-sm text-red-700 mt-1">
                  Monitor SSL/TLS encryption, 2FA, WebAuthn, session security, rate limiting, RLS, audit logs, and OAuth status
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/security')} 
            className="w-full"
            variant="default"
          >
            View Security Dashboard
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Performance & Database Monitor
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <p className="font-medium text-purple-900">System Performance & Health</p>
                <p className="text-sm text-purple-700 mt-1">
                  Monitor database health, run stress tests for 1000+ concurrent users, check connection pool status, and optimize performance
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/performance')} 
            className="w-full"
            variant="default"
          >
            View Performance Monitor
          </Button>

        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup Management System
          </h3>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-900">Automated Database Backups</p>
                <p className="text-sm text-emerald-700 mt-1">
                  Encrypted backups every 6 hours with point-in-time recovery, verification tests, and intelligent retention policies (7 days daily, 4 weeks weekly, 1 year monthly)
                </p>
                <p className="text-xs text-emerald-600 mt-2">
                  Features: AES-256 encryption, health monitoring, restore interface, backup verification, automated cleanup
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/backups')} 
            className="w-full"
            variant="default"
          >
            Manage Database Backups
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <Download className="w-4 h-4" />
            Web Scraper & Bulk Loader
          </h3>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-cyan-600 mt-0.5" />
              <div>
                <p className="font-medium text-cyan-900">Load 100+ Real Charter Boats</p>
                <p className="text-sm text-cyan-700 mt-1">
                  Automatically scrape and import real charter businesses from Gulf Coast websites with duplicate detection
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/scraper')} 
            className="w-full"
            variant="default"
          >
            Open Web Scraper Dashboard
          </Button>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            AI Chatbot Training & Analytics
          </h3>
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-sky-600 mt-0.5" />
              <div>
                <p className="font-medium text-sky-900">Manage AI Support Bot</p>
                <p className="text-sm text-sky-700 mt-1">
                  Review chatbot conversations, manage knowledge base Q&A pairs, view analytics on helpful responses, escalations, and common questions. Train the bot to improve over time.
                </p>
                <p className="text-xs text-sky-600 mt-2">
                  Features: Conversation history, sentiment analysis, knowledge base management, satisfaction tracking, escalation monitoring
                </p>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/admin/chatbot')} 
            className="w-full"
            variant="default"
          >
            Manage AI Chatbot
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

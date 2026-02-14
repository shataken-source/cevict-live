/**
 * Developer Onboarding Page
 * Complete onboarding experience for new developers
 * Combines setup wizard, code tour, video tutorials, and troubleshooting chatbot
 * 
 * Access: /developer-onboarding
 * 
 * Features:
 * - Interactive setup wizard
 * - Guided code tour
 * - Video tutorial library
 * - AI troubleshooting assistant
 * 
 * @page
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Code, Video, MessageSquare } from 'lucide-react';
import SetupWizard from '@/components/onboarding/SetupWizard';
import CodeTour from '@/components/onboarding/CodeTour';
import VideoTutorials from '@/components/onboarding/VideoTutorials';
import TroubleshootingChatbot from '@/components/onboarding/TroubleshootingChatbot';

export default function DeveloperOnboarding() {
  const [activeTab, setActiveTab] = useState('setup');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Gulf Coast Charters Development
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get up and running quickly with our interactive onboarding system.
            Follow the setup wizard, explore the codebase, and learn from video tutorials.
          </p>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="setup" className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Setup
            </TabsTrigger>
            <TabsTrigger value="tour" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Code Tour
            </TabsTrigger>
            <TabsTrigger value="tutorials" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Tutorials
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Get Help
            </TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <SetupWizard />
          </TabsContent>

          <TabsContent value="tour">
            <CodeTour />
          </TabsContent>

          <TabsContent value="tutorials">
            <VideoTutorials />
          </TabsContent>

          <TabsContent value="help">
            <TroubleshootingChatbot />
          </TabsContent>
        </Tabs>

        {/* Quick Links */}
        <Card className="mt-8 max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Quick Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <a
                href="/DEVELOPER_RESOURCES.md"
                target="_blank"
                className="p-4 border rounded-lg hover:bg-muted transition-colors"
              >
                <h3 className="font-semibold mb-2">Developer Resources</h3>
                <p className="text-sm text-muted-foreground">
                  Complete guide with all URLs and API references
                </p>
              </a>
              <a
                href="https://supabase.com/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-muted transition-colors"
              >
                <h3 className="font-semibold mb-2">Supabase Docs</h3>
                <p className="text-sm text-muted-foreground">
                  Database and authentication documentation
                </p>
              </a>
              <a
                href="https://ui.shadcn.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 border rounded-lg hover:bg-muted transition-colors"
              >
                <h3 className="font-semibold mb-2">UI Components</h3>
                <p className="text-sm text-muted-foreground">
                  shadcn/ui component library reference
                </p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
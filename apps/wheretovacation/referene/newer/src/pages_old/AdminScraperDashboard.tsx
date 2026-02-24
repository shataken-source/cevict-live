import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ScraperDashboard from '@/components/ScraperDashboard';
import BulkCharterLoader from '@/components/BulkCharterLoader';
import ScraperScheduler from '@/components/ScraperScheduler';
import { Card } from '@/components/ui/card';
import { Download, Clock, Database } from 'lucide-react';

export default function AdminScraperDashboard() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Web Scraper Dashboard</h1>
        <p className="text-gray-600">
          Load real charter boats from websites, schedule automated scraping, and manage listings
        </p>
      </div>

      <Tabs defaultValue="bulk" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="bulk" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Bulk Loader
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Manual Scraper
          </TabsTrigger>
          <TabsTrigger value="scheduler" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Scheduler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <div className="space-y-6">
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-bold text-lg mb-2">Bulk Charter Loader</h3>
              <p className="text-sm text-gray-700 mb-4">
                Automatically scrape and import 100+ real charter businesses from Gulf Coast websites. 
                Includes duplicate detection and automatic saving to the database.
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Scrapes from 10+ charter websites</li>
                <li>• AI-powered data extraction</li>
                <li>• Automatic duplicate detection</li>
                <li>• Real-time progress tracking</li>
              </ul>
            </Card>
            <BulkCharterLoader />
          </div>
        </TabsContent>

        <TabsContent value="manual">
          <ScraperDashboard />
        </TabsContent>

        <TabsContent value="scheduler">
          <div className="space-y-6">
            <Card className="p-6 bg-purple-50 border-purple-200">
              <h3 className="font-bold text-lg mb-2">Automated Scraper Scheduling</h3>
              <p className="text-sm text-gray-700">
                Schedule the scraper to run automatically at specific intervals. 
                Perfect for keeping your charter listings fresh and up-to-date.
              </p>
            </Card>
            <ScraperScheduler />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

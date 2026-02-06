/**
 * Help & Support Center
 * 
 * Route: /help
 * Provides help articles, FAQs, and support contact options
 */

import { useState } from 'react';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '../src/components/ui/card';
import { Button } from '../src/components/ui/button';
import { Input } from '../src/components/ui/input';
import { Label } from '../src/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../src/components/ui/tabs';
import { 
  HelpCircle, Search, Mail, Phone, MessageSquare, 
  Book, FileText, ChevronRight, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

const helpCategories = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Book className="w-5 h-5" />,
    articles: [
      { id: '1', title: 'How to Book a Charter', slug: 'how-to-book' },
      { id: '2', title: 'Creating Your Account', slug: 'creating-account' },
      { id: '3', title: 'Payment Methods', slug: 'payment-methods' },
      { id: '4', title: 'Cancellation Policy', slug: 'cancellation-policy' },
    ],
  },
  {
    id: 'bookings',
    title: 'Bookings & Reservations',
    icon: <FileText className="w-5 h-5" />,
    articles: [
      { id: '5', title: 'How to Modify a Booking', slug: 'modify-booking' },
      { id: '6', title: 'Booking Confirmation', slug: 'booking-confirmation' },
      { id: '7', title: 'What to Bring', slug: 'what-to-bring' },
      { id: '8', title: 'Weather Cancellations', slug: 'weather-cancellations' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Refunds',
    icon: <FileText className="w-5 h-5" />,
    articles: [
      { id: '9', title: 'Payment Processing', slug: 'payment-processing' },
      { id: '10', title: 'Refund Policy', slug: 'refund-policy' },
      { id: '11', title: 'Payment Issues', slug: 'payment-issues' },
      { id: '12', title: 'Gift Cards', slug: 'gift-cards' },
    ],
  },
  {
    id: 'account',
    title: 'Account & Profile',
    icon: <FileText className="w-5 h-5" />,
    articles: [
      { id: '13', title: 'Updating Your Profile', slug: 'update-profile' },
      { id: '14', title: 'Password Reset', slug: 'password-reset' },
      { id: '15', title: 'Notification Settings', slug: 'notification-settings' },
      { id: '16', title: 'Privacy Settings', slug: 'privacy-settings' },
    ],
  },
];

const popularArticles = [
  { id: '1', title: 'How to Book a Charter', category: 'Getting Started' },
  { id: '5', title: 'How to Modify a Booking', category: 'Bookings' },
  { id: '9', title: 'Payment Processing', category: 'Payments' },
  { id: '7', title: 'What to Bring', category: 'Bookings' },
  { id: '10', title: 'Refund Policy', category: 'Payments' },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.articles.length > 0 || !searchQuery);

  return (
    <Layout session={null}>
      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <HelpCircle className="w-10 h-10" />
            Help & Support
          </h1>
          <p className="text-gray-600">Find answers to common questions and get support</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="articles">All Articles</TabsTrigger>
            <TabsTrigger value="contact">Contact Support</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Popular Articles */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Articles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {popularArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/help/article/${article.id}`}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <p className="font-semibold">{article.title}</p>
                        <p className="text-sm text-gray-500">{article.category}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Help Categories */}
            <div className="grid md:grid-cols-2 gap-6">
              {helpCategories.map((category) => (
                <Card key={category.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.articles.slice(0, 4).map((article) => (
                        <Link
                          key={article.id}
                          href={`/help/article/${article.id}`}
                          className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm">{article.title}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        </Link>
                      ))}
                      {category.articles.length > 4 && (
                        <Link
                          href={`/help?category=${category.id}`}
                          className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          View all {category.articles.length} articles →
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Contact */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle>Still Need Help?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild>
                    <Link href="/help?tab=contact">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Contact Support
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="mailto:support@gulfcoastcharters.com">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Us
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="tel:+1-850-555-0123">
                      <Phone className="w-4 h-4 mr-2" />
                      Call Us
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Articles Tab */}
          <TabsContent value="articles" className="space-y-6">
            {filteredCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search terms or browse by category
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredCategories.map((category) => (
                <Card key={category.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {category.icon}
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {category.articles.map((article) => (
                        <Link
                          key={article.id}
                          href={`/help/article/${article.id}`}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <span>{article.title}</span>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Contact Support Tab */}
          <TabsContent value="contact">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Support</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Email</Label>
                    <a
                      href="mailto:support@gulfcoastcharters.com"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="w-4 h-4" />
                      support@gulfcoastcharters.com
                    </a>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Phone</Label>
                    <a
                      href="tel:+1-850-555-0123"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="w-4 h-4" />
                      (850) 555-0123
                    </a>
                    <p className="text-xs text-gray-500 mt-1">Mon-Fri 9am-5pm EST</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold mb-2 block">Response Time</Label>
                    <p className="text-sm text-gray-600">
                      We typically respond within 24 hours during business days.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Support Form</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="support-name">Name</Label>
                    <Input id="support-name" placeholder="Your name" />
                  </div>
                  <div>
                    <Label htmlFor="support-email">Email</Label>
                    <Input id="support-email" type="email" placeholder="your@email.com" />
                  </div>
                  <div>
                    <Label htmlFor="support-subject">Subject</Label>
                    <Input id="support-subject" placeholder="What can we help with?" />
                  </div>
                  <div>
                    <Label htmlFor="support-message">Message</Label>
                    <textarea
                      id="support-message"
                      rows={4}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="Describe your issue..."
                    />
                  </div>
                  <Button className="w-full">
                    <Mail className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

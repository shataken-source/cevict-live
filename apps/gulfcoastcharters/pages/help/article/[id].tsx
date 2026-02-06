/**
 * Help Article Detail Page
 * 
 * Route: /help/article/[id]
 * Displays individual help article content
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../../components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, HelpCircle, ThumbsUp, ThumbsDown, 
  Share2, BookOpen, Clock, ChevronRight 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../../src/lib/supabase';

type Article = {
  id: string;
  title: string;
  content: string;
  category: string;
  slug: string;
  created_at: string;
  updated_at?: string;
  views?: number;
  helpful_count?: number;
  not_helpful_count?: number;
};

const articleDatabase: Record<string, Article> = {
  '1': {
    id: '1',
    title: 'How to Book a Charter',
    category: 'Getting Started',
    slug: 'how-to-book',
    content: `
# How to Book a Charter

Booking a charter with Gulf Coast Charters is quick and easy. Follow these simple steps:

## Step 1: Browse Available Options

Start by browsing our available captains and vessels. You can filter by:
- Location
- Vessel type
- Price range
- Availability dates

## Step 2: Select Your Charter

Click on a captain or vessel that interests you to view detailed information including:
- Captain experience and specialties
- Vessel specifications
- Pricing information
- Available dates

## Step 3: Choose Date and Time

Select your preferred date and time slot. Our calendar shows real-time availability, so you can see exactly when each charter is available.

## Step 4: Complete Booking Form

Fill out the booking form with:
- Your contact information
- Number of guests
- Special requests or requirements
- Payment information

## Step 5: Confirm and Pay

Review your booking details and complete payment. You'll receive a confirmation email with all the details of your charter.

## Need Help?

If you have any questions during the booking process, don't hesitate to contact our support team. We're here to help!
    `,
    created_at: new Date().toISOString(),
    views: 1250,
    helpful_count: 89,
    not_helpful_count: 3,
  },
  '5': {
    id: '5',
    title: 'How to Modify a Booking',
    category: 'Bookings',
    slug: 'modify-booking',
    content: `
# How to Modify a Booking

Need to change your booking? We make it easy to modify your reservation.

## Modifying Your Booking

You can modify your booking through your account dashboard or by contacting our support team.

### What You Can Change

- **Date and Time**: Reschedule to a different date or time
- **Number of Guests**: Update the number of people in your party
- **Special Requests**: Add or modify special requests
- **Contact Information**: Update your contact details

### How to Modify

1. Log in to your account
2. Navigate to your bookings
3. Select the booking you want to modify
4. Click "Modify Booking"
5. Make your changes
6. Confirm the modifications

### Important Notes

- Modifications are subject to availability
- Changes made within 48 hours may incur fees
- Some modifications may require approval

## Need Assistance?

Contact our support team if you need help modifying your booking.
    `,
    created_at: new Date().toISOString(),
    views: 856,
    helpful_count: 67,
    not_helpful_count: 2,
  },
};

export default function ArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpful, setHelpful] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    async function loadArticle() {
      try {
        setLoading(true);
        
        // Try loading from database
        const { data: articleData, error: articleError } = await supabase
          .from('help_articles')
          .select('*')
          .eq('id', id)
          .single();

        if (articleError && articleError.code !== 'PGRST116') {
          // Fall back to hardcoded articles
          setArticle(articleDatabase[id as string] || null);
        } else if (articleData) {
          setArticle({
            id: articleData.id,
            title: articleData.title,
            content: articleData.content,
            category: articleData.category,
            slug: articleData.slug,
            created_at: articleData.created_at,
            updated_at: articleData.updated_at,
            views: articleData.views || 0,
            helpful_count: articleData.helpful_count || 0,
            not_helpful_count: articleData.not_helpful_count || 0,
          });
        } else {
          setArticle(articleDatabase[id as string] || null);
        }

      } catch (error: any) {
        console.error('Error loading article:', error);
        setArticle(articleDatabase[id as string] || null);
      } finally {
        setLoading(false);
      }
    }

    loadArticle();
  }, [id]);

  const handleHelpful = async (isHelpful: boolean) => {
    if (helpful !== null) {
      toast.info('You have already provided feedback on this article');
      return;
    }

    try {
      if (article) {
        // Update in database
        const { error } = await supabase
          .from('help_articles')
          .update({
            helpful_count: isHelpful 
              ? (article.helpful_count || 0) + 1 
              : article.helpful_count,
            not_helpful_count: !isHelpful 
              ? (article.not_helpful_count || 0) + 1 
              : article.not_helpful_count,
          })
          .eq('id', article.id);

        if (error && error.code !== 'PGRST116') {
          // Update local state
          setArticle({
            ...article,
            helpful_count: isHelpful 
              ? (article.helpful_count || 0) + 1 
              : article.helpful_count,
            not_helpful_count: !isHelpful 
              ? (article.not_helpful_count || 0) + 1 
              : article.not_helpful_count,
          });
        } else {
          setArticle({
            ...article,
            helpful_count: isHelpful 
              ? (article.helpful_count || 0) + 1 
              : article.helpful_count,
            not_helpful_count: !isHelpful 
              ? (article.not_helpful_count || 0) + 1 
              : article.not_helpful_count,
          });
        }

        setHelpful(isHelpful);
        toast.success('Thank you for your feedback!');
      }
    } catch (error) {
      // Update local state anyway
      if (article) {
        setArticle({
          ...article,
          helpful_count: isHelpful 
            ? (article.helpful_count || 0) + 1 
            : article.helpful_count,
          not_helpful_count: !isHelpful 
            ? (article.not_helpful_count || 0) + 1 
            : article.not_helpful_count,
        });
        setHelpful(isHelpful);
        toast.success('Thank you for your feedback!');
      }
    }
  };

  const handleShare = () => {
    if (navigator.share && article) {
      navigator.share({
        title: article.title,
        text: `Check out this help article: ${article.title}`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!article) {
    return (
      <Layout session={null}>
        <div className="max-w-4xl mx-auto p-8">
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h1 className="text-2xl font-bold mb-2">Article Not Found</h1>
            <p className="text-gray-600 mb-6">The article you're looking for doesn't exist.</p>
            <Link href="/help">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Help Center
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout session={null}>
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        {/* Back Button */}
        <Link href="/help">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Help Center
          </Button>
        </Link>

        {/* Article Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline">{article.category}</Badge>
            {article.views && (
              <span className="text-sm text-gray-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {article.views} views
              </span>
            )}
          </div>
          <h1 className="text-4xl font-bold mb-4">{article.title}</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {article.created_at && (
              <span>Published {new Date(article.created_at).toLocaleDateString()}</span>
            )}
            {article.updated_at && (
              <span>Updated {new Date(article.updated_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Article Content */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div 
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: article.content
                  .split('\n')
                  .map(line => {
                    if (line.startsWith('# ')) {
                      return `<h1>${line.substring(2)}</h1>`;
                    } else if (line.startsWith('## ')) {
                      return `<h2>${line.substring(3)}</h2>`;
                    } else if (line.startsWith('### ')) {
                      return `<h3>${line.substring(4)}</h3>`;
                    } else if (line.startsWith('- ')) {
                      return `<li>${line.substring(2)}</li>`;
                    } else if (line.trim() === '') {
                      return '<br />';
                    } else {
                      return `<p>${line}</p>`;
                    }
                  })
                  .join('')
              }}
            />
          </CardContent>
        </Card>

        {/* Feedback Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Was this article helpful?</h3>
            <div className="flex items-center gap-4">
              <Button
                variant={helpful === true ? 'default' : 'outline'}
                onClick={() => handleHelpful(true)}
                disabled={helpful !== null}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Yes ({article.helpful_count || 0})
              </Button>
              <Button
                variant={helpful === false ? 'default' : 'outline'}
                onClick={() => handleHelpful(false)}
                disabled={helpful !== null}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                No ({article.not_helpful_count || 0})
              </Button>
              <Button variant="ghost" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Related Articles */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Related Articles</h3>
            <div className="space-y-2">
              {Object.values(articleDatabase)
                .filter(a => a.id !== article.id && a.category === article.category)
                .slice(0, 3)
                .map((relatedArticle) => (
                  <Link
                    key={relatedArticle.id}
                    href={`/help/article/${relatedArticle.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <span>{relatedArticle.title}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              {Object.values(articleDatabase).filter(a => a.id !== article.id && a.category === article.category).length === 0 && (
                <p className="text-gray-600">No related articles found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

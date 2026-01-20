# Web Scraper System Setup Guide

## Overview
The web scraper system allows you to extract charter business information from websites automatically or manually.

## Features
- **Single URL Scraping**: Scrape one website at a time
- **Bulk URL Scraping**: Process multiple URLs in batch
- **AI-Powered Extraction**: Uses Gemini AI to intelligently extract business details
- **History Tracking**: Keep track of all scraping activities
- **Auto-Save**: Scraped charters automatically added to listings

## Manual Scraping

### Single URL
1. Log in as admin (level 1 user)
2. Navigate to the Scraper Dashboard (visible only to admins)
3. Enter a charter website URL in the "Single URL" tab
4. Click "Scrape"
5. Review the results and click "Save" to add to listings

### Bulk URLs
1. Go to the "Bulk URLs" tab
2. Enter multiple URLs (one per line)
3. Click "Scrape X URLs"
4. Review all results and save individually

## Automated Scraping Setup

### Option 1: Supabase Cron Jobs (Recommended)
1. Create a cron job in Supabase Dashboard
2. Set schedule (e.g., daily at 2 AM)
3. Configure to call the `scraper-manager` function
4. Pass array of URLs to scrape

### Option 2: External Scheduler
Use services like:
- GitHub Actions (free)
- Zapier
- Make.com
- AWS EventBridge

## URL Management
Store URLs to scrape in `src/data/scraperUrls.ts` for easy management.

## Best Practices
- Scrape during off-peak hours
- Respect website rate limits
- Review scraped data before publishing
- Keep URL list updated

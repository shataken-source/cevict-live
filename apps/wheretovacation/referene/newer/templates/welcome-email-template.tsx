import React from 'react';

// Welcome Email Template for Gulf Coast Charters
// This template includes cross-promotion to WhereToVacation.com

export const WelcomeEmailTemplate = {
  subject: "Get Ready to Fish! 🎣 Your Upcoming Adventure with Gulf Coast Charters",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Get Ready to Fish! Your Upcoming Adventure</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #2563eb, #0891b2); padding: 40px 20px; text-align: center; color: white; }
        .content { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .button:hover { background: #1d4ed8; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .footer { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
        .details { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 15px; margin: 15px 0; }
        .safety { background: #fee2e2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎣 Get Ready to Fish! Your Upcoming Adventure with Gulf Coast Charters</h1>
        <p>We're thrilled to have you joining us for an incredible day on the water!</p>
      </div>

      <div class="content">
        <h2>Hi {{customerName}},</h2>
        <p>We are thrilled to have you joining us on <strong>{{tripDate}}</strong>! Captain {{captainName}} and the crew are already prepping the gear to make sure you have an incredible day on the water.</p>

        <div class="details">
          <h3>📋 Trip Details</h3>
          <p><strong>Arrival:</strong> Please be at <a href="{{mapLink}}" style="color: #2563eb;">{{dockAddress}}</a> 15 minutes before departure.</p>
          <p><strong>Departure Time:</strong> {{tripTime}}</p>
          <p><strong>Included:</strong> All licenses, bait, tackle, and ice for your catch.</p>
          <p><strong>What to Bring:</strong> Sunscreen (non-spray), polarized sunglasses, and a cooler to take your fillets home.</p>
        </div>

        <div class="highlight">
          <h3>🌴 Plan the Rest of Your Stay</h3>
          <p>To help you win your vacation, check out our sister site, <strong>WhereToVacation.com</strong>, for local-only guides:</p>
          <ul>
            <li>🌦️ <strong>Plan B: The Ultimate Rainy Day Guide</strong></li>
            <li>🍴 <strong>Cook Your Catch: Top Restaurants that will cook your fish</strong></li>
            <li>🎒 <strong>Packing: The Pro Beach Checklist</strong></li>
          </ul>
          <p style="text-align: center; margin: 20px 0;">
            <a href="https://wheretovacation.com/gulf-coast-charters-special" class="button" style="background: #10b981;">
              Get Your FREE Local Guides
            </a>
          </p>
        </div>

        <div class="safety">
          <h3>⚠️ Safety First</h3>
          <p>Please review our <a href="{{safetyPolicyLink}}" style="color: #dc2626;">Safety & Liability Policies</a> before we depart. Your safety is our top priority.</p>
        </div>

        <div class="card">
          <h3>📞 Have Questions?</h3>
          <p>If you need anything before your trip, just reply to this email or call us at <strong>{{phoneNumber}}</strong>.</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="tel:{{phoneNumber}}" class="button">
              Call Us Now
            </a>
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <h3>See you at the dock! 🎣</h3>
          <p><strong>The Gulf Coast Charters Team</strong></p>
          <p><a href="https://gulfcoastcharters.com" style="color: #2563eb;">www.gulfcoastcharters.com</a></p>
        </div>

        <div class="card">
          <h3>🎁 Complete Your Gulf Coast Experience</h3>
          <p>While you're planning, don't miss these exclusive resources from WhereToVacation.com:</p>
          <ul>
            <li>🍽️ <strong>Where the Locals Eat</strong> - Skip tourist traps, save 30%</li>
            <li>🏖️ <strong>Beach Comparison</strong> - Gulf Shores vs Orange Beach</li>
            <li>🌧️ <strong>Rainy Day Backup</strong> - 50+ indoor activities</li>
            <li>🏠 <strong>Vacation Rental Checklist</strong> - Pack like a pro</li>
          </ul>
          <a href="https://wheretovacation.com" class="button" style="background: #f59e0b;">
            Explore All FREE Guides
          </a>
        </div>
      </div>

      <div class="footer">
        <h3>🌊 Gulf Coast Charters</h3>
        <p>{{dockAddress}} | Phone: {{phoneNumber}}</p>
        <p><a href="#" style="color: #60a5fa;">Website</a> | <a href="#" style="color: #60a5fa;">Facebook</a> | <a href="#" style="color: #60a5fa;">Instagram</a></p>
        <p style="margin-top: 20px; font-size: 12px;">© 2024 Gulf Coast Charters. All rights reserved.</p>
      </div>
    </body>
    </html>
  `
};

// Rainy Day Backup Email Template
export const RainyDayBackupTemplate = {
  subject: "Weather Update & Rainy Day Backup Plan 🌧️",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weather Update & Backup Plan</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #6b7280, #374151); padding: 40px 20px; text-align: center; color: white; }
        .content { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .button:hover { background: #1d4ed8; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .highlight { background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 20px 0; }
        .footer { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌧️ Weather Update & Backup Plan</h1>
        <p>Your Gulf Coast vacation is still going to be amazing!</p>
      </div>

      <div class="content">
        <h2>Hi {{customerName}},</h2>
        <p>We're monitoring the weather conditions for your upcoming fishing trip on {{tripDate}}. Your safety is our top priority, and we want to ensure you have a fantastic Gulf Coast experience no matter what!</p>

        <div class="highlight">
          <h3>🎯 DON'T WORRY - WE'VE GOT YOU COVERED!</h3>
          <p>If weather prevents us from fishing, we've partnered with <strong>WhereToVacation.com</strong> to provide you with their <strong>Ultimate Rainy Day Guide</strong> - absolutely FREE!</p>
        </div>

        <div class="card">
          <h3>🌈 Your Rainy Day Adventure Awaits</h3>
          <p>WhereToVacation.com has created an amazing guide with 50+ indoor activities that are just as fun as the beach:</p>
          <ul>
            <li>🏊‍♂️ <strong>Tropic Falls Indoor Waterpark</strong> - Tropical paradise under a glass roof!</li>
            <li>🎯 <strong>The Wharf Indoor Entertainment</strong> - Laser tag, movies, bowling & more</li>
            <li>🎨 <strong>Coastal Arts Center</strong> - Glass blowing demos and pottery classes</li>
            <li>🎳 <strong>Gulf Bowl & Captain's Choice</strong> - 35,000 sq ft of family fun</li>
            <li>🏛️ <strong>World-Class Museums</strong> - Including the FREE Naval Aviation Museum</li>
          </ul>
          <p style="text-align: center; margin: 20px 0;">
            <a href="https://wheretovacation.com/rainy-day-guide" class="button" style="background: #10b981;">
              Get Your FREE Rainy Day Guide
            </a>
          </p>
        </div>

        <div class="card">
          <h3>📞 Weather Decision Process</h3>
          <p><strong>When We Decide:</strong> Weather decisions are made by 6 AM on your trip day</p>
          <p><strong>How We Notify You:</strong> Phone call + email confirmation</p>
          <p><strong>Your Options:</strong></p>
          <ul>
            <li>✅ 100% refund if we cancel due to weather</li>
            <li>✅ Reschedule for the next available day</li>
            <li>✅ Use your Rainy Day Guide for alternative fun</li>
          </ul>
        </div>

        <h3>🌤️ Gulf Coast Weather Facts</h3>
        <p>Good news! Most Gulf Coast storms pass quickly:</p>
        <ul>
          <li>⚡ 95% of storms pass in under 30 minutes</li>
          <li>🌤️ Afternoon storms typically clear by evening</li>
          <li>🌅 Morning and evening are usually beautiful</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <h3>Questions? We're Here to Help!</h3>
          <p>Call us anytime: (251) 555-0123</p>
          <a href="tel:2555550123" class="button">Call Us Now</a>
        </div>

        <div class="card">
          <h3>🎁 BONUS: Complete Vacation Planning</h3>
          <p>While you're checking out the Rainy Day Guide, don't miss these other FREE resources from WhereToVacation.com:</p>
          <ul>
            <li>🍽️ <strong>Where the Locals Eat</strong> - Skip tourist traps, save 30%</li>
            <li>🏖️ <strong>Beach Comparison Guide</strong> - Gulf Shores vs Orange Beach</li>
            <li>🏠 <strong>Vacation Rental Checklist</strong> - Pack like a pro</li>
          </ul>
        </div>
      </div>

      <div class="footer">
        <h3>🌊 Gulf Coast Charters</h3>
        <p>Your Gulf Coast adventure partners, rain or shine!</p>
        <p>Phone: (251) 555-0123 | Email: info@gulfcoastcharters.com</p>
      </div>
    </body>
    </html>
  `
};

// Post-Trip Follow-up Email
export const PostTripTemplate = {
  subject: "Thanks for Fishing with Us! 🎣 Share Your Experience & Get Special Offers",
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Thanks for Fishing with Us!</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 20px; text-align: center; color: white; }
        .content { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
        .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .button:hover { background: #1d4ed8; }
        .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; }
        .footer { background: #1f2937; color: white; padding: 30px 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎣 Thanks for Fishing with Gulf Coast Charters!</h1>
        <p>We hope you had an amazing time on the water!</p>
      </div>

      <div class="content">
        <h2>Hi {{customerName}},</h2>
        <p>Thank you for choosing Gulf Coast Charters for your Gulf Coast fishing adventure! We loved having you aboard and hope you made some incredible memories (and caught some amazing fish!).</p>

        <div class="highlight">
          <h3>📸 SHARE YOUR EXPERIENCE & GET REWARDED!</h3>
          <p>Post your fishing photos on Instagram or Facebook with <strong>#GulfCoastCharters</strong> and tag us for a <strong>10% discount</strong> on your next trip!</p>
        </div>

        <div class="card">
          <h3>🍽️ COOK YOUR CATCH LIKE A LOCAL!</h3>
          <p>Did you know many local restaurants will cook your fresh catch? Our partners at WhereToVacation.com have identified the <strong>best spots</strong> where locals actually eat:</p>
          <ul>
            <li>🦞 <strong>Sassy Bass</strong> - Incredible sunset views, no tourist crowds</li>
            <li>🏠 <strong>Tin Top Restaurant</strong> - Family-owned since 1985, amazing fried shrimp</li>
            <li>🌊 <strong>Wolf Bay Lodge</strong> - Historic spot with legendary fried crab claws</li>
          </ul>
          <a href="https://wheretovacation.com/local-guides/where-locals-go" class="button" style="background: #f59e0b;">
            Discover Local Dining Secrets
          </a>
        </div>

        <div class="card">
          <h3>🌟 PLAN YOUR NEXT GULF COAST ADVENTURE</h3>
          <p>Ready to come back? We've got some special offers just for our returning customers:</p>
          <ul>
            <li>🎣 <strong>Return Customer Discount</strong> - 15% off your next charter</li>
            <li>👨‍👩‍👧‍👦 <strong>Refer a Friend</strong> - Get $50 credit for each referral who books</li>
            <li>📅 <strong>Multi-Trip Package</strong> - Book 3 trips, save 25%</li>
          </ul>
          <a href="#" class="button">Book Your Next Trip</a>
        </div>

        <h3>📝 We'd Love to Hear From You!</h3>
        <p>Your feedback helps us improve and helps other travelers make great choices:</p>
        <ul>
          <li>⭐ <strong>Leave a Review</strong> on Google, TripAdvisor, or Facebook</li>
          <li>📸 <strong>Share Your Photos</strong> with #GulfCoastCharters</li>
          <li>💬 <strong>Tell Us Your Story</strong> - We love hearing about your experience!</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <h3>Stay Connected!</h3>
          <p>Follow us for fishing tips, catch reports, and special offers:</p>
          <a href="#" class="button" style="background: #3b82f6; margin: 5px;">Facebook</a>
          <a href="#" class="button" style="background: #e1306c; margin: 5px;">Instagram</a>
          <a href="#" class="button" style="background: #1da1f2; margin: 5px;">Twitter</a>
        </div>

        <div class="card">
          <h3>🎁 COMPLETE YOUR GULF COAST KNOWLEDGE</h3>
          <p>Our friends at WhereToVacation.com have amazing FREE resources to make your next trip even better:</p>
          <ul>
            <li>🌧️ <strong>Rainy Day Guide</strong> - 50+ indoor backup activities</li>
            <li>🍽️ <strong>Local Dining Guide</strong> - Where the locals really eat</li>
            <li>🏖️ <strong>Beach Comparison</strong> - Gulf Shores vs Orange Beach</li>
            <li>🏠 <strong>Packing Checklist</strong> - Never forget essentials again</li>
          </ul>
          <a href="https://wheretovacation.com" class="button" style="background: #10b981;">
            Get All FREE Guides
          </a>
        </div>
      </div>

      <div class="footer">
        <h3>🌊 Gulf Coast Charters</h3>
        <p>Can't wait to see you again on the water!</p>
        <p>Phone: (251) 555-0123 | Email: info@gulfcoastcharters.com</p>
        <p><a href="#" style="color: #60a5fa;">Website</a> | <a href="#" style="color: #60a5fa;">Reviews</a> | <a href="#" style="color: #60a5fa;">Gallery</a></p>
      </div>
    </body>
    </html>
  `
};

export default {
  WelcomeEmailTemplate,
  RainyDayBackupTemplate,
  PostTripTemplate
};

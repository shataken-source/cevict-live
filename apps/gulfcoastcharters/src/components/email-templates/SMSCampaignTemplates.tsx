export const SMSTemplates = {
  booking_reminder: (captainName: string, date: string, time: string) => 
    `Ahoy! Your charter with Captain ${captainName} is tomorrow at ${time}. Weather looks great! Reply CANCEL to modify. - Gulf Coast Charters`,
  
  last_minute_deal: (discount: number, location: string) => 
    `🎣 FLASH DEAL: ${discount}% off ${location} charters TODAY! Book now: gulfcoastcharters.com/deals Reply STOP to opt out`,
  
  booking_confirmed: (captainName: string, date: string, time: string) => 
    `✅ Booking confirmed! Captain ${captainName} on ${date} at ${time}. Check-in details sent to email. See you soon!`,
  
  weather_alert: (captainName: string, condition: string) => 
    `⚠️ Weather Alert: ${condition} for your charter with Captain ${captainName}. Captain will contact you shortly about rescheduling options.`,
  
  catch_milestone: (species: string, weight: number, rank: number) => 
    `🏆 New personal record! Your ${weight}lb ${species} ranks #${rank} on our leaderboard! Share your catch: gulfcoastcharters.com/catches`,
  
  referral_reward: (points: number, friendName: string) => 
    `🎁 ${friendName} just booked! You earned ${points} points. Redeem now: gulfcoastcharters.com/rewards`,
  
  membership_renewal: (daysLeft: number, planName: string) => 
    `Your ${planName} membership expires in ${daysLeft} days. Renew now to keep your benefits: gulfcoastcharters.com/membership`,
  
  review_request: (captainName: string) => 
    `How was your trip with Captain ${captainName}? Share your experience and earn 50 points: gulfcoastcharters.com/review`,
  
  seasonal_tip: (season: string, species: string, location: string) => 
    `🎣 ${season} Tip: ${species} are running hot in ${location}! Book your charter: gulfcoastcharters.com/search?location=${location}`,
  
  event_invitation: (eventName: string, date: string) => 
    `You're invited to ${eventName} on ${date}! RSVP and compete for prizes: gulfcoastcharters.com/events`,
  
  price_drop_alert: (charterName: string, oldPrice: number, newPrice: number) => 
    `💰 Price Drop! ${charterName} now $${newPrice} (was $${oldPrice}). Limited availability: gulfcoastcharters.com/book`,
  
  loyalty_milestone: (level: string, points: number, reward: string) => 
    `🌟 Congrats! You've reached ${level} status with ${points} points! Unlock: ${reward}. View rewards: gulfcoastcharters.com/loyalty`
};

export const SMSCampaignBuilder = {
  buildMessage: (template: keyof typeof SMSTemplates, params: any) => {
    const templateFn = SMSTemplates[template];
    if (!templateFn) throw new Error('Template not found');
    return typeof templateFn === 'function' ? templateFn(...Object.values(params)) : templateFn;
  },
  
  validatePhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  },
  
  formatPhoneNumber: (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.startsWith('1') ? `+${cleaned}` : `+1${cleaned}`;
  }
};

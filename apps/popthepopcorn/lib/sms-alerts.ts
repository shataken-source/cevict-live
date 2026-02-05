import { supabase } from './supabase'
import { formatProbabilityAlert, calculateProbability } from './probability-calculator'
import { generateNicknameUsage } from './nicknames'
import { isRestrictedNotificationHours } from './age-verification'

// Sinch configuration (set via environment variables)
const SINCH_SERVICE_PLAN_ID = process.env.SINCH_SERVICE_PLAN_ID
const SINCH_API_TOKEN = process.env.SINCH_API_TOKEN
const SINCH_FROM_NUMBER = process.env.SINCH_FROM_NUMBER || process.env.SINCH_PHONE_NUMBER
const SINCH_REGION = process.env.SINCH_REGION || 'us' // us, eu, br, au, ca

/**
 * Send SMS alert for high-drama headlines using Sinch
 */
export async function sendSMSAlerts() {
  if (!SINCH_SERVICE_PLAN_ID || !SINCH_API_TOKEN || !SINCH_FROM_NUMBER) {
    console.log('Sinch not configured, skipping SMS alerts')
    return
  }

  try {
    // Get high-drama headlines from last hour
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: highDramaHeadlines } = await supabase
      .from('headlines')
      .select('*')
      .gte('drama_score', 8)
      .gte('posted_at', oneHourAgo.toISOString())
      .eq('is_breaking', true)

    if (!highDramaHeadlines || highDramaHeadlines.length === 0) {
      return
    }

    // Get active alert subscriptions
    // 2026 Compliance: Filter out minors during restricted hours (12am-6am)
    const isRestrictedHours = isRestrictedNotificationHours()
    
    const { data: alerts } = await supabase
      .from('user_alerts')
      .select('*')
      .eq('is_active', true)
      .not('phone_number', 'is', null)

    if (!alerts || alerts.length === 0) {
      return
    }

    // Sinch API endpoint
    const sinchApiUrl = `https://${SINCH_REGION}.sms.api.sinch.com/xms/v1/${SINCH_SERVICE_PLAN_ID}/batches`
    const authHeader = `Bearer ${SINCH_API_TOKEN}`

    for (const headline of highDramaHeadlines) {
      // Collect all phone numbers that should receive this alert
      const recipients: string[] = []
      
      for (const alert of alerts) {
        // 2026 Compliance: Check if user is a minor (stored in alert metadata)
        // If restricted hours (12am-6am) and user is minor, skip notification
        const userAgeCategory = alert.age_category // Would be stored when user signs up
        if (isRestrictedHours && (userAgeCategory === '13-15' || userAgeCategory === '16-17')) {
          continue // California law: No notifications for minors 12am-6am
        }

        const alertTypes = alert.alert_types || []
        const shouldAlert = 
          alertTypes.includes('breaking') ||
          alertTypes.includes(headline.category) ||
          (alert.custom_keywords && alert.custom_keywords.some((keyword: string) => 
            headline.title.toLowerCase().includes(keyword.toLowerCase())
          ))

        if (shouldAlert && alert.phone_number) {
          recipients.push(alert.phone_number)
        }
      }

      if (recipients.length === 0) {
        continue
      }

      // Calculate probability for SMS
      const probability = calculateProbability(
        headline.drama_score,
        undefined,
        headline.verification_confidence,
        headline.sentiment
      )
      
      // Format message with nickname and probability
      const message = formatProbabilityAlert(headline, probability)

      try {
        const response = await fetch(sinchApiUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: SINCH_FROM_NUMBER,
            to: recipients,
            body: message,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
          throw new Error(`Sinch API error: ${response.status} - ${JSON.stringify(errorData)}`)
        }

        const result = await response.json()
        console.log(`Sent SMS alerts to ${recipients.length} recipients via Sinch:`, result.id)
      } catch (error) {
        console.error(`Error sending SMS via Sinch:`, error)
      }
    }
  } catch (error) {
    console.error('Error in SMS alerts:', error)
  }
}

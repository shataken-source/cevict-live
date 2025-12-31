"use strict";
/**
 * SMS Notifier
 * Sends daily suggestions and alerts via Sinch SMS
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSNotifier = void 0;
class SMSNotifier {
    constructor() {
        this.config = {
            keyId: process.env.SINCH_KEY_ID || '',
            keySecret: process.env.SINCH_KEY_SECRET || '',
            projectId: process.env.SINCH_PROJECT_ID || '',
            fromNumber: process.env.SINCH_NUMBER || '',
            toNumber: process.env.MY_PERSONAL_NUMBER || '',
        };
        this.enabled = !!(this.config.keyId &&
            this.config.keySecret &&
            this.config.projectId &&
            this.config.fromNumber &&
            this.config.toNumber);
        if (!this.enabled) {
            console.warn('⚠️ SMS notifications disabled: Missing Sinch configuration');
        }
    }
    async sendDailySuggestion(suggestion) {
        if (!this.enabled) {
            console.log('📱 [SMS DISABLED] Would send:\n', suggestion);
            return { success: true, messageId: 'disabled' };
        }
        return this.sendSMS(suggestion);
    }
    async sendAlert(title, message) {
        const alertText = `🚨 ${title}\n\n${message}`;
        if (!this.enabled) {
            console.log('📱 [SMS DISABLED] Alert:\n', alertText);
            return { success: true, messageId: 'disabled' };
        }
        return this.sendSMS(alertText);
    }
    async sendTradeExecuted(opportunityTitle, amount, platform) {
        const message = `🎯 TRADE EXECUTED\n\n` +
            `${opportunityTitle}\n` +
            `💰 Amount: $${amount.toFixed(2)}\n` +
            `📍 Platform: ${platform}\n` +
            `⏰ ${new Date().toLocaleTimeString()}`;
        return this.sendAlert('Trade Executed', message);
    }
    async sendTradeResult(opportunityTitle, profit, isWin) {
        const emoji = isWin ? '✅' : '❌';
        const message = `${emoji} TRADE ${isWin ? 'WON' : 'LOST'}\n\n` +
            `${opportunityTitle}\n` +
            `${isWin ? '🎉 Profit' : '📉 Loss'}: ${profit > 0 ? '+' : ''}$${profit.toFixed(2)}`;
        return this.sendAlert(isWin ? 'Trade Won!' : 'Trade Lost', message);
    }
    async sendDailySummary(tradesExecuted, wins, losses, profit, balance) {
        const winRate = tradesExecuted > 0 ? (wins / tradesExecuted * 100).toFixed(1) : '0';
        const message = `📊 DAILY SUMMARY\n\n` +
            `📈 Trades: ${tradesExecuted} (${wins}W/${losses}L)\n` +
            `🎯 Win Rate: ${winRate}%\n` +
            `${profit >= 0 ? '💰' : '📉'} P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)}\n` +
            `💵 Balance: $${balance.toFixed(2)}\n\n` +
            `${profit >= 250 ? '🔥 TARGET HIT!' : profit >= 100 ? '📈 Good day!' : profit > 0 ? '✅ Profitable' : '⏳ Tomorrow is another day'}`;
        return this.sendSMS(message);
    }
    async sendOpportunityAlert(title, confidence, expectedValue, action) {
        const message = `🎯 OPPORTUNITY ALERT\n\n` +
            `${title}\n` +
            `📊 Confidence: ${confidence}%\n` +
            `📈 EV: +${expectedValue.toFixed(1)}%\n\n` +
            `🎬 ${action}`;
        return this.sendSMS(message);
    }
    async sendSMS(message) {
        try {
            // Sinch REST API
            const url = `https://sms.api.sinch.com/xms/v1/${this.config.projectId}/batches`;
            const auth = Buffer.from(`${this.config.keyId}:${this.config.keySecret}`).toString('base64');
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`,
                },
                body: JSON.stringify({
                    from: this.config.fromNumber,
                    to: [this.config.toNumber],
                    body: this.truncateMessage(message),
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                console.error('SMS send error:', error);
                return { success: false, error };
            }
            const data = await response.json();
            console.log(`📱 SMS sent: ${data.id}`);
            return { success: true, messageId: data.id };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('SMS error:', errorMsg);
            return { success: false, error: errorMsg };
        }
    }
    truncateMessage(message, maxLength = 1600) {
        // SMS can be up to 1600 chars (10 segments)
        if (message.length <= maxLength)
            return message;
        return message.substring(0, maxLength - 3) + '...';
    }
    isConfigured() {
        return this.enabled;
    }
}
exports.SMSNotifier = SMSNotifier;
//# sourceMappingURL=sms-notifier.js.map
/**
 * SMS Notifier
 * Sends daily suggestions and alerts via Sinch SMS
 */
interface NotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
}
export declare class SMSNotifier {
    private config;
    private enabled;
    constructor();
    sendDailySuggestion(suggestion: string): Promise<NotificationResult>;
    sendAlert(title: string, message: string): Promise<NotificationResult>;
    sendTradeExecuted(opportunityTitle: string, amount: number, platform: string): Promise<NotificationResult>;
    sendTradeResult(opportunityTitle: string, profit: number, isWin: boolean): Promise<NotificationResult>;
    sendDailySummary(tradesExecuted: number, wins: number, losses: number, profit: number, balance: number): Promise<NotificationResult>;
    sendOpportunityAlert(title: string, confidence: number, expectedValue: number, action: string): Promise<NotificationResult>;
    private sendSMS;
    private truncateMessage;
    isConfigured(): boolean;
}
export {};
//# sourceMappingURL=sms-notifier.d.ts.map
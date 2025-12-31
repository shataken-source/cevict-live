/**
 * Alpha Hunter - Main Entry Point
 * Autonomous profit-hunting bot with fund management
 *
 * Commands:
 *   npm run dev        - Start with file watching
 *   npm run daily      - Run daily hunter
 *   npm run scan       - Just scan for opportunities
 *   npm run test       - Test run with simulated data
 */
import 'dotenv/config';
declare class AlphaHunter {
    private brain;
    private funds;
    private sms;
    private kalshi;
    private progno;
    private jobs;
    constructor();
    initialize(): Promise<void>;
    private setupScheduledJobs;
    startScheduler(): void;
    stopScheduler(): void;
    runDailyScan(): Promise<void>;
    runDailyHunt(): Promise<void>;
    runSportsScan(): Promise<void>;
    checkProgress(): Promise<void>;
    sendDailySummary(): Promise<void>;
    deposit(amount: number): Promise<void>;
    withdraw(amount: number): Promise<void>;
    status(): Promise<void>;
}
export { AlphaHunter };
//# sourceMappingURL=index.d.ts.map
import { useStore } from '@/store/useStore';
import { EPGService } from './EPGService';

class AutoEPGRefreshServiceImpl {
    private refreshInterval: ReturnType<typeof setInterval> | null = null;
    private refreshIntervalMs: number = 60 * 60 * 1000; // Default 1 hour

    /**
     * Start automatic EPG refresh
     * @param intervalMs - Refresh interval in milliseconds (default: 1 hour)
     */
    start(intervalMs?: number): void {
        if (this.refreshInterval) {
            this.stop();
        }

        this.refreshIntervalMs = intervalMs || this.refreshIntervalMs;

        // Initial refresh
        this.refresh();

        // Set up interval
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, this.refreshIntervalMs);
    }

    /**
     * Stop automatic EPG refresh
     */
    stop(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Manually trigger EPG refresh
     */
    async refresh(): Promise<void> {
        const { epgUrl, setEpgLastRefresh } = useStore.getState();

        if (!epgUrl) {
            console.log('No EPG URL configured');
            return;
        }

        try {
            console.log('Refreshing EPG data...');
            await EPGService.fetchEPG(epgUrl);
            const now = Date.now();
            setEpgLastRefresh(now);
            console.log('EPG refresh completed at:', new Date(now).toISOString());
        } catch (error) {
            console.error('EPG refresh failed:', error);
        }
    }

    /**
     * Get time since last refresh
     */
    getTimeSinceLastRefresh(): string {
        const { epgLastRefresh } = useStore.getState();

        if (!epgLastRefresh) {
            return 'Never';
        }

        const now = Date.now();
        const diff = now - epgLastRefresh;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ago`;
        } else if (minutes > 0) {
            return `${minutes}m ago`;
        } else {
            return 'Just now';
        }
    }

    /**
     * Check if auto refresh is running
     */
    isRunning(): boolean {
        return this.refreshInterval !== null;
    }

    /**
     * Set custom refresh interval
     * @param intervalMinutes - Interval in minutes
     */
    setInterval(intervalMinutes: number): void {
        this.refreshIntervalMs = intervalMinutes * 60 * 1000;

        // If already running, restart with new interval
        if (this.refreshInterval) {
            this.start(this.refreshIntervalMs);
        }
    }
}

export const AutoEPGRefreshService = new AutoEPGRefreshServiceImpl();

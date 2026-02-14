export interface ParentalSettings {
    enabled: boolean;
    pin: string;
    blockedChannels: string[];
    blockedGenres: string[];
    maxRating: string;
    hideAdultContent: boolean;
}

const DEFAULT_SETTINGS: ParentalSettings = {
    enabled: false,
    pin: '0000',
    blockedChannels: [],
    blockedGenres: [],
    maxRating: 'R',
    hideAdultContent: true,
};

class ParentalControlsServiceImpl {
    private settings: ParentalSettings = { ...DEFAULT_SETTINGS };

    /**
     * Get current settings
     */
    getSettings(): ParentalSettings {
        return { ...this.settings };
    }

    /**
     * Update settings
     */
    updateSettings(updates: Partial<ParentalSettings>): void {
        this.settings = { ...this.settings, ...updates };
    }

    /**
     * Verify PIN
     */
    verifyPin(pin: string): boolean {
        return this.settings.pin === pin;
    }

    /**
     * Change PIN
     */
    changePin(currentPin: string, newPin: string): boolean {
        if (!this.verifyPin(currentPin)) {
            return false;
        }
        this.updateSettings({ pin: newPin });
        return true;
    }

    /**
     * Set new PIN (for first time or reset)
     */
    setPin(pin: string): void {
        this.updateSettings({ pin, enabled: true });
    }

    /**
     * Check if channel is blocked
     */
    isChannelBlocked(channelId: string): boolean {
        return this.settings.blockedChannels.includes(channelId);
    }

    /**
     * Check if genre is blocked
     */
    isGenreBlocked(genre: string): boolean {
        return this.settings.blockedGenres.includes(genre.toLowerCase());
    }

    /**
     * Block/unblock a channel
     */
    toggleChannelBlock(channelId: string): void {
        const blocked = [...this.settings.blockedChannels];
        const index = blocked.indexOf(channelId);

        if (index >= 0) {
            blocked.splice(index, 1);
        } else {
            blocked.push(channelId);
        }

        this.updateSettings({ blockedChannels: blocked });
    }

    /**
     * Block/unblock a genre
     */
    toggleGenreBlock(genre: string): void {
        const blocked = [...this.settings.blockedGenres];
        const genreLower = genre.toLowerCase();
        const index = blocked.indexOf(genreLower);

        if (index >= 0) {
            blocked.splice(index, 1);
        } else {
            blocked.push(genreLower);
        }

        this.updateSettings({ blockedGenres: blocked });
    }

    /**
     * Enable/disable parental controls
     */
    setEnabled(enabled: boolean, pin?: string): void {
        if (enabled && pin) {
            this.updateSettings({ enabled, pin });
        } else {
            this.updateSettings({ enabled });
        }
    }

    /**
     * Check if content should be hidden based on rating
     */
    shouldBlockRating(contentRating: string): boolean {
        const ratings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
        const maxIndex = ratings.indexOf(this.settings.maxRating);
        const contentIndex = ratings.indexOf(contentRating);

        return contentIndex > maxIndex;
    }

    /**
     * Filter channels based on parental settings
     */
    filterChannels<T extends { id: string; group?: string }>(channels: T[]): T[] {
        if (!this.settings.enabled) {
            return channels;
        }

        return channels.filter(channel => {
            if (this.isChannelBlocked(channel.id)) {
                return false;
            }
            if (channel.group && this.isGenreBlocked(channel.group)) {
                return false;
            }
            return true;
        });
    }

    /**
     * Check if parental controls are enabled
     */
    isEnabled(): boolean {
        return this.settings.enabled;
    }

    /**
     * Reset all settings
     */
    reset(): void {
        this.settings = { ...DEFAULT_SETTINGS };
    }
}

export const ParentalControlsService = new ParentalControlsServiceImpl();

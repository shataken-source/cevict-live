import { useStore } from '@/store/useStore';
import { M3UParser } from './M3UParser';

export interface ProviderConfig {
    version: string;
    provider: {
        name: string;
        id: string;
        supportEmail?: string;
        website?: string;
    };
    playlist: {
        url: string;
        type: 'm3u' | 'm3u8' | 'xml';
        auth?: {
            type: 'none' | 'basic' | 'token' | 'xtream';
            username?: string;
            password?: string;
            token?: string;
        };
    };
    epg?: {
        url: string;
        auth?: {
            type: 'none' | 'basic' | 'token';
            username?: string;
            password?: string;
            token?: string;
        };
    };
    settings?: {
        autoRefreshEPG?: boolean;
        refreshIntervalHours?: number;
        adDetection?: boolean;
        defaultVolume?: number;
    };
}

const CONFIG_VERSION = '1.0';

/**
 * Provider Configuration Import Service
 *
 * Allows IPTV providers to create configuration files that automatically
 * set up the app with playlist, credentials, EPG, and settings.
 *
 * Supported formats:
 * - JSON: Direct configuration object
 * - Base64 encoded JSON: For sharing via text/URL
 *
 * Example config file:
 * {
 *   "version": "1.0",
 *   "provider": {
 *     "name": "My IPTV",
 *     "id": "my-iptv-provider"
 *   },
 *   "playlist": {
 *     "url": "https://example.com/playlist.m3u",
 *     "type": "m3u",
 *     "auth": {
 *       "type": "basic",
 *       "username": "user123",
 *       "password": "pass123"
 *     }
 *   },
 *   "epg": {
 *     "url": "https://example.com/epg.xml"
 *   },
 *   "settings": {
 *     "adDetection": true,
 *     "defaultVolume": 70
 *   }
 * }
 */
class ProviderConfigServiceImpl {
    /**
     * Parse and validate a provider configuration file
     */
    parseConfig(content: string): ProviderConfig | null {
        try {
            // Try parsing as JSON
            const config = JSON.parse(content) as ProviderConfig;

            // Validate required fields
            if (!this.validateConfig(config)) {
                console.error('Invalid configuration format');
                return null;
            }

            return config;
        } catch (error) {
            // Try decoding base64
            try {
                const decoded = atob(content);
                const config = JSON.parse(decoded) as ProviderConfig;

                if (!this.validateConfig(config)) {
                    return null;
                }

                return config;
            } catch {
                console.error('Failed to parse configuration:', error);
                return null;
            }
        }
    }

    /**
     * Validate configuration has required fields
     */
    private validateConfig(config: ProviderConfig): boolean {
        if (!config.version) {
            console.error('Missing version field');
            return false;
        }

        if (!config.provider?.name || !config.provider?.id) {
            console.error('Missing provider info');
            return false;
        }

        if (!config.playlist?.url) {
            console.error('Missing playlist URL');
            return false;
        }

        return true;
    }

    /**
     * Import provider configuration
     */
    async importConfig(config: ProviderConfig): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const state = useStore.getState();

            // 1. Set EPG URL if provided
            if (config.epg?.url) {
                state.setEpgUrl(config.epg.url);
            }

            // 2. Update settings if provided
            if (config.settings) {
                if (config.settings.adDetection !== undefined) {
                    state.setAdConfig({ enabled: config.settings.adDetection });
                }
                if (config.settings.defaultVolume !== undefined) {
                    state.setVolume(config.settings.defaultVolume);
                }
            }

            // 3. Build authentication headers
            const headers: Record<string, string> = {};

            // Add authentication headers for playlist
            if (config.playlist.auth) {
                switch (config.playlist.auth.type) {
                    case 'basic':
                        if (config.playlist.auth.username && config.playlist.auth.password) {
                            const credentials = btoa(`${config.playlist.auth.username}:${config.playlist.auth.password}`);
                            headers['Authorization'] = `Basic ${credentials}`;
                        }
                        break;
                    case 'token':
                        if (config.playlist.auth.token) {
                            headers['Authorization'] = `Bearer ${config.playlist.auth.token}`;
                        }
                        break;
                    case 'xtream':
                        // Xtream format: http://host:port/get.php?username=x&password=y
                        // Already encoded in URL
                        break;
                }
            }

            // Add auth headers for EPG if different
            if (config.epg?.auth && config.epg.url !== config.playlist.url) {
                switch (config.epg.auth.type) {
                    case 'basic':
                        if (config.epg.auth.username && config.epg.auth.password) {
                            const credentials = btoa(`${config.epg.auth.username}:${config.epg.auth.password}`);
                            headers['Authorization'] = `Basic ${credentials}`;
                        }
                        break;
                    case 'token':
                        if (config.epg.auth.token) {
                            headers['Authorization'] = `Bearer ${config.epg.auth.token}`;
                        }
                        break;
                }
            }

            // 4. Fetch playlist
            const fetchOptions: RequestInit = {};
            if (Object.keys(headers).length > 0) {
                fetchOptions.headers = headers;
            }

            const response = await fetch(config.playlist.url, fetchOptions);

            if (!response.ok) {
                return {
                    success: false,
                    message: `Failed to fetch playlist: ${response.status} ${response.statusText}`,
                };
            }

            const playlistContent = await response.text();

            // Parse M3U playlist
            const playlist = await M3UParser.parse(
                playlistContent,
                config.provider.id,
                config.provider.name
            );

            if (playlist.channels.length === 0) {
                return {
                    success: false,
                    message: 'No channels found in playlist',
                };
            }

            // Add to store
            state.addPlaylist(playlist);
            state.setCurrentPlaylist(playlist);

            return {
                success: true,
                message: `Successfully imported ${playlist.channels.length} channels from ${config.provider.name}`,
            };
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Generate a configuration file content
     */
    generateConfig(config: Omit<ProviderConfig, 'version'>): string {
        const fullConfig: ProviderConfig = {
            version: CONFIG_VERSION,
            ...config,
        };
        return JSON.stringify(fullConfig, null, 2);
    }

    /**
     * Generate a base64 encoded configuration (for URL sharing)
     */
    generateBase64Config(config: Omit<ProviderConfig, 'version'>): string {
        const json = this.generateConfig(config);
        return btoa(json);
    }

    /**
     * Create configuration from URL parameters (for deep linking)
     */
    parseFromUrlParams(params: Record<string, string>): ProviderConfig | null {
        const url = params.url;
        const name = params.name;
        const id = params.id;
        const user = params.user;
        const pass = params.pass;
        const token = params.token;
        const epgUrl = params.epg;
        const epgUser = params.epg_user;
        const epgPass = params.epg_pass;
        const epgToken = params.epg_token;

        if (!url || !name || !id) {
            return null;
        }

        const config: ProviderConfig = {
            version: CONFIG_VERSION,
            provider: {
                name,
                id,
            },
            playlist: {
                url,
                type: 'm3u',
            },
        };

        // Add playlist auth
        if (user && pass) {
            config.playlist.auth = {
                type: 'basic',
                username: user,
                password: pass,
            };
        } else if (token) {
            config.playlist.auth = {
                type: 'token',
                token,
            };
        }

        // Add EPG
        if (epgUrl) {
            config.epg = {
                url: epgUrl,
            };

            if (epgUser && epgPass) {
                config.epg.auth = {
                    type: 'basic',
                    username: epgUser,
                    password: epgPass,
                };
            } else if (epgToken) {
                config.epg.auth = {
                    type: 'token',
                    token: epgToken,
                };
            }
        }

        return config;
    }
}

export const ProviderConfigService = new ProviderConfigServiceImpl();

export async function validateConsent(userId: string, header?: string) { return { isValid: true }; }
export function getUserIdFromApiKey(key: string | null) { return key ? 'user_' + key.substring(0,8) : 'anonymous'; }

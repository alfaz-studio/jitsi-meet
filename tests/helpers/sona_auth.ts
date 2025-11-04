import { multiremotebrowser } from '@wdio/globals';
import process from 'node:process';

import { IJoinOptions } from './types';

// Global token cache to store tokens across test runs
interface ITokenCacheEntry {
    expiresAt: number; // Unix timestamp
    participant: string;
    token: string;
}

const tokenCache = new Map<string, ITokenCacheEntry>();

/**
 * Automates the user login process via Keycloak.
 *
 * Navigates to the login page, fills in credentials based on the provided
 * options, and submits the form to create an authenticated session.
 *
 * @param {string} displayName - The identifier for the browser instance to log in.
 * @param {IJoinOptions} [options] - Determines which user credentials to use for the login.
 * @returns {Promise<void>} A promise that resolves upon successful login.
 */
export async function loginUser(displayName: string, options?: IJoinOptions) {
    let loginEmail: string | undefined = undefined;
    let loginPassword: string | undefined = undefined;

    if (options?.useActiveToken) {
        loginEmail = process.env.SONA_EMAIL1!;
        loginPassword = process.env.SONA_PASSWORD1!;
    } else if (options?.useTrialingToken) {
        loginEmail = process.env.SONA_EMAIL2!;
        loginPassword = process.env.SONA_PASSWORD2!;
    } else if (options?.useInactiveToken) {
        loginEmail = process.env.SONA_EMAIL3!;
        loginPassword = process.env.SONA_PASSWORD3!;
    }

    if (!loginEmail || !loginPassword) {
        throw new Error("Credentials must be provided in .env file");
    }

    const driver = multiremotebrowser.getInstance(displayName);
    const baseUrl = process.env.BASE_URL || "https://sonacove.com/meet/";

    const baseOrigin = new URL(baseUrl).origin;

    try {
        const safeUrl = `${baseOrigin}/meet/base.html`;

        await driver.url(safeUrl);

        // Inject the auth-service.js script.
        const authServiceUrl = `${baseOrigin}/meet/static/auth-service.js`;

        await driver.execute((scriptUrl: string) => {
            const script = document.createElement("script");

            script.src = scriptUrl;
            document.head.appendChild(script);
        }, authServiceUrl);

        // Wait for the AuthService to be fully ready.
        await driver.waitUntil(
            async () => await driver.execute(() => typeof window.AuthService?.getAuthService === "function"),
            { timeout: 15000, timeoutMsg: "AuthService did not load on the page" }
        );
        console.log("[AUTH] AuthService is ready.");

        const callbackUrl = `${baseOrigin}/static/callback.html`;

        await driver.execute((state: string) => {
            window.AuthService.getAuthService().login({ state });
        }, callbackUrl);

        // Automate the Keycloak login form.
        const usernameInput = await driver.$("#username");

        await usernameInput.waitForDisplayed({
            timeout: 15000,
            timeoutMsg: "Failed to redirect to Keycloak login page.",
        });
        await usernameInput.setValue(loginEmail);
        const passwordInput = await driver.$("#password");

        await passwordInput.setValue(loginPassword);
        await driver.$("#kc-login").click();

        // Wait to be redirected back to our simple callback page.
        await driver.waitUntil(async () => (await driver.getUrl()).startsWith(callbackUrl), {
            timeout: 15000,
            timeoutMsg: "Failed to redirect back to callback.html after login.",
        });
    } catch (error) {
        console.error(`Error fetching Sona token for ${displayName}:`, error);
        throw error;
    }
}


/**
 * Clear the token cache for a specific participant or all participants
 *
 * @param participant - Optional participant name to clear (P1 or P2). If not provided, clears all tokens.
 */
export function clearTokenCache(participant?: string): void {
    if (participant) {
        tokenCache.delete(participant);
        console.log(`Cleared token cache for ${participant}`);
    } else {
        tokenCache.clear();
        console.log('Cleared all token cache');
    }
}

/**
 * Get cached token info for debugging
 *
 * @param participant - Participant name (P1 or P2)
 * @returns Token cache info or null if not cached
 */
export function getCachedTokenInfo(participant: string): { expiresAt: number; isValid: boolean; } | null {
    const entry = tokenCache.get(participant);

    if (!entry) {
        return null;
    }

    return {
        expiresAt: entry.expiresAt,
        isValid: entry.expiresAt > Date.now(),
    };
}

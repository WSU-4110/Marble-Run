import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Replace the real Supabase client with a fake one, so the tests never touch the database.
vi.mock('../js/supabase.js', () => ({
    db: {
        auth: { getSession: vi.fn(), signOut: vi.fn() },
        from: vi.fn(),
    },
}));

import { db } from '../js/supabase.js';
import { startGuestSession, isGuest, getProfile, requireLogin, logout } from '../js/auth.js';

// A small in-memory stand-in for the browser's sessionStorage
function fakeStorage() {
    const data = {};
    return {
        getItem: (key) => (key in data ? data[key] : null),
        setItem: (key, value) => { data[key] = String(value); },
        removeItem: (key) => { delete data[key]; },
    };
}

// Makes db.from('profiles').select(...).eq(...).single() return the given result
function mockProfileQuery(result) {
    const single = vi.fn().mockResolvedValue(result);
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    db.from.mockReturnValue({ select });
    return { select, eq, single };
}

const LOGGED_IN = { data: { session: { user: { id: 'user-123' } } } };
const LOGGED_OUT = { data: { session: null } };
const PROFILE = { id: 'user-123', display_name: 'Jacob', coins: 50 };

beforeEach(() => {
    vi.stubGlobal('sessionStorage', fakeStorage());
    vi.stubGlobal('window', { location: { replace: vi.fn() } });
    vi.spyOn(console, 'error').mockImplementation(() => {});   // keep expected errors out of the output
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
});

describe('startGuestSession', () => {
    it('saves the guest flag in sessionStorage', () => {
        startGuestSession();
        expect(sessionStorage.getItem('mmr-guest')).toBe('true');
    });

    it('can be called twice without breaking anything', () => {
        startGuestSession();
        startGuestSession();
        expect(sessionStorage.getItem('mmr-guest')).toBe('true');
    });
});

describe('isGuest', () => {
    it('is false when no one has started a guest session', () => {
        expect(isGuest()).toBe(false);
    });

    it('is true after startGuestSession()', () => {
        startGuestSession();
        expect(isGuest()).toBe(true);
    });

    it('is false if the flag holds anything other than "true"', () => {
        sessionStorage.setItem('mmr-guest', 'yes');
        expect(isGuest()).toBe(false);
    });
});

describe('getProfile', () => {
    it('returns the guest profile for guests without calling Supabase', async () => {
        startGuestSession();
        const profile = await getProfile();
        expect(profile.display_name).toBe('Guest');
        expect(profile.coins).toBe(0);
        expect(db.auth.getSession).not.toHaveBeenCalled();
    });

    it('returns a fresh copy each time, so changing it cannot change the next guest', async () => {
        startGuestSession();
        const first = await getProfile();
        first.coins = 999;
        const second = await getProfile();
        expect(second.coins).toBe(0);
    });

    it('returns null when no one is logged in', async () => {
        db.auth.getSession.mockResolvedValue(LOGGED_OUT);
        expect(await getProfile()).toBeNull();
        expect(db.from).not.toHaveBeenCalled();
    });

    it("loads the logged-in player's row from the profiles table", async () => {
        db.auth.getSession.mockResolvedValue(LOGGED_IN);
        const query = mockProfileQuery({ data: PROFILE, error: null });

        expect(await getProfile()).toEqual(PROFILE);
        expect(db.from).toHaveBeenCalledWith('profiles');
        expect(query.eq).toHaveBeenCalledWith('id', 'user-123');
    });

    it('returns null and logs an error when the query fails', async () => {
        db.auth.getSession.mockResolvedValue(LOGGED_IN);
        mockProfileQuery({ data: null, error: { message: 'network down' } });

        expect(await getProfile()).toBeNull();
        expect(console.error).toHaveBeenCalled();
    });
});

describe('requireLogin', () => {
    it('sends logged-out visitors back to the login page', async () => {
        db.auth.getSession.mockResolvedValue(LOGGED_OUT);
        expect(await requireLogin()).toBeNull();
        expect(window.location.replace).toHaveBeenCalledWith('index.html');
    });

    it('returns the profile and does not redirect a logged-in player', async () => {
        db.auth.getSession.mockResolvedValue(LOGGED_IN);
        mockProfileQuery({ data: PROFILE, error: null });

        expect(await requireLogin()).toEqual(PROFILE);
        expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('lets guests through without redirecting', async () => {
        startGuestSession();
        const profile = await requireLogin();
        expect(profile.display_name).toBe('Guest');
        expect(window.location.replace).not.toHaveBeenCalled();
    });
});

describe('logout', () => {
    it('clears the guest flag without calling Supabase', async () => {
        startGuestSession();
        await logout();
        expect(isGuest()).toBe(false);
        expect(db.auth.signOut).not.toHaveBeenCalled();
    });

    it('signs a real player out of Supabase', async () => {
        await logout();
        expect(db.auth.signOut).toHaveBeenCalledTimes(1);
    });

    it('sends everyone back to the login page', async () => {
        await logout();
        expect(window.location.replace).toHaveBeenCalledWith('index.html');
    });
});
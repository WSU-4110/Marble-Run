// bot.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BotFactory } from './bot.js';

// BotMarble / RandomEffectBot aren't exported directly, so we obtain instances
// through the public BotFactory (createBot / createBotsForLanes).
// Each test creates its own bot so tests stay independent.

const TRACK_METERS = 100;

// Helper: build a bot with predictable randomness so tests are repeatable.
// RandomEffectBot.onTimerExpired rolls Math.random() < 0.7 -> boost, else slow.
// We stub Math.random per-test to control that roll and the factory's ranges.
function makeBot({ laneIndex = 1, random = () => 0.5 } = {}) {
    const spy = vi.spyOn(Math, 'random').mockImplementation(random);
    const bot = BotFactory.createBot(laneIndex);
    spy.mockRestore(); // restore immediately; randomness only matters at creation
    return bot;
}

describe('BotMarble (via BotFactory)', () => {
    // ------------------------------------------------------------------
    // 1. currentSpeed
    // ------------------------------------------------------------------
    describe('currentSpeed', () => {
        it('returns baseSpeed when no effect or slowdown is active', () => {
            const bot = makeBot();
            // Far in the future, nothing is active yet.
            const now = performance.now() + 1000;
            expect(bot.currentSpeed(now)).toBe(bot.baseSpeed);
        });

        it('returns effect speed while an active boost is in progress', () => {
            const bot = makeBot();
            const now = performance.now();
            // Force a boost effect (5 m/s) that ends in 1000ms.
            bot.effect = { speed: 5, endsAt: now + 1000 };
            expect(bot.currentSpeed(now)).toBe(5);
        });

        it('prioritises the player slowdown over any effect', () => {
            const bot = makeBot();
            const now = performance.now();
            bot.effect = { speed: 5, endsAt: now + 1000 };
            bot.applySlowdown(now, 2000);
            // Slowdown (1 m/s) must win over the boost.
            expect(bot.currentSpeed(now)).toBe(1);
        });
    });

    // ------------------------------------------------------------------
    // 2. applySlowdown
    // ------------------------------------------------------------------
    describe('applySlowdown', () => {
        it('sets the slowdown window relative to the given time', () => {
            const bot = makeBot();
            const now = 10_000;
            bot.applySlowdown(now, 2000);
            expect(bot.slowdownEndsAt).toBe(now + 2000);
            // Inside the window -> slowed
            expect(bot.currentSpeed(now + 1999)).toBe(1);
            // After the window -> back to base speed
            expect(bot.currentSpeed(now + 2000)).toBe(bot.baseSpeed);
        });
    });

    // ------------------------------------------------------------------
    // 3. isFrozen
    // ------------------------------------------------------------------
    describe('isFrozen', () => {
        it('is true inside the slowdown window and false outside it', () => {
            const bot = makeBot();
            const now = 5_000;
            bot.applySlowdown(now, 2000);

            expect(bot.isFrozen(now)).toBe(true);
            expect(bot.isFrozen(now + 1999)).toBe(true);
            expect(bot.isFrozen(now + 2000)).toBe(false);
            expect(bot.isFrozen(now + 5000)).toBe(false);
        });

        it('is false for a freshly created bot', () => {
            const bot = makeBot();
            expect(bot.isFrozen(0)).toBe(false);
        });
    });

    // ------------------------------------------------------------------
    // 4. update
    // ------------------------------------------------------------------
    describe('update', () => {
        it('advances distance by speed * dt', () => {
            const bot = makeBot({ random: () => 0.5 }); // baseSpeed = 3
            const now = performance.now();
            bot.nextExpiry = now + 999_999; // ensure no timer expiry during this step

            bot.update(now, 1, TRACK_METERS); // 1 second at base speed
            expect(bot.distance).toBeCloseTo(3, 5);
            expect(bot.finished).toBe(false);
        });

        it('clamps to trackMeters and marks the bot finished on crossing', () => {
            const bot = makeBot({ random: () => 0.5 });
            const now = performance.now();
            bot.nextExpiry = now + 999_999;
            bot.distance = TRACK_METERS - 1; // 1m from the line

            bot.update(now, 1, TRACK_METERS); // would move 3m

            expect(bot.distance).toBe(TRACK_METERS);
            expect(bot.finished).toBe(true);
            // Coasting speed/decel were initialised from the speed at the line.
            expect(bot.coastSpeed).toBeGreaterThan(0);
            expect(bot.coastDecel).toBeGreaterThan(0);
        });

        it('ignores further driving updates once finished (coasts instead)', () => {
            const bot = makeBot({ random: () => 0.5 });
            const now = performance.now();
            bot.nextExpiry = now + 999_999;
            bot.distance = TRACK_METERS;
            bot.finished = true;
            bot.coastSpeed = 0; // nothing to coast
            bot.coastDecel = 0;

            const before = bot.distance;
            bot.update(now, 1, TRACK_METERS);
            expect(bot.distance).toBe(before); // no movement without coast speed
        });
    });

    // ------------------------------------------------------------------
    // 5. coast
    // ------------------------------------------------------------------
    describe('coast', () => {
        it('decelerates coastSpeed and extends distance past the finish line', () => {
            const bot = makeBot({ random: () => 0.5 });
            const now = performance.now();
            bot.nextExpiry = now + 999_999;
            bot.distance = TRACK_METERS;
            bot.finished = true;
            bot.coastSpeed = 3;
            bot.coastDecel = 0.225; // (3^2) / (2*20)

            const before = bot.distance;
            bot.coast(0.5, TRACK_METERS); // half a second of coasting

            expect(bot.coastSpeed).toBeLessThan(3);
            expect(bot.coastSpeed).toBeGreaterThan(0);
            expect(bot.distance).toBeGreaterThan(before);
        });

        it('stops adding distance once coastSpeed reaches 0', () => {
            const bot = makeBot({ random: () => 0.5 });
            bot.finished = true;
            bot.coastSpeed = 0;
            bot.coastDecel = 1;
            bot.distance = TRACK_METERS;

            bot.coast(1, TRACK_METERS);
            expect(bot.distance).toBe(TRACK_METERS);
        });
    });

    // ------------------------------------------------------------------
    // 6. isMoving
    // ------------------------------------------------------------------
    describe('isMoving', () => {
        it('is true while the bot has not finished', () => {
            const bot = makeBot();
            expect(bot.isMoving()).toBe(true);
        });

        it('is true while still coasting after the finish', () => {
            const bot = makeBot();
            bot.finished = true;
            bot.coastSpeed = 2;
            expect(bot.isMoving()).toBe(true);
        });

        it('is false once finished and coasting has stopped', () => {
            const bot = makeBot();
            bot.finished = true;
            bot.coastSpeed = 0;
            expect(bot.isMoving()).toBe(false);
        });
    });

});
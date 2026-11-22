
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QuestionTimer } from './questionTimer.js';

describe('QuestionTimer Unit Tests', () => {
    let timer;

    beforeEach(() => {
        vi.useFakeTimers();
        timer = new QuestionTimer(5);
    });

    afterEach(() => {
        timer.stop();
        vi.useRealTimers();
    });

    // Test 1: subscribe()
    it('subscribe adds an observer without duplicates', () => {
        const observer = { onTick: vi.fn() };

        timer.subscribe(observer);
        timer.subscribe(observer);

        expect(timer.observers).toHaveLength(1);
        expect(timer.observers).toContain(observer);
    });

    // Test 2: unsubscribe()
    it('unsubscribe removes an observer', () => {
        const observer = { onTick: vi.fn() };

        timer.subscribe(observer);
        timer.unsubscribe(observer);

        expect(timer.observers).not.toContain(observer);
    });

    // Test 3: notify()
    it('notify calls the correct observer method', () => {
        const observer = {
            onTick: vi.fn(),
            onExpire: vi.fn()
        };

        timer.subscribe(observer);
        timer.notify('onTick', 3000, 5000);

        expect(observer.onTick).toHaveBeenCalledWith(3000, 5000);
        expect(observer.onExpire).not.toHaveBeenCalled();
    });

    // Test 4: start()
    it('start begins the countdown', () => {
        timer.start();

        expect(timer.isRunning()).toBe(true);
        expect(timer.endTime).toBe(Date.now() + 5000);
    });

    // Test 5: stop()
    it('stop stops the countdown', () => {
        timer.start();
        timer.stop();

        expect(timer.isRunning()).toBe(false);
        expect(timer.intervalId).toBeNull();
    });

    // Test 6: isRunning()
    it('isRunning reports the timer status', () => {
        expect(timer.isRunning()).toBe(false);

        timer.start();
        expect(timer.isRunning()).toBe(true);

        timer.stop();
        expect(timer.isRunning()).toBe(false);
    });

    // Test 7: tick()
    it('tick notifies observers when time expires', () => {
        const observer = {
            onTick: vi.fn(),
            onExpire: vi.fn()
        };

        timer.subscribe(observer);
        timer.start();

        vi.advanceTimersByTime(5000);

        expect(observer.onTick).toHaveBeenLastCalledWith(0, 5000);
        expect(observer.onExpire).toHaveBeenCalledTimes(1);
        expect(timer.isRunning()).toBe(false);
    });
});

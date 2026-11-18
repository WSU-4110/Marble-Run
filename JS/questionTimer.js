const TICK_MS = 50;

// Seconds allowed per question for each difficulty level.
export const DIFFICULTY_SECONDS = {
    easy: 10,
    medium: 8,
    hard: 6,
};
const DEFAULT_DIFFICULTY = 'easy';

export class QuestionTimer {
    constructor(seconds) {
        this.totalMs = seconds * 1000;
        this.observers = [];
        this.endTime = 0;
        this.intervalId = null;
    }

    // Factory: builds a timer whose length matches the chosen difficulty.
    // Unknown or missing difficulty falls back to easy.
    static forDifficulty(difficulty) {
        const seconds = DIFFICULTY_SECONDS[difficulty] ?? DIFFICULTY_SECONDS[DEFAULT_DIFFICULTY];
        return new QuestionTimer(seconds);
    }



    subscribe(observer) {
        if (!this.observers.includes(observer)) {
            this.observers.push(observer);
        }
    }

    unsubscribe(observer) {
        this.observers = this.observers.filter((o) => o !== observer);
    }

    notify(eventName, ...args) {
        // Copy the list so an observer can unsubscribe during the loop safely.
        for (const observer of [...this.observers]) {
            if (typeof observer[eventName] === 'function') {
                observer[eventName](...args);
            }
        }
    }


    start() {
        this.stop();
        this.endTime = Date.now() + this.totalMs;
        this.intervalId = setInterval(() => this.tick(), TICK_MS);
        this.tick();
    }

    stop() {
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    isRunning() {
        return this.intervalId !== null;
    }

    tick() {
        const msLeft = Math.max(0, this.endTime - Date.now());
        this.notify('onTick', msLeft, this.totalMs);

        if (msLeft === 0) {
            this.stop();
            this.notify('onExpire');
        }
    }
}
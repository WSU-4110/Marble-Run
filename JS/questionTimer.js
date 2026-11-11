const TICK_MS = 50;  

export class QuestionTimer {
    constructor(seconds) {
        this.totalMs = seconds * 1000;
        this.observers = [];
        this.endTime = 0;
        this.intervalId = null;
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
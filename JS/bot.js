// Matches the player's BASE_SPEED in game.js
const BOT_BASE_SPEED = 3;
const BOT_BOOST_SPEED = 5;
const BOT_SLOW_SPEED = 1;


class BotMarble {
    constructor({ laneIndex, baseSpeed, initialTimerMs }) {
        this.laneIndex = laneIndex;
        this.baseSpeed = baseSpeed;
        this.distance = 0;
        this.effect = null;
        
        
        // The time to wait between effects
        this.timerMs = initialTimerMs; 
        this.nextExpiry = performance.now() + initialTimerMs;
        this.finished = false;
    }

    currentSpeed(now) {
        return this.effect && now < this.effect.endsAt
            ? this.effect.speed
            : this.baseSpeed;
    }

    update(now, dt, trackMeters) {
        if (this.finished) return;

        if (now >= this.nextExpiry) {
            this.onTimerExpired(now);
            this.nextExpiry = now + this.timerMs;
        }

        const speed = this.currentSpeed(now);
        this.distance = Math.min(this.distance + speed * dt, trackMeters);

        if (this.distance >= trackMeters) {
            this.finished = true;
        }
    }

    onTimerExpired() {
        throw new Error("onTimerExpired() must be implemented");
    }

    toState() {
        return {
            laneIndex: this.laneIndex,
            distance: this.distance,
            speed: this.currentSpeed(performance.now()),
        };
    }
}

class RandomEffectBot extends BotMarble {
    onTimerExpired(now) {
        const roll = Math.random();
        
        if (roll < 0.7) {
            this.effect = { speed: BOT_BOOST_SPEED, endsAt: now + 1000 };
        } else {
            this.effect = { speed: BOT_SLOW_SPEED, endsAt: now + 1000 };
        }
    }
}

export class BotFactory {
    static createBot(laneIndex) {
        const initialTimerMs = 2000 + Math.random() * 4000;
        
        // Base speed is centered around 3 (the player's speed) 
        // but with a slight ±0.2 variation so the bots don't feel perfectly identical.
        const baseSpeed = BOT_BASE_SPEED + (Math.random() * 0.4 - 0.2);

        return new RandomEffectBot({
            laneIndex,
            baseSpeed,
            initialTimerMs,
        });
    }

    static createBotsForLanes(totalLanes) {
        const bots = [];
        for (let i = 1; i < totalLanes; i++) {
            bots.push(BotFactory.createBot(i));
        }
        return bots;
    }
}
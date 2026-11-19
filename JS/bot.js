// Matches the player's BASE_SPEED in game.js
const BOT_BASE_SPEED = 3;
const BOT_BOOST_SPEED = 5;
const BOT_SLOW_SPEED = 1;
// How far a bot rolls past the finish line before stopping.
// Keep below EXTRA_TRACK in race3d.js (30) so it stays on the track.
const BOT_COAST_METERS = 20;


class BotMarble {
    constructor({ laneIndex, baseSpeed, initialTimerMs }) {
        this.laneIndex = laneIndex;
        this.baseSpeed = baseSpeed;
        this.distance = 0;
        this.effect = null;
        this.slowdownEndsAt = 0;
        
        
        // The time to wait between effects
        this.timerMs = initialTimerMs; 
        this.nextExpiry = performance.now() + initialTimerMs;
        this.finished = false;
        this.coastSpeed = 0;
        this.coastDecel = 0;
    }

    currentSpeed(now) {
        // Prioritize the player's slowdown ability
        if (now < this.slowdownEndsAt) {
            return BOT_SLOW_SPEED;
        }
        return this.effect && now < this.effect.endsAt
            ? this.effect.speed
            : this.baseSpeed;
    }

    applySlowdown(now, duration) {
        this.slowdownEndsAt = now + duration;
    }

    // True while the player's Slow Down ability is affecting this bot.
    // race3d.js and game.js use this to know when to show/hide the freeze
    // animation on the bot's marble.
    isFrozen(now = performance.now()) {
        return now < this.slowdownEndsAt;
    }

    update(now, dt, trackMeters) {
        if (this.finished) {
            this.coast(dt, trackMeters);
            return;
        }

        if (now >= this.nextExpiry) {
            this.onTimerExpired(now);
            this.nextExpiry = now + this.timerMs;
        }

        const speed = this.currentSpeed(now);
        this.distance = Math.min(this.distance + speed * dt, trackMeters);

        if (this.distance >= trackMeters) {
            this.finished = true;
            // Keep rolling past the line and brake to a stop over BOT_COAST_METERS (v² = 2·a·d).
            this.coastSpeed = speed;
            this.coastDecel = (speed * speed) / (2 * BOT_COAST_METERS);
        }
    }

    // After finishing: slow down smoothly instead of stopping dead on the line.
    coast(dt, trackMeters) {
        if (!this.isCoasting()) return;
        this.coastSpeed = Math.max(0, this.coastSpeed - this.coastDecel * dt);
        this.distance = Math.min(this.distance + this.coastSpeed * dt, trackMeters + BOT_COAST_METERS);
    }

    // True while the bot is still racing or still rolling after the finish.
    isCoasting() {
        return this.finished && this.coastSpeed > 0;
    }

    isMoving() {
        return !this.finished || this.isCoasting();
    }

    onTimerExpired() {
        throw new Error("onTimerExpired() must be implemented");
    }

    toState() {
        const now = performance.now();
        return {
            laneIndex: this.laneIndex,
            distance: this.distance,
            speed: this.finished ? this.coastSpeed : this.currentSpeed(now),
            // Exposed so game.js/race3d.js can react to the freeze state
            frozen: this.isFrozen(now),
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
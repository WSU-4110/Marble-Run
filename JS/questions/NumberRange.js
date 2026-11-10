// Value object that resolves numeric bounds from a difficulty string.
// Centralizes what used to be duplicated MIN/MAX/MIN2/MAX2 assignments.
export class NumberRange {
    constructor({ min, max, min2, max2 }) {
        this.min = min;
        this.max = max;
        this.min2 = min2;
        this.max2 = max2;
    }

    // Random integer in [min, max] inclusive.
    nextPrimary() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
    }

    // Random integer in [min2, max2] inclusive (used by multiplication).
    nextSecondary() {
        return Math.floor(Math.random() * (this.max2 - this.min2 + 1)) + this.min2;
    }

    // Primary operand constrained to strictly positive (used by division).
    nextPositivePrimary() {
        return Math.floor(Math.random() * (this.max - this.min + 1)) + this.min + 1;
    }

    nextPositiveSecondary() {
        return Math.floor(Math.random() * (this.max2 - this.min2 + 1)) + this.min2 + 1;
    }
}
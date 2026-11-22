import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlameContext } from '../JS/flameStrategies.js';

describe('FlameContext', () => {
    let strategy;
    let context;
    let parent;
    let scene;

    beforeEach(() => {
        strategy = {
            attach: vi.fn(),
            activate: vi.fn(),
            deactivate: vi.fn(),
            update: vi.fn(),
            dispose: vi.fn()
        };

        parent = {};
        scene = {};

        context = new FlameContext(strategy);
    });

    it('mounts the strategy with the parent and scene', () => {
        context.mount(parent, scene);

        expect(strategy.attach).toHaveBeenCalledWith(parent, scene);
    });

    it('sets a new strategy and disposes the old one', () => {
        const newStrategy = {
            attach: vi.fn(),
            dispose: vi.fn()
        };

        context.mount(parent, scene);
        context.setStrategy(newStrategy);

        expect(strategy.dispose).toHaveBeenCalled();
        expect(newStrategy.attach).toHaveBeenCalledWith(parent, scene);
    });

    it('activates the strategy', () => {
        context.activate();

        expect(strategy.activate).toHaveBeenCalled();
    });

    it('deactivates the strategy', () => {
        context.deactivate();

        expect(strategy.deactivate).toHaveBeenCalled();
    });

    it('updates the strategy', () => {
        context.update(0.5);

        expect(strategy.update).toHaveBeenCalledWith(0.5);
    });

    it('disposes the strategy', () => {
        context.dispose();

        expect(strategy.dispose).toHaveBeenCalled();
    });
});
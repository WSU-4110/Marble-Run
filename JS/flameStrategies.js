// js/flameStrategies.js
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Strategy interface (documented, not enforced at runtime)
 *
 * attach(parent, scene) -> called once when strategy is selected.
 *                          `parent` is a non-rotating anchor positioned
 *                          behind/below the marble by race3d.js.
 * activate()            -> boost started
 * deactivate()          -> boost ended
 * update(dt)            -> called every frame while active
 * dispose()             -> remove all resources
 * ------------------------------------------------------------------ */

export class FlameStrategy {
    attach(/* parent, scene */) {}
    activate() {}
    deactivate() {}
    update(/* dt */) {}
    dispose() {}
}

/* ------------------------------------------------------------------ *
 * Strategy A — cone + point light, trailing like a jet exhaust.
 *
 * Each cone's axis runs along -Z (default) after a -90° X rotation.
 * The wide base sits close to the anchor; the tip streams backward (+Z)
 * and slightly up (+Y), so the flame looks like it's leaving the marble.
 * ------------------------------------------------------------------ */
export class ConeFlameStrategy extends FlameStrategy {
    constructor({ colorInner = 0xffdd33, colorOuter = 0xff4500, size = 0.9 } = {}) {
        super();
        this.colorInner = colorInner;
        this.colorOuter = colorOuter;
        this.size = size;
        this.mesh = null;
        this.light = null;
        this.active = false;
        this.t = 0;
    }

    attach(parent /*, scene */) {
        // Outer glow cone
        const outer = new THREE.Mesh(
            new THREE.ConeGeometry(this.size * 0.55, this.size * 1.6, 12, 1, true),
            new THREE.MeshBasicMaterial({
                color: this.colorOuter,
                transparent: true,
                opacity: 0.75,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
        // Rotate so the cone lies along +Z (axis pointing backward from the marble).
        // Base is near -Z end, tip at +Z end. Default cone has base at -Y, tip at +Y,
        // so rotate -90° about X to bring the tip from +Y to +Z.
        outer.rotation.x = -Math.PI / 2;
        // Push the cone back so its base is near the anchor origin.
        outer.position.set(0, 0.15, this.size * 0.8);

        // Inner hotter core
        const inner = new THREE.Mesh(
            new THREE.ConeGeometry(this.size * 0.28, this.size * 1.1, 10, 1, true),
            new THREE.MeshBasicMaterial({
                color: this.colorInner,
                transparent: true,
                opacity: 0.95,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
        inner.rotation.x = -Math.PI / 2;
        inner.position.set(0, 0.15, this.size * 0.55);

        // Group the two cones so they move/scale together.
        this.mesh = new THREE.Group();
        this.mesh.add(outer);
        this.mesh.add(inner);
        this.mesh.visible = false;

        // Point light for a warm glow, positioned at the base of the flame
        this.light = new THREE.PointLight(0xff5500, 0, 4, 2);
        this.light.position.set(0, 0.15, 0.2);

        parent.add(this.mesh);
        parent.add(this.light);
    }

    activate() {
        this.active = true;
        this.t = 0;
        if (this.mesh) this.mesh.visible = true;
        if (this.light) this.light.intensity = 2.5;
    }

    deactivate() {
        this.active = false;
        if (this.mesh) this.mesh.visible = false;
        if (this.light) this.light.intensity = 0;
    }

    update(dt) {
        if (!this.active || !this.mesh) return;
        this.t += dt;

        // Flicker scale + slight jitter
        const flicker = 0.85 + Math.sin(this.t * 28) * 0.08 + Math.random() * 0.07;
        this.mesh.scale.set(flicker, flicker * (1 + Math.random() * 0.15), flicker);
        this.mesh.rotation.z = Math.sin(this.t * 22) * 0.05;

        if (this.light) {
            this.light.intensity = 2.2 + Math.sin(this.t * 30) * 0.6 + Math.random() * 0.3;
        }
    }

    dispose() {
        if (!this.mesh) return;
        this.mesh.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
        if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
        if (this.light && this.light.parent) this.light.parent.remove(this.light);
        this.mesh = null;
        this.light = null;
    }
}

/* ------------------------------------------------------------------ *
 * Strategy B — sprite billboard (2D canvas flame)
 * ------------------------------------------------------------------ */
export class SpriteFlameStrategy extends FlameStrategy {
    constructor() {
        super();
        this.sprite = null;
        this.light = null;
        this.active = false;
        this.t = 0;
    }

    attach(parent /*, scene */) {
        const texture = makeFlameTexture();
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(1.4, 2.2, 1);
        // Push the sprite back so it trails behind the marble
        this.sprite.position.set(0, 0.2, 0.4);
        this.sprite.visible = false;

        this.light = new THREE.PointLight(0xff6600, 0, 4, 2);
        this.light.position.set(0, 0.2, 0.3);

        parent.add(this.sprite);
        parent.add(this.light);
    }

    activate() {
        this.active = true;
        this.t = 0;
        if (this.sprite) this.sprite.visible = true;
        if (this.light) this.light.intensity = 2.5;
    }

    deactivate() {
        this.active = false;
        if (this.sprite) this.sprite.visible = false;
        if (this.light) this.light.intensity = 0;
    }

    update(dt) {
        if (!this.active || !this.sprite) return;
        this.t += dt;
        const flicker = 0.9 + Math.sin(this.t * 25) * 0.1 + Math.random() * 0.08;
        this.sprite.scale.set(1.4 * flicker, 2.2 * flicker, 1);
        this.sprite.material.opacity = 0.7 + Math.random() * 0.3;
        if (this.light) {
            this.light.intensity = 2 + Math.sin(this.t * 32) * 0.7;
        }
    }

    dispose() {
        if (this.sprite) {
            if (this.sprite.material.map) this.sprite.material.map.dispose();
            this.sprite.material.dispose();
            if (this.sprite.parent) this.sprite.parent.remove(this.sprite);
        }
        if (this.light && this.light.parent) this.light.parent.remove(this.light);
        this.sprite = null;
        this.light = null;
    }
}

/* ------------------------------------------------------------------ *
 * Strategy C — particle flames (sparks trailing behind marble)
 * ------------------------------------------------------------------ */
export class ParticleFlameStrategy extends FlameStrategy {
    constructor({ count = 60, life = 0.6 } = {}) {
        super();
        this.count = count;
        this.life = life;
        this.points = null;
        this.positions = null;
        this.velocities = null;
        this.ages = null;
        this.light = null;
        this.active = false;
    }

    attach(parent /*, scene */) {
        const geometry = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.velocities = new Float32Array(this.count * 3);
        this.ages = new Float32Array(this.count);
        for (let i = 0; i < this.count; i++) this.ages[i] = Math.random();

        geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        const sprite = makeFlameTexture();
        const material = new THREE.PointsMaterial({
            size: 0.22,
            map: sprite,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: 0xffaa33,
        });

        this.points = new THREE.Points(geometry, material);
        this.points.visible = false;

        this.light = new THREE.PointLight(0xff5500, 0, 4, 2);
        this.light.position.set(0, 0.1, 0.2);

        parent.add(this.points);
        parent.add(this.light);
    }

    _respawn(i) {
        // Particles spawn near the anchor (which sits just below/behind the marble)
        // and drift further back (+z) and up (+y) as they age.
        this.positions[i * 3]     = (Math.random() - 0.5) * 0.35;
        this.positions[i * 3 + 1] = Math.random() * 0.25;
        this.positions[i * 3 + 2] = Math.random() * 0.2;
        this.velocities[i * 3]     = (Math.random() - 0.5) * 0.6;
        this.velocities[i * 3 + 1] = 0.3 + Math.random() * 0.5;
        this.velocities[i * 3 + 2] = 0.9 + Math.random() * 0.9;
        this.ages[i] = 0;
    }

    activate() {
        this.active = true;
        if (this.points) this.points.visible = true;
        if (this.light) this.light.intensity = 2.5;
        for (let i = 0; i < this.count; i++) this._respawn(i);
    }

    deactivate() {
        this.active = false;
        if (this.points) this.points.visible = false;
        if (this.light) this.light.intensity = 0;
    }

    update(dt) {
        if (!this.active || !this.points) return;
        for (let i = 0; i < this.count; i++) {
            this.ages[i] += dt / this.life;
            if (this.ages[i] >= 1) this._respawn(i);
            this.positions[i * 3]     += this.velocities[i * 3]     * dt;
            this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
            this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;
        }
        this.points.geometry.attributes.position.needsUpdate = true;
        if (this.light) this.light.intensity = 2 + Math.random() * 0.8;
    }

    dispose() {
        if (this.points) {
            this.points.geometry.dispose();
            if (this.points.material.map) this.points.material.map.dispose();
            this.points.material.dispose();
            if (this.points.parent) this.points.parent.remove(this.points);
        }
        if (this.light && this.light.parent) this.light.parent.remove(this.light);
        this.points = null;
        this.light = null;
    }
}

/* ------------------------------------------------------------------ *
 * Context — the object game.js talks to
 * ------------------------------------------------------------------ */
export class FlameContext {
    constructor(strategy) {
        this.strategy = strategy;
        this.parent = null;
        this.scene = null;
    }

    /** Call once the non-rotating anchor exists in the scene. */
    mount(parent, scene) {
        this.parent = parent;
        this.scene = scene;
        this.strategy.attach(parent, scene);
    }

    /** Swap strategy at runtime (old one is disposed). */
    setStrategy(strategy) {
        this.strategy.dispose();
        this.strategy = strategy;
        if (this.parent) this.strategy.attach(this.parent, this.scene);
    }

    activate()   { this.strategy.activate(); }
    deactivate() { this.strategy.deactivate(); }
    update(dt)   { this.strategy.update(dt); }
    dispose()    { this.strategy.dispose(); }
}

/* ------------------------------------------------------------------ *
 * Helper: generate a soft flame sprite texture on a canvas
 * ------------------------------------------------------------------ */
function makeFlameTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,220,1)');
    g.addColorStop(0.35, 'rgba(255,200,80,0.9)');
    g.addColorStop(0.7, 'rgba(255,90,20,0.5)');
    g.addColorStop(1, 'rgba(255,40,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    // Tear-drop shape
    ctx.moveTo(size / 2, 6);
    ctx.bezierCurveTo(size * 0.9, size * 0.4, size * 0.85, size * 0.95, size / 2, size * 0.95);
    ctx.bezierCurveTo(size * 0.15, size * 0.95, size * 0.1, size * 0.4, size / 2, 6);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
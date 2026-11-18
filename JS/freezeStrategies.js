// js/freezeStrategies.js
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Strategy interface (documented, not enforced at runtime)
 *
 * attach(parent, scene) -> called once when strategy is selected.
 *                          `parent` is a non-rotating anchor positioned
 *                          at the bot marble by race3d.js.
 * activate()            -> slow down started
 * deactivate()          -> slow down ended
 * update(dt)            -> called every frame while active
 * dispose()             -> remove all resources
 * ------------------------------------------------------------------ */

export class FreezeStrategy {
    attach(/* parent, scene */) {}
    activate() {}
    deactivate() {}
    update(/* dt */) {}
    dispose() {}
}

/* ------------------------------------------------------------------ *
 * Strategy A — Ice crystal shell (translucent sphere + spikes).
 * The marble gets encased in a glowing ice bubble with jagged
 * crystal shards sticking out. Slowly rotates and pulses.
 * ------------------------------------------------------------------ */
export class IceCrystalFreezeStrategy extends FreezeStrategy {
    constructor({ radius = 0.62, color = 0x99ddff } = {}) {
        super();
        this.radius = radius;
        this.color = color;
        this.group = null;
        this.shell = null;
        this.wire = null;
        this.crystals = null;
        this.light = null;
        this.active = false;
        this.t = 0;
    }

    attach(parent /*, scene */) {
        this.group = new THREE.Group();
        this.group.visible = false;

        // Translucent ice shell
        this.shell = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius, 20, 14),
            new THREE.MeshPhysicalMaterial({
                color: this.color,
                transparent: true,
                opacity: 0.35,
                roughness: 0.1,
                metalness: 0.1,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
                depthWrite: false,
                side: THREE.DoubleSide,
            })
        );
        this.group.add(this.shell);

        // Wireframe outline to give it a "frozen" crystalline look
        this.wire = new THREE.Mesh(
            new THREE.SphereGeometry(this.radius * 1.01, 10, 6),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                wireframe: true,
                transparent: true,
                opacity: 0.25,
                depthWrite: false,
            })
        );
        this.group.add(this.wire);

        // Jagged crystal spikes radiating outward
        this.crystals = new THREE.Group();
        const spikeGeo = new THREE.ConeGeometry(0.09, 0.32, 4);

        const spikeCount = 10;
        for (let i = 0; i < spikeCount; i++) {
            const spikeMat = new THREE.MeshPhysicalMaterial({
                color: 0xbfefff,
                transparent: true,
                opacity: 0.7,
                roughness: 0.05,
                metalness: 0.2,
                clearcoat: 1,
            });
            const spike = new THREE.Mesh(spikeGeo, spikeMat);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const dir = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            );
            spike.position.copy(dir.clone().multiplyScalar(this.radius * 0.85));
            spike.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 1, 0),
                dir
            );
            const s = 0.7 + Math.random() * 0.6;
            spike.scale.setScalar(s);
            this.crystals.add(spike);
        }
        this.group.add(this.crystals);

        // Cold blue point light
        this.light = new THREE.PointLight(0x66ccff, 0, 3, 2);
        this.group.add(this.light);

        parent.add(this.group);
    }

    activate() {
        this.active = true;
        this.t = 0;
        if (this.group) this.group.visible = true;
        if (this.light) this.light.intensity = 2.0;
        if (this.shell) {
            this.shell.scale.setScalar(0.01);
            this.shell.material.opacity = 0;
        }
    }

    deactivate() {
        this.active = false;
        if (this.group) this.group.visible = false;
        if (this.light) this.light.intensity = 0;
    }

    update(dt) {
        if (!this.active || !this.group) return;
        this.t += dt;

        // Grow-in animation over the first ~0.4s
        const grow = Math.min(1, this.t / 0.4);
        const eased = 1 - Math.pow(1 - grow, 3); // ease-out cubic
        if (this.shell) {
            this.shell.scale.setScalar(eased);
            this.shell.material.opacity = 0.35 * eased;
        }

        // Slow rotation of the whole cage
        this.group.rotation.y += dt * 0.6;

        // Subtle pulse on the shell
        if (this.shell) {
            const pulse = 1 + Math.sin(this.t * 4) * 0.03;
            this.shell.scale.setScalar(eased * pulse);
        }

        // Crystals shimmer
        if (this.crystals) {
            this.crystals.children.forEach((c, i) => {
                c.material.opacity = 0.5 + Math.sin(this.t * 5 + i) * 0.25;
            });
        }

        // Flickering cold light
        if (this.light) {
            this.light.intensity = 1.6 + Math.sin(this.t * 6) * 0.5;
        }
    }

    dispose() {
        if (!this.group) return;
        this.group.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
        if (this.group.parent) this.group.parent.remove(this.group);
        this.group = null;
        this.shell = null;
        this.wire = null;
        this.crystals = null;
        this.light = null;
    }
}

/* ------------------------------------------------------------------ *
 * Strategy B — Frost particles + icy ground ring.
 * Snowflake sparkles orbit the marble while a frosty ring spreads
 * on the ground beneath it.
 * ------------------------------------------------------------------ */
export class FrostParticleFreezeStrategy extends FreezeStrategy {
    constructor({ count = 80, color = 0x88ccff } = {}) {
        super();
        this.count = count;
        this.color = color;
        this.points = null;
        this.positions = null;
        this.velocities = null;
        this.ages = null;
        this.ring = null;
        this.light = null;
        this.active = false;
        this.t = 0;
    }

    attach(parent /*, scene */) {
        // Orbiting particle cloud
        const geo = new THREE.BufferGeometry();
        this.positions = new Float32Array(this.count * 3);
        this.velocities = new Float32Array(this.count * 3);
        this.ages = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            const angle = (i / this.count) * Math.PI * 2;
            const r = 0.65 + Math.random() * 0.25;
            this.positions[i * 3] = Math.cos(angle) * r;
            this.positions[i * 3 + 1] = (Math.random() - 0.5) * 0.8;
            this.positions[i * 3 + 2] = Math.sin(angle) * r;
            this.velocities[i * 3] = -Math.sin(angle) * 0.8;
            this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
            this.velocities[i * 3 + 2] = Math.cos(angle) * 0.8;
            this.ages[i] = Math.random();
        }

        geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

        const sprite = makeFrostTexture();
        const mat = new THREE.PointsMaterial({
            size: 0.14,
            map: sprite,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            color: this.color,
        });

        this.points = new THREE.Points(geo, mat);
        this.points.visible = false;

        // Frost ring on the ground
        this.ring = new THREE.Mesh(
            new THREE.RingGeometry(0.55, 0.85, 32),
            new THREE.MeshBasicMaterial({
                color: 0xaaddff,
                transparent: true,
                opacity: 0.0,
                side: THREE.DoubleSide,
                depthWrite: false,
            })
        );
        this.ring.rotation.x = -Math.PI / 2;
        this.ring.position.y = -0.4;
        this.ring.visible = false;

        this.light = new THREE.PointLight(0x66ccff, 0, 3, 2);

        parent.add(this.points);
        parent.add(this.ring);
        parent.add(this.light);
    }

    activate() {
        this.active = true;
        this.t = 0;
        if (this.points) this.points.visible = true;
        if (this.ring) {
            this.ring.visible = true;
            this.ring.material.opacity = 0;
        }
        if (this.light) this.light.intensity = 2.0;
        for (let i = 0; i < this.count; i++) this.ages[i] = Math.random();
    }

    deactivate() {
        this.active = false;
        if (this.points) this.points.visible = false;
        if (this.ring) this.ring.visible = false;
        if (this.light) this.light.intensity = 0;
    }

    update(dt) {
        if (!this.active || !this.points) return;
        this.t += dt;

        for (let i = 0; i < this.count; i++) {
            this.ages[i] += dt * 0.8;
            if (this.ages[i] >= 1) this.ages[i] -= 1;

            this.positions[i * 3]     += this.velocities[i * 3] * dt;
            this.positions[i * 3 + 1] += this.velocities[i * 3 + 1] * dt;
            this.positions[i * 3 + 2] += this.velocities[i * 3 + 2] * dt;

            // Keep them in a loose orbit band
            const x = this.positions[i * 3];
            const z = this.positions[i * 3 + 2];
            const r = Math.sqrt(x * x + z * z);
            if (r > 0.95 || r < 0.5) {
                const ang = Math.atan2(z, x) + Math.PI * 0.15;
                const nr = 0.65 + Math.random() * 0.2;
                this.positions[i * 3] = Math.cos(ang) * nr;
                this.positions[i * 3 + 2] = Math.sin(ang) * nr;
                this.positions[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
            }
        }
        this.points.geometry.attributes.position.needsUpdate = true;

        if (this.ring) {
            this.ring.material.opacity = Math.min(0.4, this.t * 0.5);
            this.ring.rotation.z += dt * 0.3;
        }
        if (this.light) {
            this.light.intensity = 1.6 + Math.sin(this.t * 7) * 0.4;
        }
    }

    dispose() {
        if (this.points) {
            this.points.geometry.dispose();
            if (this.points.material.map) this.points.material.map.dispose();
            this.points.material.dispose();
            if (this.points.parent) this.points.parent.remove(this.points);
        }
        if (this.ring) {
            this.ring.geometry.dispose();
            this.ring.material.dispose();
            if (this.ring.parent) this.ring.parent.remove(this.ring);
        }
        if (this.light && this.light.parent) this.light.parent.remove(this.light);
        this.points = null;
        this.ring = null;
        this.light = null;
    }
}

/* ------------------------------------------------------------------ *
 * Context — the object race3d.js talks to
 * ------------------------------------------------------------------ */
export class FreezeContext {
    constructor(strategy) {
        this.strategy = strategy;
        this.parent = null;
        this.scene = null;
    }

    mount(parent, scene) {
        this.parent = parent;
        this.scene = scene;
        this.strategy.attach(parent, scene);
    }

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
 * Helper: soft snowflake / frost sprite texture
 * ------------------------------------------------------------------ */
function makeFrostTexture() {
    const size = 64;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(200,235,255,0.8)');
    g.addColorStop(0.8, 'rgba(120,190,255,0.3)');
    g.addColorStop(1, 'rgba(80,150,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // 6-point snowflake arms
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(size / 2, size / 2);
        ctx.lineTo(
            size / 2 + Math.cos(a) * size * 0.42,
            size / 2 + Math.sin(a) * size * 0.42
        );
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}
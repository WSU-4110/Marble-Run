// js/sceneryStrategies.js
import * as THREE from 'three';

/* ------------------------------------------------------------------ *
 * Scenery (Strategy pattern) — 3D objects scattered beside the track.
 * Each landscape gets its own strategy (trees for grass, cacti for
 * desert, ...). race3d.js picks one with createSceneryForLandscape().
 *
 * build(scene, { startZ, endZ }) -> create and add all objects
 * dispose()                      -> remove objects, free GPU memory
 *
 * Subclasses only describe WHAT to place (createAssets + getObjects);
 * the base class handles WHERE (seeded scatter on both track sides).
 * ------------------------------------------------------------------ */

// Small seeded random generator so the layout is the same every race.
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    return m;
}

function flatMaterial(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9, ...extra });
}

export class SceneryStrategy {
    constructor({ seed = 1234 } = {}) {
        this.seed = seed;
        this.group = null;
        this.assets = null;
    }

    // Distance (meters) between rows of objects along the track.
    get spacing() { return 4; }
    // How many objects per row on each side of the track.
    get perRow() { return 2; }
    // Optional scene fog: { color, near, far } in meters, or null for none.
    get fog() { return null; }

    // Shared geometries/materials: { geo: {...}, mat: {...} }. Built once per build().
    createAssets() { return { geo: {}, mat: {} }; }

    // List of { weight, minX, maxX, make(rand, assets) -> Object3D }.
    // minX/maxX = distance from the track center (keep minX > 2 to stay off the lanes).
    getObjects() { return []; }

    build(scene, { startZ, endZ }) {
        this.dispose();
        this.group = new THREE.Group();
        this.group.name = 'scenery';
        this.assets = this.createAssets();

        const kinds = this.getObjects();
        const totalWeight = kinds.reduce((sum, k) => sum + k.weight, 0);
        const rand = mulberry32(this.seed);

        const pick = () => {
            let r = rand() * totalWeight;
            for (const k of kinds) {
                if ((r -= k.weight) <= 0) return k;
            }
            return kinds[kinds.length - 1];
        };

        if (kinds.length) {
            for (let z = startZ; z > endZ; z -= this.spacing) {
                for (const side of [-1, 1]) {
                    for (let n = 0; n < this.perRow; n++) {
                        const kind = pick();
                        const obj = kind.make(rand, this.assets);
                        const x = side * (kind.minX + rand() * (kind.maxX - kind.minX));
                        obj.position.set(x, 0, z - rand() * this.spacing);
                        obj.rotation.y = rand() * Math.PI * 2;
                        obj.scale.multiplyScalar(0.8 + rand() * 0.45);
                        this.group.add(obj);
                    }
                }
            }
        }

        scene.add(this.group);
    }

    dispose() {
        if (this.group) {
            this.group.removeFromParent();
            this.group = null;
        }
        if (this.assets) {
            Object.values(this.assets.geo).forEach(g => g.dispose());
            Object.values(this.assets.mat).forEach(m => m.dispose());
            this.assets = null;
        }
    }
}

/* ------------------------------------------------------------------ *
 * No scenery — used for landscapes that don't have objects yet.
 * ------------------------------------------------------------------ */
export class EmptyScenery extends SceneryStrategy {}

/* ------------------------------------------------------------------ *
 * Grass — round trees, pine trees, bushes and rocks.
 * ------------------------------------------------------------------ */
export class GrassScenery extends SceneryStrategy {
    get spacing() { return 4.5; }
    // Light morning haze: pale blue-white, starts well ahead of the camera.
    get fog() { return { color: 0xdbe9f2, near: 40, far: 220 }; }

    createAssets() {
        return {
            geo: {
                trunk: new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6).translate(0, 0.8, 0),
                canopy: new THREE.IcosahedronGeometry(1.1, 0),
                pine: new THREE.ConeGeometry(0.9, 1.8, 7),
                bush: new THREE.IcosahedronGeometry(0.55, 0),
                rock: new THREE.DodecahedronGeometry(0.5, 0),
            },
            mat: {
                trunk: flatMaterial(0x7a4a26),
                leaves: flatMaterial(0x3f8f3a),
                pine: flatMaterial(0x2c6b35),
                bush: flatMaterial(0x4fa046),
                rock: flatMaterial(0x8a8a8a),
            },
        };
    }

    getObjects() {
        return [
            { weight: 3, minX: 7, maxX: 40, make: makeRoundTree },
            { weight: 2, minX: 7, maxX: 40, make: makePineTree },
            { weight: 3, minX: 3.5, maxX: 25, make: makeBush },
            { weight: 2, minX: 3.5, maxX: 30, make: makeRock },
        ];
    }
}

function makeRoundTree(rand, { geo, mat }) {
    const g = new THREE.Group();
    g.add(mesh(geo.trunk, mat.trunk));
    g.add(mesh(geo.canopy, mat.leaves, 0, 2.1, 0));
    const top = mesh(geo.canopy, mat.leaves, 0.35 - rand() * 0.7, 2.75, 0.35 - rand() * 0.7);
    top.scale.setScalar(0.65);
    g.add(top);
    return g;
}

function makePineTree(rand, { geo, mat }) {
    const g = new THREE.Group();
    const trunk = mesh(geo.trunk, mat.trunk);
    trunk.scale.y = 0.6;
    g.add(trunk);
    g.add(mesh(geo.pine, mat.pine, 0, 1.6, 0));
    const upper = mesh(geo.pine, mat.pine, 0, 2.5, 0);
    upper.scale.setScalar(0.7);
    g.add(upper);
    return g;
}

function makeBush(rand, { geo, mat }) {
    const g = new THREE.Group();
    const blobs = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < blobs; i++) {
        const b = mesh(geo.bush, mat.bush, (rand() - 0.5) * 0.8, 0.35, (rand() - 0.5) * 0.8);
        b.scale.setScalar(0.7 + rand() * 0.5);
        g.add(b);
    }
    return g;
}

function makeRock(rand, { geo, mat }) {
    const r = mesh(geo.rock, mat.rock, 0, 0.2, 0);
    r.scale.set(1 + rand() * 0.5, 0.6, 0.8 + rand() * 0.4);
    const g = new THREE.Group();
    g.add(r);
    return g;
}

/* ------------------------------------------------------------------ *
 * Desert — saguaro cacti, barrel cacti and tumbleweeds.
 * ------------------------------------------------------------------ */
export class DesertScenery extends SceneryStrategy {
    get spacing() { return 6; }

    createAssets() {
        return {
            geo: {
                cactusPart: new THREE.CylinderGeometry(0.14, 0.14, 1, 8),
                cactusCap: new THREE.SphereGeometry(0.14, 8, 6),
                barrel: new THREE.SphereGeometry(0.4, 9, 7),
                flower: new THREE.IcosahedronGeometry(0.1, 0),
                tumbleweed: new THREE.IcosahedronGeometry(0.4, 1),
            },
            mat: {
                cactus: flatMaterial(0x4f8a3c),
                flower: flatMaterial(0xff5fa2),
                tumbleweed: flatMaterial(0xa0804f, { wireframe: true }),
            },
        };
    }

    getObjects() {
        return [
            { weight: 3, minX: 5, maxX: 40, make: makeSaguaro },
            { weight: 3, minX: 3.5, maxX: 20, make: makeBarrelCactus },
            { weight: 1, minX: 3.5, maxX: 15, make: makeTumbleweed },
        ];
    }
}

function makeSaguaro(rand, { geo, mat }) {
    const g = new THREE.Group();
    const h = 2.2 + rand() * 1.2;
    const trunkScale = 1.8;   // trunk is thicker than the arms

    const trunk = mesh(geo.cactusPart, mat.cactus, 0, h / 2, 0);
    trunk.scale.set(trunkScale, h, trunkScale);
    g.add(trunk);
    const top = mesh(geo.cactusCap, mat.cactus, 0, h, 0);
    top.scale.setScalar(trunkScale);
    g.add(top);

    // One arm, sometimes a second on the other side: out, then up.
    const firstSide = rand() < 0.5 ? -1 : 1;
    const sides = rand() < 0.6 ? [firstSide, -firstSide] : [firstSide];
    for (const s of sides) {
        const armY = h * (0.4 + rand() * 0.25);
        const armLen = 0.7 + rand() * 0.5;
        const elbowX = s * 0.62;

        const out = mesh(geo.cactusPart, mat.cactus, s * 0.4, armY, 0);
        out.rotation.z = Math.PI / 2;
        out.scale.y = 0.45;
        g.add(out);
        g.add(mesh(geo.cactusCap, mat.cactus, elbowX, armY, 0));

        const up = mesh(geo.cactusPart, mat.cactus, elbowX, armY + armLen / 2, 0);
        up.scale.y = armLen;
        g.add(up);
        g.add(mesh(geo.cactusCap, mat.cactus, elbowX, armY + armLen, 0));
    }
    return g;
}

function makeBarrelCactus(rand, { geo, mat }) {
    const g = new THREE.Group();
    const body = mesh(geo.barrel, mat.cactus, 0, 0.4, 0);
    body.scale.y = 1.2;
    g.add(body);
    if (rand() < 0.6) g.add(mesh(geo.flower, mat.flower, 0, 0.9, 0));
    return g;
}

function makeTumbleweed(rand, { geo, mat }) {
    const g = new THREE.Group();
    g.add(mesh(geo.tumbleweed, mat.tumbleweed, 0, 0.35, 0));
    return g;
}

/* ------------------------------------------------------------------ *
 * Snow — ice cubes, plus a rare snowman.
 * ------------------------------------------------------------------ */
export class SnowScenery extends SceneryStrategy {
    get spacing() { return 12; }
    get perRow() { return 1; }

    createAssets() {
        return {
            geo: {
                ice: new THREE.BoxGeometry(1, 1, 1),
                snowball: new THREE.SphereGeometry(0.5, 12, 10),
                eye: new THREE.SphereGeometry(0.05, 6, 4),
                nose: new THREE.ConeGeometry(0.06, 0.35, 6).rotateX(Math.PI / 2),
                arm: new THREE.CylinderGeometry(0.025, 0.035, 0.8, 5),
            },
            mat: {
                ice: new THREE.MeshStandardMaterial({
                    color: 0xbfe8ff, roughness: 0.1, metalness: 0.1,
                    transparent: true, opacity: 0.7, flatShading: true,
                }),
                snow: flatMaterial(0xf7fbff, { roughness: 1 }),
                coal: flatMaterial(0x222222),
                carrot: flatMaterial(0xff8a1f),
                stick: flatMaterial(0x6b4423),
            },
        };
    }

    getObjects() {
        return [
            { weight: 24, minX: 3.5, maxX: 35, make: makeIceCubes },
            { weight: 1, minX: 6, maxX: 30, make: makeSnowman },
        ];
    }
}

// A single ice cube, or a small cluster of 2–3 tilted cubes.
function makeIceCubes(rand, { geo, mat }) {
    const g = new THREE.Group();
    const count = rand() < 0.5 ? 1 : 2 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
        const size = 0.5 + rand() * 0.6;
        const cube = mesh(geo.ice, mat.ice,
            i === 0 ? 0 : (rand() - 0.5) * 1.4,
            size / 2,
            i === 0 ? 0 : (rand() - 0.5) * 1.4);
        cube.scale.setScalar(size);
        cube.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI, (rand() - 0.5) * 0.3);
        g.add(cube);
    }
    return g;
}

function makeSnowman(rand, { geo, mat }) {
    const g = new THREE.Group();

    const base = mesh(geo.snowball, mat.snow, 0, 0.45, 0);
    base.scale.setScalar(1.8);
    g.add(base);
    const middle = mesh(geo.snowball, mat.snow, 0, 1.25, 0);
    middle.scale.setScalar(1.3);
    g.add(middle);
    const head = mesh(geo.snowball, mat.snow, 0, 1.85, 0);
    head.scale.setScalar(0.9);
    g.add(head);

    // Face (snowman faces +z)
    g.add(mesh(geo.eye, mat.coal, -0.13, 1.95, 0.41));
    g.add(mesh(geo.eye, mat.coal, 0.13, 1.95, 0.41));
    g.add(mesh(geo.nose, mat.carrot, 0, 1.85, 0.55));

    // Buttons
    for (const y of [1.1, 1.3, 1.5]) {
        g.add(mesh(geo.eye, mat.coal, 0, y, Math.sqrt(0.65 ** 2 - (y - 1.25) ** 2)));
    }

    // Stick arms
    for (const s of [-1, 1]) {
        const arm = mesh(geo.arm, mat.stick, s * 0.85, 1.4, 0);
        arm.rotation.z = s * -1.0;
        g.add(arm);
    }
    return g;
}

/* ------------------------------------------------------------------ *
 * Lava — dark volcanic rocks, alone or in small piles.
 * ------------------------------------------------------------------ */
export class LavaScenery extends SceneryStrategy {
    get spacing() { return 6; }
    // Smoky haze with a warm reddish-orange tint.
    get fog() { return { color: 0x6b3a2a, near: 15, far: 130 }; }

    createAssets() {
        return {
            geo: {
                rock: new THREE.DodecahedronGeometry(0.6, 0),
            },
            mat: {
                rock: flatMaterial(0x2a2422),
                darkRock: flatMaterial(0x1a1615),
            },
        };
    }

    getObjects() {
        return [
            { weight: 3, minX: 3.5, maxX: 35, make: makeDarkRock },
            { weight: 1, minX: 5, maxX: 35, make: makeDarkRockPile },
        ];
    }
}

function makeDarkRock(rand, { geo, mat }) {
    const g = new THREE.Group();
    const r = mesh(geo.rock, rand() < 0.5 ? mat.rock : mat.darkRock, 0, 0.3, 0);
    r.scale.set(1 + rand() * 0.8, 0.6 + rand() * 0.6, 0.9 + rand() * 0.6);
    r.rotation.set(rand() * 0.5, rand() * Math.PI, rand() * 0.5);
    g.add(r);
    return g;
}

function makeDarkRockPile(rand, assets) {
    const g = new THREE.Group();
    const count = 3 + Math.floor(rand() * 3);
    for (let i = 0; i < count; i++) {
        const r = makeDarkRock(rand, assets);
        r.position.set((rand() - 0.5) * 2.2, 0, (rand() - 0.5) * 2.2);
        r.scale.multiplyScalar(0.6 + rand() * 0.7);
        g.add(r);
    }
    return g;
}

/* ------------------------------------------------------------------ *
 * Factory — picks the scenery from the landscape image filename,
 * e.g. 'images/landscapes/desert.png' -> DesertScenery.
 * ------------------------------------------------------------------ */
const SCENERY_BY_LANDSCAPE = {
    landscape: GrassScenery,
    desert: DesertScenery,
    snowland: SnowScenery,
    lava: LavaScenery,
};

export function createSceneryForLandscape(imageUrl) {
    const name = (imageUrl || 'landscape')
        .split('?')[0]
        .split('/').pop()
        .split('.')[0]
        .toLowerCase();
    const Strategy = SCENERY_BY_LANDSCAPE[name] ?? EmptyScenery;
    return new Strategy();
}

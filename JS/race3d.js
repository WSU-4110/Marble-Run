import * as THREE from 'three';

const TRACK_WIDTH = 4;         
const MARBLE_RADIUS = 0.45;     
const MARBLE_IMAGE = 'images/marbles/marble1.jpg';   // image wrapped around the marble
const EXTRA_TRACK = 30;
const CAMERA_BEHIND = 6;        // how far behind the marble the camera sits
const CAMERA_HEIGHT = 2.6;      // how high the camera sits
const CAMERA_LOOK_AHEAD = 6;    // how far ahead of the marble the camera looks
const CAMERA_FOV = 60;          // camera field of view (higher = wider view)
const LANDSCAPE_TILE_METERS = 10; // width of one landscape image on the ground (bigger = fewer seams, but blurrier)

// Three lanes divided evenly across the original TRACK_WIDTH.
// Adjusted slightly from exact thirds to line up with the image's lane markings.
const LANES = [
    { offset: 0, isBot: false },                    // player - center
    { offset: -TRACK_WIDTH / 3.3, isBot: true },    // bot 1 - left
    { offset: TRACK_WIDTH / 3.3, isBot: true },     // bot 2 - right
];

const COLORS = {
    sky: 0xbfe3ff,
    grass: 0x7cc46b,
    track: 0xd9c9a3,
    marble: 0xfca311,
    bot1: 0x3c73f1,   // blue bot
    bot2: 0xae0a0f,   // red bot
    finishDark: '#14213d',
    finishLight: '#ffffff',
};

let renderer, scene, camera, sun;
let ground, track;              // kept so the shop's equipped images can be applied later
let groundLength = 0, trackLength = 0;
let trackMeters = 100;
let distance = 0;

const marbles = new Map();
let botStates = [];

// Builds the scene and resolves once every texture has loaded and the first frame is drawn,
// so the page can stay hidden until then (no flash of plain colors / default images).
// options.images = { marble, landscape, track } equipped image paths (optional).
export async function initRace3D(canvas, options = {}) {
    trackMeters = options.trackMeters ?? 100;
    const images = options.images ?? {};

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.sky);

    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 300);

    addLights();
    const loads = [
        addGround(images.landscape),
        addTrack(images.track),
        ...addMarbles(images.marble),   // player gets the equipped marble, bots their own design
    ];
    addFinishLine();

    resize();
    window.addEventListener('resize', resize);

    // Wait for the images, upload everything to the GPU, then draw the first frame.
    await Promise.all(loads);
    await renderer.compileAsync(scene, camera);
    renderFrame();
    renderer.setAnimationLoop(renderFrame);
}

export function setRaceState(newDistance) {
    distance = newDistance;
}

export function setBotStates(bots) {
    botStates = bots;
}

export function resetRace3D() {
    distance = 0;
    botStates = [];
}

// Swap in the player's equipped shop items: { marble, landscape, track } image paths.
// Any category left out keeps its default image.
export function setEquippedImages(images = {}) {
    const player = marbles.get(0);
    if (!player) return Promise.resolve();
    const loads = [];
    if (images.marble) loads.push(loadMarbleTexture(images.marble, player.material));
    if (images.landscape) loads.push(loadRepeatingTexture(images.landscape, ground.material, LANDSCAPE_TILE_METERS, 300, groundLength));
    if (images.track) loads.push(loadRepeatingTexture(images.track, track.material, TRACK_WIDTH, TRACK_WIDTH, trackLength));
    return Promise.all(loads);
}

// Swap only the player's marble image.
export function setMarbleImage(url) {
    const player = marbles.get(0);
    if (!player) return Promise.resolve();
    return loadMarbleTexture(url, player.material);
}

// ---------- scene setup ----------

function addLights() {
    scene.add(new THREE.HemisphereLight(0xffffff, 0x5a7d4a, 1.2));

    sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    scene.add(sun);
    scene.add(sun.target);
}

function addGround(imageUrl) {
    const length = trackMeters + EXTRA_TRACK + 200;
    groundLength = length;
    const material = new THREE.MeshStandardMaterial({ color: COLORS.grass });
    ground = new THREE.Mesh(new THREE.PlaneGeometry(300, length), material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -length / 2 + 60);
    ground.receiveShadow = true;
    scene.add(ground);

    // Reuse the 2D landscape art as a repeating ground texture (keeps the grass color if the image is missing).
    return loadRepeatingTexture(imageUrl || 'images/landscapes/landscape.jpg', material, LANDSCAPE_TILE_METERS, 300, length);
}

function addTrack(imageUrl) {
    const length = trackMeters + EXTRA_TRACK + 10;
    trackLength = length;
    const centerZ = -length / 2 + 5;

    const material = new THREE.MeshStandardMaterial({ color: COLORS.track });
    track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, length), material);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, centerZ);
    track.receiveShadow = true;
    scene.add(track);

    // Reuse the 2D track art, tiled along the length of the track.
    return loadRepeatingTexture(imageUrl || 'images/tracks/track.png', material, TRACK_WIDTH, TRACK_WIDTH, length);
}

function addFinishLine() {
    const z = -trackMeters;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size * 8;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d');
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 8; col++) {
            ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.finishLight : COLORS.finishDark;
            ctx.fillRect(col * size, row * size, size, size);
        }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(TRACK_WIDTH, TRACK_WIDTH / 4),
        new THREE.MeshStandardMaterial({ map: texture })
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.01, z);
    strip.receiveShadow = true;
    scene.add(strip);
}

// One marble per lane: index 0 is the player, 1 and 2 are bots.
// Returns the image loads so initRace3D can wait for them.
function addMarbles(playerImageUrl) {
    const loads = [];
    LANES.forEach((lane, index) => {
        let color;
        if (index === 0) {
            color = COLORS.marble;
        } else if (index === 1) {
            color = COLORS.bot1;
        } else {
            color = COLORS.bot2;
        }

        const material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.3,
        });
        const marble = new THREE.Mesh(
            new THREE.SphereGeometry(MARBLE_RADIUS, 32, 16),
            material
        );
        marble.castShadow = true;
        marble.position.set(lane.offset, MARBLE_RADIUS, 0);
        scene.add(marble);
        marbles.set(index, marble);

        // Marble designs: the player wears the equipped marble, the bots the default design
        const imageUrl = index === 0 ? (playerImageUrl || MARBLE_IMAGE) : MARBLE_IMAGE;
        loads.push(loadMarbleTexture(imageUrl, material));
    });
    return loads;
}

// ---------- every frame ----------

function renderFrame() {
    const player = marbles.get(0);
    if (player) {
        const playerZ = -distance;
        player.position.set(0, MARBLE_RADIUS, playerZ);
        player.rotation.x = -distance / MARBLE_RADIUS;
    }

    for (const bot of botStates) {
        const mesh = marbles.get(bot.laneIndex);
        if (!mesh) continue;
        const lane = LANES[bot.laneIndex];
        const botZ = -bot.distance;
        mesh.position.set(lane.offset, MARBLE_RADIUS, botZ);
        mesh.rotation.x = -bot.distance / MARBLE_RADIUS;
    }

    const playerZ = -distance;
    camera.position.set(0, CAMERA_HEIGHT, playerZ + CAMERA_BEHIND);
    camera.lookAt(0, MARBLE_RADIUS, playerZ - CAMERA_LOOK_AHEAD);

    sun.position.set(5, 12, playerZ + 6);
    sun.target.position.set(0, 0, playerZ);

    renderer.render(scene, camera);
}

function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

// ---------- helpers ----------

function loadRepeatingTexture(url, material, tileWidthMeters, areaWidthMeters, areaLengthMeters) {
    material.userData.url = url;   // the newest request wins (default vs. equipped image)
    return new Promise((resolve) => new THREE.TextureLoader().load(
        url,
        (texture) => {
            if (material.userData.url !== url) { texture.dispose(); resolve(); return; }
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();   // keeps the texture sharp when seen at a low angle
            const tileLengthMeters = tileWidthMeters * (texture.image.height / texture.image.width);
            texture.repeat.set(areaWidthMeters / tileWidthMeters, areaLengthMeters / tileLengthMeters);
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
            resolve();
        },
        undefined,
        () => { console.warn('Could not load ' + url + ', using a plain color instead.'); resolve(); }
    ));
}

function loadMarbleTexture(url, material) {
    // The image wraps around the ball like a world map, so a 2:1 image (e.g. 1024x512) fits best.
    material.userData.url = url;   // the newest request wins (default vs. equipped image)
    return new Promise((resolve) => new THREE.TextureLoader().load(
        url,
        (texture) => {
            if (material.userData.url !== url) { texture.dispose(); resolve(); return; }
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();   // keeps the texture sharp when seen at a low angle
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
            resolve();
        },
        undefined,
        () => { console.warn('Could not load ' + url + ', using a plain color instead.'); resolve(); }
    ));
}
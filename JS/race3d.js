import * as THREE from 'three';

const TRACK_WIDTH = 4;         
const MARBLE_RADIUS = 0.45;     
const MARBLE_IMAGE = 'images/marbles/marble1.jpg';   // image wrapped around the marble
const EXTRA_TRACK = 30;         
const CAMERA_BEHIND = 6;        // how far behind the marble the camera sits
const CAMERA_HEIGHT = 2.6;      // how high the camera sits
const CAMERA_LOOK_AHEAD = 6;    // how far ahead of the marble the camera looks
const CAMERA_FOV = 30;          // camera field of view (higher = wider view)
const LANDSCAPE_TILE_METERS = 10; // width of one landscape image on the ground (bigger = fewer seams, but blurrier)

const COLORS = {
    sky: 0xbfe3ff,
    grass: 0x7cc46b,
    track: 0xd9c9a3,
    marble: 0xfca311,           // shown until the marble image loads, or if it's missing
    finishDark: '#14213d',
    finishLight: '#ffffff',
};

let renderer, scene, camera, marble, sun;
let ground, track;              // kept so the shop's equipped images can be applied later
let groundLength = 0, trackLength = 0;
let trackMeters = 100;
let distance = 0;



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
        addMarble(images.marble),
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

export function resetRace3D() {
    distance = 0;
}

// Swap in the player's equipped shop items: { marble, landscape, track } image paths.
// Any category left out keeps its default image.
export function setEquippedImages(images = {}) {
    if (!marble) return Promise.resolve();
    const loads = [];
    if (images.marble) loads.push(loadMarbleTexture(images.marble, marble.material));
    if (images.landscape) loads.push(loadRepeatingTexture(images.landscape, ground.material, LANDSCAPE_TILE_METERS, 300, groundLength));
    if (images.track) loads.push(loadRepeatingTexture(images.track, track.material, TRACK_WIDTH, TRACK_WIDTH, trackLength));
    return Promise.all(loads);
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

    // Checkered strip on the track (8 squares across, 2 rows, like the 2D version).
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

function addMarble(imageUrl) {
    const material = new THREE.MeshStandardMaterial({ color: COLORS.marble, roughness: 0.3 });
    marble = new THREE.Mesh(new THREE.SphereGeometry(MARBLE_RADIUS, 32, 16), material);
    marble.castShadow = true;
    scene.add(marble);

    return loadMarbleTexture(imageUrl || MARBLE_IMAGE, material);
}

// ---------- every frame ----------

function renderFrame() {
    // Marble position comes straight from game.js's distance.
    const marbleZ = -distance;
    marble.position.set(0, MARBLE_RADIUS, marbleZ);
    // Spin so it looks like it's rolling: 1 radian per radius of distance traveled.
    marble.rotation.x = -distance / MARBLE_RADIUS;

    // Camera stays a fixed distance behind and above the marble.
    camera.position.set(0, CAMERA_HEIGHT, marbleZ + CAMERA_BEHIND);
    camera.lookAt(0, MARBLE_RADIUS, marbleZ - CAMERA_LOOK_AHEAD);

    // Keep the sun's shadow area centered on the marble.
    sun.position.set(5, 12, marbleZ + 6);
    sun.target.position.set(0, 0, marbleZ);

    renderer.render(scene, camera);
}

function resize() {
    // Always fill the whole window, even if the page's CSS doesn't size the canvas.
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
            material.color.set(0xffffff);   // show the image's real colors
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
            material.color.set(0xffffff);   // show the image's real colors
            material.needsUpdate = true;
            resolve();
        },
        undefined,
        () => { console.warn('Could not load ' + url + ', using a plain color instead.'); resolve(); }
    ));
}
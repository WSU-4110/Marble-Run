import * as THREE from 'three';

const TRACK_WIDTH = 4;         
const MARBLE_RADIUS = 0.45;     
const MARBLE_IMAGE = 'images/marble1.jpg';   // image wrapped around the marble
const EXTRA_TRACK = 30;         
const CAMERA_BEHIND = 6;        // how far behind the marble the camera sits
const CAMERA_HEIGHT = 2.6;      // how high the camera sits
const CAMERA_LOOK_AHEAD = 6;    // how far ahead of the marble the camera looks
const CAMERA_FOV = 60;          // camera field of view (higher = wider view)

const COLORS = {
    sky: 0xbfe3ff,
    grass: 0x7cc46b,
    track: 0xd9c9a3,
    marble: 0xfca311,           // shown until the marble image loads, or if it's missing
    finishDark: '#14213d',
    finishLight: '#ffffff',
};

let renderer, scene, camera, marble, sun;
let trackMeters = 100;
let distance = 0;



export function initRace3D(canvas, options = {}) {
    trackMeters = options.trackMeters ?? 100;

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.sky);

    camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 300);

    addLights();
    addGround();
    addTrack();
    addFinishLine();
    addMarble();

    resize();
    window.addEventListener('resize', resize);

    
    renderer.setAnimationLoop(renderFrame);
}

export function setRaceState(newDistance) {
    distance = newDistance;
}

export function resetRace3D() {
    distance = 0;
}

// Ready for the shop later: profiles.equipped_marble could pick the image here.
export function setMarbleImage(url) {
    if (!marble) return;
    loadMarbleTexture(url, marble.material);
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

function addGround() {
    const length = trackMeters + EXTRA_TRACK + 200;
    const material = new THREE.MeshStandardMaterial({ color: COLORS.grass });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, length), material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, -length / 2 + 60);
    ground.receiveShadow = true;
    scene.add(ground);

    // Reuse the 2D landscape art as a repeating ground texture (keeps the grass color if the image is missing).
    loadRepeatingTexture('images/landscape.png', material, 12, 300, length);
}

function addTrack() {
    const length = trackMeters + EXTRA_TRACK + 10;
    const centerZ = -length / 2 + 5;

    const material = new THREE.MeshStandardMaterial({ color: COLORS.track });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(TRACK_WIDTH, length), material);
    track.rotation.x = -Math.PI / 2;
    track.position.set(0, 0, centerZ);
    track.receiveShadow = true;
    scene.add(track);

    // Reuse the 2D track art, tiled along the length of the track.
    loadRepeatingTexture('images/track.png', material, TRACK_WIDTH, TRACK_WIDTH, length);
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

function addMarble() {
    const material = new THREE.MeshStandardMaterial({ color: COLORS.marble, roughness: 0.3 });
    marble = new THREE.Mesh(new THREE.SphereGeometry(MARBLE_RADIUS, 32, 16), material);
    marble.castShadow = true;
    scene.add(marble);

    loadMarbleTexture(MARBLE_IMAGE, material);
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
    new THREE.TextureLoader().load(
        url,
        (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            const tileLengthMeters = tileWidthMeters * (texture.image.height / texture.image.width);
            texture.repeat.set(areaWidthMeters / tileWidthMeters, areaLengthMeters / tileLengthMeters);
            material.map = texture;
            material.color.set(0xffffff);   // show the image's real colors
            material.needsUpdate = true;
        },
        undefined,
        () => console.warn('Could not load ' + url + ', using a plain color instead.')
    );
}

function loadMarbleTexture(url, material) {
    // The image wraps around the ball like a world map, so a 2:1 image (e.g. 1024x512) fits best.
    new THREE.TextureLoader().load(
        url,
        (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            material.map = texture;
            material.color.set(0xffffff);   // show the image's real colors
            material.needsUpdate = true;
        },
        undefined,
        () => console.warn('Could not load ' + url + ', using a plain color instead.')
    );
}
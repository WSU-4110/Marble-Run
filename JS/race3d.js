import * as THREE from 'three';

const TRACK_WIDTH = 4;         
const MARBLE_RADIUS = 0.45;     
const MARBLE_IMAGE = 'images/marble1.jpg';
const EXTRA_TRACK = 30;         
const CAMERA_BEHIND = 6;        
const CAMERA_HEIGHT = 2.6;      
const CAMERA_LOOK_AHEAD = 6;    
const CAMERA_FOV = 60;          

// Three lanes divided evenly across the original TRACK_WIDTH.
// Adjusted slightly from exact thirds to line up with the image's lane markings.
const LANES = [
    { offset: 0, isBot: false },                             // player - center
    { offset: -TRACK_WIDTH / 3.3, isBot: true },             // bot 1 - left
    { offset: TRACK_WIDTH / 3.3, isBot: true },              // bot 2 - right
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
let trackMeters = 100;
let distance = 0;

const marbles = new Map();
let botStates = [];

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
    addMarbles();

    resize();
    window.addEventListener('resize', resize);

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

export function setMarbleImage(url) {
    const player = marbles.get(0);
    if (!player) return;
    loadMarbleTexture(url, player.material);
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

    loadRepeatingTexture('images/track.png', material, TRACK_WIDTH, TRACK_WIDTH, length);
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

function addMarbles() {
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

        // Marble designs
        if (index === 0 || index === 1 || index === 2) {
            loadMarbleTexture(MARBLE_IMAGE, material);
        }
    });
}

// ---------- every frame ----------

function renderFrame() {
    const player = marbles.get(0);
    if (player) {
        const playerZ = -distance;
        player.position.set(0, MARBLE_RADIUS, playerZ);
        player.rotation.x = -distance / MARBLE_RADIUS;
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
    new THREE.TextureLoader().load(
        url,
        (texture) => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            const tileLengthMeters = tileWidthMeters * (texture.image.height / texture.image.width);
            texture.repeat.set(areaWidthMeters / tileWidthMeters, areaLengthMeters / tileLengthMeters);
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
        },
        undefined,
        () => console.warn('Could not load ' + url + ', using a plain color instead.')
    );
}

function loadMarbleTexture(url, material) {
    new THREE.TextureLoader().load(
        url,
        (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            material.map = texture;
            material.color.set(0xffffff);
            material.needsUpdate = true;
        },
        undefined,
        () => console.warn('Could not load ' + url + ', using a plain color instead.')
    );
}
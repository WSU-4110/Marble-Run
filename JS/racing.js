let canvas = document.getElementById("canvas");
let context = canvas.getContext("2d");

let landscape = new Image();
landscape.src = "images/landscape.png";

let track = new Image();
track.src = "images/track.png";

let imagesLoaded = 0;
function onImageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === 2) {
        resizeCanvas();                 // Draw once both images have loaded
        requestAnimationFrame(frame);   // Start animation
    }
}
landscape.onload = onImageLoaded;
track.onload = onImageLoaded;

// Scroll state
let scrollY = 0;             // Total pixels scrolled so far
const SCROLL_SPEED = 200;    // Pixels per second
let lastTime = 0;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    //canvas.style.background = "rgb(201, 136, 255)"
    drawBackground();
}

function frame(now) {
    // Convert ms to seconds
    if (lastTime === 0) {
        lastTime = now;
    }
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // Advance the scroll
    scrollY = (scrollY + SCROLL_SPEED * dt) % 100000;

    drawBackground();
    requestAnimationFrame(frame);
}

function drawBackground() {
    if (imagesLoaded < 2) {
        return;
    }

    const cw = canvas.width;
    const ch = canvas.height;

    // Original sizes
    var trackW = track.width;
    var trackH = track.height;
    var landW  = landscape.width;
    var landH  = landscape.height;

    const scale = Math.min(1, cw / (landW * 2 + trackW));

    trackW *= scale;
    trackH *= scale;
    landW  *= scale;
    landH  *= scale;

    // Track: centered, tiled vertically, scrolling
    const trackX = (cw - trackW) / 2;
    
    // Offset the starting position by scrollY
    const trackStartY = ((ch - trackH) / 2 + scrollY % trackH) % trackH - trackH;
    const trackCopies = Math.ceil(ch / trackH) + 2;

    for (let i = 0; i < trackCopies; i++) {
        const y = trackStartY + i * trackH;
        context.drawImage(track, trackX, y, trackW, trackH);
    }

    // Landscape: left of track
    const leftX = trackX - landW;
    const landStartY = ((ch - landH) / 2 + scrollY % landH) % landH - landH;
    const landCopies = Math.ceil(ch / landH) + 2;

    for (let i = 0; i < landCopies; i++) {
        const y = landStartY + i * landH;
        context.drawImage(landscape, leftX, y, landW, landH);
    }

    // Landscape: right of track
    const rightX = trackX + trackW;
    for (let i = 0; i < landCopies; i++) {
        const y = landStartY + i * landH;
        context.drawImage(landscape, rightX, y, landW, landH);
    }
}

// Initial size
resizeCanvas();

// Resize whenever window changes (including fullscreen)
window.addEventListener("resize", resizeCanvas);

/*
// For debugging
function logHeight() {
    console.log("Height = " + window.innerHeight);
}
console.log("Height = " + canvas.height);
console.log("Width = " + canvas.width);
window.addEventListener("resize", logHeight);*/

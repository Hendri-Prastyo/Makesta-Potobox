const bgMusic = document.getElementById("bgMusic");

// Autoplay
window.addEventListener("load", () => {
  bgMusic.play().catch(() => {
    console.log("Autoplay diblokir");
  });
});

// Kamera
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const photos = [];
const photosFilters = [];
let step = 1;

const captureBtn = document.getElementById("capture-btn");
const cameraWrapper = document.getElementById("camera-wrapper");

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => video.srcObject = stream);

// Preview
const previewContainer = document.getElementById("previewContainer");
const previewCanvas = document.getElementById("previewCanvas");

const retakeBtn = document.getElementById("retakeBtn");
const nextBtn = document.getElementById("nextBtn");

let lastCapturedImage = null;

// Countdown
let countdownValue = 3, countdownInterval;
const countdownElement = document.getElementById("countdown");
countdownElement.style.display = "none";

function startCountdown(callback) {
  countdownValue = 3;
  countdownElement.textContent = countdownValue;
  countdownElement.style.display = "block";

  countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) countdownElement.textContent = countdownValue;
    else {
      clearInterval(countdownInterval);
      countdownElement.style.display = "none";
      callback();
    }
  }, 1000);
}

// Flash & shutter
const flash = document.getElementById("flashOverlay");
const shutterSound = document.getElementById("shutterSound");

function startCapture(callback) {
  startCountdown(() => {
    flash.style.opacity = 1;
    setTimeout(() => flash.style.opacity = 0, 180);

    shutterSound.currentTime = 0;
    shutterSound.play();

    // Tunggu kamera stabil
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        callback();
      });
    });
  });
}

// Filter system
const filterSelect = document.getElementById("filterSelect");
let currentFilter = "filter-none";

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  video.className = currentFilter;
  previewCanvas.className = currentFilter;
});

// =========================
// CAPTURE FOTO
// =========================
captureBtn.addEventListener("click", () => {

  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }

  // Sembunyikan filter saat capture
  document.querySelectorAll('#filterSelect, .dropdown, #LoadingText')
    .forEach(el => el.style.display = 'none');

  startCapture(() => {

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const tctx = tempCanvas.getContext("2d");

    // Mirror fix → hasil foto dibalik lagi
    tctx.save();
    tctx.translate(tempCanvas.width, 0);
    tctx.scale(-1, 1);
    tctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tctx.restore();

    lastCapturedImage = tempCanvas;
    photos[step - 1] = tempCanvas;
    photosFilters[step - 1] = currentFilter;

    previewCanvas.width = tempCanvas.width;
    previewCanvas.height = tempCanvas.height;
    previewCanvas.getContext("2d").drawImage(tempCanvas, 0, 0);

    previewContainer.style.display = "block";
    cameraWrapper.style.display = "none";
    captureBtn.style.display = "none";
  });
});

// =========================
// RETAKE FOTO
// =========================
retakeBtn.onclick = () => {
  photos[step - 1] = null;
  photosFilters[step - 1] = null;
  lastCapturedImage = null;

  previewContainer.style.display = "none";
  cameraWrapper.style.display = "block";
  captureBtn.style.display = "block";

  // TAMPILKAN KEMBALI FILTER
  document.querySelectorAll('#filterSelect, .dropdown')
    .forEach(el => el.style.display = 'flex');
};

// =========================
// NEXT STEP
// =========================
nextBtn.onclick = () => {

  if (!photos[step - 1]) {
    alert("Ambil foto dulu!");
    return;
  }

  previewContainer.style.display = "none";

  if (step < 3) {
    step++;
    lastCapturedImage = null;

    cameraWrapper.style.display = "block";
    captureBtn.style.display = "block";

    // Tampilkan filter lagi
    document.querySelectorAll('#filterSelect, .dropdown')
      .forEach(el => el.style.display = 'flex');

  } else {
    generateFinal();
  }
};


// =========================
// FINAL RENDER
// =========================
function generateFinal() {

  document.querySelectorAll('.title, .title-bawah, .subtitle, #filterSelect, .dropdown')
    .forEach(el => el.style.display = 'none');

  const loadingText = document.getElementById('loadingText');
  if (loadingText) loadingText.style.display = 'flex';

  canvas.width = 1080;
  canvas.height = 1920;

  const frameW = 768;
  const frameH = 479;

  const posX = (canvas.width - frameW) / 2;
  const positionsY = [130, 705, 1300];

  const extraWidth = 40;
  const extraHeight = 35;
  const offsetX = 10;

  photos.forEach((photo, index) => {

    const photoRatio = photo.width / photo.height;
    const frameRatio = frameW / frameH;

    let sWidth, sHeight, sx, sy;

    if (photoRatio > frameRatio) {
      sHeight = photo.height;
      sWidth = sHeight * frameRatio;
      sx = (photo.width - sWidth) / 2;
      sy = 0;
    } else {
      sWidth = photo.width;
      sHeight = sWidth / frameRatio;
      sx = 0;
      sy = (photo.height - sHeight) / 2;
    }

    const targetW = frameW + extraWidth;
    const targetH = frameH + extraHeight;

    const targetX = posX - (targetW - frameW) / 2 - offsetX;
    const targetY = positionsY[index] - (targetH - frameH) / 2;

    ctx.filter = getCSSFilter(photosFilters[index]);
    ctx.drawImage(photo, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
    ctx.filter = "none";
  });

  const frame = new Image();
  frame.src = "frame.png";

  frame.onload = () => {
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);

    document.getElementById("result").src = canvas.toDataURL("image/png");
    document.getElementById("result-area").style.display = "block";
    document.getElementById("result-area").classList.add("show");

    if (loadingText) loadingText.style.display = 'none';
    if (cameraWrapper) cameraWrapper.style.display = 'none';
  };
}

// =========================
// DOWNLOAD
// =========================
document.getElementById("download-btn").onclick = () => {
  const link = document.createElement("a");
  link.download = "Potobox-Strip.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// =========================
// FILTER MAP
// =========================
function getCSSFilter(className) {
  switch (className) {
    case "filter-sepia": return "sepia(60%)";
    case "filter-grayscale": return "grayscale(100%)";
    case "filter-saturate": return "saturate(200%)";
    case "filter-bright": return "brightness(1.4)";
    case "filter-contrast": return "contrast(1.5)";
    case "filter-hue": return "hue-rotate(90deg)";
    default: return "none";
  }
}






// script.js (revisi lengkap)

// Audio bg
const bgMusic = document.getElementById("bgMusic");
window.addEventListener("load", () => {
  bgMusic.play().catch(() => {
    console.log("Autoplay diblok, perlu klik user");
  });
});

// Kamera & elemen
const video = document.getElementById("video");
const canvas = document.getElementById("canvas"); // final canvas
const ctx = canvas.getContext("2d"); // final ctx
const photos = [];        // akan menyimpan dataURL string
const photosFilters = []; // menyimpan nama class filter
let step = 1;
const captureBtn = document.getElementById("capture-btn");
const cameraWrapper = document.getElementById("camera-wrapper");

navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
  .then(stream => video.srcObject = stream)
  .catch(err => console.error("getUserMedia error:", err));

const previewContainer = document.getElementById("previewContainer");
const previewCanvas = document.getElementById("previewCanvas");
const previewCtx = previewCanvas.getContext("2d");
const retakeBtn = document.getElementById("retakeBtn");
const nextBtn = document.getElementById("nextBtn");
let lastCapturedImage = null; // dataURL string

// Countdown
let countdownValue = 3, countdownInterval;
const countdownElement = document.getElementById("countdown");
if (countdownElement) countdownElement.style.display = "none";

function startCountdown(callback) {
  countdownValue = 3;
  if (countdownElement) {
    countdownElement.textContent = countdownValue;
    countdownElement.style.display = "block";
  }

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    countdownValue--;
    if (countdownValue > 0) {
      if (countdownElement) countdownElement.textContent = countdownValue;
    } else {
      clearInterval(countdownInterval);
      if (countdownElement) countdownElement.style.display = "none";
      callback();
    }
  }, 1000);
}

// Flash & shutter
const flash = document.getElementById("flashOverlay");
const shutterSound = document.getElementById("shutterSound");

function startCapture(callback) {
  startCountdown(() => {
    if (flash) {
      flash.style.opacity = 1;
      setTimeout(() => { flash.style.opacity = 0; }, 180);
    }
    if (shutterSound) {
      shutterSound.currentTime = 0;
      shutterSound.play();
    }

    // Tunggu frame rendering (double rAF)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        callback();
      });
    });
  });
}

// Filter dropdown
const filterSelect = document.getElementById("filterSelect");
let currentFilter = "filter-none";
if (filterSelect) {
  filterSelect.addEventListener("change", () => {
    currentFilter = filterSelect.value;
    video.className = currentFilter;
    previewCanvas.className = currentFilter;
  });
}

// Utility: remove inline display so element falls back to CSS
function restoreDisplay(selectorList) {
  const els = document.querySelectorAll(selectorList);
  els.forEach(el => {
    el.style.removeProperty('display');
  });
}

// Utility: hide via inline (used only when capturing preview)
function hideInline(selectorList) {
  const els = document.querySelectorAll(selectorList);
  els.forEach(el => {
    el.style.setProperty('display', 'none', 'important');
  });
}

// =========================
// CAPTURE FOTO (revisi)
// =========================
captureBtn.addEventListener("click", () => {

  if (bgMusic && bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }

  // hide filter dropdown while capturing to avoid layout shift
  hideInline('#filterSelect, .dropdown');

  startCapture(() => {
    // safety: jika video belum ready, abort gracefully
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn("Video belum siap — coba lagi.");
      // restore filter so user can retry
      restoreDisplay('#filterSelect, .dropdown');
      return;
    }

    // buat canvas sementara baru setiap capture
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    const tctx = tempCanvas.getContext("2d");

    // Video live SUDAH mirror via CSS → foto HARUS dibalik supaya normal
    tctx.save();
    tctx.translate(tempCanvas.width, 0);
    tctx.scale(-1, 1);
    tctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tctx.restore();

    // convert ke dataURL (immutable) — lebih aman daripada menyimpan canvas element
    const dataUrl = tempCanvas.toDataURL("image/png");

    // simpan data URL ke photos array (index berdasarkan step)
    photos[step - 1] = dataUrl;
    photosFilters[step - 1] = currentFilter;

    // simpan lastCapturedImage sebagai dataURL juga
    lastCapturedImage = dataUrl;

    // tampilkan preview (gambar diam) menggunakan image load
    const img = new Image();
    img.onload = () => {
      previewCanvas.width = img.width;
      previewCanvas.height = img.height;
      previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewCtx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;

    // UI: show preview, hide camera
    previewContainer.style.display = "block";
    cameraWrapper.style.display = "none";
    captureBtn.style.display = "none";

    // leave inline display hidden for filters until retake/next resets
  });
});


// =========================
// RETAKE FOTO (revisi)
// =========================
retakeBtn.onclick = () => {
  // clear saved for current step
  photos[step - 1] = null;
  photosFilters[step - 1] = null;
  lastCapturedImage = null;

  // UI: kembali ke kamera
  previewContainer.style.display = "none";
  cameraWrapper.style.display = "block";
  captureBtn.style.display = "block";

  // restore filter/menu display (remove inline style)
  restoreDisplay('#filterSelect, .dropdown');
};


// =========================
// NEXT STEP (revisi)
// =========================
nextBtn.onclick = () => {

  // pastikan foto untuk step ini ada (user sudah capture & belum retake)
  if (!photos[step - 1]) {
    alert("Ambil foto dulu!");
    return;
  }

  // hide preview
  previewContainer.style.display = "none";

  // next step atau generate
  if (step < 3) {
    step++;
    lastCapturedImage = null;

    cameraWrapper.style.display = "block";
    captureBtn.style.display = "block";

    // restore filter/menu display
    restoreDisplay('#filterSelect, .dropdown');

  } else {
    // generate final — gunakan async loader agar tidak muncul hitam
    generateFinal();
  }
};


// =========================
// Generate final (async, menunggu load semua image)
// =========================
async function generateFinal() {

  // tampilkan loading teks (jika ada elementnya)
  const loading = document.getElementById("loadingText");
  if (loading) loading.style.display = "block";

  // hide UI controls
  const elementsToHide = document.querySelectorAll('.title, .title-bawah, .subtitle, #filterSelect, .dropdown');
  elementsToHide.forEach(el => el.style.display = 'none');

  // set ukuran final canvas sesuai frame.png (kamu pakai 1080x1920)
  canvas.width = 1080;
  canvas.height = 1920;

  const frameW = 768;
  const frameH = 479;
  const posX = (canvas.width - frameW) / 2;
  const positionsY = [130, 705, 1300];

  const extraWidth = 40;
  const extraHeight = 35;
  const offsetX = 10;

  // load all photos into Image objects in-order
  const loadedImages = await Promise.all(photos.map((src, idx) => {
    return new Promise((resolve) => {
      if (!src) {
        // buat canvas kosong sebagai placeholder (hitam) agar index konsisten
        const empty = document.createElement('canvas');
        empty.width = frameW;
        empty.height = frameH;
        const ectx = empty.getContext('2d');
        ectx.fillStyle = 'black';
        ectx.fillRect(0, 0, empty.width, empty.height);
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = empty.toDataURL();
      } else {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = src;
      }
    });
  }));

  // gambar setiap foto ke canvas final
  loadedImages.forEach((photo, index) => {
    // hitung crop agar sesuai frameRatio
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

    // apply filter per-photo (photosFilters should align)
    const f = photosFilters[index] || "filter-none";
    ctx.filter = getCSSFilter(f);

    // draw
    ctx.drawImage(photo, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);

    ctx.filter = "none";
  });

  // overlay frame
  await new Promise(resolve => {
    const frame = new Image();
    frame.src = "frame.png";
    frame.onload = () => {
      ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    frame.onerror = () => resolve(); // fallback
  });

  // set result image
  const resultEl = document.getElementById("result");
  if (resultEl) resultEl.src = canvas.toDataURL("image/png");

  const resultArea = document.getElementById("result-area");
  if (resultArea) {
    resultArea.style.display = "block";
    resultArea.classList.add("show");
  }

  // hide loading
  if (loading) loading.style.display = "none";

  // hide camera
  cameraWrapper.style.display = "none";
}


// Download
document.getElementById("download-btn").onclick = () => {
  const link = document.createElement("a");
  link.download = "Potobox-Strip.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
};

// Helper: map class ke filter string CSS
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

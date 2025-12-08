const bgMusic = document.getElementById("bgMusic");

// Coba autoplay saat load halaman (desktop)
window.addEventListener("load", () => {
  bgMusic.play().catch(() => {
    console.log("Autoplay diblok, perlu klik user");
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

navigator.mediaDevices.getUserMedia({ video: { facingMode:"user" } })
  .then(stream => video.srcObject = stream);

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
    if(countdownValue>0) countdownElement.textContent = countdownValue;
    else { clearInterval(countdownInterval); countdownElement.style.display="none"; callback(); }
  },1000);
}

// Flash & shutter
const flash = document.getElementById("flashOverlay");
const shutterSound = document.getElementById("shutterSound");

function startCapture(callback){
  startCountdown(()=>{
    flash.style.opacity=1;
    setTimeout(()=>flash.style.opacity=0,180);
    shutterSound.currentTime=0;
    shutterSound.play();
    setTimeout(()=>callback(),200);
  });
}

// Filter dropdown
const filterSelect = document.getElementById("filterSelect");
let currentFilter = "filter-none";

filterSelect.addEventListener("change", () => {
  currentFilter = filterSelect.value;
  video.className = currentFilter;
  previewCanvas.className = currentFilter;
});


// Capture foto
captureBtn.addEventListener("click", () => {
  // Play music jika belum play
  if(bgMusic.paused){
    bgMusic.play().catch(() => {
      console.log("Klik user diperlukan untuk play music");
    });
  }

   const elementsToHide = document.querySelectorAll('.filter-buttons, .dropdown');
  elementsToHide.forEach(el => el.style.display = 'none');

  // Lanjut proses capture
  startCapture(() => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    const tempCtx = tempCanvas.getContext("2d");
tempCtx.save();
tempCtx.scale(-1, 1); // flip horizontal supaya hasil foto normal
tempCtx.drawImage(video, -tempCanvas.width, 0, tempCanvas.width, tempCanvas.height);
tempCtx.restore();


    lastCapturedImage = tempCanvas;

    previewCanvas.width = tempCanvas.width;
    previewCanvas.height = tempCanvas.height;
    previewCanvas.getContext("2d").drawImage(tempCanvas, 0, 0);

    cameraWrapper.style.display = "none";
    captureBtn.style.display = "none";

     // Hide elemen lain (judul, subtitle, dropdown filter)
    const elementsToHide = document.querySelectorAll('#filterSelect, .dropdown');
    elementsToHide.forEach(el => el.style.display = 'none');

    previewContainer.style.display = "block";
    // Simpan foto dan filter
    photos.push(lastCapturedImage);
    photosFilters.push(currentFilter);
  });
});


retakeBtn.onclick = () => {
  previewContainer.style.display="none";
  cameraWrapper.style.display="block";
  captureBtn.style.display="block";

  // Hapus foto terakhir jika retake
  const elementsToShow = document.querySelectorAll('#filterSelect, .dropdown');
  elementsToShow.forEach(el => el.style.display = '');

  photos.pop();
  photosFilters.pop();
};

nextBtn.onclick = () => {
  photos.push(lastCapturedImage);
  previewContainer.style.display="none";

  if(step<3){
    step++;
    captureBtn.textContent="Ambil Foto";
    captureBtn.style.display="block";
    cameraWrapper.style.display="block";

    const elementsToShow = document.querySelectorAll('#filterSelect, .dropdown');
    elementsToShow.forEach(el => el.style.display = '');
  } else {
    generateFinal();
  }
};

// Generate final
function generateFinal(){
  const elementsToHide = document.querySelectorAll('.title, .title-bawah, .subtitle, #filterSelect, .dropdown');
  elementsToHide.forEach(el => el.style.display = 'none');

  canvas.width=1080;
  canvas.height=1920;

  const frameW=768;
  const frameH=479;
  const posX=(canvas.width-frameW)/2;
  const positionsY=[130,705,1300];

const extraWidth = 40;
const extraHeight = 35;
const offsetX = 10; // geser foto sedikit ke kiri

photos.forEach((photo, index) => {
  const photoRatio = photo.width / photo.height;
  const frameRatio = frameW / frameH;

  let sWidth, sHeight, sx, sy;

  if(photoRatio > frameRatio){
    sHeight = photo.height;
    sWidth = sHeight * frameRatio;
    sx = (photo.width - sWidth)/2;
    sy = 0;
  } else {
    sWidth = photo.width;
    sHeight = sWidth / frameRatio;
    sx = 0;
    sy = (photo.height - sHeight)/2;
  }

  const targetW = frameW + extraWidth;
  const targetH = frameH + extraHeight;
  const targetX = posX - (targetW - frameW)/2 - offsetX; // geser ke kiri
  const targetY = positionsY[index] - (targetH - frameH)/2;

  // Terapkan filter masing-masing foto
    ctx.filter = getCSSFilter(photosFilters[index]);
    ctx.drawImage(photo, sx, sy, sWidth, sHeight, targetX, targetY, targetW, targetH);
    ctx.filter = "none"; // reset supaya frame tidak ikut
});






  // Frame overlay
  const frame=new Image();
  frame.src="frame.png";
  frame.onload=()=>{
    ctx.drawImage(frame,0,0,canvas.width,canvas.height);
    document.getElementById("result").src=canvas.toDataURL("image/png");
    document.getElementById("result-area").style.display="block";
    document.getElementById("result-area").classList.add("show");
  };

  cameraWrapper.style.display="none";
}

// Download
document.getElementById("download-btn").onclick=()=>{
  const link=document.createElement("a");
  link.download="Potobox-Strip.png";
  link.href=canvas.toDataURL("image/png");
  link.click();
};

// Helper: map class ke filter string CSS
function getCSSFilter(className){
  switch(className){
    case "filter-sepia": return "sepia(60%)";
    case "filter-grayscale": return "grayscale(100%)";
    case "filter-saturate": return "saturate(200%)";
    case "filter-bright": return "brightness(1.4)";
    case "filter-contrast": return "contrast(1.5)";
    case "filter-hue": return "hue-rotate(90deg)";
    default: return "none";
  }
}

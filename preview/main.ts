import { CRTEffect, presets } from 'crt-fx';
import type { CRTOptions } from 'crt-fx';
import { ControlsUI, setupDragDrop, populatePresets } from './ui.js';

// Elements
const canvas = document.getElementById('crt-canvas') as HTMLCanvasElement;
const dropZone = document.getElementById('drop-zone') as HTMLElement;
const dropOverlay = document.getElementById('drop-overlay') as HTMLElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
const controlsContainer = document.getElementById('controls-container') as HTMLElement;
const animateBtn = document.getElementById('animate-toggle') as HTMLButtonElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

// State
let crt: CRTEffect | null = null;
let animating = false;
let imageLoaded = false;

// Initialize CRT
function initCRT(options: CRTOptions = {}): CRTEffect {
  if (crt) {
    crt.dispose();
  }
  crt = new CRTEffect(canvas, options);
  return crt;
}

// Handle options change from UI
function onOptionsChange(options: CRTOptions): void {
  if (!crt) {
    crt = initCRT(options);
  } else {
    crt.setOptions(options);
  }
  if (animating) {
    crt.start();
  }
}

// Controls UI
const ui = new ControlsUI(controlsContainer, onOptionsChange);

// Initialize with default (no effects)
crt = initCRT({});

// File loading
async function loadFile(file: File): Promise<void> {
  if (!crt) return;
  dropOverlay.classList.add('hidden');
  await crt.loadImage(file);
  imageLoaded = true;
  if (animating) {
    crt.start();
  }
}

async function loadDefaultImage(): Promise<void> {
  // Generate a colorful test pattern as default
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 640;
  testCanvas.height = 480;
  const ctx = testCanvas.getContext('2d')!;

  // Dark background
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, 640, 480);

  // Color bars
  const colors = ['#fff', '#ff0', '#0ff', '#0f0', '#f0f', '#f00', '#00f'];
  const barWidth = 640 / colors.length;
  for (let i = 0; i < colors.length; i++) {
    ctx.fillStyle = colors[i];
    ctx.fillRect(i * barWidth, 40, barWidth, 300);
  }

  // Gradient below
  const grad = ctx.createLinearGradient(0, 360, 640, 360);
  grad.addColorStop(0, '#000');
  grad.addColorStop(1, '#fff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 350, 640, 40);

  // Text
  ctx.fillStyle = '#33ff33';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CRT-FX TEST PATTERN', 320, 28);

  ctx.fillStyle = '#ffb000';
  ctx.font = '14px monospace';
  ctx.fillText('Drop an image or use File > Load Image', 320, 420);
  ctx.fillText('640×480 · WebGL', 320, 445);

  // Circle patterns for testing curvature
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  for (let r = 40; r < 240; r += 40) {
    ctx.beginPath();
    ctx.arc(320, 200, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Grid
  ctx.strokeStyle = '#222';
  for (let x = 0; x < 640; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 480);
    ctx.stroke();
  }
  for (let y = 0; y < 480; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(640, y);
    ctx.stroke();
  }

  if (crt) {
    await crt.loadImage(testCanvas);
    imageLoaded = true;
    dropOverlay.classList.add('hidden');
  }
}

// Drag and drop
setupDragDrop(dropZone, dropOverlay, loadFile);

// File input
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) loadFile(file);
});

// Presets
populatePresets(presetSelect, presets);
presetSelect.addEventListener('change', () => {
  const name = presetSelect.value;
  if (name && presets[name]) {
    ui.applyPreset(presets[name]);
  }
});

// Animate toggle
animateBtn.addEventListener('click', () => {
  animating = !animating;
  if (animating) {
    animateBtn.textContent = '⏸ Stop';
    crt?.start();
  } else {
    animateBtn.textContent = '▶ Animate';
    crt?.stop();
  }
});

// Export
exportBtn.addEventListener('click', async () => {
  if (!crt || !imageLoaded) return;
  const blob = await crt.exportBlob('image/png');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crt-export.png';
  a.click();
  URL.revokeObjectURL(url);
});

// Reset
resetBtn.addEventListener('click', () => {
  presetSelect.value = '';
  ui.reset();
});

// Load test pattern on start
loadDefaultImage();

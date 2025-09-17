#!/usr/bin/env node
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Create public directory if it doesn't exist
const publicDir = join(projectRoot, 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

// List of WASM files to copy from onnxruntime-web
const wasmFiles = [
  'ort-wasm.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
];

// Copy ONNX Runtime WASM files
const onnxPath = join(projectRoot, 'node_modules', 'onnxruntime-web', 'dist');
wasmFiles.forEach(file => {
  const src = join(onnxPath, file);
  const dest = join(publicDir, file);

  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`✓ Copied ${file}`);
  } else {
    console.warn(`⚠ File not found: ${file}`);
  }
});

// Also copy VAD model and worklet files if they exist
const vadModelPath = join(projectRoot, 'node_modules', '@ricky0123', 'vad-web', 'dist');
const vadFiles = [
  'silero_vad.onnx',
  'silero_vad_legacy.onnx',
  'vad.worklet.bundle.min.js',
  'vad.worklet.bundle.dev.js'
];

vadFiles.forEach(file => {
  const src = join(vadModelPath, file);
  const dest = join(publicDir, file);

  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`✓ Copied VAD file: ${file}`);
  }
});

console.log('\n✨ WASM and VAD files copied successfully!');
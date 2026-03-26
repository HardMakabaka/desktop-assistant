import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const repoDir = process.cwd();
const outputDir = path.join(repoDir, 'src', 'renderer', 'public', 'tesseract');
const workerSource = path.join(repoDir, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const coreSourceDir = path.join(repoDir, 'node_modules', 'tesseract.js-core');

async function main() {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  await cp(workerSource, path.join(outputDir, 'worker.min.js'));

  const coreFiles = [
    'tesseract-core.js',
    'tesseract-core.wasm',
    'tesseract-core.wasm.js',
    'tesseract-core-lstm.js',
    'tesseract-core-lstm.wasm',
    'tesseract-core-lstm.wasm.js',
    'tesseract-core-simd.js',
    'tesseract-core-simd.wasm',
    'tesseract-core-simd.wasm.js',
    'tesseract-core-simd-lstm.js',
    'tesseract-core-simd-lstm.wasm',
    'tesseract-core-simd-lstm.wasm.js'
  ];

  await Promise.all(
    coreFiles.map(file => cp(path.join(coreSourceDir, file), path.join(outputDir, file))),
  );
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});

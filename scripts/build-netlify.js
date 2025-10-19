#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'dist');
const SKIP_ENTRIES = new Set([
  'dist',
  'node_modules',
  '.git',
  '.gitmodules',
  '.github',
  '.netlify',
  '.cache',
  '.idea',
  '.vscode'
]);

function resetOutputDir() {
  if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outputDir, { recursive: true });
}

function copyEntry(srcPath, destPath) {
  const stats = fs.statSync(srcPath);

  if (stats.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    for (const entry of fs.readdirSync(srcPath)) {
      copyEntry(path.join(srcPath, entry), path.join(destPath, entry));
    }
    return;
  }

  if (stats.isFile()) {
    fs.copyFileSync(srcPath, destPath);
  }
}

function buildBundle() {
  resetOutputDir();

  for (const entry of fs.readdirSync(rootDir)) {
    if (SKIP_ENTRIES.has(entry)) {
      continue;
    }

    const sourcePath = path.join(rootDir, entry);
    const destPath = path.join(outputDir, entry);
    copyEntry(sourcePath, destPath);
  }

  const landingIndex = path.join(outputDir, 'apps', 'landing', 'index.html');
  const publicIndex = path.join(outputDir, 'public', 'index.html');
  const rootIndex = path.join(outputDir, 'index.html');

  if (!fs.existsSync(rootIndex)) {
    if (fs.existsSync(landingIndex)) {
      fs.copyFileSync(landingIndex, rootIndex);
    } else if (fs.existsSync(publicIndex)) {
      fs.copyFileSync(publicIndex, rootIndex);
    }
  }
}

buildBundle();

console.log(`Netlify bundle ready in ${outputDir}`);

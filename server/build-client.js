// build-client.js
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.join(__dirname, 'client');

console.log('Installing client dependencies...');
const npmInstall = spawn('npm', ['install'], { cwd: clientDir, stdio: 'inherit' });

npmInstall.on('close', (code) => {
  if (code !== 0) {
    console.error('Failed to install client dependencies');
    process.exit(1);
  }

  console.log('Installing Vite globally...');
  const installVite = spawn('npm', ['install', '-g', 'vite'], { stdio: 'inherit' });

  installVite.on('close', (code) => {
    if (code !== 0) {
      console.error('Failed to install Vite globally');
      process.exit(1);
    }

    console.log('Building client with Vite...');
    
    // Check if vite.config.js exists
    const viteConfigPath = path.join(clientDir, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
      console.log('Using existing vite.config.js');
    } else {
      console.log('Creating minimal vite.config.js');
      const minimalConfig = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist'
  }
})
      `;
      fs.writeFileSync(viteConfigPath, minimalConfig);
    }

    // Run vite build directly
    const viteBuild = spawn('npx', ['vite', 'build'], { cwd: clientDir, stdio: 'inherit' });

    viteBuild.on('close', (code) => {
      if (code !== 0) {
        console.error('Vite build failed');
        process.exit(1);
      }

      console.log('Client build successful');
    });
  });
});
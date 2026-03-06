import { build } from 'vite'

async function buildProject() {
  try {
    await build({
      configFile: './vite.config.js',
      base: './',
      logLevel: 'info',
    })
    console.log('✅ Build completed successfully!')
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

buildProject()

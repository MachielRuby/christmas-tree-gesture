/**
 * main.js — 应用入口
 * 串联：Three.js 场景 ↔ MediaPipe 手势检测 ↔ 交互控制
 */
import './style.css'
import { createScene, updateScene, onResize } from './scene.js'
import { initHandLandmarker, startCamera, detectHands, classifyGesture, drawLandmarks } from './gesture.js'
import { applyGestureControl } from './controls.js'

// ─── DOM 引用 ──────────────────────────────────────────────────
const canvas        = document.getElementById('canvas')
const videoEl       = document.getElementById('video')
const landmarkCanvas = document.getElementById('landmark-canvas')
const gestureLabel  = document.getElementById('gesture-label')
const loadingOverlay = document.getElementById('loading-overlay')
const loadingText   = document.getElementById('loading-text')
const retryBtn      = document.getElementById('camera-retry-btn')

// ─── 帧率计时 ──────────────────────────────────────────────────
let lastTime = performance.now()

// ─── 主启动函数 ────────────────────────────────────────────────
async function main() {
  // 1. 初始化 Three.js 场景
  setLoadingText('正在搭建 3D 场景…')
  const sceneCtx = createScene(canvas)

  // 2. 初始化 MediaPipe
  setLoadingText('正在加载 AI 手势模型…')
  let handLandmarker = null
  try {
    handLandmarker = await initHandLandmarker()
    console.log('✅ MediaPipe 模型加载成功')
  } catch (err) {
    console.error('❌ MediaPipe 初始化失败：', err)
    setLoadingText('⚠️ 模型加载失败，请检查网络连接')
    setTimeout(() => hideLoading(), 2000)
  }

  // 3. 启动摄像头
  if (handLandmarker) {
    setLoadingText('请允许摄像头权限…')
    const tryStart = async () => {
      try {
        await startCamera(videoEl)
        setupLandmarkCanvas()
        console.log('✅ 摄像头启动成功')
        hideLoading()
        retryBtn.style.display = 'none'
        return true
      } catch (err) {
        console.error('❌ 摄像头启动失败：', err)
        setLoadingText('⚠️ ' + err.message)
        retryBtn.style.display = 'block'
        retryBtn.onclick = tryStart
        return false
      }
    }
    
    const success = await tryStart()
    if (!success) {
      handLandmarker = null
    }
  } else {
    hideLoading()
  }

  // 4. 响应窗口尺寸
  window.addEventListener('resize', () => onResize(sceneCtx.renderer, sceneCtx.camera))

  // 5. 启动渲染循环
  const lCtx = landmarkCanvas.getContext('2d')
  requestAnimationFrame(function loop(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1)
    lastTime = now

    // 手势检测
    if (handLandmarker) {
      const detectResult = detectHands(handLandmarker, videoEl)
      const gesture = classifyGesture(detectResult)

      // 绘制骨架
      drawLandmarks(
        lCtx,
        detectResult?.landmarks,
        landmarkCanvas.width,
        landmarkCanvas.height
      )

      // 应用控制
      const label = applyGestureControl(gesture, sceneCtx)
      const debugGesture = window.__DEBUG_GESTURE || 'None'
      const debugConf = window.__DEBUG_CONFIDENCE || '0%'
      gestureLabel.textContent = label ?? `等待手势… [${debugGesture} ${debugConf}]`
    }

    // 更新 3D 场景
    updateScene(sceneCtx, delta)

    requestAnimationFrame(loop)
  })
}

// ─── 同步 landmark canvas 尺寸到视频 ──────────────────────────
function setupLandmarkCanvas() {
  const sync = () => {
    landmarkCanvas.width  = videoEl.videoWidth  || 640
    landmarkCanvas.height = videoEl.videoHeight || 480
  }
  videoEl.addEventListener('loadeddata', sync)
  sync()
}

// ─── 工具：更新加载文字 ────────────────────────────────────────
function setLoadingText(text) {
  loadingText.textContent = text
}

function hideLoading() {
  loadingOverlay.classList.add('hidden')
  setTimeout(() => { loadingOverlay.style.display = 'none' }, 600)
}

// ─── 启动 ──────────────────────────────────────────────────────
main().catch(console.error)

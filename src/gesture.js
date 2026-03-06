/**
 * gesture.js — MediaPipe GestureRecognizer 手势识别
 *
 * 使用 MediaPipe 官方 GestureRecognizer，识别精度更高
 *   Pointing_Up (1指) → 'one'   (旋转)
 *   Victory (2指)     → 'two'   (缩放)
 *   ILoveYou (3指)    → 'three' (切换彩灯)
 *   Open_Palm (5指)   → 'five'  (开启/关闭飘雪)
 */
import { FilesetResolver, GestureRecognizer } from '@mediapipe/tasks-vision'

// ─── 手势映射表 ────────────────────────────────────────────────
const GESTURE_MAP = {
  'Pointing_Up': 'rotate',   // 食指指向上 → 旋转
  'Victory': 'lights',       // V手势 → 切换彩灯
  'ILoveYou': 'snow',        // 我爱你手势 → 切换飘雪
  'Closed_Fist': 'closer',   // 拳头 → 靠近（持续）
  'Open_Palm': 'farther',    // 张开手掌 → 远离（持续）
  'Thumb_Up': 'fireworks',   // 拇指向上 → 烟火特效
  'Thumb_Down': 'shake',     // 拇指向下 → 摇动树
}

// ─── 初始化 GestureRecognizer ──────────────────────────────────
export async function initHandLandmarker() {
  const vision = await FilesetResolver.forVisionTasks('/wasm')

  const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
      delegate: 'CPU',
    },
    numHands: 1,
    runningMode: 'VIDEO',
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  return gestureRecognizer
}

// ─── 启动摄像头 ────────────────────────────────────────────────
export async function startCamera(videoEl) {
  // 检查浏览器支持
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('浏览器不支持摄像头访问（可能需要 HTTPS）')
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 }, 
        facingMode: 'user' 
      },
      audio: false,
    })
    
    videoEl.srcObject = stream
    
    // 等待视频元数据加载
    await new Promise((resolve, reject) => {
      videoEl.onloadedmetadata = () => {
        videoEl.play().then(resolve).catch(reject)
      }
      videoEl.onerror = () => reject(new Error('视频加载失败'))
      
      // 超时保护
      setTimeout(() => reject(new Error('摄像头启动超时')), 10000)
    })
    
    console.log('摄像头分辨率：', videoEl.videoWidth, 'x', videoEl.videoHeight)
    return stream
  } catch (err) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      throw new Error('摄像头权限被拒绝')
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      throw new Error('未找到摄像头设备')
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      throw new Error('摄像头被其他应用占用')
    } else {
      throw err
    }
  }
}

// ─── 每帧检测 ──────────────────────────────────────────────────
let lastVideoTime = -1

export function detectHands(gestureRecognizer, videoEl) {
  if (videoEl.currentTime === lastVideoTime) return null
  lastVideoTime = videoEl.currentTime

  const result = gestureRecognizer.recognizeForVideo(videoEl, performance.now())
  
  // 返回 { landmarks, gestureName, confidence }
  return {
    landmarks: result.landmarks?.[0] || null,
    gestureName: result.gestures?.[0]?.[0]?.categoryName || null,
    confidence: result.gestures?.[0]?.[0]?.score || 0,
  }
}

// ─── 手势分类 ──────────────────────────────────────────────────
export function classifyGesture(detectResult) {
  if (!detectResult || !detectResult.gestureName) return null

  const { gestureName, confidence } = detectResult

  // 调试信息
  if (typeof window !== 'undefined') {
    window.__DEBUG_GESTURE = gestureName
    window.__DEBUG_CONFIDENCE = (confidence * 100).toFixed(0) + '%'
  }

  // 置信度过低则忽略
  if (confidence < 0.5) return null

  // 映射到我们的控制指令
  return GESTURE_MAP[gestureName] || null
}

// ─── 骨架绘制 ──────────────────────────────────────────────────
const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17],
]

export function drawLandmarks(ctx, landmarks, videoWidth, videoHeight) {
  ctx.clearRect(0, 0, videoWidth, videoHeight)
  if (!landmarks) return

  // 连线
  ctx.strokeStyle = 'rgba(0, 255, 150, 0.8)'
  ctx.lineWidth = 2.5
  CONNECTIONS.forEach(([a, b]) => {
    ctx.beginPath()
    ctx.moveTo(landmarks[a].x * videoWidth, landmarks[a].y * videoHeight)
    ctx.lineTo(landmarks[b].x * videoWidth, landmarks[b].y * videoHeight)
    ctx.stroke()
  })

  // 关节点
  landmarks.forEach((pt, idx) => {
    ctx.beginPath()
    ctx.arc(pt.x * videoWidth, pt.y * videoHeight, idx === 0 ? 5 : 3, 0, Math.PI * 2)
    ctx.fillStyle = idx === 0 ? '#ff4466' : '#ffd700'
    ctx.fill()
  })
}

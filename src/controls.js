/**
 * controls.js — 手势 → 3D 场景控制映射
 *
 * 防抖机制：同一手势需持续 HOLD_FRAMES 帧才触发，避免误操作
 */

const HOLD_FRAMES = 3     // 手势稳定帧数阈值（降低让响应更快）
const ROTATE_SPEED = 1.8  // 旋转速度 (rad/s)
const CAMERA_SPEED = 8.0  // 摄像头移动速度（加快）
const CAMERA_MIN   = 4    // 最近距离
const CAMERA_MAX   = 22   // 最远距离
const SHAKE_INTENSITY = 0.15 // 摇动强度

// ─── 手势处理器状态 ────────────────────────────────────────────
const holdState = {
  gesture: null,
  count: 0,
  lastTriggered: null,
}

// ─── 手势 → 动作映射 ───────────────────────────────────────────
const GESTURE_LABELS = {
  rotate:    '☝️ 旋转中…',
  closer:    '✊ 持续靠近…',
  farther:   '🖐️ 持续远离…',
  lights:    '✌️ 切换彩灯',
  snow:      '🤟 切换飘雪',
  fireworks: '👍 烟火爆发！',
  shake:     '👎 摇动模式',
}

// ─── 连续型手势（持续触发）─────────────────────────────────────
const CONTINUOUS_GESTURES = new Set(['rotate', 'closer', 'farther', 'shake'])

// ─── 主处理函数 ────────────────────────────────────────────────
export function applyGestureControl(gesture, sceneCtx) {
  const { camera, state, tree } = sceneCtx

  updateHoldState(gesture)

  if (!holdState.gesture) {
    // 无有效手势：停止所有连续动作
    state.rotationY = 0
    state.shaking = false
    return null
  }

  const g = holdState.gesture

  // 连续型手势
  if (g === 'rotate') {
    state.rotationY = ROTATE_SPEED
    state.shaking = false
    return GESTURE_LABELS.rotate
  }

  if (g === 'closer') {
    state.rotationY = 0
    state.shaking = false
    // 每帧持续移动
    const newZ = THREE_clamp(camera.position.z - CAMERA_SPEED * 0.016, CAMERA_MIN, CAMERA_MAX)
    camera.position.z = newZ
    return GESTURE_LABELS.closer
  }

  if (g === 'farther') {
    state.rotationY = 0
    state.shaking = false
    // 每帧持续移动
    const newZ = THREE_clamp(camera.position.z + CAMERA_SPEED * 0.016, CAMERA_MIN, CAMERA_MAX)
    camera.position.z = newZ
    return GESTURE_LABELS.farther
  }

  if (g === 'shake') {
    state.rotationY = 0
    state.shaking = true
    return GESTURE_LABELS.shake
  }

  // 离散型手势（防重复触发）
  if (holdState.justTriggered) {
    if (g === 'lights') {
      state.lightsVisible = !state.lightsVisible
      return GESTURE_LABELS.lights
    }
    if (g === 'snow') {
      state.snowActive = !state.snowActive
      return GESTURE_LABELS.snow
    }
    if (g === 'fireworks') {
      state.fireworksActive = true
      state.fireworksTimer = 0
      return GESTURE_LABELS.fireworks
    }
  }

  return GESTURE_LABELS[g] ?? null
}

// ─── 内部防抖逻辑 ──────────────────────────────────────────────
function updateHoldState(gesture) {
  holdState.justTriggered = false

  if (gesture === holdState.gesture) {
    holdState.count++
  } else {
    holdState.gesture = gesture
    holdState.count = 0
  }

  if (holdState.count === HOLD_FRAMES) {
    holdState.justTriggered = true
    holdState.lastTriggered = gesture
  }

  if (!CONTINUOUS_GESTURES.has(holdState.gesture)) {
    // 离散手势：只在 justTriggered 时生效
  }
}

// ─── 工具函数 ──────────────────────────────────────────────────
function THREE_clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

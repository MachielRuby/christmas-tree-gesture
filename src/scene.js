/**
 * scene.js — Three.js 场景：3D 圣诞树 + 彩灯 + 飘雪粒子
 */
import * as THREE from 'three'

// ─── 常量 ──────────────────────────────────────────────────────
const SNOW_COUNT = 1200
const LIGHT_COLORS = [0xff2244, 0xffdd00, 0x00eeff, 0xff8800, 0x88ff00]

// ─── 场景创建 ──────────────────────────────────────────────────
export function createScene(canvas) {
  const renderer = buildRenderer(canvas)
  const { scene, camera } = buildSceneAndCamera()
  const tree = buildTree(scene)
  const lights = buildChristmasLights(scene, tree)
  const snow = buildSnow(scene)
  const fireworks = buildFireworks(scene)
  const star = buildStar(scene)
  const envLights = buildEnvLights(scene)

  const state = {
    rotationY: 0,
    lightsVisible: true,
    snowActive: true,
    lightBlinkTimer: 0,
    shaking: false,
    shakeOffset: { x: 0, z: 0 },
    fireworksActive: false,
    fireworksTimer: 0,
  }

  return { renderer, scene, camera, tree, lights, snow, star, state, envLights, fireworks }
}

// ─── 渲染器 ────────────────────────────────────────────────────
function buildRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  return renderer
}

// ─── 场景 & 相机 ───────────────────────────────────────────────
function buildSceneAndCamera() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x030812)
  scene.fog = new THREE.FogExp2(0x050d1a, 0.03)

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  )
  camera.position.set(0, 3.5, 12)
  camera.lookAt(0, 3, 0)

  return { scene, camera }
}

// ─── 3D 圣诞树（多层圆锥叠加） ─────────────────────────────────
function buildTree(scene) {
  const group = new THREE.Group()

  const layers = [
    { ry: 0,   rBottom: 3.8, height: 4.0, y: 0   },
    { ry: 0,   rBottom: 3.0, height: 3.4, y: 2.4 },
    { ry: 0,   rBottom: 2.1, height: 2.8, y: 4.4 },
    { ry: 0,   rBottom: 1.2, height: 2.0, y: 6.0 },
    { ry: 0,   rBottom: 0.55,height: 1.4, y: 7.4 },
  ]

  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a6b2f,
    roughness: 0.85,
    metalness: 0.05,
    envMapIntensity: 0.6,
  })

  layers.forEach(({ rBottom, height, y }) => {
    const geo = new THREE.ConeGeometry(rBottom, height, 10, 1)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = y
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)

    // 每层加一点积雪感（白色顶面）
    const snowGeo = new THREE.ConeGeometry(rBottom * 0.18, height * 0.22, 8)
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xddeeff, roughness: 1 })
    const snowMesh = new THREE.Mesh(snowGeo, snowMat)
    snowMesh.position.y = y + height * 0.45
    group.add(snowMesh)
  })

  // 树干
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.45, 1.5, 8)
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1f, roughness: 0.9 })
  const trunk = new THREE.Mesh(trunkGeo, trunkMat)
  trunk.position.y = -1.0
  trunk.castShadow = true
  group.add(trunk)

  // 地台（雪地）
  const baseGeo = new THREE.CylinderGeometry(4.5, 4.5, 0.25, 32)
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0xddeeff,
    roughness: 0.95,
    metalness: 0,
  })
  const base = new THREE.Mesh(baseGeo, baseMat)
  base.position.y = -1.8
  base.receiveShadow = true
  group.add(base)

  group.position.y = -2
  scene.add(group)
  return group
}

// ─── 彩灯 ──────────────────────────────────────────────────────
export function buildChristmasLights(scene, tree) {
  const group = new THREE.Group()
  const sphereGeo = new THREE.SphereGeometry(0.1, 6, 6)
  const lights = []

  // 螺旋排列
  const total = 80
  for (let i = 0; i < total; i++) {
    const t = i / total
    const angle = t * Math.PI * 14
    const radius = 3.6 - t * 2.8
    const y = t * 9.2

    const color = LIGHT_COLORS[i % LIGHT_COLORS.length]
    const mat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 2.5,
      metalness: 0.3,
      roughness: 0.3,
    })
    const sphere = new THREE.Mesh(sphereGeo, mat)
    sphere.position.set(
      Math.cos(angle) * radius,
      y - 1,
      Math.sin(angle) * radius
    )
    group.add(sphere)
    lights.push({ mesh: sphere, baseColor: color, mat })

    // 每颗灯配一个点光源（降低性能消耗，每 4 颗一个）
    if (i % 4 === 0) {
      const pl = new THREE.PointLight(color, 0.6, 3.5)
      pl.position.copy(sphere.position)
      group.add(pl)
    }
  }

  tree.add(group)
  return { group, lights }
}

// ─── 顶部星星 ──────────────────────────────────────────────────
function buildStar(scene) {
  // 用八面体模拟星星
  const geo = new THREE.OctahedronGeometry(0.45, 0)
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    emissive: 0xffaa00,
    emissiveIntensity: 3,
    roughness: 0.2,
    metalness: 0.8,
  })
  const star = new THREE.Mesh(geo, mat)
  star.position.set(0, 7.9, 0)
  star.rotation.y = Math.PI / 4

  // 星光
  const starLight = new THREE.PointLight(0xffdd88, 2.5, 8)
  starLight.position.copy(star.position)
  scene.add(starLight)
  scene.add(star)

  return { mesh: star, light: starLight }
}

// ─── 飘雪粒子 ──────────────────────────────────────────────────
function buildSnow(scene) {
  const positions = new Float32Array(SNOW_COUNT * 3)
  const velocities = new Float32Array(SNOW_COUNT)
  const offsets = new Float32Array(SNOW_COUNT)

  for (let i = 0; i < SNOW_COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 40
    positions[i * 3 + 1] = Math.random() * 25 - 5
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40
    velocities[i] = 0.02 + Math.random() * 0.04
    offsets[i] = Math.random() * Math.PI * 2
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true,
    depthWrite: false,
  })

  const points = new THREE.Points(geo, mat)
  scene.add(points)

  return { points, positions, velocities, offsets }
}

// ─── 环境光照 ──────────────────────────────────────────────────
function buildEnvLights(scene) {
  const ambient = new THREE.AmbientLight(0x1a2a4a, 1.2)
  scene.add(ambient)

  const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.5)
  dirLight.position.set(5, 15, 8)
  dirLight.castShadow = true
  dirLight.shadow.mapSize.set(1024, 1024)
  dirLight.shadow.camera.near = 1
  dirLight.shadow.camera.far = 40
  dirLight.shadow.camera.left = -10
  dirLight.shadow.camera.right = 10
  dirLight.shadow.camera.top = 15
  dirLight.shadow.camera.bottom = -5
  scene.add(dirLight)

  // 冷调背光（蓝紫）
  const backLight = new THREE.DirectionalLight(0x3344aa, 0.5)
  backLight.position.set(-8, 6, -10)
  scene.add(backLight)

  return { ambient, dirLight, backLight }
}

// ─── 烟火粒子系统 ──────────────────────────────────────────────
function buildFireworks(scene) {
  const FIREWORK_COUNT = 300
  const positions = new Float32Array(FIREWORK_COUNT * 3)
  const colors = new Float32Array(FIREWORK_COUNT * 3)
  const velocities = []
  
  for (let i = 0; i < FIREWORK_COUNT; i++) {
    positions[i * 3] = 0
    positions[i * 3 + 1] = 8
    positions[i * 3 + 2] = 0
    
    const color = new THREE.Color()
    color.setHSL(Math.random(), 1.0, 0.6)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
    
    const theta = Math.random() * Math.PI * 2
    const phi = Math.random() * Math.PI
    const speed = 3 + Math.random() * 2
    velocities.push({
      x: Math.sin(phi) * Math.cos(theta) * speed,
      y: Math.cos(phi) * speed,
      z: Math.sin(phi) * Math.sin(theta) * speed,
      life: 1.0,
    })
  }
  
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  
  const mat = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  
  const points = new THREE.Points(geo, mat)
  scene.add(points)
  
  return { points, positions, velocities, geo, mat }
}

// ─── 帧更新 ────────────────────────────────────────────────────
export function updateScene({ renderer, camera, scene, tree, snow, star, lights, state, fireworks }, delta) {
  // 圣诞树旋转
  tree.rotation.y += state.rotationY * delta

  // 摇动效果
  if (state.shaking) {
    const time = Date.now() * 0.01
    state.shakeOffset.x = Math.sin(time) * 0.15
    state.shakeOffset.z = Math.cos(time * 1.3) * 0.15
    tree.position.x = state.shakeOffset.x
    tree.position.z = state.shakeOffset.z
    tree.rotation.z = Math.sin(time * 0.7) * 0.08
  } else {
    // 平滑归位
    tree.position.x *= 0.9
    tree.position.z *= 0.9
    tree.rotation.z *= 0.9
  }

  // 顶部星星自旋 + 浮动
  star.mesh.rotation.y += delta * 1.2
  star.mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.15
  star.light.intensity = 2.2 + Math.sin(Date.now() * 0.003) * 0.4

  // 彩灯闪烁
  state.lightBlinkTimer += delta
  if (state.lightBlinkTimer > 0.12) {
    state.lightBlinkTimer = 0
    lights.lights.forEach(({ mat, baseColor }) => {
      if (state.lightsVisible && Math.random() > 0.92) {
        mat.emissiveIntensity = 0.3 + Math.random() * 2.5
      } else if (!state.lightsVisible) {
        mat.emissiveIntensity = 0
      }
    })
  }

  // 飘雪
  const pos = snow.positions
  const n = SNOW_COUNT
  for (let i = 0; i < n; i++) {
    if (!state.snowActive) break
    const idx = i * 3
    pos[idx + 1] -= snow.velocities[i]
    pos[idx]     += Math.sin(Date.now() * 0.001 + snow.offsets[i]) * 0.003
    if (pos[idx + 1] < -6) {
      pos[idx + 1] = 22
      pos[idx]     = (Math.random() - 0.5) * 40
      pos[idx + 2] = (Math.random() - 0.5) * 40
    }
  }
  snow.points.geometry.attributes.position.needsUpdate = true

  // 烟火效果
  if (state.fireworksActive) {
    state.fireworksTimer += delta
    fireworks.mat.opacity = Math.min(1, state.fireworksTimer * 3)
    
    const fPos = fireworks.positions
    for (let i = 0; i < fireworks.velocities.length; i++) {
      const v = fireworks.velocities[i]
      v.life -= delta * 0.5
      
      if (v.life > 0) {
        fPos[i * 3]     += v.x * delta
        fPos[i * 3 + 1] += v.y * delta - 9.8 * delta * delta
        fPos[i * 3 + 2] += v.z * delta
        
        v.y -= 9.8 * delta
      }
    }
    fireworks.geo.attributes.position.needsUpdate = true
    
    // 2秒后关闭烟火
    if (state.fireworksTimer > 2) {
      state.fireworksActive = false
      fireworks.mat.opacity = 0
      // 重置烟火位置
      for (let i = 0; i < fireworks.velocities.length; i++) {
        fPos[i * 3] = 0
        fPos[i * 3 + 1] = 8
        fPos[i * 3 + 2] = 0
        const v = fireworks.velocities[i]
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const speed = 3 + Math.random() * 2
        v.x = Math.sin(phi) * Math.cos(theta) * speed
        v.y = Math.cos(phi) * speed
        v.z = Math.sin(phi) * Math.sin(theta) * speed
        v.life = 1.0
      }
    }
  }

  renderer.render(scene, camera)
}

// ─── 响应式尺寸 ────────────────────────────────────────────────
export function onResize(renderer, camera) {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

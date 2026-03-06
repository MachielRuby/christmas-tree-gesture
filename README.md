# 🎄 AI 手势控制圣诞树

基于 Three.js + MediaPipe 的 3D 交互式圣诞树，支持 7 种手势实时控制。

## ✨ 功能特性

- 🎅 **7 种手势控制**
  - ☝️ 食指向上 → 旋转树
  - ✊ 握拳 → 持续靠近
  - 🖐️ 张开手 → 持续远离
  - ✌️ V 手势 → 彩灯开关
  - 🤟 ILY → 飘雪开关
  - 👍 点赞 → 烟火爆发
  - 👎 踩 → 摇动圣诞树

- 🎨 **炫酷视觉效果**
  - 300+ 粒子烟火系统
  - 1200+ 飘雪粒子
  - 80 颗闪烁彩灯
  - 实时摇动动画
  - 金色脉冲边框

- 🤖 **AI 手势识别**
  - MediaPipe GestureRecognizer
  - 实时骨架追踪
  - 置信度显示

## 🚀 本地运行

```bash
npm install
npm run dev
```

访问 `http://localhost:5173`

## 📦 部署

项目已配置 Vercel 自动部署。

## 🛠️ 技术栈

- Three.js - 3D 渲染
- MediaPipe - 手势识别
- Vite - 构建工具

## 📄 许可

MIT License

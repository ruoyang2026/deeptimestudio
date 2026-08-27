"use client";

import * as THREE from "three";

/**
 * Anomalocaris — 8-directional Sprite "pseudo-3D" swimmer.
 *
 * Movement: a state machine (IDLE -> SWIMMING -> PAUSED) that crosses the
 * view along fixed straight routes (no CatmullRomCurve3). Each route is a
 * fast linear traversal with sinusoidal bob/sway. The creature stays outside
 * the frame during IDLE/PAUSED and fades in/out based on camera distance.
 *
 * View: 8-direction atlas cropped at runtime; per-frame camera-relative angle
 * selects the nearest 45° sprite with a 22.5° hysteresis threshold.
 */

export const ANOMALOCARIS_ATLAS_URL = "/anomalocaris/cam.png";

const SPRITE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

/** 调试: 输出每个角度的 alpha 统计 (主体/半透明/背景 像素数) */
const DEBUG_ANOMALOCARIS_ALPHA = true;

/** 顶部标签区域占比 (如 "000° (Front)"), 裁切时跳过 */
const LABEL_CROP_TOP = 0.15;

export type AnomalocarisTextureSet = {
  textures: Map<number, THREE.CanvasTexture>;
  aspectRatios: Map<number, number>;
};

/** Crop the 2x4 atlas into 8 angle textures (runtime), skipping top labels. */
export function loadAnomalocarisAtlas(image: HTMLImageElement): AnomalocarisTextureSet {
  const cols = 4;
  const rows = 2;
  const cellW = Math.floor(image.width / cols);
  const cellH = Math.floor(image.height / rows);
  const cropTop = Math.floor(cellH * LABEL_CROP_TOP);
  const cropH = cellH - cropTop;
  const textures = new Map<number, THREE.CanvasTexture>();
  const aspectRatios = new Map<number, number>();

  // atlas cell -> angle: row0 = 000/045/090/135, row1 = 180/225/270/315
  const cellAngle: number[][] = [
    [0, 45, 90, 135],
    [180, 225, 270, 315],
  ];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const angle = cellAngle[row][col];
      const canvas = document.createElement("canvas");
      canvas.width = cellW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, cellW, cropH);
      // 跳过顶部标签区, 只截取奇虾本体
      ctx.drawImage(
        image,
        col * cellW,
        row * cellH + cropTop,
        cellW,
        cropH,
        0,
        0,
        cellW,
        cropH
      );

      // 1) 先在"整个 cell"上清理 alpha + 去白边, 再找 bounding box.
      //    白边两类:
      //      a) 半透明(a<240)且 RGB 偏亮 => 白边, 直接置透明
      //      b) 近不透明(a>=240)且高亮, 但贴 cell 外边缘(<12px) => 素材底部/边部白带, 做 alpha 渐变衰减
      //    主体内部的亮白鳍片/高光保留。
      const EDGE_CLEAR = 12;
      const imageData = ctx.getImageData(0, 0, cellW, cropH);
      const px = imageData.data;
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2];
        const a = px[i + 3];
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        if (a < 32) {
          px[i] = 0;
          px[i + 1] = 0;
          px[i + 2] = 0;
          px[i + 3] = 0;
        } else if (a >= 240 && lum > 130) {
          // 近不透明高亮像素: 计算到最近 cell 边缘的距离
          const pxi = (i / 4) % cellW;
          const pyi = Math.floor(i / 4 / cellW);
          const dx = Math.min(pxi, cellW - 1 - pxi);
          const dy = Math.min(pyi, cropH - 1 - pyi);
          const dist = Math.min(dx, dy);
          if (dist < EDGE_CLEAR) {
            // 越靠边缘越透明, 消除白色亮带
            const keep = dist / EDGE_CLEAR; // 0..1
            const newA = Math.round(a * keep);
            if (newA < 32) {
              px[i] = 0;
              px[i + 1] = 0;
              px[i + 2] = 0;
              px[i + 3] = 0;
            } else {
              px[i + 3] = newA;
            }
          } else {
            px[i + 3] = 255;
          }
        } else if (a >= 240) {
          // 接近不透明的主体像素置为完全不透明
          px[i + 3] = 255;
        } else {
          // 半透明边缘: 若偏亮 => 白边, 直接清除 (alpha=0)
          if (lum > 130) {
            px[i] = 0;
            px[i + 1] = 0;
            px[i + 2] = 0;
            px[i + 3] = 0;
          }
          // 偏暗的半透明像素保留 (主体暗色轮廓抗锯齿)
        }
      }
      ctx.putImageData(imageData, 0, 0);

      // 2) 在清理后的 cell 上找 alpha bounding box
      let minX = cellW, minY = cropH, maxX = 0, maxY = 0;
      let found = false;
      for (let y = 0; y < cropH; y++) {
        for (let x = 0; x < cellW; x++) {
          const a = px[(y * cellW + x) * 4 + 3];
          if (a > 8) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const bw = found ? maxX - minX + 1 : cellW;
      const bh = found ? maxY - minY + 1 : cropH;

      // 3) 真正裁切到 bounding box (加 4px padding)
      const pad = 4;
      const cropW = Math.min(cellW, bw + pad * 2);
      const cropH2 = Math.min(cropH, bh + pad * 2);
      const sx = Math.max(0, minX - pad);
      const sy = Math.max(0, minY - pad);
      aspectRatios.set(angle, cropW / Math.max(1, cropH2));

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = cropW;
      cropCanvas.height = cropH2;
      const cctx = cropCanvas.getContext("2d");
      if (!cctx) continue;
      cctx.clearRect(0, 0, cropW, cropH2);
      cctx.drawImage(canvas, sx, sy, cropW, cropH2, 0, 0, cropW, cropH2);

      const cpx = cctx.getImageData(0, 0, cropW, cropH2).data;

      if (DEBUG_ANOMALOCARIS_ALPHA) {
        let n0 = 0, nMid = 0, nOpaque = 0;
        for (let i = 0; i < cpx.length; i += 4) {
          const a = cpx[i + 3];
          if (a === 0) n0++;
          else if (a < 255) nMid++;
          else nOpaque++;
        }
        console.log(
          `[anomalocaris] angle=${angle} cell=${cellW}x${cropH} crop=${cropW}x${cropH2} ` +
          `alpha: bg=${n0} semi=${nMid} opaque=${nOpaque}`
        );
      }

      const tex = new THREE.CanvasTexture(cropCanvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // 关闭 mipmap: 防止半透明边缘 RGB 在缩放采样时向透明区域扩散
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      textures.set(angle, tex);
    }
  }
  return { textures, aspectRatios };
}

/** 固定直线穿越路线 (基于相机俯瞰视角 (0,10,16)) */
export type AnomalocarisRoute = {
  id: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration: number; // 穿越耗时 (秒)
  pause: number;    // 到达终点后等待 (秒)
};

const ROUTE_DEFS: Omit<AnomalocarisRoute, "start" | "end">[] = [
  { id: 0, duration: 4.5, pause: 2.0 }, // 7->2
  { id: 1, duration: 5.0, pause: 2.0 }, // 9->3
  { id: 2, duration: 4.5, pause: 2.0 }, // 5->11
  { id: 3, duration: 5.5, pause: 2.0 }, // 6->12
];

const ROUTE_POINTS: { start: [number, number, number]; end: [number, number, number] }[] = [
  { start: [-14, 3.0, 10], end: [14, 3.0, -10] },
  { start: [-16, 2.5, 2], end: [16, 2.5, -2] },
  { start: [14, 3.5, 10], end: [-14, 3.5, -10] },
  { start: [4, 2.0, 14], end: [-4, 2.0, -14] },
];

const STATE = {
  IDLE: 0,
  SWIMMING: 1,
  PAUSED: 2,
};

export type AnomalocarisOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  textures: AnomalocarisTextureSet;
  worldHeight?: number; // base world-space height of the creature
  phase?: number;
  scale?: number;
};

/** 每帧计算相机相对游动方向的水平角, 返回 0..360 */
function computeRelativeAngle(
  forward: THREE.Vector3,
  toCamera: THREE.Vector3
): number {
  const dot = forward.dot(toCamera);
  const cross = forward.x * toCamera.z - forward.z * toCamera.x;
  const angle = Math.atan2(cross, dot) * (180 / Math.PI); // -180..180
  return (angle + 360) % 360;
}

export class Anomalocaris {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: AnomalocarisTextureSet;

  private sprite: THREE.Sprite;
  private material: THREE.SpriteMaterial;

  private phase: number;
  private worldHeight: number;
  private scale: number;

  private forward = new THREE.Vector3();
  private toCamera = new THREE.Vector3();
  private dir = new THREE.Vector3();       // 路线方向 (单位)
  private elapsed = 0;                     // 当前阶段经过的时间
  private routeIndex = 0;
  private state = STATE.IDLE;
  private route: AnomalocarisRoute;

  private currentAngle = 0;
  private currentTexture = 0;

  constructor(opts: AnomalocarisOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.textures = opts.textures;

    this.phase = opts.phase ?? Math.random() * Math.PI * 2;
    this.worldHeight = opts.worldHeight ?? 3.2;
    this.scale = opts.scale ?? 4.0;

    this.material = new THREE.SpriteMaterial({
      map: this.textures.textures.get(0) ?? null,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false,
      depthTest: true,
      rotation: 0,
      blending: THREE.NormalBlending,
      toneMapped: false, // 不被 tone mapping/Bloom 提亮, 保持本体实色
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(3, 2.25, 1);
    this.sprite.visible = false;
    this.scene.add(this.sprite);

    // 初始化第一条路线 (带随机偏移)
    this.route = this.buildRoute(this.routeIndex);
    this.startIdle();
  }

  getSprite() {
    return this.sprite;
  }

  private buildRoute(index: number): AnomalocarisRoute {
    const pts = ROUTE_POINTS[index];
    const def = ROUTE_DEFS[index];
    // 随机化: start/end 的 y 偏移 ±0.5, z 偏移 ±2
    const yOff = (Math.random() - 0.5) * 1.0;
    const zOffS = (Math.random() - 0.5) * 4.0;
    const zOffE = (Math.random() - 0.5) * 4.0;
    const start = new THREE.Vector3(pts.start[0], pts.start[1] + yOff, pts.start[2] + zOffS);
    const end = new THREE.Vector3(pts.end[0], pts.end[1] + yOff, pts.end[2] + zOffE);
    return { id: def.id, start, end, duration: def.duration, pause: def.pause };
  }

  private startIdle() {
    this.state = STATE.IDLE;
    this.elapsed = 0;
    this.sprite.visible = false;
    // 停在起始点
    this.sprite.position.copy(this.route.start);
  }

  private startSwimming() {
    this.state = STATE.SWIMMING;
    this.elapsed = 0;
    this.sprite.visible = true;
    this.sprite.position.copy(this.route.start);
    this.dir.copy(this.route.end).sub(this.route.start).normalize();
  }

  private startPaused() {
    this.state = STATE.PAUSED;
    this.elapsed = 0;
    // 到达终点后隐藏, 在画面外等待
    this.sprite.visible = false;
  }

  /** Update state machine, movement, sprite view. */
  update(time: number, dt: number) {
    this.elapsed += dt;

    if (this.state === STATE.IDLE) {
      // 短暂待机后直接进入游动
      if (this.elapsed >= 0.6) {
        this.startSwimming();
      }
      return;
    }

    if (this.state === STATE.PAUSED) {
      if (this.elapsed >= this.route.pause) {
        // 切换下一条路线 (0->1->2->3->0)
        this.routeIndex = (this.routeIndex + 1) % ROUTE_DEFS.length;
        this.route = this.buildRoute(this.routeIndex);
        this.startSwimming();
      }
      return;
    }

    // ----- SWIMMING -----
    const progress = THREE.MathUtils.clamp(this.elapsed / this.route.duration, 0, 1);

    // 沿直线匀速推进
    const base = this.route.start.clone().lerp(this.route.end, progress);

    // 正弦波上下浮动 + 轻微垂直于路径摆动 (游泳起伏)
    const bob = Math.sin(time * 3.0 + this.phase) * 0.25;
    const sway = Math.sin(time * 2.5 + this.phase) * 0.15;
    // 垂直于路线的水平偏移方向 (右向量)
    const perp = new THREE.Vector3(-this.dir.z, 0, this.dir.x);

    const pos = base.addScaledVector(perp, sway);
    this.sprite.position.set(pos.x, pos.y + bob, pos.z);

    // 游动方向 = 路线方向 (直线)
    this.forward.copy(this.dir);

    // 相机 -> 奇虾 水平向量
    this.toCamera.subVectors(this.camera.position, this.sprite.position);
    this.toCamera.y = 0;
    if (this.toCamera.lengthSq() < 1e-6) {
      this.toCamera.set(0, 0, 1);
    } else {
      this.toCamera.normalize();
    }

    // A. 每帧计算相机相对游动方向的水平角度
    this.currentAngle = computeRelativeAngle(this.forward, this.toCamera);

    // B. 目标 Sprite 索引
    const targetIndex = Math.round(this.currentAngle / 45) % 8;
    const targetAngle = SPRITE_ANGLES[targetIndex];

    // C. 22.5° 滞后阈值: 避免 45° 边界抖动
    if (targetIndex !== this.currentTexture) {
      const curAngle = SPRITE_ANGLES[this.currentTexture];
      let diff = Math.abs(targetAngle - curAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff >= 22.5) {
        this.switchSprite(targetIndex);
      }
    }

    // billboard: Sprite 始终面向相机 (构造保证)

    // 按生物 bbox 比例缩放
    const aspect = this.textures.aspectRatios.get(SPRITE_ANGLES[this.currentTexture]) ?? 1;
    const h = this.worldHeight * this.scale;
    this.sprite.scale.set(h * aspect, h, 1);

    // 距离控制: 过远时隐藏 (不再做透明度渐变, 保持主体实心不透明)
    const distCam = this.camera.position.distanceTo(this.sprite.position);
    this.sprite.visible = distCam < 20;
    this.material.opacity = 1;

    // 到达终点
    if (progress >= 1) {
      this.startPaused();
    }
  }

  private switchSprite(newIndex: number) {
    this.currentTexture = newIndex;
    const tex = this.textures.textures.get(SPRITE_ANGLES[newIndex]) ?? null;
    if (tex && this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
  }

  dispose() {
    this.scene.remove(this.sprite);
    this.material.dispose();
  }
}
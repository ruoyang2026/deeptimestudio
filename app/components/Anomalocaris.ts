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
  { id: 0, duration: 6.3, pause: 2.0 }, // 左->右, 近带
  { id: 1, duration: 6.3, pause: 2.0 }, // 右->左, 中带
  { id: 2, duration: 6.3, pause: 2.0 }, // 左->右, 中后带
  { id: 3, duration: 6.3, pause: 2.0 }, // 右->左, 后带
];

// 全部水平穿越: 起点/终点都在左右(x=±46)屏幕外, z 保持画面中部水平带,
// 终点不在画布顶部区域也不在角落; 奇虾从一侧自然游入、另一侧游出。
const ROUTE_POINTS: { start: [number, number, number]; end: [number, number, number] }[] = [
  { start: [-46, 3.0, 8], end: [46, 3.0, 8] },
  { start: [46, 2.5, 0], end: [-46, 2.5, 0] },
  { start: [-46, 3.5, -6], end: [46, 3.5, -6] },
  { start: [46, 3.0, -12], end: [-46, 3.0, -12] },
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
  poseSwitch?: boolean; // 路线移动过程中是否切换姿势; 默认 false: 整条路线保持同一姿势
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

  private group: THREE.Group;
  private sprite: THREE.Sprite;       // 主 sprite (静止时唯一渲染, 实体)
  private overlay: THREE.Sprite;      // 叠加 sprite (切换过渡用)
  private material: THREE.SpriteMaterial;
  private overlayMat: THREE.SpriteMaterial;

  private phase: number;
  private worldHeight: number;
  private scale: number;
  private poseSwitch: boolean;

  private forward = new THREE.Vector3();
  private toCamera = new THREE.Vector3();
  private dir = new THREE.Vector3();       // 路线方向 (单位)
  private elapsed = 0;                     // 当前阶段经过的时间
  private routeIndex = 0;
  private state = STATE.IDLE;
  private route: AnomalocarisRoute;

  private currentAngle = 0;
  private currentTexture = 0;

  // 交叉淡入淡出过渡状态
  private crossfade = 0;           // 0=无过渡, 1=过渡中
  private crossfadeTimer = 0;      // 过渡经过时间
  private readonly CROSSFADE_DURATION = 0.18; // 过渡时长 (秒)

  constructor(opts: AnomalocarisOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.textures = opts.textures;

    this.phase = opts.phase ?? Math.random() * Math.PI * 2;
    this.worldHeight = opts.worldHeight ?? 3.2;
    this.scale = opts.scale ?? 4.0;
    this.poseSwitch = opts.poseSwitch ?? false;

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
    this.overlayMat = new THREE.SpriteMaterial({
      map: null,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false,
      depthTest: true,
      rotation: 0,
      blending: THREE.NormalBlending,
      toneMapped: false,
      opacity: 0,
    });

    this.sprite = new THREE.Sprite(this.material);
    this.overlay = new THREE.Sprite(this.overlayMat);
    this.sprite.scale.set(3, 2.25, 1);
    this.overlay.scale.copy(this.sprite.scale);

    this.group = new THREE.Group();
    this.group.add(this.sprite);
    this.group.add(this.overlay);
    this.group.visible = false;
    this.scene.add(this.group);

    // 初始化第一条路线 (带随机偏移)
    this.route = this.buildRoute(this.routeIndex);
    this.startIdle();
  }

  getSprite() {
    return this.group;
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
    // 不硬设 visible: 完全交给 update() 的画布边界判定, 避免状态切换瞬间闪烁
    this.group.position.copy(this.route.start);
  }

  private startSwimming() {
    this.state = STATE.SWIMMING;
    this.elapsed = 0;
    this.group.position.copy(this.route.start);
    this.dir.copy(this.route.end).sub(this.route.start).normalize();
    // 姿势开关关闭时: 整条路线锁定一个与行进方向匹配的姿势
    if (!this.poseSwitch) {
      this.lockRoutePose();
    }
  }

  /** 姿势开关关闭: 按路线方向计算一次姿势并锁定, 不再切换 */
  private lockRoutePose() {
    this.crossfade = 0;
    this.crossfadeTimer = 0;
    this.overlayMat.opacity = 0;
    this.overlay.visible = false;
    this.material.opacity = 1;
    this.toCamera.subVectors(this.camera.position, this.group.position);
    this.toCamera.y = 0;
    if (this.toCamera.lengthSq() < 1e-6) {
      this.toCamera.set(0, 0, 1);
    } else {
      this.toCamera.normalize();
    }
    const angle = computeRelativeAngle(this.dir, this.toCamera);
    const idx = Math.round(angle / 45) % 8;
    this.currentAngle = angle;
    this.currentTexture = idx;
    const tex = this.textures.textures.get(SPRITE_ANGLES[idx]) ?? null;
    if (tex && this.material.map !== tex) {
      this.material.map = tex;
      this.material.needsUpdate = true;
    }
  }

  private startPaused() {
    this.state = STATE.PAUSED;
    this.elapsed = 0;
    // 到达终点(屏幕外), 不硬设 visible, 由边界判定保持隐藏
  }

  /** Update state machine, movement, sprite view. */
  update(time: number, dt: number) {
    this.elapsed += dt;

    if (this.state === STATE.IDLE) {
      // 短暂待机后直接进入游动
      if (this.elapsed >= 0.6) {
        this.startSwimming();
      }
      this.applyBoundsVisibility();
      return;
    }

    if (this.state === STATE.PAUSED) {
      if (this.elapsed >= this.route.pause) {
        // 切换下一条路线 (0->1->2->3->0)
        this.routeIndex = (this.routeIndex + 1) % ROUTE_DEFS.length;
        this.route = this.buildRoute(this.routeIndex);
        this.startSwimming();
      }
      this.applyBoundsVisibility();
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
    this.group.position.set(pos.x, pos.y + bob, pos.z);

    // 游动方向 = 路线方向 (直线)
    this.forward.copy(this.dir);

    // 姿势开关打开时才计算角度并切换 Sprite (交叉淡入淡出)
    if (this.poseSwitch) {
      // 相机 -> 奇虾 水平向量
      this.toCamera.subVectors(this.camera.position, this.group.position);
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

      // C. 22.5° 滞后阈值 + 交叉淡入淡出切换
      if (targetIndex !== this.currentTexture) {
        const curAngle = SPRITE_ANGLES[this.currentTexture];
        let diff = Math.abs(targetAngle - curAngle);
        if (diff > 180) diff = 360 - diff;
        if (diff >= 22.5) {
          this.switchSprite(targetIndex);
        }
      }

      // 推进交叉淡入淡出: overlay 0->1, main 1->0, 结束后 main 换图恢复实体
      if (this.crossfade === 1) {
        this.crossfadeTimer += dt;
        const k = Math.min(1, this.crossfadeTimer / this.CROSSFADE_DURATION);
        this.overlayMat.opacity = k;              // 新图淡入
        this.material.opacity = 1 - k;            // 旧图淡出
        if (k >= 1) {
          // 过渡完成: 主 sprite 换新图, 恢复实体, 隐藏 overlay
          const tex = this.textures.textures.get(SPRITE_ANGLES[this.currentTexture]) ?? null;
          if (tex && this.material.map !== tex) {
            this.material.map = tex;
            this.material.needsUpdate = true;
          }
          this.material.opacity = 1;
          this.overlayMat.opacity = 0;
          this.overlay.visible = false;
          this.crossfade = 0;
        }
      }
    }

    // billboard: Sprite 始终面向相机 (构造保证)

    // 按生物 bbox 比例缩放 (主 + overlay 同步)
    const aspect = this.textures.aspectRatios.get(SPRITE_ANGLES[this.currentTexture]) ?? 1;
    const h = this.worldHeight * this.scale;
    this.sprite.scale.set(h * aspect, h, 1);
    this.overlay.scale.copy(this.sprite.scale);

    // 画布边界 (对应海底沙地范围), 出边界才隐藏, 保证自然游出画面
    this.applyBoundsVisibility();

    // 到达终点
    if (progress >= 1) {
      this.startPaused();
    }
  }

  /** 可见性完全由画布边界判定: 屏外隐藏, 屏内显示, 无状态切换闪烁 */
  private applyBoundsVisibility() {
    const BOUND_X = 40;
    const BOUND_Z_MIN = -28;
    const BOUND_Z_MAX = 24;
    const p = this.group.position;
    this.group.visible =
      Math.abs(p.x) <= BOUND_X && p.z >= BOUND_Z_MIN && p.z <= BOUND_Z_MAX;
  }

  private switchSprite(newIndex: number) {
    if (this.crossfade === 1) return; // 已在过渡中, 忽略
    this.crossfade = 1;
    this.crossfadeTimer = 0;
    // 当前主图是旧图; overlay 载入新图开始淡入
    const tex = this.textures.textures.get(SPRITE_ANGLES[newIndex]) ?? null;
    if (tex && this.overlayMat.map !== tex) {
      this.overlayMat.map = tex;
      this.overlayMat.needsUpdate = true;
    }
    this.overlay.visible = true;
    this.overlay.position.copy(this.sprite.position);
    this.overlayMat.opacity = 0;
    this.material.opacity = 1;
    // 记录目标索引, 过渡完成时主图切到它
    this.currentTexture = newIndex;
  }

  dispose() {
    this.scene.remove(this.group);
    this.material.dispose();
    this.overlayMat.dispose();
  }
}
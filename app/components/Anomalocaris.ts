"use client";

import * as THREE from "three";

/**
 * Anomalocaris — 8-directional Sprite "pseudo-3D" swimmer.
 *
 * Strategy (no real 3D mesh / GLB):
 *   - A 2x4 atlas (1536x1024) is cropped at runtime into 8 angle textures:
 *     row1: 000 / 045 / 090 / 135  row2: 180 / 225 / 270 / 315
 *   - Each frame the horizontal angle between the creature's heading
 *     (path tangent) and the camera direction selects the nearest sprite.
 *   - THREE.Sprite always billboards toward the camera; heading stays
 *     independent of billboard orientation.
 *   - Natural bob + a tiny breathing scale animation + per-individual random
 *     params keep it alive. Distance-based opacity blends into the fog.
 */

export const ANOMALOCARIS_ATLAS_URL = "/anomalocaris/cam.png";

const SPRITE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export type AnomalocarisTextureSet = {
  textures: Map<number, THREE.CanvasTexture>;
  aspectRatios: Map<number, number>;
};

/** Crop the 2x4 atlas into 8 angle textures (runtime). */
export function loadAnomalocarisAtlas(image: HTMLImageElement): AnomalocarisTextureSet {
  const cols = 4;
  const rows = 2;
  const cellW = Math.floor(image.width / cols);
  const cellH = Math.floor(image.height / rows);
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
      canvas.height = cellH;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.clearRect(0, 0, cellW, cellH);
      ctx.drawImage(image, col * cellW, row * cellH, cellW, cellH, 0, 0, cellW, cellH);

      // Compute the alpha bounding box so the sprite is sized to the creature
      const imageData = ctx.getImageData(0, 0, cellW, cellH);
      const px = imageData.data;
      let minX = cellW, minY = cellH, maxX = 0, maxY = 0;
      let found = false;
      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const a = px[(y * cellW + x) * 4 + 3];
          if (a > 12) {
            found = true;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      const bw = found ? maxX - minX + 1 : cellW;
      const bh = found ? maxY - minY + 1 : cellH;
      aspectRatios.set(angle, bw / Math.max(1, bh));

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      textures.set(angle, tex);
    }
  }
  return { textures, aspectRatios };
}

export type AnomalocarisOptions = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  textures: AnomalocarisTextureSet;
  path: THREE.CatmullRomCurve3;
  worldHeight?: number;   // base world-space height of the creature
  speed?: number;         // path param advance per second (0..1)
  phase?: number;
  scale?: number;
  swimFrequency?: number;
  bobAmount?: number;
  bobSpeed?: number;
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
  private path: THREE.CatmullRomCurve3;

  private sprite: THREE.Sprite;
  private material: THREE.SpriteMaterial;

  private t = 0;               // path parameter 0..1
  private speed: number;
  private phase: number;
  private worldHeight: number;
  private scale: number;
  private swimFrequency: number;
  private bobAmount: number;
  private bobSpeed: number;

  private forward = new THREE.Vector3();
  private toCamera = new THREE.Vector3();

  private currentAngle = 0;
  private currentTexture = 0;
  /** 交叉淡入淡出用: 旧/新图透明度进度 0..1 */
  private fade = 1;

  constructor(opts: AnomalocarisOptions) {
    this.scene = opts.scene;
    this.camera = opts.camera;
    this.textures = opts.textures;
    this.path = opts.path;

    this.speed = opts.speed ?? 0.005;
    this.phase = opts.phase ?? Math.random() * Math.PI * 2;
    this.worldHeight = opts.worldHeight ?? 3.2;
    this.scale = opts.scale ?? 4.0;
    this.swimFrequency = opts.swimFrequency ?? 2.0 + Math.random() * 1.5;
    this.bobAmount = opts.bobAmount ?? 0.3;
    this.bobSpeed = opts.bobSpeed ?? 2.0;

    this.material = new THREE.SpriteMaterial({
      map: this.textures.textures.get(0) ?? null,
      transparent: true,
      alphaTest: 0.05,
      depthWrite: false,
      depthTest: true,
      rotation: 0,
    });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set(3, 2.25, 1);
    this.sprite.position.set(0, 2, -4);
    this.scene.add(this.sprite);

    this.update(0, 0);
  }

  getSprite() {
    return this.sprite;
  }

  /** Advance along the path, update heading, sprite view, billboard, animation. */
  update(time: number, dt: number) {
    // 沿闭环曲线推进 (基于时间, 不受帧率影响)
    this.t = (this.t + dt * this.speed) % 1;
    const pos = this.path.getPointAt(this.t);
    const tangent = this.path.getTangentAt(this.t);

    // 上下浮动
    const bob = Math.sin(time * this.bobSpeed + this.phase) * this.bobAmount;
    this.sprite.position.set(pos.x, pos.y + bob, pos.z);

    // 水平游动方向 = 路径切线在 XZ 平面的投影
    this.forward.set(tangent.x, 0, tangent.z).normalize();

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

    // C. 22.5° 滞后阈值: 只有新角度与当前 Sprite 角度差 >= 22.5° 才切换, 避免 45° 边界抖动
    if (targetIndex !== this.currentTexture) {
      const curAngle = SPRITE_ANGLES[this.currentTexture];
      let diff = Math.abs(targetAngle - curAngle);
      if (diff > 180) diff = 360 - diff;
      if (diff >= 22.5) {
        this.switchSprite(targetIndex);
      }
    }

    // 交叉淡入淡出: 切换后 0.15s 内透明度回升到 1, 消除跳变感
    this.fade = Math.min(1, this.fade + dt / 0.15);
    this.material.opacity = this.fade;

    // billboard: Sprite 始终面向相机 (构造保证)

    // 轻微游泳呼吸缩放
    const breathe = 1 + Math.sin(time * this.swimFrequency + this.phase) * 0.015;

    // 按生物 bbox 比例缩放
    const aspect = this.textures.aspectRatios.get(SPRITE_ANGLES[this.currentTexture]) ?? 1;
    const h = this.worldHeight * this.scale * breathe;
    this.sprite.scale.set(h * aspect, h, 1);

    // 距离渐隐
    const dist = this.camera.position.distanceTo(this.sprite.position);
    const fade = THREE.MathUtils.clamp(1 - (dist - 26) / 26, 0.25, 1);
    this.material.opacity = this.fade * fade;
  }

  private switchSprite(newIndex: number) {
    this.currentTexture = newIndex;
    this.fade = 0; // 从 0 开始交叉淡入
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

/** Build a closed CatmullRomCurve3 swimming loop. */
export function makeSwimLoop(points: [number, number, number][]): THREE.CatmullRomCurve3 {
  const vecs = points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  return new THREE.CatmullRomCurve3(vecs, true, "catmullrom", 0.5);
}
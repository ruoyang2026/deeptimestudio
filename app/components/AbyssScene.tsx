"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";
import {
  Anomalocaris,
  loadAnomalocarisAtlas,
  ANOMALOCARIS_ATLAS_URL,
} from "./Anomalocaris";

const FOG_COLOR = 0x0a1f2e;
const SAND_BASE_Y = -1.2;
const SAND_WIDTH = 80;
const SAND_DEPTH = 50;
const SAND_SEGMENTS = 256;

/**
 * AbyssScene — 寒武纪海底 Three.js 背景
 *
 * sculptural terrain + 湿润砂地质感 + 动态焦散光影 (程序生成, 无外部图片):
 *  - Domain Warping 多层噪声位移地形 (PlaneGeometry 80x50, 256x256)
 *  - 程序 PBR 纹理: diffuse 沉积斑块 + roughness 湿砂反光 + bump
 *  - 动态 Voronoi 焦散光斑 (ShaderMaterial, AdditiveBlending)
 *  - 光照: HemisphereLight 散射 + 强方向光(阴影) + 补光
 *  - ACES 色调映射 + Bloom 后期
 */
export default function AbyssScene({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.pointerEvents = "none";
    host.appendChild(container);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.setClearColor(FOG_COLOR, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(FOG_COLOR);
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.015);

    const camera = new THREE.PerspectiveCamera(
      55,
      host.clientWidth / host.clientHeight,
      0.1,
      120
    );
    camera.position.set(0, 10, 16);
    camera.lookAt(0, -0.5, 0);

    // ---------- 噪声 ----------
    const noise = new SimplexNoise();
    function fbm(x: number, y: number, octaves: number): number {
      let v = 0;
      let amp = 0.5;
      let freq = 1;
      for (let o = 0; o < octaves; o++) {
        v += amp * noise.noise(x * freq, y * freq);
        amp *= 0.5;
        freq *= 2.1;
      }
      return v;
    }

    // Domain Warping 地形高度: 用噪声扭曲采样坐标生成自然起伏
    function terrainHeightAt(x: number, z: number): number {
      const warpX = fbm(x * 0.08, z * 0.08, 2) * 2.0;
      const warpZ = fbm(x * 0.08 + 3.0, z * 0.08 + 3.0, 2) * 2.0;
      let h = fbm((x + warpX) * 0.12, (z + warpZ) * 0.12, 4) * 2.5;
      h += fbm(x * 0.4, z * 0.4, 3) * 0.4;
      h += Math.sin(x * 0.15 + z * 0.08) * 0.3;
      h -= z * 0.02;
      return THREE.MathUtils.clamp(h, -0.6, 2.8);
    }
    const worldY = (h: number) => SAND_BASE_Y + h;

    // ---------- 岩石散布点 (与地形共用的放置点) ----------
    const rockSpots = [
      { x: -3.5, z: -3.6, size: 0.7 },
      { x: 3.9, z: -5, size: 0.9 },
      { x: -1.8, z: -6.4, size: 0.5 },
      { x: 0.9, z: -8.2, size: 1.1 },
      { x: -7.2, z: -10.5, size: 1.4 },
      { x: 6.4, z: -9.4, size: 1.0 },
      { x: -5.6, z: 1.4, size: 1.2 },
      { x: 7.6, z: -14, size: 1.6 },
      { x: -9.4, z: -5.6, size: 1.3 },
      { x: -12, z: -11, size: 1.5 },
      { x: 12.5, z: -7, size: 1.2 },
    ];

    // ---------- 程序 PBR 纹理: 湿润砂地质感 ----------
    function createSeabedTextures(): { diffuseMap: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
      const size = 1024;
      const diffuseCanvas = document.createElement("canvas");
      const roughCanvas = document.createElement("canvas");
      diffuseCanvas.width = roughCanvas.width = size;
      diffuseCanvas.height = roughCanvas.height = size;
      const dCtx = diffuseCanvas.getContext("2d")!;
      const rCtx = roughCanvas.getContext("2d")!;

      // 底色: 青灰绿 (湿润砂地)
      dCtx.fillStyle = "#4a6a7a";
      dCtx.fillRect(0, 0, size, size);
      rCtx.fillStyle = "#aaaaaa";
      rCtx.fillRect(0, 0, size, size);

      for (let i = 0; i < 60000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const n = noise.noise(x * 0.01, y * 0.01);

        // 沉积物斑块
        if (n > 0.3) {
          dCtx.fillStyle = `rgba(60, 80, 65, ${0.3 + Math.random() * 0.3})`;
          dCtx.fillRect(x, y, 3, 3);
          rCtx.fillStyle = "rgba(200, 200, 200, 0.3)";
          rCtx.fillRect(x, y, 3, 3);
        } else if (n < -0.2) {
          // 亮色砂砾/贝壳碎片 (湿润反光更光滑)
          dCtx.fillStyle = `rgba(140, 170, 180, ${0.2 + Math.random() * 0.3})`;
          dCtx.fillRect(x, y, 2, 2);
          rCtx.fillStyle = "rgba(80, 80, 80, 0.4)";
          rCtx.fillRect(x, y, 2, 2);
        }

        // 微砂粒
        if (i % 2 === 0) {
          dCtx.fillStyle = `rgba(90, 110, 120, ${Math.random() * 0.15})`;
          dCtx.fillRect(x, y, 1, 1);
        }
      }

      const diffuseMap = new THREE.CanvasTexture(diffuseCanvas);
      const roughnessMap = new THREE.CanvasTexture(roughCanvas);
      diffuseMap.wrapS = diffuseMap.wrapT = THREE.RepeatWrapping;
      roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
      diffuseMap.repeat.set(6, 4);
      roughnessMap.repeat.set(6, 4);

      return { diffuseMap, roughnessMap };
    }

    // ---------- 海底地形: Domain Warping 位移 ----------
    const sandGeo = new THREE.PlaneGeometry(SAND_WIDTH, SAND_DEPTH, SAND_SEGMENTS, SAND_SEGMENTS);
    sandGeo.rotateX(-Math.PI / 2);
    const posAttr = sandGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, terrainHeightAt(x, z));
    }
    sandGeo.computeVertexNormals();

    const { diffuseMap, roughnessMap } = createSeabedTextures();
    const seabedMat = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughnessMap,
      roughness: 1.0,
      metalness: 0.05,
      bumpMap: diffuseMap,
      bumpScale: 0.05,
    });
    const sand = new THREE.Mesh(sandGeo, seabedMat);
    sand.position.set(0, worldY(0), -2);
    sand.receiveShadow = true;
    scene.add(sand);

    // ---------- 动态焦散 (Voronoi, 紧贴砂床) ----------
    const causticsMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        lightDir: { value: new THREE.Vector3(0.3, -1, 0.2).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vWorldPos;

        mat2 rot(float a) {
          float c = cos(a), s = sin(a);
          return mat2(c, -s, s, c);
        }

        float voronoi(vec2 p) {
          vec2 n = floor(p);
          vec2 f = fract(p);
          float md = 1.0;
          for (int j = -1; j <= 1; j++) {
            for (int i = -1; i <= 1; i++) {
              vec2 g = vec2(float(i), float(j));
              vec2 o = vec2(
                sin(dot(n + g, vec2(127.1, 311.7))),
                cos(dot(n + g, vec2(269.5, 183.3)))
              ) * 0.5 + 0.5;
              md = min(md, length(g + o - f));
            }
          }
          return md;
        }

        void main() {
          vec2 pos = vWorldPos.xz * 0.3;
          float c = 0.0;
          for (int i = 1; i <= 3; i++) {
            float fi = float(i);
            vec2 p = rot(time * 0.05 * fi + fi) * pos * (1.0 + fi * 0.3);
            float v = voronoi(p);
            c += smoothstep(0.12, 0.0, v) * 0.35 / fi;
          }
          float fade = smoothstep(0.0, 15.0, abs(vWorldPos.x)) *
                       smoothstep(0.0, 10.0, abs(vWorldPos.z));
          c *= (1.0 - fade);

          gl_FragColor = vec4(0.85, 0.95, 1.0, c * 0.5);
        }
      `,
    });
    const causticsGeo = sandGeo.clone();
    {
      const cp = causticsGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < cp.count; i++) cp.setY(i, cp.getY(i) + 0.15);
    }
    const causticsPlane = new THREE.Mesh(causticsGeo, causticsMat);
    causticsPlane.position.set(0, worldY(0), -2);
    scene.add(causticsPlane);

    // ---------- 岩石 (低多边形 + 顶点扰动倒角) ----------
    const rockMatA = new THREE.MeshStandardMaterial({ color: 0x2c3a42, roughness: 0.95, metalness: 0 });
    const rockMatB = new THREE.MeshStandardMaterial({ color: 0x35474f, roughness: 0.9, metalness: 0 });
    for (const r of rockSpots) {
      const geo = new THREE.DodecahedronGeometry(r.size, 1);
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const jx = p.getX(i);
        const jy = p.getY(i);
        const jz = p.getZ(i);
        const n = fbm(jx * 2 + r.x, jz * 2 + r.z, 2) * 0.12;
        p.setXYZ(i, jx * (1 + n), jy * (1 + n), jz * (1 + n));
      }
      geo.computeVertexNormals();
      const rock = new THREE.Mesh(geo, Math.random() > 0.5 ? rockMatA : rockMatB);
      rock.position.set(r.x, worldY(terrainHeightAt(r.x, r.z)) + r.size * 0.2, r.z);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      rock.scale.y = 0.7 + Math.random() * 0.5;
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // ---------- 贝壳碎片 (扁平化球体) ----------
    const shellMatA = new THREE.MeshStandardMaterial({ color: 0xb9c8d4, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide });
    const shellMatB = new THREE.MeshStandardMaterial({ color: 0x8fa8b8, roughness: 0.65, side: THREE.DoubleSide });
    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 20;
      const z = -2 - Math.random() * 11;
      const shell = new THREE.Mesh(
        new THREE.SphereGeometry(0.22 + Math.random() * 0.35, 7, 5),
        Math.random() > 0.5 ? shellMatA : shellMatB
      );
      shell.scale.set(1, 0.16 + Math.random() * 0.14, 1.3 + Math.random() * 0.6);
      shell.position.set(x, worldY(terrainHeightAt(x, z)) + 0.04, z);
      shell.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      shell.receiveShadow = true;
      scene.add(shell);
    }

    // ---------- 发光浮游生物点 (海底零星) ----------
    function makeGlowTexture(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext("2d")!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(210,240,255,0.95)");
      g.addColorStop(0.4, "rgba(170,225,255,0.4)");
      g.addColorStop(1, "rgba(170,225,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    }
    const floorGlowCount = reduced ? 30 : 90;
    const floorGlowGeo = new THREE.BufferGeometry();
    const floorGlowArr = new Float32Array(floorGlowCount * 3);
    for (let i = 0; i < floorGlowCount; i++) {
      const x = (Math.random() - 0.5) * 24;
      const z = -1.5 - Math.random() * 12;
      floorGlowArr[i * 3] = x;
      floorGlowArr[i * 3 + 1] = worldY(terrainHeightAt(x, z)) + 0.05;
      floorGlowArr[i * 3 + 2] = z;
    }
    floorGlowGeo.setAttribute("position", new THREE.BufferAttribute(floorGlowArr, 3));
    const floorGlowMat = new THREE.PointsMaterial({
      map: makeGlowTexture(),
      size: 0.12,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0x4ecdc4,
      opacity: 0.9,
    });
    const floorGlow = new THREE.Points(floorGlowGeo, floorGlowMat);
    scene.add(floorGlow);

    // ---------- 带状海藻 (Seaweed): 弯曲叶片 + 顶点着色器水流摆动 ----------
    function createSeaweedBlade(
      width: number,
      height: number,
      bendStrength: number,
      phase: number
    ): THREE.PlaneGeometry {
      const geo = new THREE.PlaneGeometry(width, height, 4, 24);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const phaseArr = new Float32Array(pos.count);
      const heightArr = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const t = THREE.MathUtils.clamp((y + height / 2) / height, 0, 1);
        const bend = Math.pow(t, 1.8) * bendStrength;
        const wave = Math.sin(t * Math.PI * 3 + phase) * 0.15 * t;
        const taper = 1.0 - t * 0.55;
        pos.setX(i, x * taper + bend + wave);
        pos.setZ(i, pos.getZ(i) + Math.sin(t * Math.PI) * 0.08);
        phaseArr[i] = phase;
        heightArr[i] = height;
      }
      geo.computeVertexNormals();
      geo.setAttribute("aPhase", new THREE.BufferAttribute(phaseArr, 1));
      geo.setAttribute("aHeight", new THREE.BufferAttribute(heightArr, 1));
      return geo;
    }

    function makeSeaweedMaterial(h: number, s: number, l: number): THREE.MeshStandardMaterial {
      const color = new THREE.Color().setHSL(h, s, l);
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.08,
      });
      mat.userData.uTime = { value: 0 };
      mat.customProgramCacheKey = () => "seaweed-sway";
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = mat.userData.uTime;
        shader.vertexShader =
          "uniform float uTime;\nattribute float aPhase;\nattribute float aHeight;\n" +
          shader.vertexShader.replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
            float sH = aHeight;
            float tNorm = clamp((transformed.y + sH * 0.5) / sH, 0.0, 1.0);
            float swayF = tNorm * tNorm;
            float w1 = sin(uTime * 1.1 + aPhase + transformed.y * 0.5) * 0.26;
            float w2 = sin(uTime * 2.3 + aPhase * 2.0 + transformed.y * 1.3 + uv.x * 2.5) * 0.06;
            transformed.x += (w1 + w2) * swayF;
            transformed.z += cos(uTime * 0.9 + aPhase + transformed.y * 0.35) * 0.16 * swayF;`
          );
      };
      return mat;
    }

    // 共享材质: 近景正常色 / 远景剪影变暗
    const seaweedHues = [0.36, 0.39, 0.42];
    const nearSeaweedMats: THREE.MeshStandardMaterial[] = [];
    const farSeaweedMats: THREE.MeshStandardMaterial[] = [];
    for (const hue of seaweedHues) {
      nearSeaweedMats.push(makeSeaweedMaterial(hue, 0.5, 0.28));
      const far = makeSeaweedMaterial(hue, 0.5, 0.24);
      far.color.multiplyScalar(0.65);
      far.emissive.copy(far.color);
      farSeaweedMats.push(far);
    }

    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 3 + Math.random() * 16;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const far = r > 12;
      const mats = far ? farSeaweedMats : nearSeaweedMats;
      const cluster = new THREE.Group();
      const bladeCount = 3 + Math.floor(Math.random() * 4);
      for (let b = 0; b < bladeCount; b++) {
        const h = far
          ? 2.2 + Math.random() * 2.2
          : r < 7
            ? 3.6 + Math.random() * 2.4
            : 2.5 + Math.random() * 3.0;
        const w = 0.25 + Math.random() * 0.25;
        const bend = 0.3 + Math.random() * 1.2;
        const phase = Math.random() * Math.PI * 2;
        const mat = mats[Math.floor(Math.random() * mats.length)];
        const blade = new THREE.Mesh(createSeaweedBlade(w, h, bend, phase), mat);
        const ang = (b / bladeCount) * Math.PI * 2 + Math.random() * 0.5;
        blade.position.set(Math.cos(ang) * 0.15, h / 2, Math.sin(ang) * 0.15);
        blade.rotation.y = ang + Math.random() * 0.5;
        blade.rotation.z = (Math.random() - 0.5) * 0.2;
        cluster.add(blade);
      }
      cluster.position.set(x, worldY(terrainHeightAt(x, z)), z);
      if (far) cluster.scale.setScalar(0.7 + Math.random() * 0.3);
      scene.add(cluster);
    }

    // ---------- 杯状海绵 (Sponge): 中空 + 纵向纹理 + 边缘不规则 ----------
    function createSpongeGeometry(
      baseRadius: number,
      height: number,
      type: "cup" | "tube"
    ): THREE.CylinderGeometry {
      const rTop = type === "cup" ? baseRadius * 1.6 : baseRadius * 1.1;
      const rBot = type === "cup" ? baseRadius * 0.7 : baseRadius * 0.9;
      const geo = new THREE.CylinderGeometry(rTop, rBot, height, 16, 10, true);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const yNorm = (v.y + height / 2) / height;
        const angle = Math.atan2(v.z, v.x);
        const ridge = Math.sin(angle * 12 + yNorm * Math.PI * 4) * 0.025;
        const pore = Math.sin(angle * 25 + yNorm * 8) * 0.008;
        const deform = Math.sin(angle * 3 + yNorm * 5) * 0.04;
        let r = Math.sqrt(v.x * v.x + v.z * v.z);
        if (yNorm > 0.92) {
          const edgeNoise =
            Math.sin(angle * 7) * 0.12 +
            Math.sin(angle * 17) * 0.05 +
            (Math.random() - 0.5) * 0.06;
          r += edgeNoise;
        }
        const newR = r + ridge + pore + deform;
        const scale = newR / r;
        v.x *= scale;
        v.z *= scale;
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    }

    const spongePalettes = [
      { h: 0.08, s: 0.35, l: 0.45 },
      { h: 0.15, s: 0.25, l: 0.4 },
      { h: 0.25, s: 0.3, l: 0.38 },
      { h: 0.05, s: 0.4, l: 0.5 },
      { h: 0.2, s: 0.2, l: 0.35 },
      { h: 0.1, s: 0.45, l: 0.55 },
    ];
    for (let i = 0; i < 22; i++) {
      const type = Math.random() > 0.4 ? "cup" : "tube";
      const baseR = 0.3 + Math.random() * 0.6;
      const h = 1.0 + Math.random() * 2.5;
      const geo = createSpongeGeometry(baseR, h, type);
      const p = spongePalettes[Math.floor(Math.random() * spongePalettes.length)];
      const color = new THREE.Color().setHSL(
        p.h + (Math.random() - 0.5) * 0.03,
        p.s + (Math.random() - 0.5) * 0.1,
        p.l + (Math.random() - 0.5) * 0.08
      );
      const mat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.06,
      });
      const sponge = new THREE.Mesh(geo, mat);
      let x = 0;
      let z = 0;
      let dist = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const radius = 2 + Math.random() * 16;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        dist = Math.sqrt(x * x + z * z);
      } while (dist < 4.5);
      sponge.position.set(x, worldY(terrainHeightAt(x, z)) + h / 2 - 0.1, z);
      sponge.rotation.z = (Math.random() - 0.5) * 0.25;
      sponge.rotation.x = (Math.random() - 0.5) * 0.25;
      sponge.rotation.y = Math.random() * Math.PI * 2;
      sponge.castShadow = true;
      sponge.receiveShadow = true;
      if (dist > 12) sponge.scale.setScalar(0.7 + Math.random() * 0.3);
      scene.add(sponge);
    }

    // ---------- 悬浮浮游粒子 ----------
    const planktonCount = reduced ? 400 : 1400;
    const particleGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(planktonCount * 3);
    const speedArr = new Float32Array(planktonCount);
    const phaseArr = new Float32Array(planktonCount);
    for (let i = 0; i < planktonCount; i++) {
      posArr[i * 3] = (Math.random() - 0.5) * 26;
      posArr[i * 3 + 1] = Math.random() * 10 - 1;
      posArr[i * 3 + 2] = Math.random() * -18;
      speedArr[i] = 0.3 + Math.random() * 0.9;
      phaseArr[i] = Math.random() * Math.PI * 2;
    }
    particleGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
    const particleMat = new THREE.PointsMaterial({
      map: makeGlowTexture(),
      size: 0.09,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xcfeaff,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---------- 三叶虫 ----------
    function makeTrilobite(): THREE.Group {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x5a3d2b, roughness: 0.85, metalness: 0.05 });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), bodyMat);
      head.scale.set(1, 0.55, 1.1);
      head.position.z = 0.6;
      g.add(head);
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.36 - i * 0.03, 12, 10), bodyMat);
        seg.scale.set(1, 0.5, 0.6);
        seg.position.z = -i * 0.34;
        g.add(seg);
      }
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 4), bodyMat);
      tail.rotation.x = Math.PI / 2;
      tail.rotation.y = Math.PI / 4;
      tail.position.z = -2.7;
      g.add(tail);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xd9c8a0, emissive: 0x443322, roughness: 0.4 });
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeMat);
        eye.position.set(side * 0.3, 0.08, 0.7);
        g.add(eye);
      }
      return g;
    }
    const trilobite = makeTrilobite();
    trilobite.scale.setScalar(0.9);
    trilobite.position.set(2.1, worldY(terrainHeightAt(2.1, -3.4)) + 0.18, -3.4);
    trilobite.rotation.y = -0.6;
    trilobite.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(trilobite);

    // ---------- 奇虾 (Anomalocaris): 8方向 Sprite 伪3D 游动 ----------
    const anomalocarisList: Anomalocaris[] = [];
    const img = new Image();
    img.src = ANOMALOCARIS_ATLAS_URL;
    img.onload = () => {
      const atlas = loadAnomalocarisAtlas(img);
      const ac = new Anomalocaris({
        scene,
        camera,
        textures: atlas,
        worldHeight: 2.6,
        scale: 4.0,
        phase: Math.random() * Math.PI * 2,
      });
      anomalocarisList.push(ac);
    };
    img.onerror = () => {
      // 素材加载失败时静默降级, 不影响场景
      console.warn("[abyss] Anomalocaris atlas failed to load");
    };

    // ---------- 光照: 最终参数 ----------
    // 环境散射: 青蓝, 强度高
    const hemiLight = new THREE.HemisphereLight(0x7ec8e3, 0x3a6a5a, 1.0);
    scene.add(hemiLight);

    // 阳光: 极淡青白强方向光, 开阴影
    const sunLight = new THREE.DirectionalLight(0xd0f0f5, 2.2);
    sunLight.position.set(10, 20, 8);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    scene.add(sunLight.target);

    // 补光: 消除死黑
    const fillLight = new THREE.DirectionalLight(0x5a9aaa, 0.5);
    fillLight.position.set(-8, 5, -8);
    scene.add(fillLight);

    // ---------- 体积光 (God Rays): 圆锥 + 透明材质 + 光柱尘埃 ----------
    function makeGodRay(x: number, z: number, tilt: number): THREE.Mesh {
      const geo = new THREE.ConeGeometry(1.6, 24, 12, 1, true);
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 128;
      const ctx = cv.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "rgba(180,225,255,0.18)");
      g.addColorStop(0.55, "rgba(180,225,255,0.06)");
      g.addColorStop(1, "rgba(180,225,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 128);
      const mat = new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(cv),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const ray = new THREE.Mesh(geo, mat);
      ray.position.set(x, 7, z);
      ray.rotation.z = tilt;
      return ray;
    }
    const rays = [makeGodRay(-3.4, -2, 0.08), makeGodRay(0.4, -3, 0.0), makeGodRay(3.6, -2.6, -0.08)];
    scene.add(...rays);

    // 光柱尘埃
    const dustMat = new THREE.PointsMaterial({
      map: makeGlowTexture(),
      size: 0.05,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xa8d8ea,
      opacity: 0.5,
    });
    for (const r of rays) {
      const count = 40;
      const dg = new THREE.BufferGeometry();
      const dp = new Float32Array(count * 3);
      const cx = r.position.x;
      const cz = r.position.z;
      for (let i = 0; i < count; i++) {
        const t = Math.random();
        const rad = THREE.MathUtils.lerp(0.35, 1.4, t);
        const ang = Math.random() * Math.PI * 2;
        dp[i * 3] = cx + Math.cos(ang) * rad;
        dp[i * 3 + 1] = 18 - t * 22;
        dp[i * 3 + 2] = cz + Math.sin(ang) * rad * 0.6;
      }
      dg.setAttribute("position", new THREE.BufferAttribute(dp, 3));
      scene.add(new THREE.Points(dg, dustMat));
    }

    // ---------- 后期处理: Bloom + 青蓝色偏 ----------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(host.clientWidth, host.clientHeight),
      0.6,
      0.5,
      0.3
    );
    composer.addPass(bloom);
    const colorPass = new ShaderPass(ColorCorrectionShader);
    colorPass.uniforms.mulRGB.value = new THREE.Vector3(1.05, 1.1, 1.22);
    colorPass.uniforms.addRGB.value = new THREE.Vector3(0.015, 0.02, 0.03);
    composer.addPass(colorPass);
    composer.addPass(new OutputPass());

    // ---------- 相机缓动 (指针视差) ----------
    const pointer = { x: 0, y: 0 };
    const smooth = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer);

    // ---------- 动画循环 ----------
    const clock = new THREE.Clock();
    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      const dt = Math.min(clock.getDelta() || 0.016, 0.05);

      smooth.x += (pointer.x - smooth.x) * 0.03;
      smooth.y += (pointer.y - smooth.y) * 0.03;
      camera.position.x = smooth.x * 1.8;
      camera.position.y = 10 + smooth.y * 1.2;
      camera.position.z = 16;
      camera.lookAt(0, -0.5, 0);

      // 焦散流动
      causticsMat.uniforms.time.value = t;

      // 海藻水流摆动 (顶点着色器)
      for (const m of nearSeaweedMats) m.userData.uTime.value = t;
      for (const m of farSeaweedMats) m.userData.uTime.value = t;

      // 浮游粒子向上漂
      const pos = particleGeo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < planktonCount; i++) {
        let y = arr[i * 3 + 1] + speedArr[i] * dt * 0.5;
        const x = arr[i * 3] + Math.sin(t * 0.4 + phaseArr[i]) * 0.004;
        if (y > 10) y = -1;
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
      }
      pos.needsUpdate = true;

      // 体积光微动
      rays.forEach((b, i) => {
        b.position.x += Math.sin(t * 0.25 + i * 2.1) * 0.0015;
        const m = b.material as THREE.MeshBasicMaterial;
        m.opacity = 0.7 + Math.sin(t * 0.4 + i * 1.7) * 0.15;
      });

      // 三叶虫缓慢爬动
      trilobite.position.x = 2.1 + Math.sin(t * 0.15) * 0.5;
      trilobite.rotation.z = Math.sin(t * 0.4) * 0.06;

      // 奇虾 8方向伪3D 游动
      for (const ac of anomalocarisList) {
        ac.update(t, dt);
      }

      composer.render();
    }
    loop();

    // ---------- 尺寸自适应 ----------
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      composer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(host);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      for (const ac of anomalocarisList) ac.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry?.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m.dispose();
        }
      });
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      container.remove();
    };
  }, []);

  return <div ref={hostRef} className={`abyss-scene${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
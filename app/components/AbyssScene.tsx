"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

const FOG_COLOR = 0x0a1520;
const SAND_BASE_Y = -1.2;
const SAND_SIZE = 100;
const SAND_SEGMENTS = 128;

/**
 * AbyssScene — 寒武纪海底 Three.js 背景
 *
 * 参考 threeui sylva/living-green 的程序化生成思路:
 *  - 多层 Simplex Noise 位移的起伏砂床 (PlaneGeometry 100x100, 128x128)
 *  - 顶点色: 深海砂渐变 + 岩石附近生物膜褐化 + 开阔处灰蓝
 *  - 程序化 bump map 砂粒质感
 *  - 三层光照: 月光方向光(带阴影) + 生物发光点光 + 环境补光
 *  - 圆锥几何体假体积光 + 光柱尘埃
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
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(FOG_COLOR, 0.035);

    const camera = new THREE.PerspectiveCamera(
      55,
      host.clientWidth / host.clientHeight,
      0.1,
      120
    );
    camera.position.set(0, 1.4, 9);
    camera.lookAt(0, 1, 0);

    // ---------- 噪声 ----------
    const noise = new SimplexNoise();
    function fbm(x: number, y: number, octaves: number): number {
      let v = 0;
      let amp = 0.5;
      let freq = 1;
      for (let o = 0; o < octaves; o++) {
        v += amp * noise.noise(x * freq, y * freq);
        amp *= 0.5;
        freq *= 2;
      }
      return v;
    }
    function terrainHeightAt(x: number, z: number): number {
      const large = fbm(x * 0.03, z * 0.03, 3) * 1.6;
      const detail = fbm(x * 0.14, z * 0.14, 4) * 0.8;
      return THREE.MathUtils.clamp(large + detail, 0.0, 2.0);
    }
    const worldY = (h: number) => SAND_BASE_Y + h;

    // ---------- 岩石散布点 (砂床颜色与岩石网格共用) ----------
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

    // ---------- 程序化纹理: 砂粒 bump map ----------
    function makeSandBumpTexture(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 256;
      cv.height = 256;
      const ctx = cv.getContext("2d")!;
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) {
        const v = 88 + Math.random() * 84;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.floor(Math.random() * 256), Math.floor(Math.random() * 256), 1, 1);
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(24, 24);
      return tex;
    }

    // ---------- 海底砂床: 多层噪声位移地形 ----------
    const sandGeo = new THREE.PlaneGeometry(SAND_SIZE, SAND_SIZE, SAND_SEGMENTS, SAND_SEGMENTS);
    sandGeo.rotateX(-Math.PI / 2);
    const posAttr = sandGeo.attributes.position as THREE.BufferAttribute;
    const heights = new Float32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = terrainHeightAt(x, z);
      heights[i] = h;
      posAttr.setY(i, h);
    }
    sandGeo.computeVertexNormals();

    // 顶点色: 深海砂渐变 + 岩石生物膜褐化 + 开阔灰蓝
    const color = new THREE.Color();
    const deep = new THREE.Color(0x0f1f2e);
    const shallow = new THREE.Color(0x1a2f3e);
    const biofilm = new THREE.Color(0x3a2a1d);
    const openBlue = new THREE.Color(0x24384a);
    const colorArr = new Float32Array(posAttr.count * 3);
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      color.copy(deep).lerp(shallow, THREE.MathUtils.clamp(heights[i] / 2.0, 0, 1));
      let dMin = Infinity;
      for (const r of rockSpots) {
        const dx = x - r.x;
        const dz = z - r.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < dMin) dMin = d;
      }
      const brown = THREE.MathUtils.clamp(1 - dMin / 8, 0, 1);
      color.lerp(biofilm, brown * 0.55);
      const open = THREE.MathUtils.clamp(1 - dMin / 16, 0, 1);
      color.lerp(openBlue, open * 0.3);
      colorArr[i * 3] = color.r;
      colorArr[i * 3 + 1] = color.g;
      colorArr[i * 3 + 2] = color.b;
    }
    sandGeo.setAttribute("color", new THREE.BufferAttribute(colorArr, 3));

    const sandMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      bumpMap: makeSandBumpTexture(),
      bumpScale: 0.6,
      roughness: 1,
      metalness: 0,
      color: 0xffffff,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.set(0, worldY(0), -2);
    sand.receiveShadow = true;
    scene.add(sand);

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

    // ---------- 摇曳海藻 ----------
    const kelpGroup = new THREE.Group();
    scene.add(kelpGroup);
    const kelpMat = new THREE.MeshStandardMaterial({
      color: 0x1c5a3a,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const kelpMat2 = new THREE.MeshStandardMaterial({
      color: 0x145036,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    function addKelp(x: number, z: number, h: number, phase: number, color2: boolean) {
      const geo = new THREE.CylinderGeometry(0.05, 0.09, 1, 6, 14, true);
      const kelp = new THREE.Mesh(geo, color2 ? kelpMat2 : kelpMat);
      const base = worldY(terrainHeightAt(x, z));
      kelp.position.set(x, base + h / 2, z);
      kelp.scale.y = h;
      kelp.userData = { baseX: x, baseZ: z, base, h, phase, t: 0 };
      kelpGroup.add(kelp);
    }
    for (let i = 0; i < 26; i++) {
      const x = (Math.random() - 0.5) * 14;
      const z = -1.5 - Math.random() * 8;
      const h = 1.2 + Math.random() * 2.4;
      addKelp(x, z, h, Math.random() * Math.PI * 2, Math.random() > 0.5);
    }
    const kelpBladeMat = new THREE.MeshStandardMaterial({
      color: 0x1e6a44,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    const kelpBlades: THREE.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 1.1), kelpBladeMat);
      const x = (Math.random() - 0.5) * 13;
      const z = -1.2 - Math.random() * 7;
      blade.position.set(x, worldY(terrainHeightAt(x, z)) + 0.4 + Math.random() * 2.6, z);
      blade.rotation.z = (Math.random() - 0.5) * 0.7;
      blade.userData = { phase: Math.random() * Math.PI * 2, amp: 0.1 + Math.random() * 0.15 };
      kelpBlades.push(blade);
      scene.add(blade);
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

    // ---------- 光照: 三层系统 ----------
    // 1) 月光/水面折射光 (主光源, 带阴影)
    const moon = new THREE.DirectionalLight(0xa8d8ea, 0.8);
    moon.position.set(-5, 10, 4);
    moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    moon.shadow.camera.near = 0.5;
    moon.shadow.camera.far = 40;
    moon.shadow.camera.left = -14;
    moon.shadow.camera.right = 14;
    moon.shadow.camera.top = 14;
    moon.shadow.camera.bottom = -14;
    moon.shadow.bias = -0.0005;
    scene.add(moon);
    scene.add(moon.target);

    // 2) 生物发光点光 (海藻丛与浮游处)
    const bioSpots: [number, number, number][] = [
      [-2.4, 1.6, -5],
      [2.2, 1.2, -7.5],
      [-4.6, 1.0, -9],
      [4.8, 1.4, -11],
      [-0.4, 2.0, -13],
      [6.5, 0.9, -6],
    ];
    for (const [x, y, z] of bioSpots) {
      const pl = new THREE.PointLight(0x4ecdc4, 0.5, 8, 2);
      pl.position.set(x, y, z);
      scene.add(pl);
    }

    // 3) 环境补光
    const amb = new THREE.AmbientLight(0x1a2a3a, 0.3);
    scene.add(amb);

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
      camera.position.x = smooth.x * 1.4;
      camera.position.y = 1.4 + smooth.y * 0.8;
      camera.lookAt(0, 1, 0);

      // 海藻摇曳
      for (const blade of kelpBlades) {
        const { phase, amp } = blade.userData;
        blade.rotation.z = Math.sin(t * 1.2 + phase) * amp;
      }

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

      renderer.render(scene, camera);
    }
    loop();

    // ---------- 尺寸自适应 ----------
    const onResize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
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
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
          o.geometry?.dispose();
          const m = o.material as THREE.Material | THREE.Material[];
          if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
          else m.dispose();
        }
      });
      renderer.dispose();
      container.remove();
    };
  }, []);

  return <div ref={hostRef} className={`abyss-scene${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
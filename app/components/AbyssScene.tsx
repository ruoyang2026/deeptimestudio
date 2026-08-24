"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * AbyssScene — 寒武纪海底 Three.js 背景
 *
 * 复刻 threeui sylva/living-green 的架构思路: 一个程序化生成的
 * 三维海底场景, 用 CanvasTexture 做程序化纹理, 粒子系统做浮游生物,
 * 半透明水母 + 摇曳海藻 + 体积光, 挂在固定定位的 canvas 上。
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
    renderer.setClearColor(0x06121f, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x06121f, 18, 60);

    const camera = new THREE.PerspectiveCamera(
      55,
      host.clientWidth / host.clientHeight,
      0.1,
      120
    );
    camera.position.set(0, 1.4, 9);
    camera.lookAt(0, 1, 0);

    // ---------- 程序化纹理: 海底砂床 (CanvasTexture) ----------
    function makeSandTexture(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 512;
      cv.height = 512;
      const ctx = cv.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0, "#123a3f");
      g.addColorStop(1, "#071d24");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const a = 0.06 + Math.random() * 0.12;
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(80,140,130,${a})` : `rgba(20,50,60,${a})`;
        ctx.beginPath();
        ctx.arc(x, y, Math.random() * 1.6 + 0.3, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(6, 2);
      return tex;
    }

    // ---------- 海底砂床 ----------
    const sandGeo = new THREE.PlaneGeometry(80, 30, 48, 24);
    sandGeo.rotateX(-Math.PI / 2);
    const sandMat = new THREE.MeshStandardMaterial({
      map: makeSandTexture(),
      roughness: 1,
      metalness: 0,
      color: 0x1b3b40,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.set(0, -0.5, -4);
    scene.add(sand);

    // ---------- 体积光 (程序化片光) ----------
    function makeLightBeam(x: number): THREE.Mesh {
      const geo = new THREE.PlaneGeometry(1.6, 22);
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 256;
      const ctx = cv.getContext("2d")!;
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "rgba(150,220,255,0.10)");
      g.addColorStop(0.6, "rgba(150,220,255,0.04)");
      g.addColorStop(1, "rgba(150,220,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 256);
      const tex = new THREE.CanvasTexture(cv);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const beam = new THREE.Mesh(geo, mat);
      beam.position.set(x, 6, -2);
      beam.rotation.z = 0.08;
      beam.rotation.x = 0.12;
      return beam;
    }
    const beams = [makeLightBeam(-3.4), makeLightBeam(0.2), makeLightBeam(3.8)];
    scene.add(...beams);

    // ---------- 摇曳海藻 (弯曲的管状几何体) ----------
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
      const segs = 14;
      const geo = new THREE.CylinderGeometry(0.05, 0.09, 1, 6, segs, true);
      const mat = color2 ? kelpMat2 : kelpMat;
      const kelp = new THREE.Mesh(geo, mat);
      kelp.position.set(x, h / 2 - 0.5, z);
      kelp.userData = { baseX: x, baseZ: z, h, phase, t: 0 };
      kelpGroup.add(kelp);
    }
    // 一片海藻林
    for (let i = 0; i < 26; i++) {
      const x = (Math.random() - 0.5) * 14;
      const z = -1.5 - Math.random() * 8;
      const h = 1.2 + Math.random() * 2.4;
      addKelp(x, z, h, Math.random() * Math.PI * 2, Math.random() > 0.5);
    }
    // 每根海藻用几何体变形做摇曳 (简单: 顶部挂叶子粒子)
    const kelpBladeMat = new THREE.MeshStandardMaterial({
      color: 0x1e6a44,
      side: THREE.DoubleSide,
      roughness: 0.9,
    });
    const kelpBlades: THREE.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const blade = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 1.1),
        kelpBladeMat
      );
      blade.position.set(
        (Math.random() - 0.5) * 13,
        0.4 + Math.random() * 2.6,
        -1.2 - Math.random() * 7
      );
      blade.rotation.z = (Math.random() - 0.5) * 0.7;
      blade.userData = { phase: Math.random() * Math.PI * 2, amp: 0.1 + Math.random() * 0.15 };
      kelpBlades.push(blade);
      scene.add(blade);
    }

    // ---------- 浮游粒子 (浮游生物/雪) ----------
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

    function makePlanktonTexture(): THREE.CanvasTexture {
      const cv = document.createElement("canvas");
      cv.width = 64;
      cv.height = 64;
      const ctx = cv.getContext("2d")!;
      const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(210,240,255,0.9)");
      g.addColorStop(0.4, "rgba(180,225,255,0.35)");
      g.addColorStop(1, "rgba(180,225,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(cv);
    }
    const particleMat = new THREE.PointsMaterial({
      map: makePlanktonTexture(),
      size: 0.09,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: 0xcfeaff,
      opacity: 0.7,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ---------- 半透明水母 ----------
    const jellyGroup = new THREE.Group();
    scene.add(jellyGroup);
    function makeJelly(x: number, y: number, z: number, scale: number, hue: number) {
      const g = new THREE.Group();
      const bellMat = new THREE.MeshStandardMaterial({
        color: hue,
        transparent: true,
        opacity: 0.28,
        roughness: 0.2,
        metalness: 0,
        emissive: hue,
        emissiveIntensity: 0.25,
        side: THREE.DoubleSide,
      });
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), bellMat);
      bell.scale.y = 0.7;
      g.add(bell);
      // 触手
      const tentMat = new THREE.MeshStandardMaterial({
        color: hue,
        transparent: true,
        opacity: 0.2,
        emissive: hue,
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide,
      });
      for (let i = 0; i < 5; i++) {
        const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 1.2, 5), tentMat);
        tent.position.set(
          (i - 2) * 0.14,
          -0.65,
          (Math.random() - 0.5) * 0.2
        );
        tent.rotation.z = (Math.random() - 0.5) * 0.12;
        g.add(tent);
      }
      g.scale.setScalar(scale);
      g.position.set(x, y, z);
      g.userData = {
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        hue,
        driftX: 0.2 + Math.random() * 0.5,
      };
      jellyGroup.add(g);
    }
    if (!reduced) {
      makeJelly(-2.4, 3.2, -6, 1.5, 0x2fd6a8);
      makeJelly(2.8, 2.2, -9, 1.1, 0x4aa8ff);
      makeJelly(0.4, 4.4, -12, 2.0, 0xbf7cff);
      makeJelly(3.6, 5.2, -7, 0.9, 0x2fd6a8);
      makeJelly(-3.8, 5.8, -11, 1.3, 0x4aa8ff);
    }

    // ---------- 三叶虫 (寒武纪标志生物, 程序化体节) ----------
    function makeTrilobite(): THREE.Group {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x5a3d2b,
        roughness: 0.85,
        metalness: 0.05,
      });
      // 头甲
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), bodyMat);
      head.scale.set(1, 0.55, 1.1);
      head.position.z = 0.6;
      g.add(head);
      // 胸节 (体节)
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(new THREE.SphereGeometry(0.36 - i * 0.03, 12, 10), bodyMat);
        seg.scale.set(1, 0.5, 0.6);
        seg.position.z = -i * 0.34;
        g.add(seg);
      }
      // 尾甲
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 4), bodyMat);
      tail.rotation.x = Math.PI / 2;
      tail.rotation.y = Math.PI / 4;
      tail.position.z = -2.7;
      g.add(tail);
      // 眼睛
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0xd9c8a0,
        emissive: 0x443322,
        roughness: 0.4,
      });
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), eyeMat);
        eye.position.set(side * 0.3, 0.08, 0.7);
        g.add(eye);
      }
      return g;
    }
    const trilobite = makeTrilobite();
    trilobite.scale.setScalar(0.9);
    trilobite.position.set(2.1, 0.3, -3.4);
    trilobite.rotation.y = -0.6;
    scene.add(trilobite);

    // ---------- 岩石 ----------
    function addRock(x: number, z: number, s: number) {
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x2c3a42,
        roughness: 0.95,
        metalness: 0,
      });
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), rockMat);
      rock.position.set(x, -0.4 + s * 0.4, z);
      rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      scene.add(rock);
    }
    addRock(-3.5, -3.6, 0.7);
    addRock(3.9, -5, 0.9);
    addRock(-1.8, -6.4, 0.5);
    addRock(0.9, -8.2, 1.1);

    // ---------- 光照 ----------
    const hemi = new THREE.HemisphereLight(0x2a7a9a, 0x06121f, 0.7);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xbfe8ff, 0.9);
    dir.position.set(-2, 8, 4);
    scene.add(dir);
    const amb = new THREE.AmbientLight(0x1a3a52, 0.6);
    scene.add(amb);

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

      // 相机视差
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

      // 水母漂浮
      for (const j of jellyGroup.children) {
        const { baseY, phase } = j.userData;
        j.position.y = baseY + Math.sin(t * 0.6 + phase) * 0.7;
        j.position.x += Math.sin(t * 0.2 + phase) * 0.002;
        j.rotation.y = Math.sin(t * 0.3 + phase) * 0.4;
        j.rotation.z = Math.sin(t * 0.5 + phase) * 0.08;
      }

      // 体积光微动
      beams.forEach((b, i) => {
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
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const m = o.material as THREE.Material;
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
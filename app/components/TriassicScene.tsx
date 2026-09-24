"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { ColorCorrectionShader } from "three/examples/jsm/shaders/ColorCorrectionShader.js";

/**
 * TriassicScene — the Triassic shallow-sea ecology, ported from the standalone
 * trisea index.html into the Discovery canvas.
 *
 *  - Default cinematic camera, NO user camera control (OrbitControls removed).
 *  - A looping auto-play: the camera swings 90° clockwise around the target and
 *    back, forever.
 *  - The five GLB creatures are fetched from the guarded /api/models route; the
 *    files live outside public/ and are never exposed as static assets.
 */

type CreatureConfig = {
  id: string;
  url: string;
  length: number;
  position: [number, number, number];
  rotation: [number, number, number];
  bob: number;
  phase: number;
  sway: number;
};

const TRIASSIC_CREATURES: CreatureConfig[] = [
  // hero: Nothosaurus, centre-right, head rising to the upper-right
  { id: "nothosaurus", url: "/api/models/Nothosaurus_Sp.glb", length: 3.0,
    position: [0.7, -0.6, -4.2], rotation: [-0.30, Math.PI * 0.42, 0.12],
    bob: 0.05, phase: 1.3, sway: 0.03 },
  // Big Mixosaurus (1.85 m) with two juveniles riding just above it.
  { id: "mixosaurus_adult", url: "/api/models/Mixosaurus1.glb", length: 1.85,
    position: [-3.85, 0.55, -4.5], rotation: [0.02, Math.PI * 0.55, -0.04],
    bob: 0.08, phase: 2.1, sway: 0.05 },
  { id: "mixosaurus_juv1", url: "/api/models/Mixosaurus2.glb", length: 1.0,
    position: [-4.35, 0.92, -4.41], rotation: [-0.06, Math.PI * 0.46, 0.06],
    bob: 0.08, phase: 3.4, sway: 0.05 },
  { id: "mixosaurus_juv2", url: "/api/models/Mixosaurus2.glb", length: 0.85,
    position: [-4.47, 0.95, -4.68], rotation: [0.0, Math.PI * 0.48, 0],
    bob: 0.08, phase: 4.7, sway: 0.05 },
  // single Sinosaurosphargis ~0.4 m off the Nothosaurus tail tip
  { id: "sinosaurosphargis", url: "/api/models/Sinosaurosphargis.glb", length: 1.1,
    position: [-1.56, -1.41, -4.86], rotation: [0.10, Math.PI * 0.44, 0.06],
    bob: 0.03, phase: 1.9, sway: 0.03 },
  // diver: left-mid observer / scale reference
  { id: "diver", url: "/api/models/diver.glb", length: 1.7,
    position: [-2.2, 0.2, -5.5], rotation: [-0.10, Math.PI * 0.40, 0.10],
    bob: 0.05, phase: 0.0, sway: 0.015 },
];

const COLORS = {
  fog: 0x0e7ca3,
  deepWater: 0x063a5c,
  surfaceSky: 0xcdeffb,
  sand: 0xdcd5c0,
};

const WORLD = {
  seabedY: -3.2,
  seabedWidth: 140,
  seabedDepth: 140,
  seabedSegments: 220,
  waterSurfaceY: 6,
  fogDensity: 0.020,
};

// Default camera framing (identical to the standalone scene).
const CAMERA_TARGET = new THREE.Vector3(-0.6, 0.1, -5.0);
const CAMERA_POSITION = new THREE.Vector3(2.4, 0.3, -0.6);

// Looping auto-play: a 20 s out-and-back sweep of 90°, clockwise seen from above.
const AUTO_PLAY_DURATION = 20;
const AUTO_PLAY_ANGLE = -Math.PI / 2;
const AUTO_PLAY_UP = new THREE.Vector3(0, 1, 0);

// God-ray tuning carried over from the trisea scene (v2): the shafts live in
// the upper water column, with a faint floor so they do not cut off at y = 0.
const BEAM_FLOOR = 0.73;

export default function TriassicScene({ className = "" }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let disposed = false;
    let raf = 0;

    // -------------------------------------------------------------------------
    // Renderer
    // -------------------------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(host.clientWidth, 1), Math.max(host.clientHeight, 1));
    renderer.setClearColor(COLORS.fog, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    host.appendChild(renderer.domElement);

    // -------------------------------------------------------------------------
    // Scene / Camera (fixed; no OrbitControls)
    // -------------------------------------------------------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.fog);
    scene.fog = new THREE.FogExp2(COLORS.fog, WORLD.fogDensity);

    const camera = new THREE.PerspectiveCamera(
      55,
      Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1),
      0.1,
      300,
    );
    camera.position.copy(CAMERA_POSITION);
    camera.lookAt(CAMERA_TARGET);

    // -------------------------------------------------------------------------
    // Noise
    // -------------------------------------------------------------------------
    const noise = new SimplexNoise();

    function fbm(x: number, y: number, octaves = 4) {
      let value = 0;
      let amplitude = 0.5;
      let frequency = 1;
      for (let i = 0; i < octaves; i++) {
        value += amplitude * noise.noise(x * frequency, y * frequency);
        frequency *= 2.05;
        amplitude *= 0.5;
      }
      return value;
    }

    // -------------------------------------------------------------------------
    // Water gradient dome
    // -------------------------------------------------------------------------
    const waterDomeMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x7fe9ff) },
        midColor: { value: new THREE.Color(COLORS.fog) },
        bottomColor: { value: new THREE.Color(COLORS.deepWater) },
      },
      vertexShader: `
        varying vec3 vWorldDirection;
        void main() {
          vWorldDirection = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldDirection;
        void main() {
          float h = vWorldDirection.y;
          vec3 color = h > 0.0
            ? mix(midColor, topColor, pow(h, 0.55))
            : mix(midColor, bottomColor, pow(-h, 0.7));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    const waterDome = new THREE.Mesh(new THREE.SphereGeometry(240, 32, 24), waterDomeMat);
    scene.add(waterDome);

    // -------------------------------------------------------------------------
    // Seabed geometry
    // -------------------------------------------------------------------------
    function seabedHeight(x: number, z: number) {
      const broad = fbm(x * 0.03, z * 0.03, 3) * 0.9;
      const small = fbm(x * 0.14 + 10, z * 0.14 - 5, 3) * 0.12;
      const slope = Math.max(0, -z - 10) * 0.02;
      return broad + small - slope;
    }

    const seabedGeo = new THREE.PlaneGeometry(
      WORLD.seabedWidth,
      WORLD.seabedDepth,
      WORLD.seabedSegments,
      WORLD.seabedSegments,
    );
    seabedGeo.rotateX(-Math.PI / 2);
    const seabedPos = seabedGeo.attributes.position;
    for (let i = 0; i < seabedPos.count; i++) {
      const x = seabedPos.getX(i);
      const z = seabedPos.getZ(i);
      seabedPos.setY(i, seabedHeight(x, z));
    }
    seabedGeo.computeVertexNormals();

    // -------------------------------------------------------------------------
    // Procedural fine-sand texture
    // -------------------------------------------------------------------------
    function createSandTexture() {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#d3ccb4";
      ctx.fillRect(0, 0, size, size);
      const img = ctx.getImageData(0, 0, size, size);
      const data = img.data;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const ripple =
            Math.sin(x * 0.028 + fbm(x * 0.006, y * 0.006, 3) * 9.0 + y * 0.004) * 0.5 + 0.5;
          const grain = (Math.random() - 0.5) * 18;
          const shade = (ripple - 0.5) * 26 + grain;
          data[idx] = Math.max(0, Math.min(255, data[idx] + shade));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + shade));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + shade * 0.9));
        }
      }
      ctx.putImageData(img, 0, 0);
      for (let i = 0; i < 9000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const dark = Math.random() < 0.6;
        ctx.fillStyle = dark
          ? `rgba(90,95,80,${0.08 + Math.random() * 0.12})`
          : `rgba(250,248,235,${0.10 + Math.random() * 0.12})`;
        const s = Math.random() < 0.85 ? 1 : 2;
        ctx.fillRect(x, y, s, s);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(10, 10);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }

    const sandTexture = createSandTexture();
    const seabedMaterial = new THREE.MeshStandardMaterial({
      map: sandTexture,
      color: COLORS.sand,
      roughness: 0.95,
      metalness: 0,
      bumpMap: sandTexture,
      bumpScale: 0.02,
    });
    const seabed = new THREE.Mesh(seabedGeo, seabedMaterial);
    seabed.position.set(0, WORLD.seabedY, -25);
    seabed.receiveShadow = true;
    scene.add(seabed);

    // -------------------------------------------------------------------------
    // Caustics
    // -------------------------------------------------------------------------
    const causticsMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 } },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPosition = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying vec3 vWorldPosition;
        float filament(vec2 p, float t) {
          vec2 p1 = p * 1.6 + vec2(t * 0.12, t * 0.08);
          vec2 p2 = p * 2.1 - vec2(t * 0.10, t * 0.15);
          float s1 = sin(p1.x * 4.0 + sin(p1.y * 3.5 + t * 0.3));
          float s2 = cos(p1.y * 3.8 + cos(p1.x * 3.2 - t * 0.25));
          float s3 = sin(p2.x * 5.0 + cos(p2.y * 4.2 - t * 0.4));
          float s4 = cos(p2.y * 4.8 + sin(p2.x * 4.5 + t * 0.3));
          float w = abs(s1 + s2) * abs(s3 + s4);
          return pow(1.0 - clamp(w * 0.28, 0.0, 1.0), 8.5);
        }
        void main() {
          vec2 p = vWorldPosition.xz * 0.25;
          float c = filament(p, time) + filament(p * 1.8 + 2.5, time * 1.3) * 0.5;
          float dist = length(vWorldPosition.xz);
          float distFade = 1.0 - smoothstep(16.0, 60.0, dist);
          float alpha = clamp(c, 0.0, 1.6) * distFade * 0.45;
          gl_FragColor = vec4(0.80, 0.97, 1.0, alpha);
        }
      `,
    });
    const caustics = new THREE.Mesh(seabedGeo.clone(), causticsMat);
    caustics.position.copy(seabed.position);
    caustics.position.y += 0.06;
    scene.add(caustics);

    // -------------------------------------------------------------------------
    // Water surface
    // -------------------------------------------------------------------------
    const waterSurfaceMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
      uniforms: {
        time: { value: 0 },
        shallowColor: { value: new THREE.Color(0x2fa8cf) },
        skyColor: { value: new THREE.Color(COLORS.surfaceSky) },
        fogColor: { value: new THREE.Color(COLORS.fog) },
        fogDensity: { value: WORLD.fogDensity },
      },
      vertexShader: `
        uniform float time;
        varying vec3 vWorldPosition;
        varying vec3 vNormalWorld;
        varying vec2 vUv;
        vec3 wave(vec3 p, vec2 dir, float freq, float speed, float amp) {
          float ph = dot(p.xz, dir) * freq + time * speed;
          p.y += sin(ph) * amp;
          return p;
        }
        void main() {
          vUv = uv;
          vec3 p = position;
          p = wave(p, vec2( 1.0,  0.3), 0.35,  0.9, 0.16);
          p = wave(p, vec2(-0.6,  1.0), 0.55,  1.3, 0.10);
          p = wave(p, vec2( 0.8, -0.7), 0.90, -1.7, 0.05);
          float e = 0.15;
          vec3 px = p;
          px.x += e;
          px = wave(wave(wave(px, vec2(1.0,0.3),0.35,0.9,0.16), vec2(-0.6,1.0),0.55,1.3,0.10), vec2(0.8,-0.7),0.90,-1.7,0.05);
          vec3 pz = p;
          pz.z += e;
          pz = wave(wave(wave(pz, vec2(1.0,0.3),0.35,0.9,0.16), vec2(-0.6,1.0),0.55,1.3,0.10), vec2(0.8,-0.7),0.90,-1.7,0.05);
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorldPosition = wp.xyz;
          vec3 tangentX = wp.xyz + vec3(e, px.y - p.y, 0.0) - wp.xyz;
          vec3 tangentZ = wp.xyz + vec3(0.0, pz.y - p.y, e) - wp.xyz;
          vNormalWorld = normalize(cross(tangentZ, tangentX));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 shallowColor;
        uniform vec3 skyColor;
        uniform vec3 fogColor;
        uniform float fogDensity;
        varying vec3 vWorldPosition;
        varying vec3 vNormalWorld;
        varying vec2 vUv;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          vec3 n = normalize(vNormalWorld);
          float sparkle =
            sin(vWorldPosition.x * 6.0 + time * 2.1) *
            sin(vWorldPosition.z * 5.0 - time * 1.7);
          n = normalize(n + vec3(sparkle * 0.08, 0.0, sparkle * 0.06));
          float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0);
          vec3 color = mix(shallowColor, skyColor, fresnel);
          vec3 sunDir = normalize(vec3(-0.4, 1.0, 0.25));
          float spec = pow(max(dot(reflect(-viewDir, n), sunDir), 0.0), 60.0);
          color += vec3(1.0, 0.98, 0.9) * spec * 0.9;
          float dist = length(cameraPosition - vWorldPosition);
          float fogFactor = 1.0 - exp(-fogDensity * fogDensity * dist * dist * 0.6);
          color = mix(color, fogColor, fogFactor);
          float alpha = 0.82;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });
    const waterSurfaceGeo = new THREE.PlaneGeometry(260, 260, 128, 128);
    waterSurfaceGeo.rotateX(-Math.PI / 2);
    const waterSurface = new THREE.Mesh(waterSurfaceGeo, waterSurfaceMat);
    waterSurface.position.set(0, WORLD.waterSurfaceY, -30);
    scene.add(waterSurface);

    // -------------------------------------------------------------------------
    // God rays
    // -------------------------------------------------------------------------
    const godRayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        time: { value: 0 },
        opacity: { value: 0.16 },
        seed: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vWorldY;
        void main() {
          vUv = uv;
          vWorldY = (modelMatrix * vec4(position, 1.0)).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float opacity;
        uniform float seed;
        varying vec2 vUv;
        varying float vWorldY;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1, 0)), f.x),
            mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x),
            f.y
          );
        }
        void main() {
          float lateral = smoothstep(0.0, 0.42, vUv.x) * smoothstep(1.0, 0.58, vUv.x);
          float vertical = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.72, vUv.y);
          // Keep the shafts in the upper water column, with a faint floor so
          // they do not cut off abruptly below y = 0 (trisea v2, floor 0.73).
          float columnFade = ${BEAM_FLOOR} + ${(1 - BEAM_FLOOR).toFixed(2)} * smoothstep(0.0, 2.0, vWorldY);
          float streaks =
            noise(vec2(vUv.x * 5.0 + seed * 7.0, vUv.y * 2.0 - time * 0.10)) * 0.6 +
            noise(vec2(vUv.x * 12.0, vUv.y * 4.0 - time * 0.22 + seed)) * 0.4;
          streaks = smoothstep(0.25, 0.9, streaks);
          float a = lateral * vertical * streaks * opacity * columnFade;
          gl_FragColor = vec4(0.85, 0.97, 1.0, a);
        }
      `,
    });

    function createGodRay(
      x: number, z: number, width: number, height: number,
      tiltZ: number, tiltX: number, seed: number, opacity: number,
    ) {
      const mat = godRayMat.clone();
      mat.uniforms.seed.value = seed;
      mat.uniforms.opacity.value = opacity;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      mesh.position.set(x, WORLD.waterSurfaceY - height * 0.42, z);
      mesh.rotation.z = tiltZ;
      mesh.rotation.x = tiltX;
      return mesh;
    }

    const godRays = [
      createGodRay(-4.5, -6, 5.0, 26, -0.10, -0.03, 0.3, 0.16),
      createGodRay(-1.5, -5, 6.0, 28, -0.05, -0.02, 1.7, 0.21),
      createGodRay( 1.6, -6, 5.5, 28,  0.02, -0.02, 3.1, 0.24),
      createGodRay( 4.5, -8, 4.0, 26,  0.08, -0.03, 4.9, 0.14),
      createGodRay(-7.5, -9, 7.0, 24, -0.16, -0.05, 6.2, 0.12),
    ];
    scene.add(...godRays);

    // -------------------------------------------------------------------------
    // Suspended particles / marine snow
    // -------------------------------------------------------------------------
    function createGlowTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, "rgba(255,255,255,0.9)");
      gradient.addColorStop(0.3, "rgba(220,245,255,0.3)");
      gradient.addColorStop(1, "rgba(180,230,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    }

    const glowTexture = createGlowTexture();

    const planktonCount = reducedMotion ? 400 : 1400;
    const planktonGeo = new THREE.BufferGeometry();
    const planktonPositions = new Float32Array(planktonCount * 3);
    const planktonSpeed = new Float32Array(planktonCount);
    const planktonPhase = new Float32Array(planktonCount);
    for (let i = 0; i < planktonCount; i++) {
      planktonPositions[i * 3] = (Math.random() - 0.5) * 50;
      planktonPositions[i * 3 + 1] =
        WORLD.seabedY + 0.5 + Math.random() * (WORLD.waterSurfaceY - WORLD.seabedY - 1);
      planktonPositions[i * 3 + 2] = 8 - Math.random() * 60;
      planktonSpeed[i] = 0.05 + Math.random() * 0.18;
      planktonPhase[i] = Math.random() * Math.PI * 2;
    }
    planktonGeo.setAttribute("position", new THREE.BufferAttribute(planktonPositions, 3));
    const planktonMat = new THREE.PointsMaterial({
      map: glowTexture,
      color: 0xeafcff,
      size: 0.11,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const plankton = new THREE.Points(planktonGeo, planktonMat);
    scene.add(plankton);

    const sparkleCount = reducedMotion ? 120 : 480;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparklePositions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      sparklePositions[i * 3] = (Math.random() - 0.5) * 46;
      sparklePositions[i * 3 + 1] = WORLD.waterSurfaceY - 0.3 - Math.random() * 3.2;
      sparklePositions[i * 3 + 2] = 10 - Math.random() * 55;
    }
    sparkleGeo.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    const sparkleMat = new THREE.PointsMaterial({
      map: glowTexture,
      color: 0xf2ffff,
      size: 0.18,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const sparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(sparkles);

    // -------------------------------------------------------------------------
    // Lighting
    // -------------------------------------------------------------------------
    const hemi = new THREE.HemisphereLight(0xbfeeff, 0x2f6f78, 1.75);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xf6ffff, 3.8);
    sun.position.set(-3, 20, 2);
    sun.target.position.set(0.7, -0.6, -4.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -24;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    scene.add(sun.target);

    const rim = new THREE.DirectionalLight(0xa9e8ff, 1.0);
    rim.position.set(4, 7, -14);
    rim.target.position.set(0.7, -0.6, -4.2);
    scene.add(rim);
    scene.add(rim.target);

    const fill = new THREE.DirectionalLight(0x3d86a8, 0.6);
    fill.position.set(10, 3, -10);
    scene.add(fill);

    // -------------------------------------------------------------------------
    // Post-processing
    // -------------------------------------------------------------------------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloom = new UnrealBloomPass(
      new THREE.Vector2(host.clientWidth, host.clientHeight),
      0.20,
      0.45,
      0.95,
    );
    composer.addPass(bloom);

    const colorPass = new ShaderPass(ColorCorrectionShader);
    colorPass.uniforms.mulRGB.value = new THREE.Vector3(0.96, 1.05, 1.10);
    colorPass.uniforms.addRGB.value = new THREE.Vector3(0.01, 0.02, 0.03);
    composer.addPass(colorPass);

    const gradePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uVignette: { value: 0.55 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uVignette;
        varying vec2 vUv;
        void main() {
          vec4 tex = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - 0.5) * 2.0;
          float vig = smoothstep(1.35, 0.30, length(uv));
          vec3 col = tex.rgb * mix(1.0, vig, uVignette);
          col = mix(col, col * vec3(0.90, 1.02, 1.08), 0.25);
          gl_FragColor = vec4(col, tex.a);
        }
      `,
    });
    composer.addPass(gradePass);
    composer.addPass(new OutputPass());

    // -------------------------------------------------------------------------
    // Underwater environment map (IBL) for glTF PBR materials
    // -------------------------------------------------------------------------
    function createUnderwaterEnvironment() {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      const gradient = ctx.createLinearGradient(0, 0, 0, 256);
      gradient.addColorStop(0.0, "#eafaff");
      gradient.addColorStop(0.35, "#9fdcf0");
      gradient.addColorStop(0.6, "#2f8fb8");
      gradient.addColorStop(1.0, "#0a4f77");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 256);
      const equirect = new THREE.CanvasTexture(canvas);
      equirect.mapping = THREE.EquirectangularReflectionMapping;
      equirect.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envMap = pmrem.fromEquirectangular(equirect).texture;
      pmrem.dispose();
      equirect.dispose();
      return envMap;
    }
    const underwaterEnvMap = createUnderwaterEnvironment();

    // -------------------------------------------------------------------------
    // GLB ecology
    // -------------------------------------------------------------------------
    const gltfLoader = new GLTFLoader();
    const creatures: {
      pivot: THREE.Group;
      baseY: number;
      baseRotation: [number, number, number];
      bob: number;
      sway: number;
      phase: number;
    }[] = [];
    const modelCache = new Map<string, Promise<THREE.Group>>();

    function loadModel(url: string) {
      if (!modelCache.has(url)) {
        modelCache.set(url, gltfLoader.loadAsync(url).then((gltf) => gltf.scene));
      }
      return modelCache.get(url)!;
    }

    const causticTime = { value: 0 };

    const DAPPLE_GLSL = [
      "float dappleCaustic(vec2 p, float t) {",
      "  vec2 q = p * 0.9;",
      "  float a = sin(q.x * 2.0 + sin(q.y * 1.7 + t * 0.6));",
      "  float b = cos(q.y * 2.2 - cos(q.x * 1.9 - t * 0.5));",
      "  float w = abs(a + b);",
      "  return pow(1.0 - clamp(w * 0.5, 0.0, 1.0), 6.0);",
      "}",
    ].join("\n");

    function addCausticDapple(material: THREE.Material) {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uCausticTime = causticTime;
        shader.vertexShader = "varying vec3 vDappleWorld;\n" + shader.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vDappleWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
        shader.fragmentShader =
          "varying vec3 vDappleWorld;\nuniform float uCausticTime;\n" + DAPPLE_GLSL + "\n" +
          shader.fragmentShader.replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\n" +
            "  totalEmissiveRadiance += vec3(0.42, 0.68, 0.78) * " +
            "dappleCaustic(vDappleWorld.xz, uCausticTime) * 0.15;",
          );
      };
      material.customProgramCacheKey = () => "caustic-dapple";
      material.needsUpdate = true;
    }

    function dressMaterial(root: THREE.Object3D) {
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const material of materials) {
          const std = material as THREE.MeshStandardMaterial;
          if (!std || !std.isMeshStandardMaterial) continue;
          std.metalness = Math.min(std.metalness, 0.08);
          std.roughness = THREE.MathUtils.clamp(std.roughness, 0.4, 0.85);
          std.envMap = underwaterEnvMap;
          std.envMapIntensity = 1.35;
          addCausticDapple(std);
          std.needsUpdate = true;
        }
      });
    }

    function mountModel(model: THREE.Object3D, targetLength: number) {
      const pivot = new THREE.Group();
      pivot.add(model);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = targetLength / maxDim;
      model.scale.setScalar(s);
      model.position.copy(center).multiplyScalar(-s);
      return { pivot };
    }

    async function addCreature(config: CreatureConfig) {
      try {
        const model = (await loadModel(config.url)).clone(true);
        if (disposed) return;
        dressMaterial(model);
        const { pivot } = mountModel(model, config.length);
        pivot.name = `creature:${config.id}`;
        pivot.rotation.order = "YXZ";
        pivot.rotation.set(config.rotation[0], config.rotation[1], config.rotation[2]);
        pivot.position.set(config.position[0], config.position[1], config.position[2]);
        scene.add(pivot);
        creatures.push({
          pivot,
          baseY: pivot.position.y,
          baseRotation: config.rotation,
          bob: config.bob,
          sway: config.sway,
          phase: config.phase,
        });
      } catch (error) {
        if (!disposed) console.warn(`[TriassicScene] failed to load ${config.id}`, error);
      }
    }

    for (const config of TRIASSIC_CREATURES) void addCreature(config);

    // -------------------------------------------------------------------------
    // Animation loop (looping auto-play camera)
    // -------------------------------------------------------------------------
    const clock = new THREE.Clock();
    const autoplayStart = performance.now();
    const baseOffset = CAMERA_POSITION.clone().sub(CAMERA_TARGET);
    const autoplayOffset = new THREE.Vector3();

    function animate() {
      raf = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      // Looping 90° clockwise sweep, then back to the default view.
      const t = ((performance.now() - autoplayStart) / 1000 / AUTO_PLAY_DURATION) % 1;
      const half = t < 0.5 ? t / 0.5 : 1 - (t - 0.5) / 0.5;
      const eased = half * half * (3 - 2 * half);
      autoplayOffset.copy(baseOffset).applyAxisAngle(AUTO_PLAY_UP, AUTO_PLAY_ANGLE * eased);
      camera.position.copy(CAMERA_TARGET).add(autoplayOffset);
      camera.lookAt(CAMERA_TARGET);

      waterSurfaceMat.uniforms.time.value = elapsed;
      causticsMat.uniforms.time.value = elapsed;
      causticTime.value = elapsed;

      for (const ray of godRays) {
        ray.material.uniforms.time.value = elapsed;
        ray.rotation.z +=
          Math.sin(elapsed * 0.07 + ray.material.uniforms.seed.value) * delta * 0.004;
      }

      const positions = planktonGeo.attributes.position;
      const array = positions.array as Float32Array;
      for (let i = 0; i < planktonCount; i++) {
        const base = i * 3;
        let y = array[base + 1] + planktonSpeed[i] * delta;
        if (y > WORLD.waterSurfaceY - 0.5) {
          y = WORLD.seabedY + 0.5;
        }
        array[base + 1] = y;
        array[base] += Math.sin(elapsed * 0.15 + planktonPhase[i]) * delta * 0.015;
        array[base + 2] += Math.cos(elapsed * 0.10 + planktonPhase[i]) * delta * 0.008;
      }
      positions.needsUpdate = true;

      for (const creature of creatures) {
        const pivot = creature.pivot;
        if (creature.bob) {
          pivot.position.y = creature.baseY + Math.sin(elapsed * 0.5 + creature.phase) * creature.bob;
        }
        if (creature.sway) {
          pivot.rotation.y =
            creature.baseRotation[1] + Math.sin(elapsed * 0.6 + creature.phase) * creature.sway;
        }
      }

      composer.render();
    }

    animate();

    // -------------------------------------------------------------------------
    // Resize
    // -------------------------------------------------------------------------
    const onResize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      composer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(host);
    window.addEventListener("resize", onResize);

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      window.removeEventListener("resize", onResize);

      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const materials = mesh.material
          ? Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          : [];
        for (const material of materials) {
          for (const value of Object.values(material)) {
            if (value && (value as THREE.Texture).isTexture) (value as THREE.Texture).dispose();
          }
          material.dispose();
        }
      });
      underwaterEnvMap.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className={className} />;
}

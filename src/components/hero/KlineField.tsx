"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import gsap from "gsap";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import data from "./kline2015.json";

import { FLY_SECONDS } from "./constants";
const PLAY_SECONDS = 9;

const UP = new THREE.Color("#FF4D4F");
const DOWN = new THREE.Color("#3FB950");

/** Deterministic hash → [0, 1). */
const h = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const VERT = /* glsl */ `
  attribute vec3 aTarget;
  attribute vec3 aStart;
  attribute vec3 aColor;
  attribute vec2 aInfo; // x: seed, y: bar position 0..1
  attribute float aSize;
  uniform float uProgress;
  uniform float uPlay;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uRadius;
  uniform float uPx;
  uniform float uBreath;
  varying vec3 vColor;
  varying float vAlpha;

  float easeOut(float t) { return 1.0 - pow(1.0 - t, 3.0); }

  void main() {
    // each particle starts a little later the further right it lives, so the outline sweeps in
    float local = clamp((uProgress * 1.5 - aInfo.y * 0.5) , 0.0, 1.0);
    vec3 pos = mix(aStart, aTarget, easeOut(local));
    pos.y += sin(uTime * 0.9 + aInfo.x * 6.2831) * uBreath;
    // pointer push: away from the cursor inside uRadius, springs back on its own (position is recomputed each frame)
    vec2 d = pos.xy - uMouse;
    float dist = length(d);
    float push = smoothstep(uRadius, 0.0, dist);
    pos.xy += normalize(d + 0.0001) * push * push * uRadius * 0.55;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uPx;
    // playhead: bars ahead of it stay faint until it passes them
    float lit = smoothstep(uPlay - 0.02, uPlay + 0.005, aInfo.y);
    vAlpha = mix(0.95, 0.16, lit) * (0.35 + 0.65 * local);
    vColor = aColor;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.15, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`;

function buildGeometry(width: number, height: number, perBar: number) {
  const n = data.closes.length;
  const count = n * perBar;
  const target = new Float32Array(count * 3);
  const start = new Float32Array(count * 3);
  const color = new Float32Array(count * 3);
  const info = new Float32Array(count * 2);
  const size = new Float32Array(count);
  const lo = 2900;
  const hi = 5300;
  // chart band: lower ~half of the screen so the headline and copy sit above the peak
  const y0 = -height * 0.44;
  const y1 = height * 0.06;
  const yOf = (v: number) => y0 + ((v - lo) / (hi - lo)) * (y1 - y0);
  const barW = width / n;
  let k = 0;
  for (let i = 0; i < n; i++) {
    const open = i === 0 ? data.prev : data.closes[i - 1];
    const close = data.closes[i];
    const up = close >= open;
    const ya = yOf(Math.min(open, close));
    const yb = Math.max(yOf(Math.max(open, close)), ya + 3);
    const cx = -width / 2 + (i + 0.5) * barW;
    const isPeak = i === data.peak;
    for (let j = 0; j < perBar; j++, k++) {
      const s = i * 977 + j * 13.37;
      target[k * 3] = cx + (h(s) - 0.5) * barW * 0.7;
      target[k * 3 + 1] = ya + h(s + 1) * (yb - ya);
      target[k * 3 + 2] = 0;
      // starfield: scattered over the whole screen
      start[k * 3] = (h(s + 2) - 0.5) * width * 1.1;
      start[k * 3 + 1] = (h(s + 3) - 0.5) * height * 1.1;
      start[k * 3 + 2] = 0;
      const c = isPeak ? new THREE.Color("#FFD24A") : up ? UP : DOWN;
      const bright = isPeak ? 3.2 : 1;
      color[k * 3] = c.r * bright;
      color[k * 3 + 1] = c.g * bright;
      color[k * 3 + 2] = c.b * bright;
      info[k * 2] = h(s + 4);
      info[k * 2 + 1] = i / (n - 1);
      size[k] = isPeak ? 3.4 : 1.5 + h(s + 5) * 1.3;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(target.slice(), 3)); // required by Points; the shader reads aTarget
  g.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
  g.setAttribute("aStart", new THREE.BufferAttribute(start, 3));
  g.setAttribute("aColor", new THREE.BufferAttribute(color, 3));
  g.setAttribute("aInfo", new THREE.BufferAttribute(info, 2));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  return g;
}

function Field({ perBar, interactive, onReady, onStart }: { perBar: number; interactive: boolean; onReady: () => void; onStart: () => void }) {
  const { size, viewport, pointer, gl } = useThree();
  const geo = useMemo(() => buildGeometry(size.width, size.height, perBar), [size.width, size.height, perBar]);
  const mat = useRef<THREE.ShaderMaterial>(null);
  // Callbacks are read through a ref so a new closure from the parent never restarts the fly-in.
  const cb = useRef({ onReady, onStart });
  cb.current = { onReady, onStart };
  const idle = useRef(0);
  const mouse = useRef(new THREE.Vector2(9999, 9999));
  const lastMove = useRef(0);

  useEffect(() => {
    const u = mat.current!.uniforms;
    cb.current.onStart();
    u.uProgress.value = 0;
    u.uPlay.value = 0;
    const t1 = gsap.to(u.uProgress, { value: 1, duration: FLY_SECONDS, ease: "power2.out", onComplete: () => cb.current.onReady() });
    const t2 = gsap.to(u.uPlay, { value: 1.05, duration: PLAY_SECONDS, delay: FLY_SECONDS + 0.4, ease: "power1.inOut" });
    return () => {
      t1.kill();
      t2.kill();
    };
  }, [geo]);

  useFrame((state) => {
    const u = mat.current!.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPx.value = gl.getPixelRatio();
    if (interactive) {
      // pointer is in NDC; the orthographic camera maps 1 NDC unit to half the viewport size in pixels
      mouse.current.set((pointer.x * size.width) / 2, (pointer.y * size.height) / 2);
      if (Math.abs(pointer.x) + Math.abs(pointer.y) > 0) lastMove.current = state.clock.elapsedTime;
      u.uMouse.value.copy(mouse.current);
    }
    // after 8 s without pointer input the field starts to breathe (±2px)
    const breathing = state.clock.elapsedTime - lastMove.current > 8 || !interactive;
    idle.current += ((breathing ? 2 : 0) - idle.current) * 0.03;
    u.uBreath.value = idle.current;
  });

  void viewport;
  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uProgress: { value: 0 },
          uPlay: { value: 0 },
          uTime: { value: 0 },
          uMouse: { value: new THREE.Vector2(9999, 9999) },
          uRadius: { value: 120 },
          uPx: { value: 1 },
          uBreath: { value: 0 },
        }}
      />
    </points>
  );
}

/** Pauses rendering while the tab is hidden (R3F would otherwise keep its own rAF loop alive). */
function VisibilityGate() {
  const { setFrameloop } = useThree();
  useEffect(() => {
    const f = () => setFrameloop(document.hidden ? "never" : "always");
    document.addEventListener("visibilitychange", f);
    return () => document.removeEventListener("visibilitychange", f);
  }, [setFrameloop]);
  return null;
}

/** The interactive hero background. Mounted lazily by HeroBackdrop; never on the server. */
export default function KlineField({ perBar, interactive, bloom, onReady, onStart }: { perBar: number; interactive: boolean; bloom: boolean; onReady: () => void; onStart: () => void }) {
  return (
    <Canvas
      orthographic
      camera={{ zoom: 1, near: -10, far: 10, position: [0, 0, 5] }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <VisibilityGate />
      <Field perBar={perBar} interactive={interactive} onReady={onReady} onStart={onStart} />
      {bloom && (
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.1} luminanceThreshold={0.62} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
      )}
    </Canvas>
  );
}

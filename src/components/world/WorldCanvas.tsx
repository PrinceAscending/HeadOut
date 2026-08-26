"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { motion, useAnimationControls } from "framer-motion";
import { REGIONS } from "@/lib/config/regions";
import { activitySignal } from "@/lib/world/activity-signal";
import { useGame } from "@/lib/game/store";
import { useWorld } from "@/lib/world/store";
import { playSound } from "@/lib/audio/sound";
import { EASE_EXPO } from "@/lib/world/motion";
import type { RegionId } from "@/types";
import {
  CameraRig,
  Dust,
  GridFloor,
  RegionLinks,
  RegionNode,
  Starfield,
} from "./scene";

/* ═══════════════════════════════════════════════════════════
   WorldCanvas — the explorable map. WebGL, quality-scaled.
   ═══════════════════════════════════════════════════════════ */

function useQuality() {
  return useMemo(() => {
    if (typeof window === "undefined") return { stars: 500, dust: 80, dpr: 1, mobile: false };
    const mobile =
      window.matchMedia("(max-width: 768px)").matches ||
      "ontouchstart" in window === true;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as any).deviceMemory ?? 4;
    const low = mobile || cores <= 4 || mem <= 2;
    return {
      stars: low ? 350 : 1000,
      dust: low ? 50 : 150,
      dpr: low ? 1 : 1.75,
      mobile,
    };
  }, []);
}

function NodeLabel({
  def,
  revealed,
  visited,
  onSelect,
}: {
  def: (typeof REGIONS)[number];
  revealed: boolean;
  visited: boolean;
  onSelect: (id: RegionId) => void;
}) {
  /* store-driven: a hover re-renders only this label, not the scene subtree */
  const hovered = useWorld((s) => s.hoveredRegion) === def.id;
  const setHoveredRegion = useWorld((s) => s.setHoveredRegion);
  const show = def.id !== "unknown" || revealed;
  const controls = useAnimationControls();
  const prevVisited = useRef(visited);

  /* one-shot flare when the region is first visited — never for
     already-visited regions at world load */
  useEffect(() => {
    if (visited === prevVisited.current) return;
    prevVisited.current = visited;
    if (!visited) return;
    void controls.start({
      scale: [1, 1.24, 1],
      transition: { duration: 0.9, ease: EASE_EXPO },
    });
  }, [visited, controls]);

  if (!show) return null;
  const isUnknown = def.id === "unknown";
  return (
    <Html
      position={[def.x, def.y + 1.15, def.z]}
      center
      zIndexRange={[8, 0]}
      style={{ pointerEvents: "none" }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect(def.id);
        }}
        /* the label floats above the node and swallows canvas pointer
           events — drive the same hover signal from here too */
        onPointerOver={() => setHoveredRegion(def.id)}
        onPointerOut={() => setHoveredRegion(null)}
        className="group flex flex-col items-center gap-0.5 -translate-y-1 cursor-pointer"
        style={{ pointerEvents: "auto" }}
        aria-label={`Enter ${def.name}`}
      >
        <motion.span
          animate={controls}
          className="font-sans text-[10px] sm:text-[11px] tracking-[0.3em] whitespace-nowrap px-2 py-0.5 inline-block"
          style={{
            color: isUnknown ? "rgba(255,255,255,0.75)" : `${def.color}`,
            textShadow: hovered
              ? `0 0 22px ${def.color}aa, 0 0 6px ${def.color}55`
              : `0 0 14px ${def.color}66`,
            opacity: hovered ? 1 : 0.85,
            transition: "opacity 0.25s ease",
          }}
        >
          {isUnknown && !revealed ? "???" : def.name}
        </motion.span>
        <span
          className="font-mono text-[9.5px] tracking-[0.2em] text-white/35 transition-opacity duration-300"
          style={{ opacity: hovered ? 1 : 0 }}
        >
          {def.code} · ENTER
        </span>
      </button>
    </Html>
  );
}

export default function WorldCanvas({
  onSelect,
}: {
  onSelect: (id: RegionId) => void;
}) {
  const q = useQuality();
  const [introDone, setIntroDone] = useState(false);
  const [focus, setFocus] = useState<{ x: number; y: number; z: number } | null>(null);
  const setHoveredRegion = useWorld((s) => s.setHoveredRegion);
  const visited = useGame((s) => s.visitedRegions);
  const unknownRevealed = useGame((s) => s.unknownRevealed);
  const [activeRegions, setActiveRegions] = useState<Record<string, boolean>>({});

  /* mirror live activity into a react state (labels) + the mutable signal (webgl) */
  useEffect(() => {
    const update = () => {
      const sig = activitySignal;
      setActiveRegions({
        code: sig.code,
        music: sig.music,
        gaming: sig.gaming,
        core: sig.core,
        social: sig.social,
      });
    };
    const t = setInterval(update, 2000);
    update();
    return () => clearInterval(t);
  }, []);

  const handleSelect = (id: RegionId) => {
    const def = REGIONS.find((r) => r.id === id);
    if (def) setFocus({ x: def.x, y: def.y, z: def.z });
    onSelect(id);
  };

  return (
    <div className="absolute inset-0" aria-label="World map">
      <Canvas
        dpr={q.dpr}
        camera={{ position: [0, 46, 64], fov: 55, near: 0.1, far: 220 }}
        gl={{ antialias: !q.mobile, alpha: true, powerPreference: "high-performance" }}
        className="touch-none"
        onCreated={({ gl }) => {
          gl.setClearColor("#04040a", 1);
          /* if the GPU context dies (rare, but real), degrade to atlas mode */
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("wx-webgl-lost"));
          });
        }}
      >
        <fog attach="fog" args={["#04040a", 55, 130]} />
        <ambientLight intensity={0.4} />

        <Suspense fallback={null}>
          <Starfield count={q.stars} />
          <Dust count={q.dust} />
          <GridFloor />
          <RegionLinks />
          {REGIONS.map((def) => (
            <RegionNode
              key={def.id}
              def={def}
              visited={visited.includes(def.id)}
              active={!!activeRegions[def.id]}
              onSelect={handleSelect}
              onHover={setHoveredRegion}
            />
          ))}
          {REGIONS.map((def) => (
            <NodeLabel
              key={`l-${def.id}`}
              def={def}
              revealed={unknownRevealed}
              visited={visited.includes(def.id)}
              onSelect={handleSelect}
            />
          ))}
        </Suspense>

        <CameraRig focus={focus} introDone={introDone} onIntroDone={() => setIntroDone(true)} />
        <OrbitControls
          makeDefault
          enablePan={false}
          enableDamping
          dampingFactor={0.06}
          minDistance={10}
          maxDistance={62}
          minPolarAngle={0.35}
          maxPolarAngle={Math.PI / 2.05}
          rotateSpeed={0.55}
          zoomSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}

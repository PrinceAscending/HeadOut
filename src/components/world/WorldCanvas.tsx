"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { REGIONS } from "@/lib/config/regions";
import { activitySignal } from "@/lib/world/activity-signal";
import { useGame } from "@/lib/game/store";
import { playSound } from "@/lib/audio/sound";
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
  onSelect,
}: {
  def: (typeof REGIONS)[number];
  revealed: boolean;
  onSelect: (id: RegionId) => void;
}) {
  const show = def.id !== "unknown" || revealed;
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
          playSound("open");
          onSelect(def.id);
        }}
        className="group flex flex-col items-center gap-0.5 -translate-y-1 cursor-pointer"
        style={{ pointerEvents: "auto" }}
        aria-label={`Enter ${def.name}`}
      >
        <span
          className="font-sans text-[10px] sm:text-[11px] tracking-[0.3em] whitespace-nowrap px-2 py-0.5 transition-all duration-300"
          style={{
            color: isUnknown ? "rgba(255,255,255,0.75)" : `${def.color}`,
            textShadow: `0 0 14px ${def.color}66`,
            opacity: 0.85,
          }}
        >
          {isUnknown && !revealed ? "???" : def.name}
        </span>
        <span
          className="font-mono text-[9.5px] tracking-[0.2em] text-white/35 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {def.code} · ENTER
        </span>
      </button>
    </Html>
  );
}

export default function WorldCanvas({
  onSelect,
  onHover,
}: {
  onSelect: (id: RegionId) => void;
  onHover: (id: RegionId | null) => void;
}) {
  const q = useQuality();
  const [introDone, setIntroDone] = useState(false);
  const [focus, setFocus] = useState<{ x: number; y: number; z: number } | null>(null);
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
              onHover={onHover}
            />
          ))}
          {REGIONS.map((def) => (
            <NodeLabel
              key={`l-${def.id}`}
              def={def}
              revealed={unknownRevealed}
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

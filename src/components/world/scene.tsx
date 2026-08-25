"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { REGIONS, REGION_LINKS } from "@/lib/config/regions";
import { activitySignal } from "@/lib/world/activity-signal";
import { playSound } from "@/lib/audio/sound";
import type { RegionId } from "@/types";

/* ═══════════════════════════════════════════════════════════
   Scene internals — nodes, links, starfield, grid floor.
   ═══════════════════════════════════════════════════════════ */

/* soft radial glow sprite texture (generated once) */
let glowTex: THREE.CanvasTexture | null = null;
function getGlowTexture(): THREE.CanvasTexture {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.28, "rgba(255,255,255,0.5)");
  grad.addColorStop(0.6, "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

const tmpColor = new THREE.Color();

export function RegionNode({
  def,
  visited,
  active,
  onSelect,
  onHover,
}: {
  def: (typeof REGIONS)[number];
  visited: boolean;
  active: boolean;
  onSelect: (id: RegionId) => void;
  onHover: (id: RegionId | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Sprite>(null);
  const [hovered, setHovered] = useState(false);

  const color = useMemo(() => new THREE.Color(def.color), [def.color]);
  const isUnknown = def.id === "unknown";

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const live = active || (def.id === "core" && activitySignal.core);
    if (mesh.current) {
      const pulse = live ? 1 + Math.sin(t * 2.4) * 0.14 : 1 + Math.sin(t * 0.8) * 0.03;
      mesh.current.scale.setScalar(hovered ? pulse * 1.25 : pulse);
      const mat = mesh.current.material as THREE.MeshBasicMaterial;
      mat.color.copy(color);
      if (isUnknown && !activitySignal.unknownRevealed) {
        mat.opacity = 0.05 + Math.abs(Math.sin(t * 0.7)) * 0.06;
      } else {
        mat.opacity = live ? 1 : 0.85;
      }
    }
    if (ring.current) {
      ring.current.rotation.z = t * (live ? 0.8 : 0.25);
      ring.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.4) * 0.12;
      const s = (hovered ? 1.35 : 1) * (visited ? 1 : 0.8);
      ring.current.scale.setScalar(s);
      const mat = ring.current.material as THREE.MeshBasicMaterial;
      mat.opacity =
        isUnknown && !activitySignal.unknownRevealed
          ? 0.04
          : (hovered ? 0.9 : visited ? 0.55 : 0.3) * (live ? 1.4 : 1);
    }
    if (halo.current) {
      const s = (live ? 2.6 + Math.sin(t * 2.4) * 0.5 : 1.9) * (hovered ? 1.3 : 1);
      halo.current.scale.setScalar(s);
      const mat = halo.current.material as THREE.SpriteMaterial;
      mat.opacity =
        isUnknown && !activitySignal.unknownRevealed ? 0.03 : live ? 0.5 : 0.22;
      tmpColor.copy(color);
      mat.color.copy(tmpColor);
    }
    if (group.current) {
      group.current.position.y = def.y + Math.sin(t * 0.6 + def.x) * 0.18;
    }
  });

  return (
    <group
      ref={group}
      position={[def.x, def.y, def.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover(def.id);
        playSound("hover");
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        document.body.style.cursor = "";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (isUnknown && !activitySignal.unknownRevealed) {
          /* faint flicker — clicking it is one way to reveal */
          playSound("fault");
          onSelect(def.id);
          return;
        }
        playSound("open");
        onSelect(def.id);
      }}
    >
      {/* core sphere */}
      <mesh ref={mesh}>
        <sphereGeometry args={[0.42, 20, 14]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.9}
          toneMapped={false}
        />
      </mesh>
      {/* inner darker sphere for depth */}
      <mesh scale={0.55}>
        <sphereGeometry args={[0.42, 14, 10]} />
        <meshBasicMaterial color="#04040a" transparent opacity={0.9} />
      </mesh>
      {/* orbit ring */}
      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.85, 0.012, 8, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      {/* halo sprite */}
      <sprite ref={halo} scale={[2, 2, 1]}>
        <spriteMaterial
          map={getGlowTexture()}
          color={color}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
      {/* generous invisible hit area */}
      <mesh visible={false}>
        <sphereGeometry args={[1.25, 8, 6]} />
        <meshBasicMaterial />
      </mesh>
      {visited && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <ringGeometry args={[1.1, 1.16, 40]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
      {/* sub particle sparkle for live nodes */}
      {active && <LiveOrbit color={color} />}
    </group>
  );
}

function LiveOrbit({ color }: { color: THREE.Color }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 26;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 1.3 + Math.random() * 0.25;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 1.4;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color={color}
        size={0.045}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/* ── links between regions with traveling pulses ────────── */
export function RegionLinks() {
  const pulsesRef = useRef<THREE.InstancedMesh>(null);
  const links = useMemo(() => {
    const map = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
    return REGION_LINKS.map(([a, b]) => {
      const A = new THREE.Vector3(map[a].x, map[a].y, map[a].z);
      const B = new THREE.Vector3(map[b].x, map[b].y, map[b].z);
      const mid = A.clone().add(B).multiplyScalar(0.5);
      mid.y += 1.1; /* gentle arc */
      return { a: A, b: B, mid, curve: new THREE.QuadraticBezierCurve3(A, mid, B) };
    });
  }, []);

  const lineObjects = useMemo(
    () =>
      links.map((l) => {
        const geo = new THREE.BufferGeometry().setFromPoints(l.curve.getPoints(28));
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color("#3a4a66"),
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
        });
        return new THREE.Line(geo, mat);
      }),
    [links]
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpPoint = useMemo(() => new THREE.Vector3(), []);
  const PULSES_PER_LINK = 2;
  const total = links.length * PULSES_PER_LINK;

  useFrame(({ clock }) => {
    const inst = pulsesRef.current;
    if (!inst) return;
    let i = 0;
    for (let li = 0; li < links.length; li++) {
      const speed = 0.11 + (li % 5) * 0.016;
      for (let p = 0; p < PULSES_PER_LINK; p++) {
        const t =
          (clock.elapsedTime * speed + p / PULSES_PER_LINK + li * 0.37) % 1;
        const pos = links[li].curve.getPoint(t, tmpPoint);
        dummy.position.copy(pos);
        const s = 0.06 + Math.sin(t * Math.PI) * 0.05;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        inst.setMatrixAt(i++, dummy.matrix);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {lineObjects.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}
      <instancedMesh ref={pulsesRef} args={[undefined, undefined, total]}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial
          color="#8fd8ff"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

/* ── ambient starfield ──────────────────────────────────── */
export function Starfield({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 26 + Math.random() * 34;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.5 + 2;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.008;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#9db8dd"
        size={0.06}
        sizeAttenuation
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/* ── floating dust near camera ──────────────────────────── */
export function Dust({ count = 140 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.02;
      ref.current.position.y = Math.sin(clock.elapsedTime * 0.3) * 0.6;
    }
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#5a7ba6"
        size={0.035}
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/* ── sci-fi floor grid (rings + spokes) ─────────────────── */
export function GridFloor() {
  const ringRef = useRef<THREE.Group>(null);
  const rings = useMemo(() => {
    const arr: { radius: number; opacity: number }[] = [];
    for (let i = 1; i <= 7; i++) arr.push({ radius: i * 3.4, opacity: 0.16 - i * 0.014 });
    return arr;
  }, []);
  useFrame(({ clock }) => {
    if (ringRef.current) ringRef.current.rotation.y = clock.elapsedTime * 0.03;
  });
  return (
    <group position={[0, -4.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <group ref={ringRef}>
        {rings.map((r, i) => (
          <mesh key={i}>
            <ringGeometry args={[r.radius - 0.012, r.radius, 90]} />
            <meshBasicMaterial
              color="#2a3c58"
              transparent
              opacity={r.opacity}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        ))}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const len = 24;
          return (
            <mesh
              key={`s${i}`}
              position={[Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, 0]}
              rotation={[0, 0, a]}
            >
              <planeGeometry args={[len, 0.008]} />
              <meshBasicMaterial
                color="#22334e"
                transparent
                opacity={0.12}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ── camera rig: intro sweep + focus tweens + idle drift ── */
export function CameraRig({
  focus,
  introDone,
  onIntroDone,
}: {
  focus: { x: number; y: number; z: number } | null;
  introDone: boolean;
  onIntroDone: () => void;
}) {
  const { camera } = useThree();
  const anim = useRef<{
    t: number;
    from: THREE.Vector3;
    to: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const introT = useRef(0);
  const lastFocus = useRef("");
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* cinematic intro sweep */
  useFrame((state, delta) => {
    const cam = state.camera;
    const ctrl = state.controls as any;
    if (!introDone) {
      introT.current = Math.min(1, introT.current + delta / (reduced ? 0.1 : 2.6));
      const e = 1 - Math.pow(1 - introT.current, 3);
      cam.position.set(
        THREE.MathUtils.lerp(0, 0.5, e),
        THREE.MathUtils.lerp(46, 15, e),
        THREE.MathUtils.lerp(64, 30, e)
      );
      ctrl?.target?.set(0, 0, 0);
      if (introT.current >= 1) onIntroDone();
      return;
    }

    if (anim.current) {
      anim.current.t = Math.min(1, anim.current.t + delta / 1.1);
      const e =
        anim.current.t < 0.5
          ? 4 * Math.pow(anim.current.t, 3)
          : 1 - Math.pow(-2 * anim.current.t + 2, 3) / 2;
      cam.position.lerpVectors(anim.current.from, anim.current.to, e);
      ctrl?.target?.lerp(anim.current.target, 0.08);
      if (anim.current.t >= 1) anim.current = null;
    } else {
      /* idle drift */
      const t = state.clock.elapsedTime;
      if (!reduced && !ctrl?.__dragging) {
        cam.position.x += Math.sin(t * 0.07) * 0.0035;
        cam.position.y += Math.cos(t * 0.05) * 0.0022;
      }
    }
  });

  /* react to focus changes */
  useEffect(() => {
    const focusKey = focus ? `${focus.x},${focus.y},${focus.z}` : "";
    if (focusKey && introDone && focusKey !== lastFocus.current) {
      lastFocus.current = focusKey;
      const dir = new THREE.Vector3(focus!.x, focus!.y, focus!.z)
        .normalize()
        .multiplyScalar(9);
      anim.current = {
        t: 0,
        from: camera.position.clone(),
        to: new THREE.Vector3(
          focus!.x + dir.x,
          focus!.y + dir.y + 3.5,
          focus!.z + dir.z + 6
        ),
        target: new THREE.Vector3(focus!.x, focus!.y, focus!.z),
      };
    }
    if (!focusKey) lastFocus.current = "";
  }, [focus, introDone, camera]);
  return null;
}

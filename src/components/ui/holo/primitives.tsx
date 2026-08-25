"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/* ═══════════════════════════════════════════════════════════
   PRINCE // WORLD — holographic design primitives.
   Thin lines. Translucent surfaces. Restraint.
   ═══════════════════════════════════════════════════════════ */

export function SystemLabel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10.5px] tracking-[0.26em] text-foreground/60 uppercase",
        className
      )}
      style={style}
    >
      {children}
    </span>
  );
}

export function RegionLabel({
  code,
  name,
  color,
  active,
  className,
}: {
  code: string;
  name: string;
  color?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="font-mono text-[10px] px-1.5 py-0.5 border leading-none clip-tag"
        style={{
          color: color ?? "var(--wx-cyan)",
          borderColor: `${color ?? "var(--wx-cyan)"}44`,
          background: `${color ?? "var(--wx-cyan)"}0f`,
        }}
      >
        {code}
      </span>
      <span
        className={cn(
          "font-sans text-sm tracking-[0.18em] font-medium",
          active ? "text-white" : "text-foreground/80"
        )}
      >
        {name}
      </span>
    </div>
  );
}

export function LiveIndicator({
  state,
  label,
  note,
  className,
}: {
  state: "live" | "connecting" | "degraded" | "offline" | "unconfigured" | boolean;
  label?: string;
  /** secondary dim text after the state word, e.g. a sync age */
  note?: ReactNode;
  className?: string;
}) {
  const isBool = typeof state === "boolean";
  const s = isBool ? (state ? "live" : "offline") : state;
  const color =
    s === "live"
      ? "var(--wx-green)"
      : s === "connecting"
        ? "var(--wx-amber)"
        : s === "degraded"
          ? "var(--wx-amber)"
          : s === "unconfigured"
            ? "var(--wx-dim)"
            : "var(--wx-dim)";
  const text =
    s === "live"
      ? label ?? "LIVE"
      : s === "connecting"
        ? label ?? "CONNECTING"
        : s === "degraded"
          ? label ?? "INTERRUPTED"
          : s === "unconfigured"
            ? label ?? "NOT CONNECTED"
            : label ?? "OFFLINE";
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("w-1.5 h-1.5 rounded-full", s === "live" && "wx-animate-pulse")}
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
        aria-hidden
      />
      <span
        className="font-mono text-[10px] tracking-[0.18em]"
        style={{ color }}
      >
        {text}
      </span>
      {note ? (
        <span className="font-mono text-[9px] tracking-[0.14em] text-wx-dim/70">
          {note}
        </span>
      ) : null}
      <span className="sr-only">{s === "live" ? "live" : s}</span>
    </span>
  );
}

export function HoloCard({
  children,
  className,
  glow,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
  as?: "div" | "button";
} & Record<string, unknown>) {
  return (
    <Tag
      className={cn(
        "relative glass clip-panel edge-lit p-4 transition-colors duration-300",
        "hover:border-white/20",
        className
      )}
      style={glow ? ({ boxShadow: `inset 0 0 40px ${glow}12` } as never) : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function MetricDisplay({
  label,
  value,
  sub,
  color,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="font-mono text-[10px] tracking-[0.22em] text-wx-dim uppercase truncate">
        {label}
      </div>
      <div
        className="font-sans text-2xl font-semibold mt-1 leading-none tabular-nums"
        style={{ color: color ?? "var(--foreground)" }}
      >
        {value}
      </div>
      {sub ? (
        <div className="font-mono text-[10px] text-wx-dim mt-1.5 truncate">{sub}</div>
      ) : null}
    </div>
  );
}

export function DataRow({
  k,
  v,
  color,
}: {
  k: string;
  v: ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-baseline gap-3 font-mono text-[11px]">
      <span className="text-wx-dim shrink-0 tracking-wider">{k}</span>
      <span className="flex-1 border-b border-dotted border-white/10 translate-y-[-3px]" />
      <span className="text-right truncate" style={{ color: color ?? undefined }}>
        {v}
      </span>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  color,
  height = 3,
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("w-full bg-white/8 overflow-hidden", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-700 ease-out"
        style={{
          width: `${pct}%`,
          background: color ?? "var(--wx-cyan)",
          boxShadow: `0 0 10px ${color ?? "var(--wx-cyan)"}66`,
        }}
      />
    </div>
  );
}

/* ASCII-style progress: ███░░ */
export function AsciiBar({
  value,
  max = 100,
  blocks = 20,
}: {
  value: number;
  max?: number;
  blocks?: number;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const filled = Math.round(pct * blocks);
  return (
    <span className="font-mono text-[11px] tracking-tight whitespace-nowrap" aria-hidden>
      <span className="text-wx-cyan">{"█".repeat(filled)}</span>
      <span className="text-white/15">{"░".repeat(blocks - filled)}</span>
      <span className="text-wx-dim ml-2 tabular-nums">{Math.round(pct * 100)}%</span>
    </span>
  );
}

export function SignalBars({
  level,
  color,
  className,
}: {
  level: number; // 0-4
  color?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-end gap-[2px]", className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] transition-all duration-300"
          style={{
            height: 4 + i * 3,
            background: i <= level ? color ?? "var(--wx-cyan)" : "rgba(255,255,255,0.12)",
            boxShadow: i <= level ? `0 0 6px ${color ?? "var(--wx-cyan)"}88` : undefined,
          }}
        />
      ))}
    </span>
  );
}

export function Chip({
  children,
  color,
  className,
  onClick,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        "border px-2 py-1 clip-tag transition-all",
        onClick && "hover:bg-white/8 cursor-pointer",
        className
      )}
      style={{
        color: color ?? "var(--wx-dim)",
        borderColor: `${color ?? "#7d8aa0"}33`,
        background: `${color ?? "#7d8aa0"}0a`,
      }}
    >
      {children}
    </Tag>
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-4 h-px bg-wx-cyan/60" aria-hidden />
      <span className="font-mono text-[10px] tracking-[0.3em] text-foreground/70 uppercase">
        {children}
      </span>
      {right ? <span className="ml-auto">{right}</span> : null}
    </div>
  );
}

// src/components/RingRunner.tsx
import React from "react";

type RingRunnerProps = {
  className?: string;
  cassName?: string;
  color?: string; // outer ring + segment color
  innerRingColor?: string; // inner ring color
  ringThickness?: number; // px
  innerGap?: number; // px distance between outer & inner ring
  durationSec?: number; // seconds per rotation
  size?: number; // px
  icon?: React.ReactNode;
};

const DefaultBolt = ({ color = "#01faf8" }: { color?: string }) => (
  <svg viewBox="0 0 40 40" className="h-[40%] w-[40%]" fill="none">
    <path
      d="m13 2-9 12h7l-1 8 9-12h-7l1-8z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

let injected = false;
function ensureStyleSheet() {
  if (injected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.innerHTML = `
[data-ring-runner] .ring-runner__glow-layers {
  filter:
    drop-shadow(0 0 6px rgba(1,250,248,0.55))
    drop-shadow(0 0 16px rgba(1,250,248,0.35))
    drop-shadow(0 0 32px rgba(1,250,248,0.25));
}
[data-ring-runner] .ring-runner__outer,
[data-ring-runner] .ring-runner__inner {
  transition: stroke 0.3s ease;
}
[data-ring-runner] .ring-runner__segment {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  animation: ring-runner-spin var(--ring-runner-duration, 6s) linear infinite;
  transform-origin: center center;
}
[data-ring-runner] .ring-runner__segment::before {
  content: "";
  display: block;
  width: 2%;
  height: 14%;
  background: currentColor;
  border-radius: 9999px;
  transform: translateY(calc(50px - var(--ring-runner-segment-offset, 6px)));
  box-shadow:
    0 0 10px currentColor,
    0 0 18px currentColor,
    0 0 24px currentColor;
}
@keyframes ring-runner-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
`;
  document.head?.appendChild(style);
  injected = true;
}

export default function RingRunner({
  className,
  cassName,
  color = "#01faf8",
  innerRingColor = "#185981",
  ringThickness = 2,
  innerGap = 12,
  durationSec = 6,
  size,
  icon,
}: RingRunnerProps) {
  const cls = [
    "relative",
    "aspect-square",
    "select-none",
    className || cassName,
  ]
    .filter(Boolean)
    .join(" ");

  const outerRadius = 50 - ringThickness;
  const innerRadius = Math.max(outerRadius - innerGap, 5);
  const segmentOffset = outerRadius - ringThickness / 2;

  ensureStyleSheet();

  return (
    <div
      className={cls}
      style={
        size
          ? ({
              width: size,
              height: size,
              "--ring-runner-duration": `${durationSec}s`,
              "--ring-runner-segment-offset": `${segmentOffset}px`,
            } as React.CSSProperties)
          : ({
              "--ring-runner-duration": `${durationSec}s`,
              "--ring-runner-segment-offset": `${segmentOffset}px`,
            } as React.CSSProperties)
      }
      data-ring-runner
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 ring-runner__glow-layers"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle
          cx="50"
          cy="50"
          r={outerRadius}
          stroke={color}
          strokeWidth={ringThickness}
          fill="none"
          className="ring-runner__outer"
        />
        <circle
          cx="50"
          cy="50"
          r={innerRadius}
          stroke={innerRingColor}
          strokeWidth={ringThickness}
          fill="none"
          className="ring-runner__inner"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        {icon ?? <DefaultBolt color={color} />}
      </div>

      <div className="ring-runner__segment" style={{ color }} />
    </div>
  );
}

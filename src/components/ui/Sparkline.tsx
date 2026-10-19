import { useId } from "react";

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  className?: string;
}

const W = 160;

function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0][0].toFixed(2)},${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const t = 1 / 6;
    const c1x = p1[0] + (p2[0] - p0[0]) * t;
    const c1y = p1[1] + (p2[1] - p0[1]) * t;
    const c2x = p2[0] - (p3[0] - p1[0]) * t;
    const c2y = p2[1] - (p3[1] - p1[1]) * t;
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d;
}

/** Lightweight SVG sparkline with a soft gradient fill. */
export function Sparkline({ data, color, height = 44, className }: SparklineProps) {
  const id = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const values = data.length === 1 ? [data[0], data[0]] : data;

  if (values.length < 2) return <div className={className} style={{ height }} />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 4;
  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * W,
    height - pad - ((v - min) / span) * (height - pad * 2),
  ]);
  const line = smoothPath(pts);
  const area = `${line} L ${W},${height} L 0,${height} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={className} style={{ height, width: "100%" }} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} style={{ transition: "d 600ms cubic-bezier(0.22,1,0.36,1)" }} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ transition: "d 600ms cubic-bezier(0.22,1,0.36,1)" }}
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Shapes shared by the hero poster and several prints.
import { path, sample, TAU } from "./geometry";
import type { Pt } from "./types";

// psi = (x - c + t*y^2)^2 + (y/k)^2. Its level sets are D-shaped: nested
// tokamak flux surfaces, which also read as a loss surface.
const C = 0.05;
const T = 0.35;
const K = 1.45;

/** The point a fraction u of the way round flux surface r, scaled and centred on (cx, cy). */
export function fluxPoint(cx: number, cy: number, scale: number, r: number, u: number): Pt {
  const y = K * r * Math.sin(u * TAU);
  return [cx + (C + r * Math.cos(u * TAU) - T * y * y) * scale, cy - y * scale];
}

/** The magnetic axis: the innermost point of the flux surfaces. */
export const fluxAxis = (cx: number, cy: number, scale: number): Pt => [cx + C * scale, cy];

export const fluxSurface = (cx: number, cy: number, scale: number, r: number) =>
  path(
    sample(140, (u) => fluxPoint(cx, cy, scale, r, u)),
    true,
  );

/** Heavy-ball gradient descent on psi, from a start near the outer surface. */
export function fluxDescent(cx: number, cy: number, scale: number) {
  let [x, y, vx, vy] = [0.3, 1.0, 0, 0];
  const pts: Pt[] = [];
  for (let n = 0; n <= 160; n++) {
    pts.push([cx + x * scale, cy - y * scale]);
    const u = x - C + T * y * y;
    vx = 0.8 * vx - 0.07 * 2 * u;
    vy = 0.8 * vy - 0.07 * (4 * T * y * u + (2 * y) / (K * K));
    x += vx;
    y += vy;
  }
  return path(pts);
}

/** Wobbly nested contours, like a topographic map: one path per level, outermost first. */
export function topoLevels(cx: number, cy: number, r0: number, levels: number, sx: number, sy: number, drift: Pt) {
  return Array.from({ length: levels }, (_, lv) => {
    const r = r0 * (1 - lv / levels) + r0 * 0.08;
    const [ox, oy] = [cx + lv * drift[0], cy + lv * drift[1]];
    return path(
      sample(160, (u) => {
        const th = u * TAU;
        const wobble =
          1 +
          0.15 * Math.sin(3 * th + 1.1 + lv * 0.07) +
          0.08 * Math.sin(5 * th + 0.4 - lv * 0.05) +
          0.045 * Math.sin(9 * th + 2.1);
        return [ox + sx * r * wobble * Math.cos(th), oy + sy * r * wobble * Math.sin(th)];
      }),
      true,
    );
  });
}

export const gear = (cx: number, cy: number, r: number, tooth: number, teeth: number, rot: number) =>
  path(
    sample(240, (u) => {
      const th = u * TAU;
      const rr = r + tooth * Math.tanh(3 * Math.sin(teeth * th + rot));
      return [cx + rr * Math.cos(th), cy + rr * Math.sin(th)];
    }),
    true,
  );

/** A charged particle gyrating along a field line. */
export function gyration(from: number, to: number, y0: number, slope: number, rx: number, ry: number) {
  const pts: Pt[] = [];
  for (let t = 0; from + 7.4 * t <= to; t += 0.075) {
    const bx = from + 7.4 * t;
    pts.push([bx + rx * Math.cos(t), y0 + slope * bx + ry * Math.sin(t)]);
  }
  return path(pts);
}

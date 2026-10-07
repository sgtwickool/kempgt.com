// "Outside work": caving, guitar and machine learning. Climbing reuses crag.
import { draw, fade, follow, small, stamp } from "../build";
import { arcFractions, circle, path, sample } from "../geometry";
import { topoLevels } from "../shapes";
import type { Layer, Print, Pt } from "../types";

export function cave(): Print {
  // Caving. A caver abseils down the shaft, switches on their head torch,
  // and the passage reveals itself from the light outwards.
  const rope = path(sample(40, (u) => [100 + 3 * Math.sin((6 + u * 56) / 5), 6 + u * 56]));
  const passage = topoLevels(100, 76, 72, 6, 1.15, 0.42, [0, 0]).reverse();
  return small([
    { d: "M62 6H138", ink: "strong", width: 2.2, round: true, motion: draw(0, 0.3) },
    { d: rope, ink: "strong", width: 1.8, round: true, motion: draw(0.3, 0.9) },
    { d: circle(102, 66, 10), ink: "glow", motion: stamp(1.25, 0.35) },
    ...passage.map((d, i): Layer => ({ d, ink: "line", width: 1.6, motion: draw(1.45 + i * 0.16, 0.45) })),
    { d: circle(0, 0, 3.6), ink: "strong", motion: follow(rope, 0.3, 0.9) },
  ]);
}

export function guitar(): Print {
  // Guitar. The strings are strung, then a plectrum strums down across them
  // and each one starts to vibrate, at its own harmonic, once it's plucked.
  const strings = [22, 54, 86, 118];
  const strum = "M170 6L156 134";
  const [from, span] = [1.0, 0.8];
  const plucked = (y: number) => from + (span * (y - 6)) / 128;
  return small([
    ...strings.map((y, i): Layer => ({ d: `M12 ${y}H188`, ink: "strong", width: 0.8, motion: draw(i * 0.18, 0.4) })),
    ...strings.map((y, i): Layer => {
      const harmonic = i + 1;
      return {
        d: path(sample(80, (u) => [12 + 176 * u, y - 11 * Math.sin(harmonic * Math.PI * u)])),
        ink: harmonic % 2 ? "line" : "strong",
        width: 1.8,
        motion: { kind: "vibrate", origin: [100, y], cycles: 3 * harmonic, delay: plucked(y), duration: 0.35 },
      };
    }),
    { d: "M0 -7L6 4Q0 8 -6 4Z", ink: "line", motion: follow(strum, from, span, { vanish: true }) },
  ]);
}

export function loss(): Print {
  // Machine learning. A landscape with two minima fills in level by level
  // from its lowest point, then a ball rolls down with momentum, leaving its
  // gradient steps behind, gets caught in the shallow minimum, and escapes
  // to the deep one.
  const f = (x: number, y: number) =>
    0.35 * (x * x + 1.6 * y * y) -
    1.0 * Math.exp(-((x - 0.65) ** 2 + (y + 0.15) ** 2) / 0.18) -
    0.6 * Math.exp(-((x + 0.7) ** 2 + (y - 0.3) ** 2) / 0.12) +
    0.06 * Math.sin(3 * x) * Math.cos(2 * y);
  const px = (x: number) => 100 + x * 60;
  const py = (y: number) => 70 - y * 60;

  const levels = contourLevels(f, px, py);

  // Gradient descent with momentum, from the top-left corner.
  const grad = (x: number, y: number): Pt => {
    const h = 1e-4;
    return [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
  };
  let [x, y, vx, vy] = [-1.35, 0.85, 0, 0];
  const steps: Pt[] = [[x, y]];
  for (let n = 0; n < 220; n++) {
    const [gx, gy] = grad(x, y);
    vx = 0.85 * vx - 0.06 * gx;
    vy = 0.85 * vy - 0.06 * gy;
    x += vx;
    y += vy;
    steps.push([x, y]);
  }
  const pts = steps.map(([sx, sy]): Pt => [px(sx), py(sy)]);
  const at = arcFractions(pts);
  const descent = path(pts);
  const [from, span] = [1.2, 2.6];
  // The step at which the ball is deepest in the shallow minimum.
  const caught = steps.reduce(
    (best, [sx, sy], i) => {
      const d = Math.hypot(sx + 0.7, sy - 0.3);
      return d < best.d ? { d, i } : best;
    },
    { d: Infinity, i: 0 },
  ).i;

  return small([
    ...levels.map((d, i): Layer => ({ d, ink: "line", width: 1.5, motion: fade(i * 0.08, 0.3) })),
    { d: circle(px(-0.7), py(0.3), 8), ink: "line", width: 2.4, motion: stamp(from + span * at[caught]) },
    { d: circle(px(0.62), py(-0.14), 9), ink: "glow", motion: stamp(from + span - 0.05, 0.35) },
    { d: circle(pts[0][0], pts[0][1], 4), ink: "strong", width: 2.2, motion: stamp(from - 0.15) },
    { d: descent, ink: "strong", width: 1.6, round: true, motion: draw(from, span) },
    ...pts
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i > 0 && i % 9 === 0)
      .map(({ p, i }): Layer => ({
        d: circle(p[0], p[1], 1.9),
        ink: "strong",
        motion: stamp(from + span * at[i] - 0.03, 0.12),
      })),
    { d: circle(0, 0, 4.4), ink: "strong", motion: follow(descent, from, span) },
  ]);
}

/**
 * Contour lines of f by marching squares: one path per level, lowest first.
 * px and py map from f's coordinates to the print's.
 */
function contourLevels(f: (x: number, y: number) => number, px: (x: number) => number, py: (y: number) => number) {
  const [nx, ny, x0, y1] = [90, 60, -1.55, 1.1];
  const [dx, dy] = [3.1 / nx, 2.2 / ny];
  const grid = Array.from({ length: ny + 1 }, (_, j) =>
    Array.from({ length: nx + 1 }, (_, i) => f(x0 + i * dx, y1 - j * dy)),
  );
  const levels: string[] = [];
  for (let level = -0.74; level < 0.62; level += 0.11) {
    let segments = "";
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const corners: Pt[] = [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ];
        const cuts: Pt[] = [];
        for (let e = 0; e < 4; e++) {
          const [ai, aj] = corners[e];
          const [bi, bj] = corners[(e + 1) % 4];
          const [va, vb] = [grid[aj][ai], grid[bj][bi]];
          if (va < level !== vb < level) {
            const t = (level - va) / (vb - va);
            cuts.push([px(x0 + (ai + (bi - ai) * t) * dx), py(y1 - (aj + (bj - aj) * t) * dy)]);
          }
        }
        for (let q = 0; q + 1 < cuts.length; q += 2) segments += path([cuts[q], cuts[q + 1]]);
      }
    }
    if (segments) levels.push(segments);
  }
  return levels;
}

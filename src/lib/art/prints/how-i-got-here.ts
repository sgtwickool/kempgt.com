// "How I got here": Cardiff, ITER, climbing, the first dev job, the MSc, and now.
import { draw, fade, follow, slide, small, stamp } from "../build";
import { arcFractions, arrowhead, circle, path, rect, sample } from "../geometry";
import { fluxAxis, fluxPoint, fluxSurface, gear, topoLevels } from "../shapes";
import type { Layer, Print, Pt } from "../types";

export function gears(): Print {
  // Cardiff. An engineering drawing: centre lines and pitch circles first,
  // then the teeth, then the numbers. The gears turn with the scroll.
  const [bx, by, sx, sy] = [84, 72, 146, 98];
  return small(
    [
      { d: `M${bx} 26V118M38 ${by}H130M${sx} 70V126M118 ${sy}H174`, ink: "line", width: 0.8, motion: fade(0, 0.35) },
      { d: circle(bx, by, 40) + circle(sx, sy, 22), ink: "line", width: 0.9, motion: draw(0.2, 0.6) },
      { d: circle(bx, by, 30), ink: "glow", motion: stamp(1.5) },
      {
        d: gear(bx, by, 40, 6, 12, 0) + circle(bx, by, 11),
        ink: "line",
        width: 2,
        motion: draw(0.6, 0.8),
        spin: { origin: [bx, by], cycles: 1 },
      },
      {
        // 8 teeth against 12, so it turns 1.5 times as far the other way.
        d: gear(sx, sy, 22, 5, 8, 0.45) + circle(sx, sy, 5),
        ink: "strong",
        width: 2.2,
        round: true,
        motion: draw(1.0, 0.6),
        spin: { origin: [sx, sy], cycles: 1.5, reverse: true },
      },
    ],
    [
      { x: 8, y: 18, text: "12 teeth", size: 11, weight: 700, tone: "muted", motion: slide(1.7) },
      { x: 194, y: 134, text: "8 teeth", size: 11, weight: 700, tone: "muted", anchor: "end", motion: slide(1.85) },
      { x: 194, y: 22, text: "1.5 : 1", size: 14, weight: 800, tone: "strong", anchor: "end", motion: stamp(2.0) },
    ],
  );
}

export function tokamak(): Print {
  // ITER. The plasma ignites and its flux surfaces ripple outwards, a
  // particle laps one of them, then the first wall goes up around it and the
  // forces on it are worked out one by one.
  const [cx, cy, s] = [98, 70, 40];
  const surfaces = [0.22, 0.36, 0.5, 0.64, 0.78];
  const [ax, ay] = fluxAxis(cx, cy, s);
  const forces = Array.from({ length: 10 }, (_, i) => {
    const [x, y] = fluxPoint(cx, cy, s, 0.95, i / 10);
    const len = Math.hypot(x - ax, y - ay) || 1;
    const [ux, uy] = [(x - ax) / len, (y - ay) / len];
    const tip: Pt = [x + 13 * ux, y + 13 * uy];
    return path([[x + 3 * ux, y + 3 * uy], tip]) + arrowhead(tip, ux, uy);
  });
  return small([
    { d: fluxSurface(cx, cy, s, 0.36), ink: "glow", motion: stamp(0.05, 0.35) },
    ...surfaces.map((r, i): Layer => ({
      d: fluxSurface(cx, cy, s, r),
      ink: "line",
      width: 1.6,
      motion: draw(0.25 + i * 0.15, 0.35),
    })),
    { d: circle(0, 0, 2.8), ink: "strong", motion: follow(fluxSurface(cx, cy, s, 0.64), 0.5, 1.4) },
    { d: fluxSurface(cx, cy, s, 0.95), ink: "strong", width: 4, motion: draw(1.1, 0.7) },
    ...forces.map((d, i): Layer => ({ d, ink: "line", width: 1.6, round: true, motion: stamp(1.85 + i * 0.07, 0.2) })),
  ]);
}

export function crag(): Print {
  // Climbing (also used under "Outside work"). The hill draws itself contour
  // by contour, then a climber climbs the route, clipping each bolt as they
  // reach it, and plants a flag on top.
  const contours = topoLevels(92, 80, 50, 8, 1.35, 0.78, [3, -3]);
  // prettier-ignore
  const route: Pt[] = [[54, 130], [66, 114], [60, 100], [76, 88], [72, 74], [86, 64], [94, 56]];
  const at = arcFractions(route);
  const [climbFrom, climbFor] = [1.1, 1.8];
  const reached = (i: number) => climbFrom + climbFor * at[i];
  const summit = reached(route.length - 1);
  const routeD = path(route);
  return small([
    ...contours.map((d, i): Layer => ({ d, ink: "line", width: 1.5, motion: draw(i * 0.11, 0.5) })),
    { d: circle(54, 130, 3.5), ink: "strong", width: 2, knockout: true, motion: stamp(0.95) },
    { d: routeD, ink: "strong", width: 2.2, round: true, motion: draw(climbFrom, climbFor) },
    ...route.slice(1).map(([x, y], i): Layer => ({
      d: circle(x, y, 2.6),
      ink: "strong",
      width: 2,
      knockout: true,
      motion: stamp(reached(i + 1) - 0.05, 0.2),
    })),
    { d: "M94 56V38", ink: "strong", width: 1.8, round: true, motion: draw(summit, 0.2) },
    { d: "M94 38l13 4.5l-13 4.5Z", ink: "glow", motion: stamp(summit + 0.15) },
    { d: circle(0, 0, 4.2), ink: "line", motion: follow(routeD, climbFrom, climbFor) },
  ]);
}

export function editor(): Print {
  // First dev job. An editor opens, the code types itself line by line, a
  // line gets selected, and it runs.
  // [indent, length] of each line of code.
  // prettier-ignore
  const rows: Pt[] = [[0, 70], [1, 52], [1, 84], [2, 46], [2, 64], [1, 34], [0, 18]];
  const typed = 0.55 + rows.length * 0.18;
  return small([
    { d: rect(18, 14, 164, 112) + "M18 26H182", ink: "line", width: 1.8, motion: draw(0, 0.45) },
    { d: circle(26, 20, 2) + circle(33, 20, 2) + circle(40, 20, 2), ink: "line", width: 1.4, motion: fade(0.4, 0.2) },
    { d: rect(24, 56, 116, 12), ink: "glow", motion: slide(1.95, 0.3) },
    ...rows.map(([indent, len], i): Layer => ({
      d: `M${30 + indent * 12} ${40 + i * 12}h${len}`,
      ink: i === 1 ? "line" : "strong",
      width: 5,
      round: true,
      motion: draw(0.55 + i * 0.18, 0.2),
    })),
    {
      // The cursor, after the last line once typing stops.
      d: `M52 ${40 + 6 * 12 + 4}v-8`,
      ink: "line",
      width: 2.2,
      round: true,
      motion: { kind: "blink", cycles: 4, delay: typed, duration: 0.1 },
    },
    { d: circle(164, 106, 11), ink: "glow", motion: stamp(2.3) },
    { d: "M158 106l4 4l8 -9", ink: "strong", width: 2.4, round: true, motion: draw(2.4, 0.2) },
  ]);
}

export function laser(): Print {
  // MSc. A laser pulse travels down the beam and hits an electron, which
  // spirals in, throwing off radiation-reaction photons, into a tight focus.
  let waves = "";
  for (let j = 0; j < 3; j++) {
    waves += path(sample(80, (u) => [u * 110, 46 + j * 16 + 5 * Math.sin((u * 110) / 5)]));
  }
  const spiral = sample(260, (u): Pt => {
    const [th, rho] = [u * 24, 22 * (1 - 0.72 * u)];
    return [100 + u * 82 + rho * Math.cos(th), 70 - u * 12 + 0.6 * rho * Math.sin(th)];
  });
  const spiralD = path(spiral);
  const at = arcFractions(spiral);
  const [from, span] = [0.9, 1.4];
  const photon = path(sample(20, (u) => [u * 14 - 7, 2.2 * Math.sin(u * 14 * 1.3)]));
  const photons = [0.25, 0.45, 0.65, 0.85].map((fraction) => {
    const i = at.findIndex((a) => a >= fraction);
    const [x, y] = spiral[i];
    return {
      along: path([
        [x, y],
        [x + 8, y - 32],
      ]),
      delay: from + span * at[i],
    };
  });
  const [ex, ey] = spiral[spiral.length - 1];
  return small(
    [
      { d: circle(ex + 2, ey - 2, 9), ink: "glow", motion: stamp(from + span - 0.05, 0.35) },
      { d: waves, ink: "line", width: 1.8, motion: draw(0, 0.6) },
      {
        // The laser pulse.
        d: "M-12 0a12 7 0 1 0 24 0a12 7 0 1 0 -24 0",
        ink: "glow",
        motion: follow("M0 62H100", 0.3, 0.6, { vanish: true }),
      },
      { d: spiralD, ink: "strong", width: 1.8, round: true, motion: draw(from, span) },
      ...photons.map(({ along, delay }): Layer => ({
        d: photon,
        ink: "line",
        width: 1.6,
        round: true,
        motion: follow(along, delay, 0.45, { turn: true, vanish: true }),
      })),
      { d: circle(0, 0, 3.2), ink: "strong", motion: follow(spiralD, from, span) },
    ],
    [
      {
        x: 150,
        y: 26,
        text: "γ",
        size: 22,
        weight: 600,
        tone: "strong",
        symbol: true,
        motion: fade(photons[0].delay, 0.2),
      },
    ],
  );
}

export function onion(): Print {
  // Now: senior developer and architect. Clean Architecture: rings draw from
  // the outside in, then the dependency arrows point inwards and the domain
  // at the core lights up.
  const [cx, cy] = [100, 70];
  const rings = [60, 46, 32, 18];
  const arrows = [-45, 45, 135, 225].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    const tip: Pt = [cx + 23 * ux, cy + 23 * uy];
    return path([[cx + 66 * ux, cy + 66 * uy], tip]) + arrowhead(tip, -ux, -uy, 7, 4);
  });
  return small([
    { d: circle(cx, cy, 13), ink: "glow", motion: stamp(2.1, 0.4) },
    ...rings.map((r, i): Layer => {
      const core = i === rings.length - 1;
      return {
        d: circle(cx, cy, r),
        ink: core ? "strong" : "line",
        width: core ? 2.6 : 1.8,
        motion: draw(i * 0.3, 0.55),
      };
    }),
    ...arrows.map((d, i): Layer => ({ d, ink: "strong", width: 2.2, round: true, motion: draw(1.3 + i * 0.13, 0.45) })),
  ]);
}

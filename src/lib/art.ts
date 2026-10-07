// Generative risograph prints, computed at build time.
//
// Each print is a few layers of SVG path data, each in one of three inks:
// "line" (fluorescent pink), "strong" (blue) or "glow" (yellow). Inks
// overprint each other (see .ink in global.css), and every print is drawn
// from a small piece of maths tied to the work it sits beside.
//
// Layers can also carry a motion, driven by scrolling (see Print.astro), so
// each print tells a small story as it scrolls up the screen and rewinds as
// it scrolls back: a climber clips bolts on the way to the summit, a car
// stops at chargers, a product is classified one node at a time.

/** "paper" paints in the background colour, to wipe out what's beneath it. */
export type Ink = "line" | "strong" | "glow" | "paper";

type Pt = [number, number];

export interface Motion {
  /**
   * One-off motions play out as the print scrolls from the bottom of the
   * screen to just above the middle, timed by delay and duration (relative
   * units; each print's timeline is scaled to fit):
   *   draw    the stroke draws itself in
   *   fade    the layer fades in
   *   slide   the layer slides in from the left
   *   stamp   the layer lands like a rubber stamp
   *   follow  the layer (drawn around 0,0) travels along `along`
   *
   * Loops repeat as long as the print is scrolled past, `cycles` times per
   * screen height: spin, vibrate, blink, emit. A vibrate or blink with a
   * delay waits until then and builds up over its duration (a plucked string,
   * a cursor that appears once typing stops).
   */
  kind: "draw" | "fade" | "slide" | "stamp" | "follow" | "spin" | "vibrate" | "blink" | "emit";
  delay?: number;
  duration?: number;
  /** Turns (spin) or repeats (vibrate, blink, emit) per screen of scroll. */
  cycles?: number;
  /** Pivot for spin and vibrate, in viewBox units. */
  origin?: Pt;
  /** Spin anticlockwise. */
  reverse?: boolean;
  /** Where an emitted shape travels to, relative to where it starts. */
  to?: Pt;
  /** follow: the path to travel along. */
  along?: string;
  /** follow: face the direction of travel. */
  turn?: boolean;
  /** follow: disappear on arrival (absorbed into whatever it reached). */
  vanish?: boolean;
}

export interface Layer {
  d: string;
  ink: Ink;
  /** Stroke width in viewBox units. Omit for a filled shape. */
  width?: number;
  round?: boolean;
  /** Fill the shape with the plate colour as well as stroking it. */
  knockout?: boolean;
  motion?: Motion;
  /** Turn with the scroll as well, so a layer can draw in and spin. */
  spin?: { origin: Pt; cycles: number; reverse?: boolean };
}

export interface Label {
  x: number;
  y: number;
  text: string;
  size: number;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  tone?: "ink" | "muted" | "strong";
  /** Set in the serif italic, for maths and physics symbols. */
  symbol?: boolean;
  motion?: Motion;
}

export interface Print {
  width: number;
  height: number;
  layers: Layer[];
  labels?: Label[];
}

const TAU = 2 * Math.PI;
const f = (v: number) => (Math.round(v * 10) / 10).toString();
const path = (pts: Pt[], close = false) =>
  `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}${close ? "Z" : ""}`;
const circle = (cx: number, cy: number, r: number) =>
  `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
const sample = (n: number, fn: (u: number) => Pt) =>
  Array.from({ length: n + 1 }, (_, i) => fn(i / n));
const rect = (x: number, y: number, w: number, h: number) =>
  `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}Z`;

/** Fraction of the way along a polyline at which each point is reached. */
function arcFractions(pts: Pt[]) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const total = cum[cum.length - 1] || 1;
  return cum.map((c) => c / total);
}

const draw = (delay: number, duration: number): Motion => ({ kind: "draw", delay, duration });
const fade = (delay: number, duration = 0.4): Motion => ({ kind: "fade", delay, duration });
const stamp = (delay: number, duration = 0.3): Motion => ({ kind: "stamp", delay, duration });
const slide = (delay: number, duration = 0.4): Motion => ({ kind: "slide", delay, duration });
const follow = (along: string, delay: number, duration: number, opts: Partial<Motion> = {}): Motion => ({
  kind: "follow",
  along,
  delay,
  duration,
  ...opts,
});

/* ---------- Shared shapes ---------- */

// psi = (x - c + t*y^2)^2 + (y/k)^2. Its level sets are D-shaped: nested
// tokamak flux surfaces, which also read as a loss surface.
const C0 = 0.05;
const T0 = 0.35;
const K0 = 1.45;

function fluxSurface(cx: number, cy: number, scale: number, r: number) {
  return path(
    sample(140, (u) => {
      const y = K0 * r * Math.sin(u * TAU);
      return [cx + (C0 + r * Math.cos(u * TAU) - T0 * y * y) * scale, cy - y * scale];
    }),
    true,
  );
}

/** Heavy-ball gradient descent on psi, from a start near the outer surface. */
function fluxDescent(cx: number, cy: number, scale: number) {
  let [x, y, vx, vy] = [0.3, 1.0, 0, 0];
  const pts: Pt[] = [];
  for (let n = 0; n <= 160; n++) {
    pts.push([cx + x * scale, cy - y * scale]);
    const u = x - C0 + T0 * y * y;
    vx = 0.8 * vx - 0.07 * 2 * u;
    vy = 0.8 * vy - 0.07 * (4 * T0 * y * u + (2 * y) / (K0 * K0));
    x += vx;
    y += vy;
  }
  return path(pts);
}

/** Wobbly nested contours, like a topographic map: one path per level, outermost first. */
function topoLevels(
  cx: number,
  cy: number,
  r0: number,
  levels: number,
  sx: number,
  sy: number,
  drift: Pt,
) {
  return Array.from({ length: levels }, (_, lv) => {
    const r = r0 * (1 - lv / levels) + r0 * 0.08;
    const [ox, oy] = [cx + lv * drift[0], cy + lv * drift[1]];
    return path(
      sample(160, (u) => {
        const th = u * TAU;
        const wob =
          1 +
          0.15 * Math.sin(3 * th + 1.1 + lv * 0.07) +
          0.08 * Math.sin(5 * th + 0.4 - lv * 0.05) +
          0.045 * Math.sin(9 * th + 2.1);
        return [ox + sx * r * wob * Math.cos(th), oy + sy * r * wob * Math.sin(th)];
      }),
      true,
    );
  });
}

function gear(cx: number, cy: number, r: number, tooth: number, teeth: number, rot: number) {
  return path(
    sample(240, (u) => {
      const th = u * TAU;
      const rr = r + tooth * Math.tanh(3 * Math.sin(teeth * th + rot));
      return [cx + rr * Math.cos(th), cy + rr * Math.sin(th)];
    }),
    true,
  );
}

/** A charged particle gyrating along a field line. */
function gyration(from: number, to: number, y0: number, slope: number, rx: number, ry: number) {
  const pts: Pt[] = [];
  for (let t = 0; from + 7.4 * t <= to; t += 0.075) {
    const bx = from + 7.4 * t;
    pts.push([bx + rx * Math.cos(t), y0 + slope * bx + ry * Math.sin(t)]);
  }
  return path(pts);
}

/* ---------- Hero poster ---------- */

/**
 * The homepage poster. "wide" is the desktop composition; "tall" is
 * recomposed for phones rather than cropped, so the tokamak stays whole.
 */
export function heroPoster(layout: "wide" | "tall") {
  const wide = layout === "wide";
  const [width, height] = wide ? [1280, 660] : [600, 820];
  const [cx, cy, s] = wide ? [900, 300, 205] : [350, 290, 170];
  let rings = "";
  for (let i = 1; i < 12; i++) rings += fluxSurface(cx, cy, s, 0.92 - i * 0.075);

  return {
    width,
    height,
    topo: (wide
      ? topoLevels(300, 520, 360, 15, 1.3, 0.8, [9, -8])
      : topoLevels(170, 690, 300, 14, 1.2, 0.8, [8, -9])
    ).join(""),
    rings,
    wall: fluxSurface(cx, cy, s, 0.92),
    gyro: wide ? gyration(-60, 1340, 120, 0.16, 34, 20) : gyration(-60, 660, 120, 0.42, 28, 16),
    descent: fluxDescent(cx, cy, s),
    minimum: [cx + C0 * s, cy] as Pt,
  };
}

/* ---------- How I got here ---------- */

function crag(): Layer[] {
  // The hill draws itself contour by contour, then a climber climbs the
  // route, clipping each bolt as they reach it, and plants a flag on top.
  const contours = topoLevels(92, 80, 50, 8, 1.35, 0.78, [3, -3]);
  const route: Pt[] = [[54, 130], [66, 114], [60, 100], [76, 88], [72, 74], [86, 64], [94, 56]];
  const at = arcFractions(route);
  const [climbFrom, climbFor] = [1.1, 1.8];
  const reached = (i: number) => climbFrom + climbFor * at[i];
  const routeD = path(route);
  return [
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
    { d: "M94 56V38", ink: "strong", width: 1.8, round: true, motion: draw(reached(route.length - 1), 0.2) },
    { d: "M94 38l13 4.5l-13 4.5Z", ink: "glow", motion: stamp(reached(route.length - 1) + 0.15) },
    { d: circle(0, 0, 4.2), ink: "line", motion: follow(routeD, climbFrom, climbFor) },
  ];
}

function onion(): Layer[] {
  // Clean Architecture: rings draw from the outside in, then the dependency
  // arrows point inwards and the domain at the core lights up.
  const [cx, cy] = [100, 70];
  const rings = [60, 46, 32, 18];
  const arrows = [-45, 45, 135, 225].map((deg) => {
    const a = (deg * Math.PI) / 180;
    const [ux, uy] = [Math.cos(a), Math.sin(a)];
    const [x1, y1, x2, y2] = [cx + 66 * ux, cy + 66 * uy, cx + 23 * ux, cy + 23 * uy];
    const [hx, hy] = [-uy, ux];
    const head = `M${f(x2 + 7 * ux + 4 * hx)} ${f(y2 + 7 * uy + 4 * hy)}L${f(x2)} ${f(y2)}L${f(x2 + 7 * ux - 4 * hx)} ${f(y2 + 7 * uy - 4 * hy)}`;
    return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}${head}`;
  });
  return [
    { d: circle(cx, cy, 13), ink: "glow", motion: stamp(2.1, 0.4) },
    ...rings.map((r, i): Layer => ({
      d: circle(cx, cy, r),
      ink: i === rings.length - 1 ? "strong" : "line",
      width: i === rings.length - 1 ? 2.6 : 1.8,
      motion: draw(i * 0.3, 0.55),
    })),
    ...arrows.map((d, i): Layer => ({ d, ink: "strong", width: 2.2, round: true, motion: draw(1.3 + i * 0.13, 0.45) })),
  ];
}

/* ---------- Work ---------- */

function classification(): Print {
  // A cotton T-shirt is classified: the tree grows level by level, then the
  // answer is chosen one node at a time while the commodity code builds up
  // beside it, and each leaf's dot shows how confident a suggestion was.
  const curve = ([x1, y1]: Pt, [x2, y2]: Pt) => {
    const mx = (x1 + x2) / 2;
    return `C${f(mx)} ${f(y1)} ${f(mx)} ${f(y2)} ${f(x2)} ${f(y2)}`;
  };
  const link = (a: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])}${curve(a, b)}`;

  const xs = [28, 125, 222, 319];
  const root: Pt = [xs[0], 170];
  const l1: Pt[] = [68, 170, 272].map((y) => [xs[1], y]);
  const l2 = l1.flatMap((p, parent) => [-30.6, 30.6].map((dy) => ({ p: [xs[2], p[1] + dy] as Pt, parent })));
  const leaves = l2.flatMap((n, parent) => [-13.6, 13.6].map((dy) => ({ p: [xs[3], n.p[1] + dy] as Pt, parent })));
  const confidence = [0.2, 0.35, 0.1, 0.45, 0.25, 0.3, 0.55, 1, 0.15, 0.4, 0.3, 0.2];
  const pick = { l1: 1, l2: 3, leaf: 7 };
  const [n1, n2, n3] = [l1[pick.l1], l2[pick.l2].p, leaves[pick.leaf].p];

  const node = (p: Pt, delay: number): Layer => ({
    d: circle(p[0], p[1], 6),
    ink: "line",
    width: 2,
    knockout: true,
    motion: stamp(delay, 0.25),
  });
  const ring = (p: Pt, r: number, delay: number): Layer => ({
    d: circle(p[0], p[1], r),
    ink: "strong",
    width: 3.4,
    motion: stamp(delay, 0.25),
  });
  const segment = (a: Pt, b: Pt, delay: number): Layer => ({
    d: link(a, b),
    ink: "strong",
    width: 3.4,
    round: true,
    motion: draw(delay, 0.35),
  });

  const layers: Layer[] = [
    ...leaves.map((n, i): Layer => ({
      d: circle(n.p[0], n.p[1], 6 + confidence[i] * 15.6),
      ink: "glow",
      motion: stamp(3.3 + i * 0.05, 0.25),
    })),
    { d: l1.map((p) => link(root, p)).join(""), ink: "line", width: 2, motion: draw(0.25, 0.45) },
    { d: l2.map((n) => link(l1[n.parent], n.p)).join(""), ink: "line", width: 2, motion: draw(0.85, 0.45) },
    { d: leaves.map((n) => link(l2[n.parent].p, n.p)).join(""), ink: "line", width: 2, motion: draw(1.45, 0.45) },
    ...l1.map((p, i) => node(p, 0.7 + i * 0.06)),
    ...l2.map((n, i) => node(n.p, 1.3 + i * 0.05)),
    { d: circle(root[0], root[1], 10), ink: "strong", width: 3.4, knockout: true, motion: stamp(0.05) },
    segment(root, n1, 2.0),
    ring(n1, 8.5, 2.33),
    segment(n1, n2, 2.45),
    ring(n2, 8.5, 2.78),
    segment(n2, n3, 2.9),
    ring(n3, 10, 3.23),
  ];

  const code = (y: number, text: string, caption: string, delay: number): Label[] => [
    { x: 362, y, text, size: 21, weight: 800, tone: "strong", motion: slide(delay, 0.3) },
    { x: 362, y: y + 17, text: caption, size: 13.5, tone: "muted", motion: slide(delay + 0.05, 0.3) },
  ];
  return {
    width: 520,
    height: 340,
    layers,
    labels: [
      { x: 14, y: 144, text: "Cotton T-shirt", size: 15, weight: 700, tone: "ink", motion: fade(0, 0.3) },
      ...code(150, "61", "Knitted clothing", 2.38),
      ...code(198, "6109", "T-shirts", 2.83),
      ...code(246, "6109 10 00", "Of cotton", 3.28),
    ],
  };
}

function cqrs(): Layer[] {
  // Master data: requests flow in, the dispatcher splits them, commands
  // travel to the write store and queries to the read model.
  const toWrite = "M6 70H74C96 70 98 38 120 38H170";
  const toRead = "M6 70H74C96 70 98 102 120 102H168";
  const command = "M-4.5 -4.5h9v9h-9Z";
  const query = circle(0, 0, 4.6);
  return [
    { d: rect(160, 28, 28, 22), ink: "glow", motion: stamp(1.25) },
    { d: "M6 70H58", ink: "line", width: 2.4, motion: draw(0, 0.35) },
    { d: circle(66, 70, 8), ink: "strong", width: 2.6, knockout: true, motion: stamp(0.35) },
    {
      d: "M74 70C96 70 98 38 120 38H156M74 70C96 70 98 102 120 102H156",
      ink: "line",
      width: 2.4,
      motion: draw(0.5, 0.5),
    },
    {
      // A database: the write store.
      d: "M160 28a14 5 0 1 0 28 0a14 5 0 1 0 -28 0M160 28v22a14 5 0 0 0 28 0v-22",
      ink: "strong",
      width: 2.2,
      motion: draw(0.95, 0.4),
    },
    {
      // The read model: a ready-made list.
      d: rect(158, 90, 32, 26) + "M164 98h20M164 104h20M164 110h13",
      ink: "strong",
      width: 2.2,
      round: true,
      motion: draw(1.05, 0.4),
    },
    ...[0, 1, 2].map((i): Layer => ({ d: command, ink: "strong", motion: follow(toWrite, 1.3 + i * 0.25, 0.9, { vanish: true }) })),
    ...[0, 1, 2].map((i): Layer => ({ d: query, ink: "line", motion: follow(toRead, 1.42 + i * 0.25, 0.9, { vanish: true }) })),
  ];
}

function leaf(): Layer[] {
  // LEAF: fibre origins appear, their fibres converge and twist into a
  // thread, the thread becomes a garment, and the garment gets its tag.
  const origins = Array.from({ length: 7 }, (_, i): Pt => [12, 18 + i * 17]);
  const hub: Pt = [118, 70];
  const thread =
    path(sample(30, (u) => [118 + 36 * u, 70 + 4 * Math.sin(u * 9)])) +
    path(sample(30, (u) => [118 + 36 * u, 70 - 4 * Math.sin(u * 9)]));
  return [
    { d: circle(hub[0], hub[1], 9), ink: "glow", motion: stamp(1.1) },
    ...origins.map(([x, y], i): Layer => ({ d: circle(x, y, 3.2), ink: "strong", motion: stamp(i * 0.07, 0.2) })),
    ...origins.map(([x, y], i): Layer => ({
      d: path(sample(40, (u) => [x + (hub[0] - x) * u, y + (hub[1] - y) * u * u + 3 * Math.sin(u * 12 + i) * (1 - u)])),
      ink: "line",
      width: 1.8,
      motion: draw(0.2 + i * 0.07, 0.7),
    })),
    { d: thread, ink: "strong", width: 2.2, motion: draw(1.15, 0.4) },
    {
      d: "M160 52L168 47Q174 54 180 47L188 52L196 62L190 68L186 64V104H162V64L158 68L152 62Z",
      ink: "strong",
      width: 2.2,
      motion: draw(1.5, 0.8),
    },
    { d: "M166 92Q170 74 184 76Q182 92 166 92Z", ink: "glow", motion: stamp(2.3) },
    { d: "M169 89Q176 84 181 78", ink: "line", width: 1.6, round: true, motion: draw(2.45, 0.25) },
  ];
}

/* ---------- Side projects ---------- */

function evRoute(): Layer[] {
  // A car drives the planned route, and each charger lights up as it arrives.
  const route: Pt[] = [
    [14, 122], [34, 112], [52, 96], [60, 82], [72, 72], [92, 66],
    [110, 62], [126, 52], [142, 40], [160, 30], [178, 24],
  ];
  const chargers = [2, 6, 10];
  const at = arcFractions(route);
  const [from, span] = [0.5, 2.1];
  const routeD = path(route);
  return [
    {
      d: "M0 40C60 30 120 60 200 44M0 104C70 122 140 90 200 112M60 0C70 50 50 90 70 140M150 0C140 60 160 100 140 140",
      ink: "line",
      width: 1.6,
      motion: draw(0, 0.6),
    },
    ...chargers.map((i): Layer => ({ d: circle(route[i][0], route[i][1], 9), ink: "glow", motion: stamp(from + span * at[i] - 0.05) })),
    { d: routeD, ink: "strong", width: 2.6, round: true, motion: draw(from, span) },
    ...chargers.map((i): Layer => ({
      d: circle(route[i][0], route[i][1], 4.5),
      ink: "strong",
      width: 2.4,
      knockout: true,
      motion: stamp(from + span * at[i] - 0.05, 0.2),
    })),
    { d: "M-7 -4h14v8h-14Z", ink: "line", motion: follow(routeD, from, span, { turn: true }) },
  ];
}

function fleet(): Layer[] {
  // Two vans leave the depot together, and each stop is ticked off as it's visited.
  const depot: Pt = [100, 70];
  const stops: Pt[] = [[40, 30], [72, 20], [60, 62], [30, 104], [150, 30], [176, 70], [152, 112], [108, 122]];
  const routes = [
    [depot, stops[2], stops[3], stops[0], stops[1], depot],
    [depot, stops[4], stops[5], stops[6], stops[7], depot],
  ];
  const [from, span] = [0.5, 2.2];
  return [
    { d: rect(91, 61, 18, 18), ink: "glow", motion: stamp(0) },
    ...stops.map(([x, y], i): Layer => ({ d: circle(x, y, 4), ink: "line", width: 1.8, knockout: true, motion: stamp(0.1 + i * 0.04, 0.2) })),
    ...routes.flatMap((route): Layer[] => {
      const at = arcFractions(route);
      const d = path(route);
      return [
        { d, ink: "line", width: 2, motion: draw(from, span) },
        ...route.slice(1, -1).map((p, i): Layer => ({
          d: circle(p[0], p[1], 5.5),
          ink: "strong",
          width: 2.4,
          knockout: true,
          motion: stamp(from + span * at[i + 1] - 0.04, 0.2),
        })),
        { d: "M-5 -4h10v8h-10Z", ink: "strong", motion: follow(d, from, span, { turn: true }) },
      ];
    }),
  ];
}

/* ---------- Outside work ---------- */

function cave(): Layer[] {
  // A caver abseils down the shaft, switches on their head torch, and the
  // passage reveals itself from the light outwards.
  const rope: Pt[] = sample(40, (u) => [100 + 3 * Math.sin((6 + u * 56) / 5), 6 + u * 56]);
  const ropeD = path(rope);
  const passage = topoLevels(100, 76, 72, 6, 1.15, 0.42, [0, 0]).reverse();
  return [
    { d: "M62 6H138", ink: "strong", width: 2.2, round: true, motion: draw(0, 0.3) },
    { d: ropeD, ink: "strong", width: 1.8, round: true, motion: draw(0.3, 0.9) },
    { d: circle(102, 66, 10), ink: "glow", motion: stamp(1.25, 0.35) },
    ...passage.map((d, i): Layer => ({ d, ink: "line", width: 1.6, motion: draw(1.45 + i * 0.16, 0.45) })),
    { d: circle(0, 0, 3.6), ink: "strong", motion: follow(ropeD, 0.3, 0.9) },
  ];
}

function lumpyLoss(): Layer[] {
  // Two minima. The landscape fills in level by level from its lowest point,
  // then a ball rolls down with momentum, leaving its gradient steps behind,
  // gets caught in the shallow minimum, and escapes to the deep one.
  const loss = (x: number, y: number) =>
    0.35 * (x * x + 1.6 * y * y) -
    1.0 * Math.exp(-((x - 0.65) ** 2 + (y + 0.15) ** 2) / 0.18) -
    0.6 * Math.exp(-((x + 0.7) ** 2 + (y - 0.3) ** 2) / 0.12) +
    0.06 * Math.sin(3 * x) * Math.cos(2 * y);
  const px = (x: number) => 100 + x * 60;
  const py = (y: number) => 70 - y * 60;

  const [nx, ny, x0, y1] = [90, 60, -1.55, 1.1];
  const [dx, dy] = [3.1 / nx, 2.2 / ny];
  const grid = Array.from({ length: ny + 1 }, (_, j) =>
    Array.from({ length: nx + 1 }, (_, i) => loss(x0 + i * dx, y1 - j * dy)),
  );
  const levels: string[] = [];
  for (let level = -0.74; level < 0.62; level += 0.11) {
    let segs = "";
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const corners: Pt[] = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
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
        for (let q = 0; q + 1 < cuts.length; q += 2) segs += path([cuts[q], cuts[q + 1]]);
      }
    }
    if (segs) levels.push(segs);
  }

  const grad = (x: number, y: number): Pt => {
    const h = 1e-4;
    return [(loss(x + h, y) - loss(x - h, y)) / (2 * h), (loss(x, y + h) - loss(x, y - h)) / (2 * h)];
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
  const descentD = path(pts);
  const [from, span] = [1.2, 2.6];
  // When the ball is deepest in the shallow minimum.
  const caught = steps.reduce(
    (best, [sx, sy], i) => {
      const d = Math.hypot(sx + 0.7, sy - 0.3);
      return d < best.d ? { d, i } : best;
    },
    { d: Infinity, i: 0 },
  ).i;

  return [
    ...levels.map((d, i): Layer => ({ d, ink: "line", width: 1.5, motion: fade(i * 0.08, 0.3) })),
    { d: circle(px(-0.7), py(0.3), 8), ink: "line", width: 2.4, motion: stamp(from + span * at[caught]) },
    { d: circle(px(0.62), py(-0.14), 9), ink: "glow", motion: stamp(from + span - 0.05, 0.35) },
    { d: circle(pts[0][0], pts[0][1], 4), ink: "strong", width: 2.2, motion: stamp(from - 0.15) },
    { d: descentD, ink: "strong", width: 1.6, round: true, motion: draw(from, span) },
    ...pts
      .map((p, i) => ({ p, i }))
      .filter(({ i }) => i > 0 && i % 9 === 0)
      .map(({ p, i }): Layer => ({ d: circle(p[0], p[1], 1.9), ink: "strong", motion: stamp(from + span * at[i] - 0.03, 0.12) })),
    { d: circle(0, 0, 4.4), ink: "strong", motion: follow(descentD, from, span) },
  ];
}

function dayworks(): Print {
  // Brief the day, book the hours, sign off the diary. The sheet and its
  // hours appear, each worker's row is booked through the day in turn (with
  // any unallocated hours flagged as soon as the row is done), then the diary
  // is signed, stamped and locked.
  const [cols, rows, gx, gy, cw, rh] = [10, 7, 40, 36, 44, 36];
  const spans: Pt[][] = [
    [[0, 4], [4, 10]],
    [[0, 6], [6, 10]],
    [[0, 3], [3, 8]],
    [[0, 10]],
    [[0, 2], [2, 7], [7, 10]],
    [[0, 5]],
    [[1, 10]],
  ];
  const [bookFrom, perRow, rowGap] = [0.75, 0.35, 0.42];
  let grid = "";
  for (let r = 0; r <= rows; r++) grid += `M${gx} ${gy + r * rh}h${cols * cw}`;
  for (let c = 0; c <= cols; c++) grid += `M${gx + c * cw} ${gy}v${rows * rh}`;

  const layers: Layer[] = [{ d: grid, ink: "line", width: 1.6, motion: draw(0, 0.5) }];
  spans.forEach((row, r) => {
    const rowStart = bookFrom + r * rowGap;
    const y = gy + r * rh + rh / 2;
    const booked = new Set<number>();
    row.forEach(([s, e]) => {
      for (let h = s; h < e; h++) booked.add(h);
      layers.push({
        d: `M${gx + s * cw + 12} ${y}H${gx + e * cw - 12}`,
        ink: "strong",
        width: 15,
        round: true,
        motion: draw(rowStart + (perRow * s) / cols, (perRow * (e - s)) / cols),
      });
    });
    let gap = 0;
    for (let h = 0; h < cols; h++) {
      if (booked.has(h)) continue;
      layers.unshift({
        d: rect(gx + h * cw + 4, gy + r * rh + 4, cw - 8, rh - 8),
        ink: "glow",
        motion: stamp(rowStart + perRow + 0.03 + gap++ * 0.03, 0.18),
      });
    }
  });

  const signFrom = bookFrom + rows * rowGap + 0.05;
  const signature = path(
    sample(160, (u) => [40 + 160 * u + 7 * Math.cos(u * 26), 316 - 8 * Math.sin(u * 26) * (0.6 + 0.4 * Math.sin(u * 5))]),
  );
  const stampAt = signFrom + 0.6;
  layers.push(
    { d: signature, ink: "strong", width: 2, round: true, motion: draw(signFrom, 0.5) },
    { d: "M36 332H232", ink: "line", width: 1.4, motion: draw(signFrom - 0.1, 0.2) },
    { d: circle(452, 282, 34), ink: "glow", motion: stamp(stampAt, 0.35) },
    { d: circle(452, 282, 42), ink: "line", width: 4.5, motion: stamp(stampAt, 0.35) },
    { d: "M434 283L447 296L472 266", ink: "line", width: 4.5, round: true, motion: draw(stampAt + 0.25, 0.2) },
    { d: rect(372, 314, 20, 16), ink: "strong", width: 2.4, knockout: true, motion: stamp(stampAt + 0.4, 0.25) },
    { d: "M376 314v-6a6 6 0 0 1 12 0v6", ink: "strong", width: 2.4, round: true, motion: draw(stampAt + 0.55, 0.2) },
  );

  return {
    width: 520,
    height: 340,
    layers,
    labels: Array.from({ length: cols }, (_, c) => ({
      x: gx + c * cw + cw / 2,
      y: 27,
      text: String(7 + c).padStart(2, "0"),
      size: 12,
      weight: 700,
      anchor: "middle" as const,
      tone: "muted" as const,
      motion: fade(0.3 + c * 0.035, 0.15),
    })),
  };
}

/* ---------- More stories ---------- */

function gears(): Print {
  // An engineering drawing: centre lines and pitch circles first, then the
  // teeth, then the numbers. The gears turn with the scroll throughout.
  const [bx, by, sx, sy] = [84, 72, 146, 98];
  return {
    width: 200,
    height: 140,
    layers: [
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
    labels: [
      { x: 8, y: 18, text: "12 teeth", size: 11, weight: 700, tone: "muted", motion: slide(1.7) },
      { x: 194, y: 134, text: "8 teeth", size: 11, weight: 700, tone: "muted", anchor: "end", motion: slide(1.85) },
      { x: 194, y: 22, text: "1.5 : 1", size: 14, weight: 800, tone: "strong", anchor: "end", motion: stamp(2.0) },
    ],
  };
}

function iter(): Layer[] {
  // The plasma ignites and its flux surfaces ripple outwards, a particle
  // laps one of them, then the first wall goes up around it and the forces
  // on it are worked out one by one.
  const [cx, cy, s] = [98, 70, 40];
  const surfaces = [0.22, 0.36, 0.5, 0.64, 0.78];
  const wall = sample(20, (u) => {
    const y = K0 * 0.95 * Math.sin(u * TAU);
    return [cx + (C0 + 0.95 * Math.cos(u * TAU) - T0 * y * y) * s, cy - y * s] as Pt;
  }).slice(0, 20);
  const centre: Pt = [cx + C0 * s, cy];
  const arrows = wall
    .filter((_, i) => i % 2 === 0)
    .map(([x, y]) => {
      const [dx, dy] = [x - centre[0], y - centre[1]];
      const len = Math.hypot(dx, dy) || 1;
      const [ux, uy] = [dx / len, dy / len];
      const [hx, hy] = [-uy, ux];
      const [x1, y1, x2, y2] = [x + 3 * ux, y + 3 * uy, x + 13 * ux, y + 13 * uy];
      return `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}M${f(x2 - 4 * ux + 3 * hx)} ${f(y2 - 4 * uy + 3 * hy)}L${f(x2)} ${f(y2)}L${f(x2 - 4 * ux - 3 * hx)} ${f(y2 - 4 * uy - 3 * hy)}`;
    });
  return [
    { d: fluxSurface(cx, cy, s, 0.36), ink: "glow", motion: stamp(0.05, 0.35) },
    ...surfaces.map((r, i): Layer => ({ d: fluxSurface(cx, cy, s, r), ink: "line", width: 1.6, motion: draw(0.25 + i * 0.15, 0.35) })),
    { d: circle(0, 0, 2.8), ink: "strong", motion: follow(fluxSurface(cx, cy, s, 0.64), 0.5, 1.4) },
    { d: fluxSurface(cx, cy, s, 0.95), ink: "strong", width: 4, motion: draw(1.1, 0.7) },
    ...arrows.map((d, i): Layer => ({ d, ink: "line", width: 1.6, round: true, motion: stamp(1.85 + i * 0.07, 0.2) })),
  ];
}

function firstJob(): Layer[] {
  // An editor opens, the code types itself line by line, a line gets
  // selected, and it runs.
  const rows: Pt[] = [[0, 70], [1, 52], [1, 84], [2, 46], [2, 64], [1, 34], [0, 18]];
  return [
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
      d: `M${30 + 18 + 4} ${40 + 6 * 12 + 4}v-8`,
      ink: "line",
      width: 2.2,
      round: true,
      motion: { kind: "blink", cycles: 4, delay: 0.55 + 7 * 0.18, duration: 0.1 },
    },
    { d: circle(164, 106, 11), ink: "glow", motion: stamp(2.3) },
    { d: "M158 106l4 4l8 -9", ink: "strong", width: 2.4, round: true, motion: draw(2.4, 0.2) },
  ];
}

function laserPlasma(): Print {
  // A laser pulse travels down the beam and hits an electron, which spirals
  // in, throwing off radiation-reaction photons, into a tight focal spot.
  let waves = "";
  for (let j = 0; j < 3; j++) {
    waves += path(sample(80, (u) => [u * 110, 46 + j * 16 + 5 * Math.sin((u * 110) / 5)]));
  }
  const spiral = sample(260, (u) => {
    const [th, rho] = [u * 24, 22 * (1 - 0.72 * u)];
    return [100 + u * 82 + rho * Math.cos(th), 70 - u * 12 + 0.6 * rho * Math.sin(th)] as Pt;
  });
  const spiralD = path(spiral);
  const at = arcFractions(spiral);
  const [from, span] = [0.9, 1.4];
  const photon = path(sample(20, (u) => [u * 14 - 7, 2.2 * Math.sin(u * 14 * 1.3)]));
  const emitted = [0.25, 0.45, 0.65, 0.85].map((fraction) => {
    const i = at.findIndex((a) => a >= fraction);
    const [x, y] = spiral[i];
    return { along: `M${f(x)} ${f(y)}L${f(x + 8)} ${f(y - 32)}`, delay: from + span * at[i] };
  });
  const end = spiral[spiral.length - 1];
  return {
    width: 200,
    height: 140,
    layers: [
      { d: circle(end[0] + 2, end[1] - 2, 9), ink: "glow", motion: stamp(from + span - 0.05, 0.35) },
      { d: waves, ink: "line", width: 1.8, motion: draw(0, 0.6) },
      {
        d: "M-12 0a12 7 0 1 0 24 0a12 7 0 1 0 -24 0",
        ink: "glow",
        motion: follow("M0 62H100", 0.3, 0.6, { vanish: true }),
      },
      { d: spiralD, ink: "strong", width: 1.8, round: true, motion: draw(from, span) },
      ...emitted.map(({ along, delay }): Layer => ({
        d: photon,
        ink: "line",
        width: 1.6,
        round: true,
        motion: follow(along, delay, 0.45, { turn: true, vanish: true }),
      })),
      { d: circle(0, 0, 3.2), ink: "strong", motion: follow(spiralD, from, span) },
    ],
    labels: [{ x: 150, y: 26, text: "γ", size: 22, weight: 600, tone: "strong", symbol: true, motion: fade(emitted[0].delay, 0.2) }],
  };
}

function customsConnect(): Layer[] {
  // Declarations arrive, each runs through a serverless function on its way
  // to customs (lighting the function up as it runs), and customs signs off.
  const docs = [36, 70, 104];
  const xs = [78, 102, 126];
  const ys = [46, 70, 94];
  const requests: [number, number, number][] = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 2, 0], [1, 0, 1], [2, 1, 2]];
  const [from, gap, span] = [0.7, 0.25, 1.1];
  const doc = (y: number) => rect(14, y - 10, 16, 20) + `M18 ${y - 3}h8M18 ${y + 2}h8M18 ${y + 6}h5`;
  const done = from + gap * (requests.length - 1) + span;
  return [
    ...requests.map(([, i, j], n): Layer => {
      const route: Pt[] = [[32, docs[requests[n][0]]], [xs[i], ys[j]], [163, 70]];
      const at = arcFractions(route);
      return { d: rect(xs[i] - 7, ys[j] - 7, 14, 14), ink: "glow", motion: stamp(from + gap * n + span * at[1] - 0.04, 0.2) };
    }),
    ...docs.map((y, i): Layer => ({ d: doc(y), ink: "line", width: 1.4, motion: stamp(i * 0.08, 0.25) })),
    {
      d: xs.flatMap((x) => ys.map((y) => rect(x - 8, y - 8, 16, 16))).join(""),
      ink: "line",
      width: 1.5,
      motion: fade(0.3, 0.4),
    },
    { d: circle(176, 70, 13), ink: "strong", width: 2.4, motion: draw(0.4, 0.4) },
    ...requests.map(([d, i, j], n): Layer => ({
      d: circle(0, 0, 3.2),
      ink: "strong",
      motion: follow(path([[32, docs[d]], [xs[i], ys[j]], [163, 70]]), from + gap * n, span, { vanish: true }),
    })),
    { d: "M169 70l5 5l9 -10", ink: "strong", width: 2.4, round: true, motion: draw(done, 0.25) },
  ];
}

function essentialsToPremium(): Layer[] {
  // A phone app for individuals, then its much bigger business sibling,
  // whose table fills up row by row.
  const rows = [62, 48, 70, 40, 56];
  return [
    { d: rect(20, 56, 32, 8), ink: "glow", motion: stamp(0.9) },
    { d: rect(16, 30, 40, 80) + "M30 36h12", ink: "line", width: 2.2, motion: draw(0, 0.5) },
    { d: rect(22, 44, 28, 8) + "M24 60h26M24 70h20M24 80h24", ink: "strong", width: 2.2, round: true, motion: draw(0.4, 0.4) },
    { d: "M60 70H71M67 66l4 4l-4 4", ink: "line", width: 1.8, round: true, motion: draw(1.0, 0.25) },
    { d: rect(76, 16, 110, 96) + "M76 27H186M100 27V112", ink: "strong", width: 2.2, motion: draw(1.2, 0.5) },
    { d: circle(82, 21.5, 1.6) + circle(88, 21.5, 1.6) + circle(94, 21.5, 1.6), ink: "strong", width: 1.2, motion: fade(1.6, 0.2) },
    { d: "M82 38h12M82 48h10M82 58h12", ink: "line", width: 3, round: true, motion: draw(1.6, 0.3) },
    { d: rect(104, 64, 78, 12), ink: "glow", motion: stamp(2.55) },
    ...rows.map((len, i): Layer => ({
      d: `M108 ${42 + i * 14}h${len}`,
      ink: "strong",
      width: 3.4,
      round: true,
      motion: draw(1.8 + i * 0.13, 0.22),
    })),
  ];
}

function devSync(): Layer[] {
  // Three teammates each throw a snippet into the shared library, someone
  // searches, and the match lights up.
  const people = [38, 74, 110];
  const cards = [46, 76, 106];
  const card = rect(-52, -12, 104, 24) + "M-44 -3h40M-44 4h58";
  return [
    { d: rect(70, 62, 108, 28), ink: "glow", motion: stamp(2.2) },
    ...people.map((y, i): Layer => ({
      d: circle(22, y - 6, 5) + `M13 ${y + 9}Q22 ${y - 2} 31 ${y + 9}`,
      ink: "strong",
      width: 1.8,
      motion: stamp(i * 0.1, 0.25),
    })),
    { d: rect(62, 10, 124, 18), ink: "line", width: 1.8, motion: draw(0.1, 0.4) },
    { d: circle(72, 19, 4) + "M75 22l4 4", ink: "strong", width: 1.6, round: true, motion: stamp(0.45) },
    ...people.map((y, i): Layer => ({
      d: card,
      ink: i === 1 ? "strong" : "line",
      width: 2,
      round: true,
      motion: follow(`M34 ${y}L124 ${cards[i]}`, 0.5 + i * 0.3, 0.5),
    })),
    { d: "M84 19h40", ink: "strong", width: 2.4, round: true, motion: draw(1.65, 0.4) },
  ];
}

function codeMop(): Layer[] {
  // A pull request diff appears, the mop sweeps back and forth down it and
  // wipes out the removed lines, and the review is approved.
  const rows: { len: number; added: boolean }[] = [
    { len: 74, added: false }, { len: 96, added: true }, { len: 58, added: false },
    { len: 110, added: true }, { len: 84, added: true }, { len: 46, added: false },
  ];
  const y = (i: number) => 24 + i * 18;
  const sweep: Pt[] = [];
  rows.forEach((_, i) => sweep.push([36, y(i) - 4], [160, y(i) + 4]));
  const at = arcFractions(sweep);
  const [from, span] = [1.0, 1.7];
  const mop = "M-14 -2Q0 -10 14 -2L12 8Q0 3 -12 8Z";
  return [
    ...rows.map((row, i): Layer => ({
      d: `M44 ${y(i)}h${row.len}M18 ${y(i)}h12` + (row.added ? `M24 ${y(i) - 6}v12` : ""),
      ink: row.added ? "strong" : "line",
      width: 6,
      round: true,
      motion: draw(i * 0.12, 0.3),
    })),
    ...rows.flatMap((row, i): Layer[] =>
      row.added
        ? []
        : [{ d: `M12 ${y(i)}H${48 + row.len}`, ink: "paper", width: 11, round: true, motion: draw(from + span * at[2 * i], span * (at[2 * i + 1] - at[2 * i])) }],
    ),
    { d: mop, ink: "glow", motion: follow(path(sweep), from, span, { vanish: true }) },
    { d: circle(176, 118, 12), ink: "glow", motion: stamp(from + span + 0.05) },
    { d: "M170 118l4.5 4.5l8.5 -10", ink: "strong", width: 2.6, round: true, motion: draw(from + span + 0.2, 0.25) },
  ];
}

function guitar(): Layer[] {
  // The strings are strung, then a plectrum strums down across them and each
  // one starts to vibrate, at its own harmonic, only once it's been plucked.
  const mids = [22, 54, 86, 118];
  const strum = "M170 6L156 134";
  const [from, span] = [1.0, 0.8];
  const plucked = (mid: number) => from + (span * (mid - 6)) / 128;
  return [
    ...mids.map((mid, i): Layer => ({ d: `M12 ${mid}H188`, ink: "strong", width: 0.8, motion: draw(i * 0.18, 0.4) })),
    ...mids.map((mid, i): Layer => {
      const h = i + 1;
      return {
        d: path(sample(80, (u) => [12 + 176 * u, mid - 11 * Math.sin(h * Math.PI * u)])),
        ink: h % 2 ? "line" : "strong",
        width: 1.8,
        motion: { kind: "vibrate", origin: [100, mid], cycles: 3 * h, delay: plucked(mid), duration: 0.35 },
      };
    }),
    { d: "M0 -7L6 4Q0 8 -6 4Z", ink: "line", motion: follow(strum, from, span, { vanish: true }) },
  ];
}

/* ---------- All prints ---------- */

const small = (layers: Layer[]): Print => ({ width: 200, height: 140, layers });

function buildPrints() {
  return {
    // How I got here
    gears: gears(),
    tokamak: small(iter()),
    crag: small(crag()),
    code: small(firstJob()),
    laser: laserPlasma(),
    onion: small(onion()),

    // Work
    classify: classification(),
    lanes: small(cqrs()),
    functions: small(customsConnect()),
    fibres: small(leaf()),
    grow: small(essentialsToPremium()),

    // Side projects
    dayworks: dayworks(),
    snippets: small(devSync()),
    diff: small(codeMop()),
    route: small(evRoute()),
    fleet: small(fleet()),

    // Outside work
    cave: small(cave()),
    strings: small(guitar()),
    loss: small(lumpyLoss()),
  } satisfies Record<string, Print>;
}

export const prints = buildPrints();
export type PrintName = keyof typeof prints;

// Generative risograph prints, computed at build time.
//
// Each print is a few layers of SVG path data, each in one of three inks:
// "line" (fluorescent pink), "strong" (blue) or "glow" (yellow). Inks
// overprint each other (see .ink in global.css), and every print is drawn
// from a small piece of maths tied to the work it sits beside.
//
// Layers can also carry a motion, driven by scrolling (see Print.astro):
// lines draw in as a print scrolls up the screen and undraw as it scrolls
// back, gears turn with the scroll, strings vibrate with it.

export type Ink = "line" | "strong" | "glow";

type Pt = [number, number];

export interface Motion {
  /**
   * draw: the stroke draws itself in. fade, slide, stamp: the layer appears.
   * These play out as the print scrolls from the bottom of the screen to
   * just above the middle, timed by delay and duration (in relative units).
   *
   * spin, vibrate, blink, emit: repeat as long as the print is being
   * scrolled past, `cycles` times per screen height of scrolling.
   */
  kind: "draw" | "fade" | "slide" | "stamp" | "spin" | "vibrate" | "blink" | "emit";
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
}

export interface Print {
  width: number;
  height: number;
  layers: Layer[];
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

/** Wobbly nested contours, like a topographic map. */
function topo(
  cx: number,
  cy: number,
  r0: number,
  levels: number,
  sx: number,
  sy: number,
  drift: Pt,
) {
  let d = "";
  for (let lv = 0; lv < levels; lv++) {
    const r = r0 * (1 - lv / levels) + r0 * 0.08;
    const [ox, oy] = [cx + lv * drift[0], cy + lv * drift[1]];
    d += path(
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
  }
  return d;
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
    topo: wide
      ? topo(300, 520, 360, 15, 1.3, 0.8, [9, -8])
      : topo(170, 690, 300, 14, 1.2, 0.8, [8, -9]),
    rings,
    wall: fluxSurface(cx, cy, s, 0.92),
    gyro: wide ? gyration(-60, 1340, 120, 0.16, 34, 20) : gyration(-60, 660, 120, 0.42, 28, 16),
    descent: fluxDescent(cx, cy, s),
    minimum: [cx + C0 * s, cy] as Pt,
  };
}

/* ---------- Prints ---------- */

function classificationTree(w: number, h: number, rootR: number, nodeR: number): Layer[] {
  // Chapter, heading, subheading: the strong-ink branch is the verified
  // answer, and each leaf's dot is sized by how confident a suggestion is.
  const curve = ([x1, y1]: Pt, [x2, y2]: Pt) => {
    const mx = (x1 + x2) / 2;
    return `C${f(mx)} ${f(y1)} ${f(mx)} ${f(y2)} ${f(x2)} ${f(y2)}`;
  };
  const link = (a: Pt, b: Pt) => `M${f(a[0])} ${f(a[1])}${curve(a, b)}`;
  const xs = [w * 0.08, w * 0.33, w * 0.58, w * 0.84];
  const root: Pt = [xs[0], h / 2];
  const l1: Pt[] = [0.2, 0.5, 0.8].map((v) => [xs[1], h * v]);
  const l2 = l1.flatMap((n, parent) =>
    [-0.09, 0.09].map((dy) => ({ p: [xs[2], n[1] + h * dy] as Pt, parent })),
  );
  const leaves = l2.flatMap((n, parent) =>
    [-0.04, 0.04].map((dy) => ({ p: [xs[3], n.p[1] + h * dy] as Pt, parent })),
  );
  const confidence = [0.2, 0.35, 0.1, 0.45, 0.25, 0.3, 0.55, 1, 0.15, 0.4, 0.3, 0.2];
  const chosen = { l1: 1, l2: 3, leaf: 7 };

  let branches = "";
  let nodes = "";
  let dots = "";
  l1.forEach((n, i) => {
    if (i === chosen.l1) return;
    branches += link(root, n);
    nodes += circle(n[0], n[1], nodeR);
  });
  l2.forEach((n, i) => {
    if (i === chosen.l2) return;
    branches += link(l1[n.parent], n.p);
    nodes += circle(n.p[0], n.p[1], nodeR);
  });
  leaves.forEach((n, i) => {
    if (i !== chosen.leaf) branches += link(l2[n.parent].p, n.p);
    dots += circle(n.p[0], n.p[1], nodeR + confidence[i] * nodeR * 2.6);
  });
  const pick = leaves[chosen.leaf].p;
  // One continuous path, so it traces from root to answer as it draws.
  const answer =
    `M${f(root[0])} ${f(root[1])}` +
    curve(root, l1[chosen.l1]) +
    curve(l1[chosen.l1], l2[chosen.l2].p) +
    curve(l2[chosen.l2].p, pick);
  const marks =
    circle(root[0], root[1], rootR) +
    circle(l1[chosen.l1][0], l1[chosen.l1][1], nodeR) +
    circle(l2[chosen.l2].p[0], l2[chosen.l2].p[1], nodeR) +
    circle(pick[0], pick[1], nodeR * 1.6);

  const big = w > 300;
  return [
    { d: dots, ink: "glow", motion: { kind: "fade", delay: 1.7, duration: 0.7 } },
    { d: branches, ink: "line", width: big ? 2 : 1.6, motion: { kind: "draw", duration: 1.3 } },
    { d: nodes, ink: "line", width: big ? 2 : 1.6, motion: { kind: "fade", delay: 0.8 } },
    { d: answer, ink: "strong", width: big ? 3.4 : 2.6, round: true, motion: { kind: "draw", delay: 0.6, duration: 1.3 } },
    { d: marks, ink: "strong", width: big ? 3.4 : 2.6, motion: { kind: "stamp", delay: 1.8, duration: 0.5 } },
  ];
}

function lumpyLoss(): Layer[] {
  // Two minima: gradient descent with momentum drops into the shallow one,
  // then rolls out into the deeper one. Contours by marching squares.
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
  let contours = "";
  for (let level = -0.74; level < 0.62; level += 0.11) {
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
        for (let q = 0; q + 1 < cuts.length; q += 2) contours += path([cuts[q], cuts[q + 1]]);
      }
    }
  }

  const grad = (x: number, y: number): Pt => {
    const h = 1e-4;
    return [(loss(x + h, y) - loss(x - h, y)) / (2 * h), (loss(x, y + h) - loss(x, y - h)) / (2 * h)];
  };
  let [x, y, vx, vy] = [-1.35, 0.85, 0, 0];
  const pts: Pt[] = [[px(x), py(y)]];
  for (let n = 0; n < 220; n++) {
    const [gx, gy] = grad(x, y);
    vx = 0.85 * vx - 0.06 * gx;
    vy = 0.85 * vy - 0.06 * gy;
    x += vx;
    y += vy;
    pts.push([px(x), py(y)]);
  }

  return [
    { d: circle(px(0.62), py(-0.14), 9), ink: "glow", motion: { kind: "stamp", delay: 2.7, duration: 0.5 } },
    { d: contours, ink: "line", width: 1.5, motion: { kind: "fade", duration: 0.8 } },
    { d: circle(px(-1.35), py(0.85), 4), ink: "strong", width: 2.4 },
    { d: path(pts), ink: "strong", width: 2.4, round: true, motion: { kind: "draw", delay: 0.4, duration: 2.4 } },
  ];
}

function dayworksSheet(): Layer[] {
  // A day's labour allocation: booked hours are bars, unallocated hours are
  // flagged, and the diary is stamped as signed off.
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
  let grid = "";
  for (let r = 0; r <= rows; r++) grid += `M${gx} ${gy + r * rh}h${cols * cw}`;
  for (let c = 0; c <= cols; c++) grid += `M${gx + c * cw} ${gy}v${rows * rh}`;
  let bars = "";
  let flagged = "";
  spans.forEach((row, r) => {
    const y = gy + r * rh + rh / 2;
    const booked = new Set<number>();
    row.forEach(([s, e]) => {
      bars += `M${gx + s * cw + 12} ${y}H${gx + e * cw - 12}`;
      for (let h = s; h < e; h++) booked.add(h);
    });
    for (let h = 0; h < cols; h++) {
      if (!booked.has(h)) flagged += rect(gx + h * cw + 4, gy + r * rh + 4, cw - 8, rh - 8);
    }
  });
  return [
    { d: flagged, ink: "glow", motion: { kind: "fade", delay: 2, duration: 0.5 } },
    { d: circle(452, 282, 34), ink: "glow", motion: { kind: "stamp", delay: 2.6, duration: 0.45 } },
    { d: grid, ink: "line", width: 1.6, motion: { kind: "draw", duration: 1 } },
    { d: bars, ink: "strong", width: 15, round: true, motion: { kind: "draw", delay: 0.5, duration: 1.6 } },
    {
      d: circle(452, 282, 42) + "M434 283L447 296L472 266",
      ink: "line",
      width: 4.5,
      round: true,
      motion: { kind: "stamp", delay: 2.6, duration: 0.45 },
    },
  ];
}

const small = (layers: Layer[]): Print => ({ width: 200, height: 140, layers });
const large = (layers: Layer[]): Print => ({ width: 520, height: 340, layers });

function buildPrints() {
  const routePts: Pt[] = [[54, 130], [66, 114], [60, 100], [76, 88], [72, 74], [86, 64], [94, 56]];

  const codeRows: Pt[] = [[0, 92], [1, 64], [1, 104], [2, 54], [2, 76], [1, 40], [0, 24]];
  let codeLine = "";
  let codeStrong = "";
  codeRows.forEach(([indent, len], i) => {
    const seg = `M${30 + indent * 16} ${26 + i * 14}h${len}`;
    if (i === 2) codeLine += seg;
    else codeStrong += seg;
  });

  let laser = "";
  for (let j = 0; j < 3; j++) {
    laser += path(sample(80, (u) => [u * 110, 46 + j * 16 + 5 * Math.sin((u * 110) / 5)]));
  }
  const spiral = sample(260, (u) => {
    const [th, rho] = [u * 24, 22 * (1 - 0.72 * u)];
    return [100 + u * 82 + rho * Math.cos(th), 70 - u * 12 + 0.6 * rho * Math.sin(th)];
  });
  // A radiation-reaction photon: a short wave packet thrown off the electron.
  const [px0, py0] = spiral[spiral.length - 1];
  const photon = path(
    sample(30, (u) => {
      const s = u * 18;
      return [px0 + 0.45 * s + 2.4 * Math.sin(s * 1.3) * 0.87, py0 - 0.87 * s + 2.4 * Math.sin(s * 1.3) * 0.45];
    }),
  );

  let tokRings = "";
  for (const r of [0.78, 0.64, 0.5, 0.36, 0.22]) tokRings += fluxSurface(98, 70, 44, r);

  const square = (x: number, y: number) => rect(x - 5, y - 5, 10, 10);

  let fnDots = "";
  let fnIdle = "";
  let fnFiring = "";
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 6; j++) {
      const [x, y] = [28 + i * 18, 25 + j * 18];
      fnDots += circle(x, y, 3.2);
      if ((i * 7 + j * 3) % 5 === 0) fnIdle += rect(x - 6, y - 6, 12, 12);
      if ((i + j * 2) % 7 === 0) fnFiring += circle(x, y, 7);
    }
  }

  let fibres = "";
  for (let i = 0; i < 7; i++) {
    const y0 = 18 + i * 17;
    fibres += path(
      sample(60, (u) => [10 + 112 * u, y0 + (70 - y0) * u * u + 3 * Math.sin(u * 12 + i) * (1 - u)]),
    );
  }
  const thread =
    path(sample(60, (u) => [122 + 74 * u, 70 + 5 * Math.sin(u * 14)])) +
    path(sample(60, (u) => [122 + 74 * u, 70 - 5 * Math.sin(u * 14)]));

  let removed = "";
  let added = "";
  ([[74, 0], [96, 1], [58, 0], [110, 1], [84, 1], [46, 0]] as Pt[]).forEach(([len, isAdd], i) => {
    const y = 26 + i * 18;
    if (isAdd) added += `M44 ${y}h${len}M18 ${y}h12M24 ${y - 6}v12`;
    else removed += `M44 ${y}h${len}M18 ${y}h12`;
  });

  const chargers: Pt[] = [[52, 96], [110, 62], [178, 24]];

  const depot: Pt = [100, 70];
  const stops: Pt[] = [[40, 30], [72, 20], [60, 62], [30, 104], [150, 30], [176, 70], [152, 112], [108, 122]];

  // Harmonics 1 to 4 of a string, each vibrating about its own rest line,
  // the nth harmonic n times as fast as the first.
  const harmonics: Layer[] = [];
  let restLines = "";
  for (let h = 1; h <= 4; h++) {
    const mid = 22 + (h - 1) * 32;
    restLines += `M12 ${mid}H188`;
    harmonics.push({
      d: path(sample(80, (u) => [12 + 176 * u, mid - 11 * Math.sin(h * Math.PI * u)])),
      ink: h % 2 ? "line" : "strong",
      width: 1.8,
      motion: { kind: "vibrate", origin: [100, mid], cycles: 3 * h },
    });
  }

  return {
    // How I got here
    gears: small([
      { d: circle(84, 72, 30), ink: "glow" },
      {
        d: gear(84, 72, 40, 6, 12, 0) + circle(84, 72, 11),
        ink: "line",
        width: 2,
        motion: { kind: "spin", origin: [84, 72], cycles: 1 },
      },
      {
        // 8 teeth against 12, so it turns 1.5 times as far the other way.
        d: gear(146, 98, 22, 5, 8, 0.45) + circle(146, 98, 5),
        ink: "strong",
        width: 2.2,
        round: true,
        motion: { kind: "spin", origin: [146, 98], cycles: 1.5, reverse: true },
      },
    ]),
    tokamak: small([
      { d: fluxSurface(98, 70, 44, 0.36), ink: "glow", motion: { kind: "fade", delay: 1.4, duration: 0.8 } },
      { d: tokRings, ink: "line", width: 1.6, motion: { kind: "draw", delay: 0.5, duration: 1.4 } },
      { d: fluxSurface(98, 70, 44, 0.95), ink: "strong", width: 4, motion: { kind: "draw", duration: 1.1 } },
    ]),
    crag: small([
      { d: topo(92, 80, 50, 8, 1.35, 0.78, [3, -3]), ink: "line", width: 1.5, motion: { kind: "draw", duration: 1.3 } },
      { d: path(routePts), ink: "strong", width: 2.2, round: true, motion: { kind: "draw", delay: 0.8, duration: 1.6 } },
      {
        d: routePts.slice(1).map(([x, y]) => circle(x, y, 2.5)).join(""),
        ink: "strong",
        width: 2.2,
        motion: { kind: "fade", delay: 2.2, duration: 0.5 },
      },
    ]),
    code: small([
      { d: rect(22, 46, 128, 16), ink: "glow", motion: { kind: "slide", delay: 1.4, duration: 0.4 } },
      { d: codeLine, ink: "line", width: 6, round: true, motion: { kind: "draw", delay: 0.5, duration: 0.6 } },
      { d: codeStrong, ink: "strong", width: 6, round: true, motion: { kind: "draw", duration: 1.2 } },
      { d: `M60 ${26 + 6 * 14 - 6}v12`, ink: "line", width: 3, round: true, motion: { kind: "blink", cycles: 4 } },
    ]),
    laser: small([
      { d: circle(184, 56, 9), ink: "glow", motion: { kind: "stamp", delay: 2.1, duration: 0.4 } },
      { d: laser, ink: "line", width: 1.8, motion: { kind: "draw", duration: 0.9 } },
      { d: path(spiral), ink: "strong", width: 1.8, round: true, motion: { kind: "draw", delay: 0.6, duration: 1.6 } },
      { d: photon, ink: "line", width: 1.6, round: true, motion: { kind: "emit", cycles: 3, to: [10, -40] } },
    ]),
    classifySmall: small(classificationTree(200, 140, 5, 3)),

    // Work
    classify: large(classificationTree(520, 340, 10, 6)),
    lanes: small([
      { d: rect(118, 28, 82, 24), ink: "glow", motion: { kind: "fade", delay: 1, duration: 0.5 } },
      {
        d: "M8 70L70 70M70 70C100 70 100 40 130 40L196 40M70 70C100 70 100 100 130 100L196 100",
        ink: "line",
        width: 2.4,
        motion: { kind: "draw", duration: 1.2 },
      },
      {
        d:
          square(146, 40) + square(168, 40) + square(190, 40) +
          circle(146, 100, 5) + circle(168, 100, 5) + circle(190, 100, 5),
        ink: "strong",
        width: 2.4,
        motion: { kind: "slide", delay: 1, duration: 0.6 },
      },
    ]),
    functions: small([
      { d: fnDots, ink: "glow", motion: { kind: "fade", duration: 0.6 } },
      { d: fnIdle, ink: "line", width: 1.8, motion: { kind: "fade", delay: 0.4, duration: 0.6 } },
      { d: fnFiring, ink: "strong", width: 2.4, motion: { kind: "blink", cycles: 3 } },
    ]),
    fibres: small([
      { d: circle(122, 70, 9), ink: "glow", motion: { kind: "stamp", delay: 1.2, duration: 0.4 } },
      { d: fibres, ink: "line", width: 1.8, motion: { kind: "draw", duration: 1.3 } },
      { d: thread, ink: "strong", width: 2.4, motion: { kind: "draw", delay: 1.2, duration: 1 } },
    ]),
    grow: small([
      { d: rect(88, 24, 88, 88), ink: "glow", motion: { kind: "fade", delay: 1.3, duration: 0.6 } },
      { d: rect(24, 66, 40, 40), ink: "line", width: 2.4, motion: { kind: "draw", duration: 0.7 } },
      {
        d: rect(80, 16, 88, 88) + "M94 40h58M94 56h44M94 72h64M94 88h36",
        ink: "strong",
        width: 2.4,
        round: true,
        motion: { kind: "draw", delay: 0.6, duration: 1 },
      },
    ]),

    // Side projects
    dayworks: large(dayworksSheet()),
    snippets: small([
      { d: rect(30, 26, 104, 62), ink: "glow", motion: { kind: "fade", duration: 0.5 } },
      { d: rect(30, 26, 104, 62) + rect(48, 42, 104, 62), ink: "line", width: 2.2, motion: { kind: "slide", delay: 0.2, duration: 0.6 } },
      {
        d: rect(66, 58, 104, 62) + "M80 78h44M90 92h54M80 106h30",
        ink: "strong",
        width: 4,
        round: true,
        motion: { kind: "slide", delay: 0.6, duration: 0.6 },
      },
    ]),
    diff: small([
      { d: "M128 126Q162 64 198 42L198 66Q168 88 142 130Z", ink: "glow", motion: { kind: "slide", delay: 1.4, duration: 0.5 } },
      { d: removed, ink: "line", width: 6, round: true, motion: { kind: "draw", duration: 0.8 } },
      { d: added, ink: "strong", width: 6, round: true, motion: { kind: "draw", delay: 0.6, duration: 0.9 } },
    ]),
    route: small([
      {
        d: chargers.map(([x, y]) => circle(x, y, 9)).join(""),
        ink: "glow",
        motion: { kind: "fade", delay: 1.8, duration: 0.5 },
      },
      {
        d: "M0 40C60 30 120 60 200 44M0 104C70 122 140 90 200 112M60 0C70 50 50 90 70 140M150 0C140 60 160 100 140 140",
        ink: "line",
        width: 1.6,
        motion: { kind: "draw", duration: 1.2 },
      },
      {
        d: path([[14, 122], [52, 96], [72, 72], [110, 62], [142, 40], [178, 24]]),
        ink: "strong",
        width: 2.6,
        round: true,
        motion: { kind: "draw", delay: 0.4, duration: 1.6 },
      },
      {
        d: chargers.map(([x, y]) => circle(x, y, 4.5)).join(""),
        ink: "strong",
        width: 2.6,
        motion: { kind: "stamp", delay: 1.8, duration: 0.4 },
      },
    ]),
    fleet: small([
      { d: rect(91, 61, 18, 18), ink: "glow", motion: { kind: "stamp", duration: 0.4 } },
      {
        d:
          path([depot, stops[2], stops[3], stops[0], stops[1], depot]) +
          path([depot, stops[4], stops[5], stops[6], stops[7], depot]),
        ink: "line",
        width: 2,
        motion: { kind: "draw", delay: 0.3, duration: 1.8 },
      },
      {
        d: stops.map(([x, y]) => circle(x, y, 5)).join(""),
        ink: "strong",
        width: 2.4,
        knockout: true,
        motion: { kind: "fade", delay: 0.2, duration: 0.6 },
      },
    ]),

    // Outside work
    cave: small([
      { d: circle(102, 66, 8), ink: "glow", motion: { kind: "blink", cycles: 2 } },
      { d: topo(100, 76, 72, 6, 1.15, 0.42, [0, 0]), ink: "line", width: 1.6, motion: { kind: "draw", duration: 1.4 } },
      {
        d: path(sample(40, (u) => [100 + 3 * Math.sin((6 + u * 56) / 5), 6 + u * 56])),
        ink: "strong",
        width: 2.2,
        round: true,
        motion: { kind: "draw", delay: 0.6, duration: 1.2 },
      },
    ]),
    strings: small([{ d: restLines, ink: "strong", width: 0.8 }, ...harmonics]),
    loss: small(lumpyLoss()),
  } satisfies Record<string, Print>;
}

export const prints = buildPrints();
export type PrintName = keyof typeof prints;

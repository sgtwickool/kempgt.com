// Generative risograph prints, computed at build time.
//
// Each print is a few layers of SVG path data, each in one of three inks:
// "line" (fluorescent pink), "strong" (blue) or "glow" (yellow). Inks
// overprint each other (see .ink in global.css), and every print is drawn
// from a small piece of maths tied to the work it sits beside.

export type Ink = "line" | "strong" | "glow";

export interface Layer {
  d: string;
  ink: Ink;
  /** Stroke width in viewBox units. Omit for a filled shape. */
  width?: number;
  round?: boolean;
  /** Fill the shape with the plate colour as well as stroking it. */
  knockout?: boolean;
}

export interface Print {
  width: number;
  height: number;
  layers: Layer[];
}

type Pt = [number, number];

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

/* ---------- Hero poster ---------- */

export function heroPoster() {
  const [cx, cy, s] = [900, 300, 205];
  let rings = "";
  for (let i = 1; i < 12; i++) rings += fluxSurface(cx, cy, s, 0.92 - i * 0.075);

  // A charged particle gyrating along a field line, drifting across the sheet.
  const gyro: Pt[] = [];
  for (let n = 0; n <= 2400; n++) {
    const t = n * 0.075;
    const bx = -60 + 7.4 * t;
    const by = 120 + 0.16 * bx;
    gyro.push([bx + 34 * Math.cos(t), by + 20 * Math.sin(t)]);
  }

  return {
    width: 1280,
    height: 660,
    topo: topo(300, 520, 360, 15, 1.3, 0.8, [9, -8]),
    rings,
    wall: fluxSurface(cx, cy, s, 0.92),
    gyro: path(gyro),
    descent: fluxDescent(cx, cy, s),
    minimum: [cx + C0 * s, cy] as Pt,
  };
}

/* ---------- Prints ---------- */

function classificationTree(w: number, h: number, rootR: number, nodeR: number): Layer[] {
  // Chapter, heading, subheading: the strong-ink branch is the verified
  // answer, and each leaf's dot is sized by how confident a suggestion is.
  const link = ([x1, y1]: Pt, [x2, y2]: Pt) => {
    const mx = (x1 + x2) / 2;
    return `M${f(x1)} ${f(y1)}C${f(mx)} ${f(y1)} ${f(mx)} ${f(y2)} ${f(x2)} ${f(y2)}`;
  };
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

  let a = "";
  let b = "";
  let glow = "";
  l1.forEach((n, i) => {
    if (i === chosen.l1) b += link(root, n);
    else a += link(root, n) + circle(n[0], n[1], nodeR);
  });
  l2.forEach((n, i) => {
    const edge = link(l1[n.parent], n.p);
    if (i === chosen.l2) b += edge;
    else a += edge + circle(n.p[0], n.p[1], nodeR);
  });
  leaves.forEach((n, i) => {
    const edge = link(l2[n.parent].p, n.p);
    if (i === chosen.leaf) b += edge;
    else a += edge;
    glow += circle(n.p[0], n.p[1], nodeR + confidence[i] * nodeR * 2.6);
  });
  const pick = leaves[chosen.leaf].p;
  b +=
    circle(root[0], root[1], rootR) +
    circle(l1[chosen.l1][0], l1[chosen.l1][1], nodeR) +
    circle(l2[chosen.l2].p[0], l2[chosen.l2].p[1], nodeR) +
    circle(pick[0], pick[1], nodeR * 1.6);

  return [
    { d: glow, ink: "glow" },
    { d: a, ink: "line", width: w > 300 ? 2 : 1.6 },
    { d: b, ink: "strong", width: w > 300 ? 3.4 : 2.6, round: true },
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
    { d: circle(px(0.62), py(-0.14), 9), ink: "glow" },
    { d: contours, ink: "line", width: 1.5 },
    { d: path(pts) + circle(px(-1.35), py(0.85), 4), ink: "strong", width: 2.4, round: true },
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
    { d: flagged + circle(452, 282, 34), ink: "glow" },
    { d: grid, ink: "line", width: 1.6 },
    { d: bars, ink: "strong", width: 15, round: true },
    { d: circle(452, 282, 42) + "M434 283L447 296L472 266", ink: "line", width: 4.5, round: true },
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
  codeLine += `M60 ${26 + 6 * 14 - 6}v12`;

  let laser = "";
  for (let j = 0; j < 3; j++) {
    laser += path(sample(80, (u) => [u * 110, 46 + j * 16 + 5 * Math.sin((u * 110) / 5)]));
  }
  const spiral = sample(260, (u) => {
    const [th, rho] = [u * 24, 22 * (1 - 0.72 * u)];
    return [100 + u * 82 + rho * Math.cos(th), 70 - u * 12 + 0.6 * rho * Math.sin(th)];
  });

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

  let strA = "";
  let strB = "";
  for (let h = 1; h <= 4; h++) {
    const mid = 22 + (h - 1) * 32;
    const envelope =
      path(sample(80, (u) => [12 + 176 * u, mid - 11 * Math.sin(h * Math.PI * u)])) +
      path(sample(80, (u) => [12 + 176 * u, mid + 11 * Math.sin(h * Math.PI * u)]));
    if (h % 2) strA += envelope;
    else strB += envelope;
  }

  return {
    // How I got here
    gears: small([
      { d: circle(84, 72, 30), ink: "glow" },
      { d: gear(84, 72, 40, 6, 12, 0) + circle(84, 72, 11), ink: "line", width: 2 },
      { d: gear(146, 98, 22, 5, 8, 0.45) + circle(146, 98, 5), ink: "strong", width: 2.2, round: true },
    ]),
    tokamak: small([
      { d: fluxSurface(98, 70, 44, 0.36), ink: "glow" },
      { d: tokRings, ink: "line", width: 1.6 },
      { d: fluxSurface(98, 70, 44, 0.95), ink: "strong", width: 4 },
    ]),
    crag: small([
      { d: topo(92, 80, 50, 8, 1.35, 0.78, [3, -3]), ink: "line", width: 1.5 },
      {
        d: path(routePts) + routePts.slice(1).map(([x, y]) => circle(x, y, 2.5)).join(""),
        ink: "strong",
        width: 2.2,
        round: true,
      },
    ]),
    code: small([
      { d: rect(22, 46, 128, 16), ink: "glow" },
      { d: codeLine, ink: "line", width: 6, round: true },
      { d: codeStrong, ink: "strong", width: 6, round: true },
    ]),
    laser: small([
      { d: circle(184, 56, 9), ink: "glow" },
      { d: laser, ink: "line", width: 1.8 },
      { d: path(spiral), ink: "strong", width: 1.8, round: true },
    ]),
    classifySmall: small(classificationTree(200, 140, 5, 3)),

    // Work
    classify: large(classificationTree(520, 340, 10, 6)),
    lanes: small([
      { d: rect(118, 28, 82, 24), ink: "glow" },
      { d: "M70 70C100 70 100 40 130 40L196 40M70 70C100 70 100 100 130 100L196 100", ink: "line", width: 2.4 },
      {
        d:
          "M8 70L70 70" +
          square(146, 40) + square(168, 40) + square(190, 40) +
          circle(146, 100, 5) + circle(168, 100, 5) + circle(190, 100, 5),
        ink: "strong",
        width: 2.4,
      },
    ]),
    functions: small([
      { d: fnDots, ink: "glow" },
      { d: fnIdle, ink: "line", width: 1.8 },
      { d: fnFiring, ink: "strong", width: 2.4 },
    ]),
    fibres: small([
      { d: circle(122, 70, 9), ink: "glow" },
      { d: fibres, ink: "line", width: 1.8 },
      { d: thread, ink: "strong", width: 2.4 },
    ]),
    grow: small([
      { d: rect(88, 24, 88, 88), ink: "glow" },
      { d: rect(24, 66, 40, 40), ink: "line", width: 2.4 },
      { d: rect(80, 16, 88, 88) + "M94 40h58M94 56h44M94 72h64M94 88h36", ink: "strong", width: 2.4, round: true },
    ]),

    // Side projects
    dayworks: large(dayworksSheet()),
    snippets: small([
      { d: rect(30, 26, 104, 62), ink: "glow" },
      { d: rect(30, 26, 104, 62) + rect(48, 42, 104, 62), ink: "line", width: 2.2 },
      { d: rect(66, 58, 104, 62) + "M80 78h44M90 92h54M80 106h30", ink: "strong", width: 4, round: true },
    ]),
    diff: small([
      { d: "M128 126Q162 64 198 42L198 66Q168 88 142 130Z", ink: "glow" },
      { d: removed, ink: "line", width: 6, round: true },
      { d: added, ink: "strong", width: 6, round: true },
    ]),
    route: small([
      { d: chargers.map(([x, y]) => circle(x, y, 9)).join(""), ink: "glow" },
      {
        d: "M0 40C60 30 120 60 200 44M0 104C70 122 140 90 200 112M60 0C70 50 50 90 70 140M150 0C140 60 160 100 140 140",
        ink: "line",
        width: 1.6,
      },
      {
        d: path([[14, 122], [52, 96], [72, 72], [110, 62], [142, 40], [178, 24]]) +
          chargers.map(([x, y]) => circle(x, y, 4.5)).join(""),
        ink: "strong",
        width: 2.6,
        round: true,
      },
    ]),
    fleet: small([
      { d: rect(91, 61, 18, 18), ink: "glow" },
      {
        d:
          path([depot, stops[2], stops[3], stops[0], stops[1], depot]) +
          path([depot, stops[4], stops[5], stops[6], stops[7], depot]),
        ink: "line",
        width: 2,
      },
      { d: stops.map(([x, y]) => circle(x, y, 5)).join(""), ink: "strong", width: 2.4, knockout: true },
    ]),

    // Outside work
    cave: small([
      { d: circle(102, 66, 8), ink: "glow" },
      { d: topo(100, 76, 72, 6, 1.15, 0.42, [0, 0]), ink: "line", width: 1.6 },
      {
        d: path(sample(40, (u) => [100 + 3 * Math.sin((6 + u * 56) / 5), 6 + u * 56])),
        ink: "strong",
        width: 2.2,
        round: true,
      },
    ]),
    strings: small([
      { d: strA, ink: "line", width: 1.8 },
      { d: strB, ink: "strong", width: 1.8 },
    ]),
    loss: small(lumpyLoss()),
  } satisfies Record<string, Print>;
}

export const prints = buildPrints();
export type PrintName = keyof typeof prints;

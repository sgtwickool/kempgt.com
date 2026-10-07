// "What I build for fun": Dayworks and the other side projects.
import { draw, fade, follow, large, small, stamp } from "../build";
import { arcFractions, circle, path, rect, sample } from "../geometry";
import type { Label, Layer, Print, Pt } from "../types";

export function dayworks(): Print {
  // Brief the day, book the hours, sign off the diary. The sheet and its
  // hours appear, each worker's row is booked through the day in turn (with
  // any unallocated hours flagged as soon as the row is done), then the diary
  // is signed, stamped and locked.
  const [cols, rows, gx, gy, cw, rh] = [10, 7, 40, 36, 44, 36];
  // Each worker's booked hours, as [start, end) columns from 07:00.
  // prettier-ignore
  const booked: Pt[][] = [
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

  const flags: Layer[] = [];
  const bars: Layer[] = [];
  booked.forEach((spans, r) => {
    const rowStart = bookFrom + r * rowGap;
    const y = gy + r * rh + rh / 2;
    const hours = new Set<number>();
    for (const [s, e] of spans) {
      for (let h = s; h < e; h++) hours.add(h);
      bars.push({
        d: `M${gx + s * cw + 12} ${y}H${gx + e * cw - 12}`,
        ink: "strong",
        width: 15,
        round: true,
        motion: draw(rowStart + (perRow * s) / cols, (perRow * (e - s)) / cols),
      });
    }
    const gaps = Array.from({ length: cols }, (_, h) => h).filter((h) => !hours.has(h));
    gaps.forEach((h, n) =>
      flags.push({
        d: rect(gx + h * cw + 4, gy + r * rh + 4, cw - 8, rh - 8),
        ink: "glow",
        motion: stamp(rowStart + perRow + 0.03 * (n + 1), 0.18),
      }),
    );
  });

  const signedAt = bookFrom + rows * rowGap + 0.05;
  const stampedAt = signedAt + 0.6;
  const signature = path(
    sample(160, (u) => [
      40 + 160 * u + 7 * Math.cos(u * 26),
      316 - 8 * Math.sin(u * 26) * (0.6 + 0.4 * Math.sin(u * 5)),
    ]),
  );
  const hourLabels = Array.from({ length: cols }, (_, c): Label => ({
    x: gx + c * cw + cw / 2,
    y: 27,
    text: String(7 + c).padStart(2, "0"),
    size: 12,
    weight: 700,
    anchor: "middle",
    tone: "muted",
    motion: fade(0.3 + c * 0.035, 0.15),
  }));

  return large(
    [
      ...flags,
      { d: grid, ink: "line", width: 1.6, motion: draw(0, 0.5) },
      ...bars,
      { d: signature, ink: "strong", width: 2, round: true, motion: draw(signedAt, 0.5) },
      { d: "M36 332H232", ink: "line", width: 1.4, motion: draw(signedAt - 0.1, 0.2) },
      { d: circle(452, 282, 34), ink: "glow", motion: stamp(stampedAt, 0.35) },
      { d: circle(452, 282, 42), ink: "line", width: 4.5, motion: stamp(stampedAt, 0.35) },
      { d: "M434 283L447 296L472 266", ink: "line", width: 4.5, round: true, motion: draw(stampedAt + 0.25, 0.2) },
      // A padlock: the diary is locked.
      { d: rect(372, 314, 20, 16), ink: "strong", width: 2.4, knockout: true, motion: stamp(stampedAt + 0.4, 0.25) },
      {
        d: "M376 314v-6a6 6 0 0 1 12 0v6",
        ink: "strong",
        width: 2.4,
        round: true,
        motion: draw(stampedAt + 0.55, 0.2),
      },
    ],
    hourLabels,
  );
}

export function snippets(): Print {
  // DevSync. Three teammates each throw a snippet into the shared library,
  // someone searches, and the match lights up.
  const people = [38, 74, 110];
  const shelf = [46, 76, 106];
  const card = rect(-52, -12, 104, 24) + "M-44 -3h40M-44 4h58";
  return small([
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
      motion: follow(`M34 ${y}L124 ${shelf[i]}`, 0.5 + i * 0.3, 0.5),
    })),
    { d: "M84 19h40", ink: "strong", width: 2.4, round: true, motion: draw(1.65, 0.4) },
  ]);
}

export function mop(): Print {
  // CodeMop. A pull request diff appears, the mop sweeps back and forth down
  // it and wipes out the removed lines, and the review is approved.
  const diff = [
    { len: 74, added: false },
    { len: 96, added: true },
    { len: 58, added: false },
    { len: 110, added: true },
    { len: 84, added: true },
    { len: 46, added: false },
  ];
  const y = (i: number) => 24 + i * 18;
  const sweep = diff.flatMap((_, i): Pt[] => [
    [36, y(i) - 4],
    [160, y(i) + 4],
  ]);
  const at = arcFractions(sweep);
  const [from, span] = [1.0, 1.7];
  return small([
    ...diff.map((line, i): Layer => ({
      d: `M44 ${y(i)}h${line.len}M18 ${y(i)}h12` + (line.added ? `M24 ${y(i) - 6}v12` : ""),
      ink: line.added ? "strong" : "line",
      width: 6,
      round: true,
      motion: draw(i * 0.12, 0.3),
    })),
    // Removed lines are wiped out by paper-coloured strokes as the mop passes.
    ...diff.flatMap((line, i): Layer[] =>
      line.added
        ? []
        : [
            {
              d: `M12 ${y(i)}H${48 + line.len}`,
              ink: "paper",
              width: 11,
              round: true,
              motion: draw(from + span * at[2 * i], span * (at[2 * i + 1] - at[2 * i])),
            },
          ],
    ),
    {
      d: "M-14 -2Q0 -10 14 -2L12 8Q0 3 -12 8Z",
      ink: "glow",
      motion: follow(path(sweep), from, span, { vanish: true }),
    },
    { d: circle(176, 118, 12), ink: "glow", motion: stamp(from + span + 0.05) },
    { d: "M170 118l4.5 4.5l8.5 -10", ink: "strong", width: 2.6, round: true, motion: draw(from + span + 0.2, 0.25) },
  ]);
}

export function evRoute(): Print {
  // EV Route Optimizer. A car drives the planned route, and each charger
  // lights up as it arrives.
  // prettier-ignore
  const route: Pt[] = [
    [14, 122], [34, 112], [52, 96], [60, 82], [72, 72], [92, 66],
    [110, 62], [126, 52], [142, 40], [160, 30], [178, 24],
  ];
  const chargers = [2, 6, 10];
  const at = arcFractions(route);
  const [from, span] = [0.5, 2.1];
  const arrives = (i: number) => from + span * at[i] - 0.05;
  const routeD = path(route);
  return small([
    {
      // The road network.
      d: "M0 40C60 30 120 60 200 44M0 104C70 122 140 90 200 112M60 0C70 50 50 90 70 140M150 0C140 60 160 100 140 140",
      ink: "line",
      width: 1.6,
      motion: draw(0, 0.6),
    },
    ...chargers.map((i): Layer => ({ d: circle(route[i][0], route[i][1], 9), ink: "glow", motion: stamp(arrives(i)) })),
    { d: routeD, ink: "strong", width: 2.6, round: true, motion: draw(from, span) },
    ...chargers.map((i): Layer => ({
      d: circle(route[i][0], route[i][1], 4.5),
      ink: "strong",
      width: 2.4,
      knockout: true,
      motion: stamp(arrives(i), 0.2),
    })),
    { d: rect(-7, -4, 14, 8), ink: "line", motion: follow(routeD, from, span, { turn: true }) },
  ]);
}

export function fleet(): Print {
  // EV Fleet Platform. Two vans leave the depot together, and each stop is
  // ticked off as it's visited.
  const depot: Pt = [100, 70];
  // prettier-ignore
  const stops: Pt[] = [[40, 30], [72, 20], [60, 62], [30, 104], [150, 30], [176, 70], [152, 112], [108, 122]];
  const rounds = [
    [depot, stops[2], stops[3], stops[0], stops[1], depot],
    [depot, stops[4], stops[5], stops[6], stops[7], depot],
  ];
  const [from, span] = [0.5, 2.2];
  return small([
    { d: rect(91, 61, 18, 18), ink: "glow", motion: stamp(0) },
    ...stops.map(([x, y], i): Layer => ({
      d: circle(x, y, 4),
      ink: "line",
      width: 1.8,
      knockout: true,
      motion: stamp(0.1 + i * 0.04, 0.2),
    })),
    ...rounds.flatMap((round): Layer[] => {
      const at = arcFractions(round);
      const d = path(round);
      return [
        { d, ink: "line", width: 2, motion: draw(from, span) },
        ...round.slice(1, -1).map(([x, y], i): Layer => ({
          d: circle(x, y, 5.5),
          ink: "strong",
          width: 2.4,
          knockout: true,
          motion: stamp(from + span * at[i + 1] - 0.04, 0.2),
        })),
        { d: rect(-5, -4, 10, 8), ink: "strong", motion: follow(d, from, span, { turn: true }) },
      ];
    }),
  ]);
}

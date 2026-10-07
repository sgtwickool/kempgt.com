// "What I build at work": TariffTel 2.0 and the projects before it.
import { draw, fade, follow, large, slide, small, stamp } from "../build";
import { arcFractions, circle, num, path, rect, sample } from "../geometry";
import type { Label, Layer, Print, Pt } from "../types";

export function classification(): Print {
  // TariffTel 2.0. A cotton T-shirt is classified: the tree grows level by
  // level, then the answer is chosen one node at a time while the commodity
  // code builds up beside it, and each leaf's dot shows how confident a
  // suggestion was.
  const link = ([x1, y1]: Pt, [x2, y2]: Pt) => {
    const mx = num((x1 + x2) / 2);
    return `M${num(x1)} ${num(y1)}C${mx} ${num(y1)} ${mx} ${num(y2)} ${num(x2)} ${num(y2)}`;
  };

  const xs = [28, 125, 222, 319];
  const root: Pt = [xs[0], 170];
  const l1: Pt[] = [68, 170, 272].map((y) => [xs[1], y]);
  const l2 = l1.flatMap((p, parent) => [-30.6, 30.6].map((dy) => ({ p: [xs[2], p[1] + dy] as Pt, parent })));
  const leaves = l2.flatMap((n, parent) => [-13.6, 13.6].map((dy) => ({ p: [xs[3], n.p[1] + dy] as Pt, parent })));
  const confidence = [0.2, 0.35, 0.1, 0.45, 0.25, 0.3, 0.55, 1, 0.15, 0.4, 0.3, 0.2];
  const [n1, n2, n3] = [l1[1], l2[3].p, leaves[7].p]; // the chosen path

  const node = (p: Pt, delay: number): Layer => ({
    d: circle(p[0], p[1], 6),
    ink: "line",
    width: 2,
    knockout: true,
    motion: stamp(delay, 0.25),
  });
  const chosen = (p: Pt, r: number, delay: number): Layer => ({
    d: circle(p[0], p[1], r),
    ink: "strong",
    width: 3.4,
    motion: stamp(delay, 0.25),
  });
  const step = (a: Pt, b: Pt, delay: number): Layer => ({
    d: link(a, b),
    ink: "strong",
    width: 3.4,
    round: true,
    motion: draw(delay, 0.35),
  });
  const code = (y: number, text: string, caption: string, delay: number): Label[] => [
    { x: 362, y, text, size: 21, weight: 800, tone: "strong", motion: slide(delay, 0.3) },
    { x: 362, y: y + 17, text: caption, size: 13.5, tone: "muted", motion: slide(delay + 0.05, 0.3) },
  ];

  return large(
    [
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
      step(root, n1, 2.0),
      chosen(n1, 8.5, 2.33),
      step(n1, n2, 2.45),
      chosen(n2, 8.5, 2.78),
      step(n2, n3, 2.9),
      chosen(n3, 10, 3.23),
    ],
    [
      { x: 14, y: 144, text: "Cotton T-shirt", size: 15, weight: 700, tone: "ink", motion: fade(0, 0.3) },
      ...code(150, "61", "Knitted clothing", 2.38),
      ...code(198, "6109", "T-shirts", 2.83),
      ...code(246, "6109 10 00", "Of cotton", 3.28),
    ],
  );
}

export function cqrs(): Print {
  // Master Data Management. Requests flow in, the dispatcher splits them,
  // commands travel to the write store and queries to the read model.
  const toWrite = "M6 70H74C96 70 98 38 120 38H170";
  const toRead = "M6 70H74C96 70 98 102 120 102H168";
  const command = rect(-4.5, -4.5, 9, 9);
  const query = circle(0, 0, 4.6);
  return small([
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
      // The write store: a database.
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
    ...[0, 1, 2].map((i): Layer => ({
      d: command,
      ink: "strong",
      motion: follow(toWrite, 1.3 + i * 0.25, 0.9, { vanish: true }),
    })),
    ...[0, 1, 2].map((i): Layer => ({
      d: query,
      ink: "line",
      motion: follow(toRead, 1.42 + i * 0.25, 0.9, { vanish: true }),
    })),
  ]);
}

export function serverless(): Print {
  // Customs Connect. Declarations arrive, each runs through a serverless
  // function on its way to customs (lighting it up as it runs), and customs
  // signs off.
  const docs = [36, 70, 104];
  const xs = [78, 102, 126];
  const ys = [46, 70, 94];
  // [declaration, function column, function row] for each request.
  // prettier-ignore
  const requests = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 2, 0], [1, 0, 1], [2, 1, 2]];
  const [from, gap, span] = [0.7, 0.25, 1.1];
  const routes = requests.map(([d, i, j]): Pt[] => [
    [32, docs[d]],
    [xs[i], ys[j]],
    [163, 70],
  ]);
  const doc = (y: number) => rect(14, y - 10, 16, 20) + `M18 ${y - 3}h8M18 ${y + 2}h8M18 ${y + 6}h5`;
  const done = from + gap * (requests.length - 1) + span;
  return small([
    ...routes.map((route, n): Layer => {
      const [x, y] = route[1];
      const running = from + gap * n + span * arcFractions(route)[1];
      return { d: rect(x - 7, y - 7, 14, 14), ink: "glow", motion: stamp(running - 0.04, 0.2) };
    }),
    ...docs.map((y, i): Layer => ({ d: doc(y), ink: "line", width: 1.4, motion: stamp(i * 0.08, 0.25) })),
    {
      d: xs.flatMap((x) => ys.map((y) => rect(x - 8, y - 8, 16, 16))).join(""),
      ink: "line",
      width: 1.5,
      motion: fade(0.3, 0.4),
    },
    { d: circle(176, 70, 13), ink: "strong", width: 2.4, motion: draw(0.4, 0.4) },
    ...routes.map((route, n): Layer => ({
      d: circle(0, 0, 3.2),
      ink: "strong",
      motion: follow(path(route), from + gap * n, span, { vanish: true }),
    })),
    { d: "M169 70l5 5l9 -10", ink: "strong", width: 2.4, round: true, motion: draw(done, 0.25) },
  ]);
}

export function fibres(): Print {
  // LEAF. Fibre origins appear, their fibres converge and twist into a
  // thread, the thread becomes a garment, and the garment gets its tag.
  const origins = Array.from({ length: 7 }, (_, i): Pt => [12, 18 + i * 17]);
  const [hx, hy] = [118, 70];
  const thread =
    path(sample(30, (u) => [hx + 36 * u, hy + 4 * Math.sin(u * 9)])) +
    path(sample(30, (u) => [hx + 36 * u, hy - 4 * Math.sin(u * 9)]));
  return small([
    { d: circle(hx, hy, 9), ink: "glow", motion: stamp(1.1) },
    ...origins.map(([x, y], i): Layer => ({ d: circle(x, y, 3.2), ink: "strong", motion: stamp(i * 0.07, 0.2) })),
    ...origins.map(([x, y], i): Layer => ({
      d: path(sample(40, (u) => [x + (hx - x) * u, y + (hy - y) * u * u + 3 * Math.sin(u * 12 + i) * (1 - u)])),
      ink: "line",
      width: 1.8,
      motion: draw(0.2 + i * 0.07, 0.7),
    })),
    { d: thread, ink: "strong", width: 2.2, motion: draw(1.15, 0.4) },
    {
      // A T-shirt.
      d: "M160 52L168 47Q174 54 180 47L188 52L196 62L190 68L186 64V104H162V64L158 68L152 62Z",
      ink: "strong",
      width: 2.2,
      motion: draw(1.5, 0.8),
    },
    { d: "M166 92Q170 74 184 76Q182 92 166 92Z", ink: "glow", motion: stamp(2.3) },
    { d: "M169 89Q176 84 181 78", ink: "line", width: 1.6, round: true, motion: draw(2.45, 0.25) },
  ]);
}

export function appToPlatform(): Print {
  // TariffTel Essentials and Premium. A phone app for individuals, then its
  // much bigger business sibling, whose table fills up row by row.
  const tableRows = [62, 48, 70, 40, 56];
  return small([
    { d: rect(20, 56, 32, 8), ink: "glow", motion: stamp(0.9) },
    { d: rect(16, 30, 40, 80) + "M30 36h12", ink: "line", width: 2.2, motion: draw(0, 0.5) },
    {
      d: rect(22, 44, 28, 8) + "M24 60h26M24 70h20M24 80h24",
      ink: "strong",
      width: 2.2,
      round: true,
      motion: draw(0.4, 0.4),
    },
    { d: "M60 70H71M67 66l4 4l-4 4", ink: "line", width: 1.8, round: true, motion: draw(1.0, 0.25) },
    { d: rect(76, 16, 110, 96) + "M76 27H186M100 27V112", ink: "strong", width: 2.2, motion: draw(1.2, 0.5) },
    {
      d: circle(82, 21.5, 1.6) + circle(88, 21.5, 1.6) + circle(94, 21.5, 1.6),
      ink: "strong",
      width: 1.2,
      motion: fade(1.6, 0.2),
    },
    { d: "M82 38h12M82 48h10M82 58h12", ink: "line", width: 3, round: true, motion: draw(1.6, 0.3) },
    { d: rect(104, 64, 78, 12), ink: "glow", motion: stamp(2.55) },
    ...tableRows.map((len, i): Layer => ({
      d: `M108 ${42 + i * 14}h${len}`,
      ink: "strong",
      width: 3.4,
      round: true,
      motion: draw(1.8 + i * 0.13, 0.22),
    })),
  ]);
}

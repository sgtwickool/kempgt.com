import { fluxAxis, fluxDescent, fluxSurface, gyration, topoLevels } from "./shapes";

/**
 * The homepage poster: a climbing topo map, tokamak flux surfaces, a charged
 * particle gyrating along a field line, and a gradient-descent path to the
 * minimum. "wide" is the desktop composition; "tall" is recomposed for phones
 * rather than cropped, so the tokamak stays whole.
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
    minimum: fluxAxis(cx, cy, s),
  };
}

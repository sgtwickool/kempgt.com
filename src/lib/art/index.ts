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
import { crag, editor, gears, laser, onion, tokamak } from "./prints/how-i-got-here";
import { cave, guitar, loss } from "./prints/outside-work";
import { dayworks, evRoute, fleet, mop, snippets } from "./prints/side-projects";
import { appToPlatform, classification, cqrs, fibres, serverless } from "./prints/work";
import type { Print } from "./types";

export { heroPoster } from "./hero";
export type * from "./types";

/** Every print, in the order they appear on the homepage. */
export const prints = {
  // How I got here
  gears: gears(),
  tokamak: tokamak(),
  crag: crag(),
  editor: editor(),
  laser: laser(),
  onion: onion(),

  // What I build at work
  classification: classification(),
  cqrs: cqrs(),
  serverless: serverless(),
  fibres: fibres(),
  appToPlatform: appToPlatform(),

  // What I build for fun
  dayworks: dayworks(),
  snippets: snippets(),
  mop: mop(),
  evRoute: evRoute(),
  fleet: fleet(),

  // Outside work
  cave: cave(),
  guitar: guitar(),
  loss: loss(),
} satisfies Record<string, Print>;

export type PrintName = keyof typeof prints;

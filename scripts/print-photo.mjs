// Prints the profile photo in the site's risograph inks: blue in the
// shadows and pink in the midtones, slightly off register, with paper grain.
// Makes a light version (inks multiplied onto paper) and a dark one (lighter
// inks screened onto dark paper), to match the two colour themes.
//
// Run `npm run photo` after replacing src/assets/profile.jpg.
import sharp from "sharp";

const source = "src/assets/profile.jpg";
const size = 600;

const themes = {
  light: {
    file: "src/assets/profile-print-light.webp",
    paper: [244, 244, 241],
    blue: [0, 120, 191],
    pink: [255, 72, 176],
    blend: "multiply",
    blueLevels: [0.35, 0.95],
  },
  dark: {
    file: "src/assets/profile-print-dark.webp",
    paper: [25, 28, 38],
    blue: [61, 159, 230],
    pink: [255, 92, 184],
    blend: "screen",
    blueLevels: [0.3, 0.85],
  },
};

const { data: grey } = await sharp(source)
  .resize(size, size)
  .greyscale()
  .normalise()
  .raw()
  .toBuffer({ resolveWithObject: true });

// Seeded noise, so the grain is the same every time the script runs.
let seed = 7;
const grain = Float32Array.from({ length: size * size }, () => {
  seed = (seed * 16807) % 2147483647;
  return (seed / 2147483647 - 0.5) * 0.16;
});

const clamp = (v) => Math.min(1, Math.max(0, v));
/** Rescale v so that lo..hi maps onto 0..1. */
const levels = (v, lo, hi) => clamp((v - lo) / (hi - lo));
/** Pixel index (dx, dy) away from i, held at the edges. */
const offset = (i, dx, dy) => {
  const x = Math.min(size - 1, Math.max(0, (i % size) - dx));
  const y = Math.min(size - 1, Math.max(0, Math.floor(i / size) - dy));
  return y * size + x;
};

for (const [name, theme] of Object.entries(themes)) {
  // On light paper ink goes where the photo is dark; on dark paper it goes
  // where the photo is light.
  const tone = (i) => (theme.blend === "multiply" ? 1 - grey[i] / 255 : grey[i] / 255);
  const pinkDensity = (i) => {
    const j = offset(i, 3, 2); // off register
    return clamp(levels(tone(j), 0.3, 0.85) * 0.6 + grain[j]);
  };
  const blueDensity = (i) => clamp(levels(tone(i), ...theme.blueLevels) + grain[i]);

  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    const inks = [
      [theme.pink, pinkDensity(i)],
      [theme.blue, blueDensity(i)],
    ];
    for (let c = 0; c < 3; c++) {
      let v = theme.paper[c] / 255;
      for (const [ink, density] of inks) {
        const k = ink[c] / 255;
        v = theme.blend === "multiply" ? v * (1 - density * (1 - k)) : 1 - (1 - v) * (1 - density * k);
      }
      pixels[i * 3 + c] = Math.round(v * 255);
    }
  }

  await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 90 })
    .toFile(theme.file);
  console.log(`${name}: ${theme.file}`);
}

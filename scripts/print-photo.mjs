// Prints the profile photo in the site's blue ink, with paper grain, like a
// one-colour risograph. Makes a light version (ink multiplied onto paper)
// and a dark one (a lighter ink screened onto dark paper), to match the two
// colour themes.
//
// Run `npm run photo` after replacing src/assets/profile.jpg.
import sharp from "sharp";

const source = "src/assets/profile.jpg";
const size = 600;

const themes = {
  light: {
    file: "src/assets/profile-print-light.webp",
    paper: [244, 244, 241],
    ink: [0, 120, 191],
    blend: "multiply",
  },
  dark: {
    file: "src/assets/profile-print-dark.webp",
    paper: [25, 28, 38],
    ink: [61, 159, 230],
    blend: "screen",
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

for (const [name, { file, paper, ink, blend }] of Object.entries(themes)) {
  const pixels = Buffer.alloc(size * size * 3);
  for (let i = 0; i < size * size; i++) {
    // On light paper ink goes where the photo is dark; on dark paper it goes
    // where the photo is light. The levels stretch the midtones a little.
    const tone = blend === "multiply" ? 1 - grey[i] / 255 : grey[i] / 255;
    const density = clamp((tone - 0.08) / 0.84 + grain[i]);
    for (let c = 0; c < 3; c++) {
      const [p, k] = [paper[c] / 255, ink[c] / 255];
      const v = blend === "multiply" ? p * (1 - density * (1 - k)) : 1 - (1 - p) * (1 - density * k);
      pixels[i * 3 + c] = Math.round(v * 255);
    }
  }

  await sharp(pixels, { raw: { width: size, height: size, channels: 3 } })
    .webp({ quality: 90 })
    .toFile(file);
  console.log(`${name}: ${file}`);
}

import { colorTuple } from "@/config/catalog";
import type { CoatPattern, PetView, SpeciesAndBreed } from "@/types/pet";

const W = 1400, H = 800;
function random(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rotation = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); c.fill(); }

export function createPetTexture(breed: SpeciesAndBreed, coat: CoatPattern, view: PetView) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const c = canvas.getContext("2d")!;
  const dog = breed.species === "dog", belly = view === "belly", long = breed.proceduralAppearance.furLength;
  const bodyY = breed.skeletonParams.proportions.torsoRadius.y * H;
  const headX = breed.skeletonParams.proportions.headRadius.x * W * .78;
  const tail = breed.skeletonParams.tailShape, ear = breed.skeletonParams.earShape;
  c.fillStyle = "#fff"; c.strokeStyle = "#fff"; c.lineCap = "round"; c.lineJoin = "round";
  // Each breed has its own tail, ear and paw silhouette before fur is added.
  c.lineWidth = tail === "plume" ? 79 : tail === "thick" ? 65 : 48;
  c.beginPath(); c.moveTo(1010, 420);
  if (tail === "curled") { c.bezierCurveTo(1210, 455, 1240, 235, 1110, 245); c.bezierCurveTo(1005, 255, 1070, 375, 1150, 320); }
  else if (tail === "short") { c.quadraticCurveTo(1130, 400, 1150, 360); }
  else { c.bezierCurveTo(1190, 475, 1300, 355, 1225, 245); c.quadraticCurveTo(1200, 205, 1160, 209); }
  c.stroke();
  if (belly) {
    ellipse(c, 510, 265, 73, 62, -.5); ellipse(c, 510, 535, 73, 62, .5);
    ellipse(c, 925, 253, 85, 65, -.45); ellipse(c, 925, 547, 85, 65, .45);
  } else {
    ellipse(c, 475, 481, 106, 58, -.08); ellipse(c, 915, 505, 112, 54, .08);
    if (dog) { ellipse(c, 430, 290, 70, 65); ellipse(c, 900, 285, 80, 65); }
  }
  ellipse(c, 735, 400, 353, bodyY); ellipse(c, 425, 400, 160, bodyY * .85); ellipse(c, 345, 400, headX, dog ? 119 : 123);
  if (dog) ellipse(c, 223, 400, 83, 77);
  if (ear === "floppy") {
    ellipse(c, 374, 285, 81, 55, .45); ellipse(c, 374, 515, 81, 55, -.45);
  } else {
    for (const sign of [-1, 1]) {
      const base = 400 + sign * 86, tip = 400 + sign * (ear === "lynx" ? 200 : dog ? 177 : 166);
      c.beginPath(); c.moveTo(246, base); c.quadraticCurveTo(236, (base + tip) / 2, 272, tip); c.quadraticCurveTo(321, tip + sign * -22, 349, base); c.closePath(); c.fill();
    }
  }
  const mask = c.getImageData(0, 0, W, H);
  const pixels = mask.data;
  const [base, light, dark] = [colorTuple(coat.proceduralPattern.colors[0]), colorTuple(coat.proceduralPattern.colors[1] ?? coat.baseTone), colorTuple(coat.proceduralPattern.colors[2] ?? coat.baseTone)];
  const kind = coat.proceduralPattern.kind;
  for (let y = 120; y < 680; y++) for (let x = 120; x < 1340; x++) {
    const index = (y * W + x) * 4;
    if (!pixels[index + 3]) continue;
    const bx = (x - 730) / 356, by = (y - 400) / bodyY;
    const hx = (x - 340) / headX, hy = (y - 400) / 124;
    const bodyDistance = bx * bx + by * by, headDistance = hx * hx + hy * hy;
    const d = Math.min(bodyDistance, headDistance, ((x - 431) / 162) ** 2 + ((y - 400) / (bodyY * .86)) ** 2);
    let hash = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    hash = Math.imul(hash ^ hash >>> 13, 1274126177); hash ^= hash >>> 16;
    const noise = (hash >>> 0) / 4294967295;
    let shade = .70 + Math.sqrt(Math.max(0, 1 - Math.min(d, 1))) * .32 + (400 - y) / 1800 + (noise - .5) * .09;
    if (x > 1070) shade = .76 + noise * .18 + Math.sin(y * .009) * .08;
    let patch = 0, pale = 0;
    const blotch = Math.sin(x * .014 + Math.cos(y * .014) * 2.8) + Math.sin(y * .019 + x * .004) * .8;
    if (kind === "tabby") patch = Math.max(0, Math.sin(x * .058 + Math.sin(y * .016) * 2.2)) ** 8 * .42 * Math.min(1, Math.abs(y - 410) / 65 + .2);
    if (kind === "calico") patch = blotch > .25 ? .93 : 0;
    if (kind === "tortoiseshell") patch = Math.max(0, Math.min(1, blotch * .7 + .3));
    if (kind === "tuxedo") patch = Math.abs(y - 400) < 105 && x > 260 ? .96 : 0;
    if (kind === "colorpoint") patch = Math.min(1, Math.max(0, (430 - x) / 210)) * .85 + (x > 1080 ? .7 : 0);
    if (kind === "sable") pale = Math.max(0, Math.min(.6, (y - 390) / 180));
    if (belly) pale = Math.max(pale, .8 * (1 - smooth(.55, 1.16, ((x - 730) / 280) ** 2 + ((y - 400) / (bodyY * .78)) ** 2)));
    if (dog && kind !== "solid") pale = Math.max(pale, .65 * (1 - smooth(190, 350, x)));
    for (let channel = 0; channel < 3; channel++) {
      let value = mix(base[channel]!, dark[channel]!, patch);
      if (kind === "calico" && patch > 0) value = blotch > 1.1 ? dark[channel]! : light[channel]! * .77;
      if (kind === "tortoiseshell") value = mix(base[channel]!, light[channel]!, patch * .8);
      value = mix(value, belly ? light[channel]! * .55 + base[channel]! * .2 + [245, 233, 214][channel]! * .25 : light[channel]!, pale);
      pixels[index + channel] = Math.max(0, Math.min(255, value * shade));
    }
  }
  c.putImageData(mask, 0, 0);
  const rand = random(coat.proceduralPattern.seed + breed.proceduralAppearance.seed);
  // Directional strands give volume and follow the anatomical flow of the coat.
  c.lineWidth = .65; c.lineCap = "round";
  for (let i = 0; i < 39_000; i++) {
    const x = 130 + rand() * 1190, y = 160 + rand() * 480, index = (Math.floor(y) * W + Math.floor(x)) * 4;
    if ((pixels[index + 3] ?? 0) < 200) continue;
    let angle = x < 440 ? Math.atan2((y - 400) * .7, x - 345) : Math.atan2((y - 400) * .55, 270);
    angle += (rand() - .5) * .55;
    const length = 2.5 + rand() * (3 + long * 11), highlight = rand() > .28;
    const r = pixels[index]!, g = pixels[index + 1]!, b = pixels[index + 2]!;
    const shift = highlight ? 27 + rand() * 30 : -35;
    c.strokeStyle = `rgba(${Math.max(0, r + shift)},${Math.max(0, g + shift)},${Math.max(0, b + shift)},${.17 + rand() * .23})`;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(angle) * length * .6, y + Math.sin(angle) * length * .6 - .7, x + Math.cos(angle) * length, y + Math.sin(angle) * length); c.stroke();
  }
  for (const sign of [-1, 1]) {
    c.save();
    if (ear !== "floppy") {
      const grad = c.createLinearGradient(270, 400 + sign * 90, 270, 400 + sign * 155);
      grad.addColorStop(0, "rgba(70,43,34,.14)"); grad.addColorStop(.8, belly ? "rgba(178,122,112,.7)" : "rgba(111,75,58,.42)");
      c.fillStyle = grad; c.beginPath(); c.moveTo(260, 400 + sign * 96); c.quadraticCurveTo(257, 400 + sign * 125, 275, 400 + sign * (dog ? 155 : 145)); c.quadraticCurveTo(302, 400 + sign * 128, 322, 400 + sign * 92); c.closePath(); c.fill();
    } else {
      c.fillStyle = "rgba(77,46,28,.2)"; ellipse(c, 382, 400 + sign * 113, 62, 30, sign * -.45);
    }
    c.restore();
  }
  if (belly) {
    c.strokeStyle = "rgba(117,82,61,.16)"; c.lineWidth = 2; c.beginPath(); c.moveTo(590, 400); c.bezierCurveTo(680, 392, 790, 412, 890, 400); c.stroke();
    for (const [x, y] of [[510, 256], [510, 544], [943, 250], [943, 550]]) {
      const pink = c.createRadialGradient(x!, y!, 2, x!, y!, 32); pink.addColorStop(0, "#d09c98"); pink.addColorStop(1, "#a77272"); c.fillStyle = pink;
      ellipse(c, x!, y!, 24, 19, -.3);
      for (let toe = -1; toe <= 1; toe++) ellipse(c, x! - 26, y! + toe * 18, 10, 8, toe * .35);
      c.strokeStyle = "rgba(85,61,47,.2)"; c.lineWidth = 2; c.beginPath(); c.arc(x! - 13, y!, 43, -.8, .8); c.stroke();
    }
    c.strokeStyle = "#51483c"; c.lineWidth = 4.5; c.lineCap = "round";
    for (const y of [359, 441]) { c.beginPath(); c.ellipse(292, y, 21, 13, 0, 0, Math.PI); c.stroke(); }
    c.fillStyle = dog ? "#3e3d38" : "#a86f69"; c.beginPath(); c.moveTo(218, 390); c.quadraticCurveTo(239, 381, 235, 400); c.quadraticCurveTo(235, 417, 218, 410); c.closePath(); c.fill();
    c.strokeStyle = "rgba(60,47,38,.6)"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(218, 400); c.quadraticCurveTo(202, 400, 200, 387); c.moveTo(218, 400); c.quadraticCurveTo(202, 400, 200, 413); c.stroke();
  }
  if (!dog) {
    c.strokeStyle = "rgba(239,227,200,.53)"; c.lineWidth = .9;
    for (const sign of [-1, 1]) for (let j = 0; j < 4; j++) { c.beginPath(); c.moveTo(226, 400 + sign * (32 + j * 4)); c.quadraticCurveTo(165, 400 + sign * (30 + j * 14), 141, 400 + sign * (30 + j * 22)); c.stroke(); }
  }
  return canvas;
}

export function createSceneTexture(kind: string) {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 512;
  const c = canvas.getContext("2d")!, r = random(39);
  const colors: Record<string, string> = { linen: "#d8cbb7", wood: "#b39475", "shag-rug": "#c9c0b3", grass: "#8f9d76", cushion: "#bcb5a5" };
  c.fillStyle = colors[kind] ?? colors.linen!; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < (kind === "shag-rug" || kind === "grass" ? 18_000 : 9_000); i++) {
    const x = r() * 512, y = r() * 512, value = r();
    c.strokeStyle = value > .5 ? `rgba(255,248,228,${value * .11})` : `rgba(62,49,32,${.06 + value * .1})`;
    c.lineWidth = kind === "shag-rug" ? 1.2 : .5;
    c.beginPath(); c.moveTo(x, y);
    if (kind === "wood") c.bezierCurveTo(x + 100, y + r() * 3, x + 180, y - r() * 3, x + 280, y);
    else if (kind === "linen" || kind === "cushion") c.lineTo(x + (i % 2 ? 4 : 0), y + (i % 2 ? 0 : 4));
    else c.quadraticCurveTo(x + r() * 7, y - 8, x + r() * 8 - 4, y - 13 - r() * 7);
    c.stroke();
  }
  if (kind === "wood") { c.strokeStyle = "rgba(55,32,15,.15)"; for (let y = 0; y < 512; y += 128) { c.beginPath(); c.moveTo(0, y); c.lineTo(512, y); c.stroke(); } }
  return canvas;
}

import { parseBuffer } from "./opentype.js";

interface Glyph {
  index: number;
  name: string;
  unicode: number;
  unicodes: number[];
  advanceWidth?: number;
  leftSideBearing: number;
}

export function createFontToSvg(fontBuffer: Uint8Array) {
  const font = parseBuffer(fontBuffer.buffer, {});

  return (
    text: string,
    options: { fontSize: number; decimalPlaces?: number; maxWidth?: number },
  ) => {
    const decimalPlaces = options.decimalPlaces || 2;
    const fontSize = options.fontSize;
    const fontScale = 1 / font.unitsPerEm * fontSize;
    const maxWidth = options.maxWidth ?? Infinity;

    const glyphs = font.stringToGlyphs(text) as Glyph[];
    const chunks = [] as { width: number; index: number }[];

    let width = 0;
    glyphs.forEach((glyph, index) => {
      const glyphWidth = (glyph.advanceWidth ?? 0) * fontScale;
      if (width > 0 && width + glyphWidth > maxWidth) {
        chunks.push({ width: +width.toFixed(decimalPlaces), index });
        width = 0;
      }
      width += (width > 0
        ? font.getKerningValue(glyphs[index - 1], glyph) * fontScale
        : 0) + glyphWidth;
    });
    chunks.push({ width: +width.toFixed(decimalPlaces), index: glyphs.length });

    const ascender = font.ascender * fontScale;
    const height = (font.ascender - font.descender) * fontScale;

    return chunks.map((chunk, chunkIndex) => {
      const startIndex = chunkIndex > 0 ? chunks[chunkIndex - 1].index : 0;
      const line = text.slice(startIndex, chunk.index);
      return {
        h: height,
        w: chunk.width,
        d: font.getPath(line, 0, ascender, options.fontSize, {
          kerning: true,
          letterSpacing: false,
          tracking: false,
        }).toPathData() as string,
      };
    });
  };
}

async function hashHexColor(message: string) {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(message),
  );
  const numbers = Array.from(new Uint8Array(hashBuffer)).slice(0, 3);

  const hex = numbers.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `#${hex}`;
}

const fontBuffer = await Deno.readFile("./DungGeunMo.otf");

export async function createKakaoBalloonSvg(
  name: string,
  message: string,
  timestamp: number,
) {
  const svg = createFontToSvg(fontBuffer);

  const mAvatar = svg(name[0], { fontSize: 60 });
  const mName = svg(name, { fontSize: 36 });

  const time = new Date(timestamp).toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
  });
  const mTime = svg(time, { fontSize: 32 });

  const metrics = message.trim().split("\n").flatMap((line) =>
    svg(line, { fontSize: 50, maxWidth: 800 })
  );

  const spaceY = 8;
  const width = Math.max(20, ...metrics.map((m) => m.w));
  const height = Math.max(
    50,
    metrics.reduce((carry, m) => carry + m.h, 0) +
      (metrics.length - 1) * spaceY,
  );

  const r = 22.766;
  const t0 = 114;
  const t1 = 114 + 41.25; // 155.25
  const r0 = width + 156 + 32 + 32; // 783
  const r1 = width + 156 + 32 + 32 - 41.25; // 741.75
  const b0 = height + 114 + 30 + 30; // 224
  const b1 = height + 114 + 30 + 30 - 41.25; // 182.75
  const l0 = 156;
  const l1 = 156 + 41.25; // 197.25

  const avatarBgColor = await hashHexColor(name);
  const avatarTextColor = await hashHexColor(name[0]);

  let body =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width +
      445}" height="${height + 224}">`;
  body += `<rect width="100%" height="100%" fill="#262628"/>`;
  body +=
    `<path d="M132,94.25C132,73.139 114.861,56 93.75,56L68.25,56C47.139,56 30,73.139 30,94.25L30,119.75C30,140.861 47.139,158 68.25,158L93.75,158C114.861,158 132,140.861 132,119.75L132,94.25Z" fill="${avatarBgColor}" />`;
  body +=
    `<path d="M168.788,125.404C176.191,118.341 186.217,${t0} ${l1},${t0}L${r1},${t0}C${r1 +
      r},${t0} ${r0},${t1 - r} ${r0},${t1}L${r0},${b1}C${r0},${b1 + r} ${r1 +
      r},${b0} ${r1},${b0}L${l1},${b0}C${l1 - r},${b0} ${l0},${b1 +
      r} ${l0},${b1}L${l0},${t1}C${l0},154.626 156.014,154.006 156.041,153.386C156.084,147.622 155.969,140.6 154.216,134.436C151.618,125.299 146.781,117.968 146.781,117.968C146.781,117.968 159.513,115.578 168.788,125.404Z" fill="#3A3A3C" />`;
  body += `<path transform="translate(${82 - mAvatar[0].w / 2},${106 -
    mAvatar[0].h / 2})" fill="${avatarTextColor}" d="${mAvatar[0].d}"/>`;
  body += `<path transform="translate(154,60)" fill="#a8a8a9" d="${
    mName[0].d
  }"/>`;
  body += `<path transform="translate(${r0 + 10},${b0 -
    34})" fill="#a8a8a9" d="${mTime[0].d}"/>`;
  let top = 142;
  metrics.forEach((metric) => {
    body +=
      `<path transform="translate(188,${top})" fill="#f2f2f2" d="${metric.d}"/>`;
    top += metric.h + spaceY;
  });
  body += "</svg>";
  return body;
}

if (import.meta.main) {
  console.log(
    await createKakaoBalloonSvg(
      "완두",
      "동해물과 백두산이 마르고 닳도록 하느님이 보우하사 우리나라 만세 무궁화 삼천리 화려강산 대한사람 대한으로 길이보전하세.\nHello World\n와왕.......!!!!",
      Date.now(),
    ),
  );
}

import { parseBuffer } from './opentype.js'

interface Glyph {
  index: number
  name: string
  unicode: number
  unicodes: number[]
  advanceWidth?: number
  leftSideBearing: number
}

export function createFontToSvg(fontBuffer: Uint8Array) {
  const font = parseBuffer(fontBuffer.buffer, {})

  return (text: string, options: { fontSize: number }) => {
    const fontSize = options.fontSize
    const fontScale = 1 / font.unitsPerEm * fontSize;
  
    const width = (font.stringToGlyphs(text) as Glyph[]).reduce((carry, glyph, glyphIndex, glyphs) => {
      return carry
        + ((glyph.advanceWidth ?? 0) * fontScale)
        + (glyphIndex > 0 ? font.getKerningValue(glyphs[glyphIndex - 1], glyph) * fontScale : 0)
    }, 0)
    const height = (font.ascender - font.descender) * fontScale;
    const ascender = font.ascender * fontScale;

    const path = font.getPath(text, 0, ascender, options.fontSize, {
      kerning: true,
      letterSpacing: false,
      tracking: false,
    });
  
    return {
      width,
      height,
      d: path.toPathData() as string,
    }
  }
}

if (import.meta.main) {
  const svg = createFontToSvg(await Deno.readFile('./DungGeunMo.otf'))

  const { d, width, height } = svg('헬로월드', { fontSize: 20 })

  console.log(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">`)
  console.log(`<path d="${d}"/>`)
  console.log('</svg>')
}

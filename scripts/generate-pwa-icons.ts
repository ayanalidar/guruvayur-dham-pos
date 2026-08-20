import sharp from 'sharp'
import path from 'path'

// Generate PWA icons from the GVD logo:
// - icon-192.png (192x192)
// - icon-512.png (512x512)
// - icon-maskable-192.png + icon-maskable-512.png (with safe zone padding)
// - apple-touch-icon.png (180x180)
// - favicon-32.png + favicon-16.png
// - og-image.png (1200x630 for social sharing)

const LOGO = path.join(process.cwd(), 'public', 'gvd-logo.webp')
const OUT = path.join(process.cwd(), 'public')

async function generateIcon(size: number, outName: string, padding = 0) {
  const canvasSize = size
  const logoSize = Math.round(size * (1 - padding * 2))
  const offset = Math.round((canvasSize - logoSize) / 2)

  // Create white background, composite logo centered
  await sharp({
    create: {
      width: canvasSize, height: canvasSize, channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([{
      input: await sharp(LOGO).resize(logoSize, logoSize, { fit: 'contain' }).toBuffer(),
      gravity: 'center',
      blend: 'over',
    }])
    .png()
    .toFile(path.join(OUT, outName))
  console.log(`✓ ${outName} (${canvasSize}x${canvasSize})`)
}

async function generateFavicon(size: number, outName: string) {
  await sharp(LOGO).resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }).png().toFile(path.join(OUT, outName))
  console.log(`✓ ${outName} (${size}x${size})`)
}

async function generateOGImage() {
  // 1200x630 social share image — logo + hotel name on branded background
  const W = 1200, H = 630
  const logoBuf = await sharp(LOGO).resize(280, 280, { fit: 'contain' }).toBuffer()

  // Create SVG with text + hotel name (Georgia serif, red color to match invoice)
  const svgText = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="#FFFBF5"/>
      <text x="${W/2}" y="430" text-anchor="middle"
            font-family="Georgia, Times New Roman, serif"
            font-size="72" font-weight="bold" fill="#B22222">HOTEL GURUVAYUR DHAM</text>
      <text x="${W/2}" y="500" text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="28" fill="#666">Mathura, Uttar Pradesh</text>
      <text x="${W/2}" y="555" text-anchor="middle"
            font-family="Arial, sans-serif"
            font-size="22" fill="#888">Point of Sale System</text>
    </svg>`

  await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 251, b: 245, alpha: 1 } },
  })
    .composite([
      { input: logoBuf, gravity: 'north', top: 70, left: 460, blend: 'over' },
      { input: Buffer.from(svgText), gravity: 'northwest', blend: 'over' },
    ])
    .jpeg({ quality: 90 })
    .toFile(path.join(OUT, 'og-image.jpg'))
  console.log(`✓ og-image.jpg (1200x630)`)
}

async function main() {
  console.log('🎨 Generating PWA icons from gvd-logo.webp...')
  // Standard icons (white background, logo centered)
  await generateIcon(192, 'icon-192.png')
  await generateIcon(512, 'icon-512.png')
  // Maskable icons (with 10% safe zone padding so the OS can crop into any shape)
  await generateIcon(192, 'icon-maskable-192.png', 0.1)
  await generateIcon(512, 'icon-maskable-512.png', 0.1)
  // Apple touch icon
  await generateIcon(180, 'apple-touch-icon.png')
  // Favicons
  await generateFavicon(32, 'favicon-32.png')
  await generateFavicon(16, 'favicon-16.png')
  await generateFavicon(32, 'favicon.ico')  // PNG works as .ico in modern browsers
  // OG image for social sharing
  await generateOGImage()
  console.log('✅ All PWA icons generated.')
}

main().catch(e => { console.error(e); process.exit(1) })

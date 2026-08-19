'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

// Renders a QR code as an SVG for the given text.
// Used in invoice footers so guests can scan to leave a Google review.
export function QrCode({ value, size = 96, className = '', alt = 'QR code' }: {
  value: string
  size?: number
  className?: string
  alt?: string
}) {
  const [svg, setSvg] = useState<string>('')

  useEffect(() => {
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then(setSvg)
      .catch(() => setSvg(''))
  }, [value, size])

  if (!svg) return null

  return (
    <div
      className={className}
      style={{ width: size, height: size, display: 'inline-block' }}
      role="img"
      aria-label={alt}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

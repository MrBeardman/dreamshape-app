import { useEffect, useRef } from 'react'
import {
  BrowserMultiFormatReader,
  RGBLuminanceSource,
  HybridBinarizer,
  BinaryBitmap,
  DecodeHintType,
} from '@zxing/library'

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void
  onClose: () => void
}

const ROTATIONS = [0, 90, 180, 270] as const

/**
 * Draws the current video frame onto a canvas at the given rotation angle,
 * converts the pixels to a ZXing BinaryBitmap, then attempts to decode a barcode.
 * Returns the barcode string or null.
 */
function tryDecodeAtAngle(
  reader: BrowserMultiFormatReader,
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  angle: number,
): string | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null

  // Swap dimensions for 90°/270° rotations so the rotated image fits the canvas
  if (angle === 90 || angle === 270) {
    canvas.width = vh
    canvas.height = vw
  } else {
    canvas.width = vw
    canvas.height = vh
  }

  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((angle * Math.PI) / 180)
  ctx.drawImage(video, -vw / 2, -vh / 2)
  ctx.restore()

  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const luminance = new RGBLuminanceSource(data, canvas.width, canvas.height)
    const bitmap = new BinaryBitmap(new HybridBinarizer(luminance))
    const result = reader.decodeBitmap(bitmap)
    return result ? result.getText() : null
  } catch {
    // NotFoundException fires constantly while no barcode is visible — silently ignore
    return null
  }
}

export default function BarcodeScanner({ onDetect, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const detectedRef = useRef(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hints = new Map<DecodeHintType, any>()
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    const scanFrame = () => {
      if (detectedRef.current) return
      const video = videoRef.current
      if (!video || video.readyState < 2 || !video.videoWidth) return

      for (const angle of ROTATIONS) {
        if (detectedRef.current) return
        const barcode = tryDecodeAtAngle(reader, video, canvas, ctx, angle)
        if (barcode) {
          detectedRef.current = true
          if (intervalRef.current !== null) clearInterval(intervalRef.current)
          streamRef.current?.getTracks().forEach(t => t.stop())
          onDetect(barcode)
          return
        }
      }
    }

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        // ~10fps — plenty for reliable scanning without hammering the CPU
        intervalRef.current = setInterval(scanFrame, 100)
      } catch (e) {
        console.error('Failed to start camera:', e)
      }
    }

    void start()

    return () => {
      detectedRef.current = true
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [onDetect])

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-header">
        <span className="barcode-scanner-title">Scan Barcode</span>
        <button className="barcode-scanner-close" onClick={onClose}>×</button>
      </div>

      <div className="barcode-scanner-body">
        <video ref={videoRef} className="barcode-scanner-video" playsInline muted />
        <div className="barcode-scanner-overlay-ui">
          <div className="barcode-scan-line-wide" />
        </div>
      </div>

      <p className="barcode-scanner-hint">Point at a barcode in any orientation</p>
    </div>
  )
}

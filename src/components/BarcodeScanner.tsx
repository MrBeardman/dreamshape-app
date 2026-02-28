import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void
  onClose: () => void
}

// Barcode formats relevant to food products
const FOOD_FORMATS = [
  'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'itf', 'data_matrix', 'qr_code',
]

export default function BarcodeScanner({ onDetect, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const cleanupRef = useRef<() => void>(() => {})
  const detectedRef = useRef(false)

  useEffect(() => {
    let active = true
    detectedRef.current = false

    const stopStream = (stream: MediaStream) =>
      stream.getTracks().forEach(t => t.stop())

    /**
     * Fast path: Web BarcodeDetector API (Chrome 83+, Safari 17+, Edge 83+).
     * Hardware-accelerated, rotation-invariant, sub-second detection.
     */
    const startNative = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BD = (window as any).BarcodeDetector as {
        new(opts: { formats: string[] }): {
          detect(v: HTMLVideoElement): Promise<Array<{ rawValue: string }>>
        }
        getSupportedFormats(): Promise<string[]>
      }

      // Filter to formats the browser actually supports
      let formats = FOOD_FORMATS
      try {
        const supported = await BD.getSupportedFormats()
        const filtered = FOOD_FORMATS.filter(f => supported.includes(f))
        if (filtered.length > 0) formats = filtered
      } catch { /* use full list */ }

      const detector = new BD({ formats })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      if (!active) { stopStream(stream); return }

      const video = videoRef.current!
      video.srcObject = stream
      await video.play()

      cleanupRef.current = () => { active = false; stopStream(stream) }

      const scan = async () => {
        if (!active || detectedRef.current) return
        if (video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const results = await detector.detect(video)
            if (results.length > 0 && active && !detectedRef.current) {
              detectedRef.current = true
              active = false
              stopStream(stream)
              onDetect(results[0].rawValue)
              return
            }
          } catch { /* NotFoundException = no barcode in frame */ }
        }
        if (active) setTimeout(scan, 60) // ~16fps
      }

      setTimeout(scan, 200) // brief warm-up delay before first attempt
    }

    /**
     * Fallback: ZXing browser reader with TRY_HARDER.
     * Works on all browsers, good reliability on upright/slightly tilted barcodes.
     */
    const startZxing = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hints = new Map<DecodeHintType, any>()
      hints.set(DecodeHintType.TRY_HARDER, true)
      // Cast to any — @zxing/browser types don't resolve cleanly with moduleResolution:bundler
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader: any = new BrowserMultiFormatReader()
      reader.setHints(hints)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let controls: any = null
      controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result: any, err: any) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true
            try { controls?.stop() } catch { /* ignore */ }
            onDetect(result.getText())
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('[ZXing]', err.name)
          }
        }
      )
      cleanupRef.current = () => { try { controls?.stop() } catch { /* ignore */ } }
    }

    const start = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (window as any).BarcodeDetector !== 'undefined') {
          console.log('[Scanner] native BarcodeDetector API')
          await startNative()
        } else {
          console.log('[Scanner] ZXing fallback')
          await startZxing()
        }
      } catch (e) {
        console.error('[Scanner] failed to start:', e)
      }
    }

    void start()

    return () => {
      active = false
      detectedRef.current = true
      cleanupRef.current()
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

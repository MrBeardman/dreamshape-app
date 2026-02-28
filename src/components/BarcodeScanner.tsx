import { useEffect, useRef } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'

interface BarcodeScannerProps {
  onDetect: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onDetect, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const detectedRef = useRef(false)

  useEffect(() => {
    const reader = new BrowserMultiFormatReader()

    const start = async () => {
      try {
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result: { getText(): string } | null, err: { name: string } | null) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true
              controls.stop()
              onDetect(result.getText())
            }
            // Suppress "no barcode found" errors — fire constantly while scanning
            if (err && err.name !== 'NotFoundException') {
              console.error('Barcode scan error:', err)
            }
          }
        )
        controlsRef.current = controls
      } catch (e) {
        console.error('Failed to start camera:', e)
      }
    }

    void start()

    return () => {
      controlsRef.current?.stop()
    }
  }, [onDetect])

  return (
    <div className="barcode-scanner-overlay">
      <div className="barcode-scanner-header">
        <span className="barcode-scanner-title">Scan Barcode</span>
        <button className="barcode-scanner-close" onClick={onClose}>×</button>
      </div>

      <div className="barcode-scanner-body">
        <video ref={videoRef} className="barcode-scanner-video" />
        <div className="barcode-scanner-frame">
          <div className="barcode-viewfinder">
            <div className="barcode-corner tl" />
            <div className="barcode-corner tr" />
            <div className="barcode-corner bl" />
            <div className="barcode-corner br" />
            <div className="barcode-scan-line" />
          </div>
        </div>
      </div>

      <p className="barcode-scanner-hint">Point the camera at a product barcode</p>
    </div>
  )
}

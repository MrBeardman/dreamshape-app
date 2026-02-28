// Type shim for @zxing/browser 0.1.x — package types not bundler-resolution compatible
declare module '@zxing/browser' {
  export class BrowserMultiFormatReader {
    decodeFromVideoDevice(
      deviceId: string | undefined,
      videoElement: HTMLVideoElement,
      callbackFn: (
        result: { getText(): string } | null,
        err: { name: string } | null
      ) => void
    ): Promise<{ stop(): void }>
  }
}

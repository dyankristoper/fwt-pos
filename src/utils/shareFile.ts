/**
 * Android Share Intent utility for RawBT printing integration.
 * Uses Web Share API to share PDF/PNG files; falls back to download if unsupported.
 */

export async function shareFile(
  blob: Blob,
  filename: string,
  mimeType: string = 'image/png'
): Promise<void> {
  const file = new File([blob], filename, { type: mimeType });

  // Try Web Share API (Android Chrome + RawBT)
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch (err: any) {
      // User cancelled share — not an error
      if (err?.name === 'AbortError') return;
      console.warn('Share failed, falling back to download:', err);
    }
  }

  // Fallback: normal download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Share a canvas-rendered receipt/invoice as PNG via Android Share.
 */
export async function shareCanvasAsPNG(
  canvas: HTMLCanvasElement,
  filename: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error('Canvas toBlob returned null'));
        return;
      }
      try {
        await shareFile(blob, filename, 'image/png');
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 'image/png');
  });
}

/**
 * Download-only utility — saves a canvas as PNG via <a> download.
 * Does NOT trigger Android Share / RawBT.
 */
export function downloadCanvasAsPNG(canvas: HTMLCanvasElement, filename: string): void {
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

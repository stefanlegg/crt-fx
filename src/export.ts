/** Export the current canvas state to various formats */

export function exportDataURL(
  canvas: HTMLCanvasElement,
  mimeType: string = 'image/png',
  quality?: number,
): string {
  return canvas.toDataURL(mimeType, quality);
}

export function exportBlob(
  canvas: HTMLCanvasElement,
  mimeType: string = 'image/png',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to export canvas to blob'));
      },
      mimeType,
      quality,
    );
  });
}

export function exportToCanvas(
  sourceCanvas: HTMLCanvasElement,
  targetCanvas?: HTMLCanvasElement,
): HTMLCanvasElement {
  const target = targetCanvas || document.createElement('canvas');
  target.width = sourceCanvas.width;
  target.height = sourceCanvas.height;
  const ctx = target.getContext('2d')!;
  ctx.drawImage(sourceCanvas, 0, 0);
  return target;
}

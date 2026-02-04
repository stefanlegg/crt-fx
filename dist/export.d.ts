/** Export the current canvas state to various formats */
export declare function exportDataURL(canvas: HTMLCanvasElement, mimeType?: string, quality?: number): string;
export declare function exportBlob(canvas: HTMLCanvasElement, mimeType?: string, quality?: number): Promise<Blob>;
export declare function exportToCanvas(sourceCanvas: HTMLCanvasElement, targetCanvas?: HTMLCanvasElement): HTMLCanvasElement;

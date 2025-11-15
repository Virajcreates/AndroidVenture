import { FrameData, FrameStats } from './types.js';

/**
 * FrameRenderer class handles rendering frames to a canvas element
 */
export class FrameRenderer {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private loadingIndicator: HTMLElement;

    constructor(canvasId: string, loadingIndicatorId: string) {
        const canvas = document.getElementById(canvasId);
        const loading = document.getElementById(loadingIndicatorId);

        if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
            throw new Error(`Canvas element with id '${canvasId}' not found`);
        }

        if (!loading) {
            throw new Error(`Loading indicator with id '${loadingIndicatorId}' not found`);
        }

        this.canvas = canvas;
        this.loadingIndicator = loading;
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get 2D rendering context');
        }
        this.ctx = ctx;
    }

    /**
     * Render a frame to the canvas
     */
    public async renderFrame(frameData: FrameData): Promise<void> {
        this.showLoading(false);

        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                // Set canvas size to match image
                this.canvas.width = frameData.width;
                this.canvas.height = frameData.height;

                // Draw image
                this.ctx.drawImage(img, 0, 0, frameData.width, frameData.height);
                
                resolve();
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };

            // Support both base64 and data URLs
            img.src = frameData.imageData.startsWith('data:') 
                ? frameData.imageData 
                : `data:image/png;base64,${frameData.imageData}`;
        });
    }

    /**
     * Clear the canvas
     */
    public clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.showLoading(true);
    }

    /**
     * Show or hide loading indicator
     */
    private showLoading(show: boolean): void {
        this.loadingIndicator.style.display = show ? 'block' : 'none';
    }

    /**
     * Draw text overlay on the canvas
     */
    public drawTextOverlay(text: string, x: number, y: number): void {
        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(text, x, y);
        this.ctx.fillText(text, x, y);
    }
}

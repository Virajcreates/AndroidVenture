import { FrameData } from './types.js';
import { FrameRenderer } from './frameRenderer.js';
import { StatsManager } from './statsManager.js';

/**
 * Main application class
 */
class App {
    private frameRenderer: FrameRenderer;
    private statsManager: StatsManager;
    private currentMode: 'edge-detection' | 'raw' = 'edge-detection';
    private webcamStream: MediaStream | null = null;
    private animationFrameId: number | null = null;
    private isWebcamRunning = false;
    private videoElement: HTMLVideoElement;
    private tempCanvas: HTMLCanvasElement;
    private tempCtx: CanvasRenderingContext2D;
    private lastFrameTime = 0;
    private frameCount = 0;

    constructor() {
        this.frameRenderer = new FrameRenderer('frameCanvas', 'loadingIndicator');
        this.statsManager = new StatsManager();
        this.videoElement = document.getElementById('webcamVideo') as HTMLVideoElement;
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d')!;
        this.setupEventListeners();
        this.initialize();
    }

    /**
     * Initialize the application
     */
    private initialize(): void {
        console.log('🚀 AndroidVenture Web Viewer initialized');
        this.statsManager.reset();
    }

    /**
     * Setup event listeners for UI controls
     */
    private setupEventListeners(): void {
        const startWebcamBtn = document.getElementById('startWebcamBtn');
        const stopWebcamBtn = document.getElementById('stopWebcamBtn');
        const toggleModeBtn = document.getElementById('toggleModeBtn');
        const clearBtn = document.getElementById('clearBtn');

        if (startWebcamBtn) {
            startWebcamBtn.addEventListener('click', () => this.startWebcam());
        }

        if (stopWebcamBtn) {
            stopWebcamBtn.addEventListener('click', () => this.stopWebcam());
        }

        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', () => this.toggleMode());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearDisplay());
        }
    }

    /**
     * Start webcam capture
     */
    private async startWebcam(): Promise<void> {
        try {
            console.log('🎥 Requesting webcam access...');
            
            // List available devices
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            console.log('📹 Available video devices:', videoDevices);
            
            this.webcamStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            console.log('✅ Webcam access granted');
            this.videoElement.srcObject = this.webcamStream;
            
            await this.videoElement.play();
            console.log('▶️ Video playing');

            this.isWebcamRunning = true;
            this.lastFrameTime = performance.now();
            this.frameCount = 0;

            // Update button states
            const startBtn = document.getElementById('startWebcamBtn') as HTMLButtonElement;
            const stopBtn = document.getElementById('stopWebcamBtn') as HTMLButtonElement;
            if (startBtn) startBtn.disabled = true;
            if (stopBtn) stopBtn.disabled = false;

            // Hide loading indicator
            const loadingIndicator = document.getElementById('loadingIndicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';

            this.processWebcamFrame();
            console.log('✅ Webcam started successfully');
        } catch (error) {
            console.error('❌ Error starting webcam:', error);
            if (error instanceof Error) {
                console.error('Error name:', error.name);
                console.error('Error message:', error.message);
            }
            alert(`Failed to access webcam: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease make sure:\n1. You granted camera permissions\n2. No other app is using the camera\n3. Your USB webcam is connected`);
        }
    }

    /**
     * Stop webcam capture
     */
    private stopWebcam(): void {
        this.isWebcamRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }

        // Update button states
        (document.getElementById('startWebcamBtn') as HTMLButtonElement).disabled = false;
        (document.getElementById('stopWebcamBtn') as HTMLButtonElement).disabled = true;

        console.log('⏸️ Webcam stopped');
    }

    /**
     * Process webcam frame
     */
    private processWebcamFrame(): void {
        if (!this.isWebcamRunning) return;

        const startTime = performance.now();

        // Draw video frame to temp canvas
        this.tempCanvas.width = this.videoElement.videoWidth;
        this.tempCanvas.height = this.videoElement.videoHeight;
        this.tempCtx.drawImage(this.videoElement, 0, 0);

        // Get image data
        const imageData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height);

        // Apply edge detection if enabled
        if (this.currentMode === 'edge-detection') {
            this.applyEdgeDetection(imageData);
        } else {
            this.applyGrayscale(imageData);
        }

        // Render to main canvas
        const canvas = this.frameRenderer['canvas'];
        canvas.width = this.tempCanvas.width;
        canvas.height = this.tempCanvas.height;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(imageData, 0, 0);

        const processingTime = performance.now() - startTime;

        // Calculate FPS
        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this.lastFrameTime >= 1000) {
            const fps = this.frameCount / ((currentTime - this.lastFrameTime) / 1000);
            this.statsManager.updateStats({
                fps: fps,
                resolution: `${this.tempCanvas.width}x${this.tempCanvas.height}`,
                processingTime: Math.round(processingTime),
                mode: this.getModeDisplayName()
            });
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }

        // Continue processing
        this.animationFrameId = requestAnimationFrame(() => this.processWebcamFrame());
    }

    /**
     * Apply simple edge detection (Sobel-like)
     */
    private applyEdgeDetection(imageData: ImageData): void {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const temp = new Uint8ClampedArray(data);

        // Convert to grayscale first
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * temp[i] + 0.587 * temp[i + 1] + 0.114 * temp[i + 2];
            temp[i] = temp[i + 1] = temp[i + 2] = gray;
        }

        // Simple edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

                // Sobel operator
                const gx =
                    -temp[((y - 1) * width + (x - 1)) * 4] +
                    temp[((y - 1) * width + (x + 1)) * 4] +
                    -2 * temp[(y * width + (x - 1)) * 4] +
                    2 * temp[(y * width + (x + 1)) * 4] +
                    -temp[((y + 1) * width + (x - 1)) * 4] +
                    temp[((y + 1) * width + (x + 1)) * 4];

                const gy =
                    -temp[((y - 1) * width + (x - 1)) * 4] +
                    -2 * temp[((y - 1) * width + x) * 4] +
                    -temp[((y - 1) * width + (x + 1)) * 4] +
                    temp[((y + 1) * width + (x - 1)) * 4] +
                    2 * temp[((y + 1) * width + x) * 4] +
                    temp[((y + 1) * width + (x + 1)) * 4];

                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edge = magnitude > 50 ? 255 : 0;

                data[idx] = data[idx + 1] = data[idx + 2] = edge;
            }
        }
    }

    /**
     * Apply grayscale filter
     */
    private applyGrayscale(imageData: ImageData): void {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
    }

    /**
     * Toggle between edge detection and raw feed modes
     */
    private toggleMode(): void {
        this.currentMode = this.currentMode === 'edge-detection' ? 'raw' : 'edge-detection';
        console.log(`🔄 Mode toggled to: ${this.currentMode}`);
    }

    /**
     * Clear the display and reset stats
     */
    private clearDisplay(): void {
        this.frameRenderer.clear();
        this.statsManager.reset();
        console.log('🧹 Display cleared');
    }

    /**
     * Get display name for current mode
     */
    private getModeDisplayName(): string {
        return this.currentMode === 'edge-detection' ? 'Edge Detection' : 'Raw Feed';
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
});

export default App;

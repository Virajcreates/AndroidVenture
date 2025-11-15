// Main application
class App {
    constructor() {
        this.canvas = document.getElementById('frameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.video = document.getElementById('webcamVideo');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        
        this.webcamStream = null;
        this.animationFrameId = null;
        this.isWebcamRunning = false;
        this.currentMode = 'edge-detection';
        
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
        
        this.setupEventListeners();
        this.initialize();
    }

    initialize() {
        console.log('🚀 AndroidVenture Web Viewer initialized');
    }

    setupEventListeners() {
        document.getElementById('startWebcamBtn').onclick = () => this.startWebcam();
        document.getElementById('stopWebcamBtn').onclick = () => this.stopWebcam();
        document.getElementById('toggleModeBtn').onclick = () => this.toggleMode();
        document.getElementById('clearBtn').onclick = () => this.clearDisplay();
    }

    async startWebcam() {
        try {
            console.log('🎥 Requesting webcam access...');
            this.loadingIndicator.textContent = 'Requesting camera access...';
            
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
            this.video.srcObject = this.webcamStream;
            
            this.video.onloadedmetadata = () => {
                this.video.play();
                
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.tempCanvas.width = this.video.videoWidth;
                this.tempCanvas.height = this.video.videoHeight;
                
                this.loadingIndicator.style.display = 'none';
                
                document.getElementById('resolutionValue').textContent = 
                    `${this.video.videoWidth}x${this.video.videoHeight}`;
                
                this.isWebcamRunning = true;
                this.lastFrameTime = performance.now();
                this.frameCount = 0;

                document.getElementById('startWebcamBtn').disabled = true;
                document.getElementById('stopWebcamBtn').disabled = false;

                this.processWebcamFrame();
                console.log('✅ Webcam started successfully');
            };
        } catch (error) {
            console.error('❌ Error starting webcam:', error);
            this.loadingIndicator.textContent = `Error: ${error.message}`;
            alert(`Failed to access webcam: ${error.message}\n\nPlease make sure:\n1. You granted camera permissions\n2. No other app is using the camera\n3. Your USB webcam is connected`);
        }
    }

    stopWebcam() {
        this.isWebcamRunning = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.webcamStream) {
            this.webcamStream.getTracks().forEach(track => track.stop());
            this.webcamStream = null;
        }

        document.getElementById('startWebcamBtn').disabled = false;
        document.getElementById('stopWebcamBtn').disabled = true;
        
        this.loadingIndicator.style.display = 'block';
        this.loadingIndicator.textContent = 'Webcam stopped';

        console.log('⏸️ Webcam stopped');
    }

    processWebcamFrame() {
        if (!this.isWebcamRunning) return;

        const startTime = performance.now();

        this.tempCtx.drawImage(this.video, 0, 0);
        const imageData = this.tempCtx.getImageData(0, 0, this.tempCanvas.width, this.tempCanvas.height);

        if (this.currentMode === 'edge-detection') {
            this.applyEdgeDetection(imageData);
        } else {
            this.applyGrayscale(imageData);
        }

        this.ctx.putImageData(imageData, 0, 0);

        const processingTime = performance.now() - startTime;

        this.frameCount++;
        const currentTime = performance.now();
        if (currentTime - this.lastFrameTime >= 1000) {
            const fps = this.frameCount / ((currentTime - this.lastFrameTime) / 1000);
            document.getElementById('fpsValue').textContent = fps.toFixed(1);
            document.getElementById('processingTimeValue').textContent = Math.round(processingTime) + ' ms';
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
        }

        this.animationFrameId = requestAnimationFrame(() => this.processWebcamFrame());
    }

    applyEdgeDetection(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const temp = new Uint8ClampedArray(data);

        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * temp[i] + 0.587 * temp[i + 1] + 0.114 * temp[i + 2];
            temp[i] = temp[i + 1] = temp[i + 2] = gray;
        }

        // Sobel edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;

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

    applyGrayscale(imageData) {
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            data[i] = data[i + 1] = data[i + 2] = gray;
        }
    }

    toggleMode() {
        this.currentMode = this.currentMode === 'edge-detection' ? 'raw' : 'edge-detection';
        document.getElementById('modeValue').textContent = 
            this.currentMode === 'edge-detection' ? 'Edge Detection' : 'Raw Feed';
        console.log(`🔄 Mode toggled to: ${this.currentMode}`);
    }

    clearDisplay() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        document.getElementById('fpsValue').textContent = '0.0';
        document.getElementById('resolutionValue').textContent = '0x0';
        document.getElementById('processingTimeValue').textContent = '0 ms';
        console.log('🧹 Display cleared');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
});

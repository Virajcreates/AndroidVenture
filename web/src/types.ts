/**
 * Frame data interface representing a processed frame from the Android app
 */
export interface FrameData {
    imageData: string; // Base64 encoded image or data URL
    width: number;
    height: number;
    fps: number;
    processingTime: number;
    mode: 'edge-detection' | 'raw';
}

/**
 * Frame statistics for display
 */
export interface FrameStats {
    fps: number;
    resolution: string;
    processingTime: number;
    mode: string;
}

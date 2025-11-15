import { FrameStats } from './types.js';

/**
 * StatsManager class handles updating and displaying frame statistics
 */
export class StatsManager {
    private fpsElement: HTMLElement;
    private resolutionElement: HTMLElement;
    private processingTimeElement: HTMLElement;
    private modeElement: HTMLElement;

    constructor() {
        this.fpsElement = this.getElement('fpsValue');
        this.resolutionElement = this.getElement('resolutionValue');
        this.processingTimeElement = this.getElement('processingTimeValue');
        this.modeElement = this.getElement('modeValue');
    }

    private getElement(id: string): HTMLElement {
        const element = document.getElementById(id);
        if (!element) {
            throw new Error(`Element with id '${id}' not found`);
        }
        return element;
    }

    /**
     * Update all statistics
     */
    public updateStats(stats: FrameStats): void {
        this.fpsElement.textContent = stats.fps.toFixed(1);
        this.resolutionElement.textContent = stats.resolution;
        this.processingTimeElement.textContent = `${stats.processingTime} ms`;
        this.modeElement.textContent = stats.mode;
    }

    /**
     * Reset all statistics to default values
     */
    public reset(): void {
        this.fpsElement.textContent = '0.0';
        this.resolutionElement.textContent = '0x0';
        this.processingTimeElement.textContent = '0 ms';
        this.modeElement.textContent = 'Edge Detection';
    }

    /**
     * Animate a value change
     */
    public animateValue(elementId: string, targetValue: number, duration: number = 500): void {
        const element = document.getElementById(elementId);
        if (!element) return;

        const startValue = parseFloat(element.textContent || '0');
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const currentValue = startValue + (targetValue - startValue) * progress;

            element.textContent = currentValue.toFixed(1);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }
}

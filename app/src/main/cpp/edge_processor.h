#ifndef EDGE_PROCESSOR_H
#define EDGE_PROCESSOR_H

#include <opencv2/opencv.hpp>
#include <vector>

class EdgeProcessor {
public:
    /**
     * Process frame with Canny edge detection
     * @param inputData YUV420 image data
     * @param width Image width
     * @param height Image height
     * @param applyEdgeDetection Whether to apply edge detection or return raw grayscale
     * @return Processed RGBA image data
     */
    static std::vector<uint8_t> processFrame(
        const uint8_t* inputData,
        int width,
        int height,
        bool applyEdgeDetection
    );

private:
    /**
     * Convert YUV420 to BGR using OpenCV
     */
    static cv::Mat yuv420ToBGR(const uint8_t* yuvData, int width, int height);
    
    /**
     * Apply Canny edge detection
     */
    static cv::Mat applyCanny(const cv::Mat& input);
    
    /**
     * Convert to RGBA for Android display
     */
    static std::vector<uint8_t> toRGBA(const cv::Mat& input);
};

#endif // EDGE_PROCESSOR_H

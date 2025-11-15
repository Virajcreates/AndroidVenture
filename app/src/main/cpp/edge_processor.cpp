#include "edge_processor.h"
#include <android/log.h>

#define LOG_TAG "EdgeProcessor"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

std::vector<uint8_t> EdgeProcessor::processFrame(
    const uint8_t* inputData,
    int width,
    int height,
    bool applyEdgeDetection
) {
    try {
        // Convert YUV420 to BGR
        cv::Mat bgrImage = yuv420ToBGR(inputData, width, height);
        
        if (bgrImage.empty()) {
            LOGE("Failed to convert YUV to BGR");
            return std::vector<uint8_t>();
        }
        
        // Downscale for faster processing - reduced to 480 for even better performance
        cv::Mat resized;
        int targetWidth = 480;
        int targetHeight = (height * targetWidth) / width;
        cv::resize(bgrImage, resized, cv::Size(targetWidth, targetHeight), 0, 0, cv::INTER_NEAREST);
        
        cv::Mat processedImage;
        
        if (applyEdgeDetection) {
            // Apply Canny edge detection
            processedImage = applyCanny(resized);
        } else {
            // Convert to grayscale for raw feed
            cv::cvtColor(resized, processedImage, cv::COLOR_BGR2GRAY);
        }
        
        // Convert to RGBA for display
        return toRGBA(processedImage);
        
    } catch (const cv::Exception& e) {
        LOGE("OpenCV exception: %s", e.what());
        return std::vector<uint8_t>();
    } catch (const std::exception& e) {
        LOGE("Exception: %s", e.what());
        return std::vector<uint8_t>();
    }
}

cv::Mat EdgeProcessor::yuv420ToBGR(const uint8_t* yuvData, int width, int height) {
    try {
        // Create YUV Mat
        cv::Mat yuvImage(height + height / 2, width, CV_8UC1, (void*)yuvData);
        
        // Convert to BGR
        cv::Mat bgrImage;
        cv::cvtColor(yuvImage, bgrImage, cv::COLOR_YUV2BGR_NV21);
        
        return bgrImage;
    } catch (const cv::Exception& e) {
        LOGE("YUV to BGR conversion failed: %s", e.what());
        return cv::Mat();
    }
}

cv::Mat EdgeProcessor::applyCanny(const cv::Mat& input) {
    try {
        cv::Mat gray, edges;
        
        // Convert to grayscale
        if (input.channels() == 3) {
            cv::cvtColor(input, gray, cv::COLOR_BGR2GRAY);
        } else {
            gray = input.clone();
        }
        
        // Skip blur for maximum speed, apply Canny directly
        cv::Canny(gray, edges, 30, 90, 3, false);
        
        return edges;
    } catch (const cv::Exception& e) {
        LOGE("Canny edge detection failed: %s", e.what());
        return input;
    }
}

std::vector<uint8_t> EdgeProcessor::toRGBA(const cv::Mat& input) {
    try {
        cv::Mat rgba;
        
        if (input.channels() == 1) {
            // Grayscale to RGBA
            cv::cvtColor(input, rgba, cv::COLOR_GRAY2RGBA);
        } else if (input.channels() == 3) {
            // BGR to RGBA
            cv::cvtColor(input, rgba, cv::COLOR_BGR2RGBA);
        } else if (input.channels() == 4) {
            rgba = input.clone();
        } else {
            LOGE("Unsupported number of channels: %d", input.channels());
            return std::vector<uint8_t>();
        }
        
        // Convert to vector
        size_t dataSize = rgba.total() * rgba.elemSize();
        std::vector<uint8_t> result(dataSize);
        std::memcpy(result.data(), rgba.data, dataSize);
        
        return result;
    } catch (const cv::Exception& e) {
        LOGE("RGBA conversion failed: %s", e.what());
        return std::vector<uint8_t>();
    }
}

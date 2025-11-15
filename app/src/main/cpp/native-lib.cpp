#include <jni.h>
#include <string>
#include <android/log.h>
#include "edge_processor.h"

#define LOG_TAG "NativeLib"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_androidventure_edgedetector_MainActivity_processFrame(
    JNIEnv* env,
    jobject /* this */,
    jbyteArray inputData,
    jint width,
    jint height,
    jboolean applyEdgeDetection
) {
    try {
        // Get input data
        jbyte* inputBytes = env->GetByteArrayElements(inputData, nullptr);
        jsize inputSize = env->GetArrayLength(inputData);
        
        if (inputBytes == nullptr) {
            LOGE("Failed to get input data");
            return nullptr;
        }
        
        LOGI("Processing frame: %dx%d, size=%d, edgeDetection=%d", 
             width, height, inputSize, applyEdgeDetection);
        
        // Process frame
        std::vector<uint8_t> processedData = EdgeProcessor::processFrame(
            reinterpret_cast<const uint8_t*>(inputBytes),
            width,
            height,
            applyEdgeDetection
        );
        
        // Release input data
        env->ReleaseByteArrayElements(inputData, inputBytes, JNI_ABORT);
        
        if (processedData.empty()) {
            LOGE("Processing failed");
            return nullptr;
        }
        
        // Create output array
        jbyteArray outputArray = env->NewByteArray(processedData.size());
        if (outputArray == nullptr) {
            LOGE("Failed to allocate output array");
            return nullptr;
        }
        
        env->SetByteArrayRegion(
            outputArray,
            0,
            processedData.size(),
            reinterpret_cast<const jbyte*>(processedData.data())
        );
        
        LOGI("Frame processed successfully, output size: %zu", processedData.size());
        
        return outputArray;
        
    } catch (const std::exception& e) {
        LOGE("Exception in processFrame: %s", e.what());
        return nullptr;
    }
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_androidventure_edgedetector_MainActivity_getOpenCVVersion(
    JNIEnv* env,
    jobject /* this */
) {
    std::string version = cv::getVersionString();
    return env->NewStringUTF(version.c_str());
}

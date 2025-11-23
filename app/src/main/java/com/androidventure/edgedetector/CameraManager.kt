package com.androidventure.edgedetector

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.media.ImageReader
import android.util.Log
import android.view.Surface
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

class CameraManager(
    private val context: Context
) {
    companion object {
        private const val TAG = "CameraManager"
        private const val MAX_PREVIEW_WIDTH = 1080
        private const val MAX_PREVIEW_HEIGHT = 1920
    }
    
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private val cameraOpenCloseLock = Semaphore(1)
    private var frameCallback: ((ByteArray, Int, Int) -> Unit)? = null
    
    private val stateCallback = object : CameraDevice.StateCallback() {
        override fun onOpened(camera: CameraDevice) {
            cameraOpenCloseLock.release()
            cameraDevice = camera
            createCameraPreviewSession()
        }
        
        override fun onDisconnected(camera: CameraDevice) {
            cameraOpenCloseLock.release()
            camera.close()
            cameraDevice = null
        }
        
        override fun onError(camera: CameraDevice, error: Int) {
            cameraOpenCloseLock.release()
            camera.close()
            cameraDevice = null
            Log.e(TAG, "Camera error: $error")
        }
    }
    
    @SuppressLint("MissingPermission")
    fun openCamera(callback: (ByteArray, Int, Int) -> Unit) {
        frameCallback = callback
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as android.hardware.camera2.CameraManager
        
        try {
            val cameraId = manager.cameraIdList[0]
            val characteristics = manager.getCameraCharacteristics(cameraId)
            val map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            
            val previewSize = chooseOptimalSize(map?.getOutputSizes(ImageFormat.YUV_420_888) ?: emptyArray())
            
            imageReader = ImageReader.newInstance(
                previewSize.width,
                previewSize.height,
                ImageFormat.YUV_420_888,
                2
            )
            
            imageReader?.setOnImageAvailableListener({ reader ->
                val image = reader.acquireLatestImage()
                image?.let {
                    try {
                        val yuvBytes = imageToByteArray(it)
                        frameCallback?.invoke(yuvBytes, it.width, it.height)
                    } finally {
                        it.close()
                    }
                }
            }, null)
            
            if (!cameraOpenCloseLock.tryAcquire(2500, TimeUnit.MILLISECONDS)) {
                throw RuntimeException("Time out waiting to lock camera opening.")
            }
            
            manager.openCamera(cameraId, stateCallback, null)
        } catch (e: Exception) {
            Log.e(TAG, "Error opening camera", e)
        }
    }
    
    private fun createCameraPreviewSession() {
        try {
            val surface = imageReader?.surface ?: return
            val previewRequestBuilder = cameraDevice?.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW)
            previewRequestBuilder?.addTarget(surface)
            
            cameraDevice?.createCaptureSession(
                listOf(surface),
                object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(session: CameraCaptureSession) {
                        if (cameraDevice == null) return
                        
                        captureSession = session
                        try {
                            previewRequestBuilder?.set(
                                CaptureRequest.CONTROL_AF_MODE,
                                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE
                            )
                            previewRequestBuilder?.set(
                                CaptureRequest.CONTROL_AE_MODE,
                                CaptureRequest.CONTROL_AE_MODE_ON_AUTO_FLASH
                            )
                            
                            val previewRequest = previewRequestBuilder?.build()
                            captureSession?.setRepeatingRequest(
                                previewRequest!!,
                                null,
                                null
                            )
                        } catch (e: Exception) {
                            Log.e(TAG, "Error starting preview", e)
                        }
                    }
                    
                    override fun onConfigureFailed(session: CameraCaptureSession) {
                        Log.e(TAG, "Failed to configure camera")
                    }
                },
                null
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error creating camera preview session", e)
        }
    }
    
    fun closeCamera() {
        try {
            cameraOpenCloseLock.acquire()
            captureSession?.close()
            captureSession = null
            cameraDevice?.close()
            cameraDevice = null
            imageReader?.close()
            imageReader = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing camera", e)
        } finally {
            cameraOpenCloseLock.release()
        }
    }
    
    private fun chooseOptimalSize(choices: Array<android.util.Size>): android.util.Size {
        // Target 9:16 aspect ratio (portrait)
        val targetAspectRatio = 9.0 / 16.0
        val targetWidth = 720  // Target resolution for good performance
        val targetHeight = (targetWidth / targetAspectRatio).toInt()
        
        val candidates = mutableListOf<android.util.Size>()
        
        // Find sizes that match 9:16 aspect ratio (portrait orientation)
        for (option in choices) {
            if (option.width <= MAX_PREVIEW_WIDTH && option.height <= MAX_PREVIEW_HEIGHT) {
                val aspectRatio = option.width.toDouble() / option.height.toDouble()
                // Check if aspect ratio is close to 9:16 (with tolerance)
                if (Math.abs(aspectRatio - targetAspectRatio) < 0.1) {
                    candidates.add(option)
                }
            }
        }
        
        // If we found 9:16 candidates, pick the one closest to target resolution
        if (candidates.isNotEmpty()) {
            return candidates.minByOrNull { 
                Math.abs(it.width - targetWidth) + Math.abs(it.height - targetHeight)
            } ?: candidates[0]
        }
        
        // Fallback: choose the tallest available size (portrait)
        return choices.filter { 
            it.width <= MAX_PREVIEW_WIDTH && it.height <= MAX_PREVIEW_HEIGHT 
        }.maxByOrNull { it.height } ?: choices[0]
    }
    
    private fun imageToByteArray(image: android.media.Image): ByteArray {
        val width = image.width
        val height = image.height
        
        val yPlane = image.planes[0]
        val uPlane = image.planes[1]
        val vPlane = image.planes[2]
        
        val yBuffer = yPlane.buffer
        val uBuffer = uPlane.buffer
        val vBuffer = vPlane.buffer
        
        val yRowStride = yPlane.rowStride
        // val yPixelStride = yPlane.pixelStride // Always 1 for Y
        
        val uvRowStride = vPlane.rowStride
        val uvPixelStride = vPlane.pixelStride
        
        val ySize = width * height
        val uvSize = width * height / 2
        
        // Allocate exact size for NV21 (Y + VU)
        val nv21 = ByteArray(ySize + uvSize)
        
        // 1. Copy Y Plane (Row by Row to remove padding)
        if (yRowStride == width) {
            // Fast path: no padding
            yBuffer.get(nv21, 0, ySize)
        } else {
            // Slow path: skip padding bytes at end of each row
            for (row in 0 until height) {
                yBuffer.position(row * yRowStride)
                yBuffer.get(nv21, row * width, width)
            }
        }
        
        // 2. Copy UV Plane (NV21 expects V first, then U)
        // We assume semi-planar (pixelStride == 2) which is standard for camera2 API
        if (uvPixelStride == 2) {
            // For NV21, we want the V buffer. In semi-planar, V and U are interleaved.
            // V buffer usually starts at V, U buffer starts at U (offset by 1).
            // We copy row-by-row from V buffer.
            // Each row in UV plane has 'width' bytes (width/2 pixels * 2 bytes/pixel)
            
            val uvHeight = height / 2
            
            for (row in 0 until uvHeight) {
                vBuffer.position(row * uvRowStride)
                
                // Calculate offset in output array
                val outputOffset = ySize + (row * width)
                
                if (outputOffset + width <= nv21.size) {
                    // We need to handle the case where the last row might be shorter or buffer ends
                    val bytesToCopy = Math.min(width, vBuffer.remaining())
                    vBuffer.get(nv21, outputOffset, bytesToCopy)
                }
            }
        } else {
            // Fallback for planar or other formats: just fill with 128 (gray) to avoid crashes
            // This ensures geometry (Y) is correct even if color is lost
            for (i in ySize until nv21.size) {
                nv21[i] = 128.toByte()
            }
        }
        
        return nv21
    }
}

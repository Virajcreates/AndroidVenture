package com.androidventure.edgedetector

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Handles uploading processed frames to a remote server via HTTP POST.
 * Uses OkHttp for efficient networking with connection pooling and timeouts.
 */
class FrameUploader(private val serverUrl: String) {
    
    companion object {
        private const val TAG = "FrameUploader"
        private const val UPLOAD_TIMEOUT_SECONDS = 5L
        private const val JPEG_QUALITY = 80
        private const val MAX_FRAME_DIMENSION = 640 // Downscale for network efficiency
    }
    
    private val client = OkHttpClient.Builder()
        .connectTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .writeTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .readTimeout(UPLOAD_TIMEOUT_SECONDS, TimeUnit.SECONDS)
        .build()
    
    private val mediaType = "application/json; charset=utf-8".toMediaType()
    
    private var uploadCount = 0L
    private var errorCount = 0L
    
    /**
     * Upload a bitmap frame to the server as base64 encoded JPEG.
     * This is non-blocking and runs on OkHttp's internal thread pool.
     * 
     * @param bitmap The processed frame to upload
     * @param onSuccess Optional callback on successful upload
     * @param onFailure Optional callback on failure
     */
    fun uploadFrame(
        bitmap: Bitmap,
        onSuccess: (() -> Unit)? = null,
        onFailure: ((Exception) -> Unit)? = null
    ) {
        try {
            // Downscale if too large
            val scaledBitmap = if (bitmap.width > MAX_FRAME_DIMENSION || bitmap.height > MAX_FRAME_DIMENSION) {
                val scale = MAX_FRAME_DIMENSION.toFloat() / maxOf(bitmap.width, bitmap.height)
                val newWidth = (bitmap.width * scale).toInt()
                val newHeight = (bitmap.height * scale).toInt()
                Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, false)
            } else {
                bitmap
            }
            
            // Compress to JPEG
            val outputStream = ByteArrayOutputStream()
            scaledBitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, outputStream)
            val jpegBytes = outputStream.toByteArray()
            
            // Clean up scaled bitmap if we created one
            if (scaledBitmap != bitmap) {
                scaledBitmap.recycle()
            }
            
            // Encode to base64
            val base64Image = Base64.encodeToString(jpegBytes, Base64.NO_WRAP)
            val dataUrl = "data:image/jpeg;base64,$base64Image"
            
            // Create JSON payload
            val json = JSONObject().apply {
                put("image", dataUrl)
            }
            
            // Build request
            val body = json.toString().toRequestBody(mediaType)
            val request = Request.Builder()
                .url(serverUrl)
                .post(body)
                .build()
            
            // Execute async
            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    errorCount++
                    Log.w(TAG, "Upload failed: ${e.message} (errors: $errorCount)")
                    onFailure?.invoke(e)
                }
                
                override fun onResponse(call: Call, response: Response) {
                    response.use {
                        if (response.isSuccessful) {
                            uploadCount++
                            Log.d(TAG, "Frame uploaded successfully (total: $uploadCount)")
                            onSuccess?.invoke()
                        } else {
                            errorCount++
                            val error = IOException("Server returned ${response.code}")
                            Log.w(TAG, "Upload failed: ${error.message}")
                            onFailure?.invoke(error)
                        }
                    }
                }
            })
            
        } catch (e: Exception) {
            errorCount++
            Log.e(TAG, "Error preparing upload: ${e.message}", e)
            onFailure?.invoke(e)
        }
    }
    
    /**
     * Get upload statistics
     */
    fun getStats(): Pair<Long, Long> = Pair(uploadCount, errorCount)
    
    /**
     * Reset statistics
     */
    fun resetStats() {
        uploadCount = 0
        errorCount = 0
    }
    
    /**
     * Shutdown the uploader and release resources
     */
    fun shutdown() {
        client.dispatcher.executorService.shutdown()
        client.connectionPool.evictAll()
    }
}

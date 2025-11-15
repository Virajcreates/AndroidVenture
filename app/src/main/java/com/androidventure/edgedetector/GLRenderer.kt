package com.androidventure.edgedetector

import android.content.Context
import android.graphics.Bitmap
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.util.Log
import android.view.TextureView
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.FloatBuffer
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10

class GLRenderer(private val context: Context) {
    
    companion object {
        private const val TAG = "GLRenderer"
        
        private const val VERTEX_SHADER = """
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            void main() {
                gl_Position = aPosition;
                vTexCoord = aTexCoord;
            }
        """
        
        private const val FRAGMENT_SHADER = """
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uTexture;
            void main() {
                gl_FragColor = texture2D(uTexture, vTexCoord);
            }
        """
        
        private val VERTICES = floatArrayOf(
            -1.0f, -1.0f, 0.0f,  // Bottom left
             1.0f, -1.0f, 0.0f,  // Bottom right
            -1.0f,  1.0f, 0.0f,  // Top left
             1.0f,  1.0f, 0.0f   // Top right
        )
        
        private val TEX_COORDS = floatArrayOf(
            0.0f, 1.0f,  // Bottom left
            1.0f, 1.0f,  // Bottom right
            0.0f, 0.0f,  // Top left
            1.0f, 0.0f   // Top right
        )
    }
    
    private var glSurfaceView: GLSurfaceView? = null
    private var program = 0
    private var textureId = 0
    private var vertexBuffer: FloatBuffer
    private var texCoordBuffer: FloatBuffer
    
    private var currentBitmap: Bitmap? = null
    private var needsTextureUpdate = false
    
    init {
        vertexBuffer = ByteBuffer.allocateDirect(VERTICES.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(VERTICES)
        vertexBuffer.position(0)
        
        texCoordBuffer = ByteBuffer.allocateDirect(TEX_COORDS.size * 4)
            .order(ByteOrder.nativeOrder())
            .asFloatBuffer()
            .put(TEX_COORDS)
        texCoordBuffer.position(0)
    }
    
    fun initialize(textureView: TextureView) {
        glSurfaceView = GLSurfaceView(context)
        glSurfaceView?.setEGLContextClientVersion(2)
        glSurfaceView?.setRenderer(object : GLSurfaceView.Renderer {
            override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
                setupGL()
            }
            
            override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
                GLES20.glViewport(0, 0, width, height)
            }
            
            override fun onDrawFrame(gl: GL10?) {
                render()
            }
        })
        glSurfaceView?.renderMode = GLSurfaceView.RENDERMODE_WHEN_DIRTY
    }
    
    private fun setupGL() {
        GLES20.glClearColor(0.0f, 0.0f, 0.0f, 1.0f)
        
        val vertexShader = loadShader(GLES20.GL_VERTEX_SHADER, VERTEX_SHADER)
        val fragmentShader = loadShader(GLES20.GL_FRAGMENT_SHADER, FRAGMENT_SHADER)
        
        program = GLES20.glCreateProgram()
        GLES20.glAttachShader(program, vertexShader)
        GLES20.glAttachShader(program, fragmentShader)
        GLES20.glLinkProgram(program)
        
        val textureIds = IntArray(1)
        GLES20.glGenTextures(1, textureIds, 0)
        textureId = textureIds[0]
        
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureId)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
    }
    
    private fun loadShader(type: Int, shaderCode: String): Int {
        val shader = GLES20.glCreateShader(type)
        GLES20.glShaderSource(shader, shaderCode)
        GLES20.glCompileShader(shader)
        return shader
    }
    
    private fun render() {
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT)
        
        if (needsTextureUpdate && currentBitmap != null) {
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureId)
            GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, currentBitmap, 0)
            needsTextureUpdate = false
        }
        
        GLES20.glUseProgram(program)
        
        val positionHandle = GLES20.glGetAttribLocation(program, "aPosition")
        GLES20.glEnableVertexAttribArray(positionHandle)
        GLES20.glVertexAttribPointer(positionHandle, 3, GLES20.GL_FLOAT, false, 12, vertexBuffer)
        
        val texCoordHandle = GLES20.glGetAttribLocation(program, "aTexCoord")
        GLES20.glEnableVertexAttribArray(texCoordHandle)
        GLES20.glVertexAttribPointer(texCoordHandle, 2, GLES20.GL_FLOAT, false, 8, texCoordBuffer)
        
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, textureId)
        
        val textureHandle = GLES20.glGetUniformLocation(program, "uTexture")
        GLES20.glUniform1i(textureHandle, 0)
        
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        
        GLES20.glDisableVertexAttribArray(positionHandle)
        GLES20.glDisableVertexAttribArray(texCoordHandle)
    }
    
    fun updateTexture(imageData: ByteArray, width: Int, height: Int) {
        try {
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val buffer = ByteBuffer.wrap(imageData)
            bitmap.copyPixelsFromBuffer(buffer)
            
            currentBitmap = bitmap
            needsTextureUpdate = true
            glSurfaceView?.requestRender()
        } catch (e: Exception) {
            Log.e(TAG, "Error updating texture", e)
        }
    }
    
    fun release() {
        currentBitmap?.recycle()
        currentBitmap = null
    }
}

cmake_minimum_required(VERSION 3.22.1)

project("native-lib")

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Add OpenCV
# Note: You'll need to download OpenCV Android SDK and place it in cpp/opencv/
set(OpenCV_DIR ${CMAKE_CURRENT_SOURCE_DIR}/opencv/sdk/native/jni)
find_package(OpenCV REQUIRED)

# Include directories
include_directories(${OpenCV_INCLUDE_DIRS})

# Add native library
add_library(native-lib SHARED
        native-lib.cpp
        edge_processor.cpp
)

# Link libraries
target_link_libraries(native-lib
        ${OpenCV_LIBS}
        android
        log
        jnigraphics
)

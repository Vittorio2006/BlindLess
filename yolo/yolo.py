import streamlit as st
from streamlit_webrtc import webrtc_streamer
import torch
import cv2
import av
import numpy as np

# Load the pre-trained YOLOv5 model
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

st.title("Real-Time Object Detection with YOLOv5")

def video_frame_callback(frame):
    # Convert the video frame to a numpy array
    img = frame.to_ndarray(format="bgr24")

    # Perform object detection using YOLOv5
    results = model(img)

    # Draw bounding boxes on the image
    img_with_boxes = np.squeeze(results.render())

    # Convert back to VideoFrame for displaying in Streamlit
    return av.VideoFrame.from_ndarray(img_with_boxes, format="bgr24")

# Use WebRTC to handle the webcam stream
webrtc_streamer(key="example", video_frame_callback=video_frame_callback)

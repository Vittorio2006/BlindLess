import streamlit as st
import torch
import numpy as np
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase, VideoFrame

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

class VideoProcessor(VideoProcessorBase):
    def __init__(self):
        super().__init__()

    def recv(self, frame: VideoFrame) -> VideoFrame:
        # Converti il frame in un array numpy
        img = frame.to_ndarray(format="bgr24")

        # Effettua l'object detection
        results = model(img)

        # Disegna i bounding box
        img_with_boxes = np.squeeze(results.render())

        # Converti di nuovo in un frame VideoFrame
        return VideoFrame.from_ndarray(img_with_boxes, format="bgr24")

# Usa Streamlit WebRTC per gestire il flusso della webcam
webrtc_streamer(
    key="example",
    video_processor_factory=VideoProcessor,
    media_stream_constraints={"video": True, "audio": False}
)

import streamlit as st
import torch
import numpy as np
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

class VideoProcessor(VideoProcessorBase):
    def __init__(self):
        super().__init__()

    def transform(self, frame):
        try:
            # Converti il frame in un array numpy
            img = frame.to_ndarray(format="bgr24")

            # Riduci la risoluzione del frame (opzionale, se necessario per prestazioni)
            height, width, _ = img.shape
            new_width = 640
            new_height = int((new_width / width) * height)
            img_resized = cv2.resize(img, (new_width, new_height))

            # Effettua l'object detection
            results = model(img_resized)

            # Disegna i bounding box
            img_with_boxes = np.squeeze(results.render())

            return img_with_boxes
        except Exception as e:
            st.error(f"Error during frame processing: {e}")
            return frame.to_ndarray(format="bgr24")

# Imposta le configurazioni RTC con server STUN e TURN
rtc_configuration = {
    "iceServers": [
        {"urls": ["stun:stun.l.google.com:19302"]},
        {"urls": ["stun:stun1.l.google.com:19302"]},
        {"urls": ["stun:stun2.l.google.com:19302"]},
        {"urls": ["turn:your.turn.server:3478"], "username": "your_username", "credential": "your_password"}
    ]
}

# Usa Streamlit WebRTC per gestire il flusso della webcam
webrtc_streamer(
    key="example",
    video_processor_factory=VideoProcessor,
    media_stream_constraints={"video": True, "audio": False},
    rtc_configuration=rtc_configuration,
)

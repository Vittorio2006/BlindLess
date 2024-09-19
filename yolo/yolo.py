import streamlit as st
import torch
import numpy as np
from streamlit_webrtc import webrtc_streamer, VideoTransformerBase

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

class VideoTransformer(VideoTransformerBase):
    def transform(self, frame):
        # Converti il frame in un array numpy
        img = frame.to_ndarray(format="bgr24")

        # Effettua l'object detection
        results = model(img)

        # Disegna i bounding box
        img_with_boxes = np.squeeze(results.render())

        return img_with_boxes

# Usa Streamlit WebRTC per gestire il flusso della webcam
webrtc_streamer(key="example", video_transformer=VideoTransformer, media_stream_constraints={"video": True, "audio": False})

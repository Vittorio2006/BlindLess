import streamlit as st
import numpy as np
import cv2
from ultralytics import YOLO
import base64

# Carica il modello YOLO
@st.cache_resource
def load_model():
    return YOLO('yolov5su.pt')

model = load_model()

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Funzione per elaborare il frame
def process_frame(frame):
    # Applica YOLOv5 per il rilevamento degli oggetti
    results = model.predict(frame)
    # Disegna i bounding box sul frame
    annotated_frame = results[0].plot()
    return annotated_frame

# Funzione per ricevere il video dalla webcam
def webcam_video():
    video_source = cv2.VideoCapture(0)
    frame_placeholder = st.empty()  # Placeholder per l'immagine

    while st.session_state.detecting:
        ret, frame = video_source.read()
        if not ret:
            st.error("Errore nell'acquisizione del video.")
            break
        
        # Processa il frame
        annotated_frame = process_frame(frame)

        # Converti l'immagine annotata in un formato compatibile con Streamlit
        _, buffer = cv2.imencode('.jpg', annotated_frame)
        img_bytes = base64.b64encode(buffer).decode('utf-8')
        img_url = f"data:image/jpeg;base64,{img_bytes}"

        # Mostra l'immagine annotata nel placeholder
        frame_placeholder.image(img_url, use_column_width=True)

    video_source.release()

# Inizio del video dalla webcam
if 'detecting' not in st.session_state:
    st.session_state.detecting = False

if st.button('Inizia Rilevamento Oggetti'):
    st.session_state.detecting = True
    webcam_video()
    st.session_state.detecting = False

if st.button('Ferma Rilevamento'):
    st.session_state.detecting = False

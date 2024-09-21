import streamlit as st
import numpy as np
import cv2
from ultralytics import YOLO

# Carica il modello YOLO
@st.cache_resource
def load_model():
    return YOLO('yolov5su.pt')

model = load_model()

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Funzione per elaborare il frame
def process_frame(frame):
    results = model.predict(frame)
    annotated_frame = results[0].plot()
    return annotated_frame

# Variabile per il rilevamento
if 'detecting' not in st.session_state:
    st.session_state.detecting = False

# Pulsante per avviare il rilevamento
if st.button('Inizia Rilevamento Oggetti'):
    st.session_state.detecting = True

# Pulsante per fermare il rilevamento
if st.button('Ferma Rilevamento'):
    st.session_state.detecting = False

# Acquisizione video dalla webcam
if st.session_state.detecting:
    video_source = cv2.VideoCapture(0)
    frame_placeholder = st.empty()  # Placeholder per l'immagine

    while st.session_state.detecting:
        ret, frame = video_source.read()
        if not ret:
            st.error("Errore nell'acquisizione del video.")
            break

        # Converti da BGR a RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Processa il frame
        annotated_frame = process_frame(frame)

        # Mostra l'immagine annotata nel placeholder
        frame_placeholder.image(annotated_frame, channels="RGB", use_column_width=True)

    video_source.release()

import streamlit as st
import numpy as np
from ultralytics import YOLO
import cv2

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

# Acquisizione dell'immagine dalla webcam
if st.session_state.detecting:
    frame = st.camera_input("Scatta una foto", key="camera_input")

    if frame is not None:
        # Leggi l'immagine
        img = cv2.imdecode(np.frombuffer(frame.read(), np.uint8), cv2.IMREAD_COLOR)

        # Processa il frame
        annotated_frame = process_frame(img)

        # Converti da BGR a RGB
        annotated_frame = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)

        # Mostra l'immagine annotata
        st.image(annotated_frame, channels="RGB", use_column_width=True)

import streamlit as st
import numpy as np
import cv2
from ultralytics import YOLO
from PIL import Image
import time

# Carica il modello YOLO
@st.cache_resource
def load_model():
    return YOLO('yolov5su.pt')

model = load_model()

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Crea un'area per mostrare il feed della webcam e i risultati del rilevamento
stframe = st.empty()

# Funzione per catturare il video dalla webcam e processare i frame con YOLOv5
def webcam_object_detection():
    cap = cv2.VideoCapture(0)  # Apre la webcam (assicurati che l'indice 0 sia corretto)
    
    # Imposta le dimensioni della finestra di cattura
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    
    # Loop continuo per la cattura e il rilevamento degli oggetti
    while cap.isOpened():
        ret, frame = cap.read()  # Cattura un frame dalla webcam
        if not ret:
            st.error("Errore nell'acquisizione della webcam")
            break

        # Converti il frame da BGR a RGB per l'elaborazione da parte del modello YOLO
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Applica YOLOv5 per il rilevamento degli oggetti
        results = model.predict(frame_rgb)

        # Se sono stati rilevati oggetti, disegna i bounding box sul frame
        annotated_frame = results[0].plot()  # Disegna i bounding box

        # Converti l'immagine annotata in formato PIL per visualizzarla in Streamlit
        img_pil = Image.fromarray(annotated_frame)

        # Aggiorna il frame nell'interfaccia utente
        stframe.image(img_pil, use_column_width=True)

        # Aggiungi un ritardo per evitare di sovraccaricare l'interfaccia
        time.sleep(0.03)

    cap.release()  # Rilascia la webcam

# Bottone per iniziare l'acquisizione dalla webcam
if st.button("Inizia Rilevamento Oggetti"):
    webcam_object_detection()

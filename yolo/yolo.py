import streamlit as st
import cv2
import torch
import numpy as np

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

# Imposta il titolo dell'app
st.title("Real-Time Object Detection con YOLOv5")

# Checkbox per avviare/arrestare la webcam
run = st.checkbox('Avvia webcam')

# Placeholder per l'immagine elaborata
FRAME_WINDOW = st.image([])

# Variabile cap solo se la webcam è avviata
cap = None

if run:
    # Inizializza la webcam
    cap = cv2.VideoCapture(0)
    
    # Loop per elaborare il flusso video in tempo reale
    while True:
        ret, frame = cap.read()
        if not ret:
            st.error("Errore nell'acquisizione del video.")
            break

        # Converti il frame BGR in RGB per la visualizzazione
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # YOLOv5: Effettua l'object detection sul frame
        results = model(frame)

        # Disegna i bounding box e le etichette sul frame
        frame_with_boxes = np.squeeze(results.render())  # results.render() restituisce una lista
        
        # Mostra il frame con i bounding box nella UI
        FRAME_WINDOW.image(frame_with_boxes, channels="RGB")
    
    # Rilascia la videocamera al termine
    cap.release()

else:
    st.write("Premi il checkbox qui sopra per avviare la webcam.")

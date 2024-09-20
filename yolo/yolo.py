import streamlit as st
import torch
import numpy as np
from PIL import Image
import cv2
import tempfile

# Carica il modello pre-addestrato YOLOv5 e conferma la fiducia nel repository
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True, trust_repo=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Usa OpenCV per accedere alla webcam
cap = cv2.VideoCapture(0)  # 0 è l'indice della webcam principale

# Crea una funzione per acquisire e processare i frame dalla webcam
def process_frame(frame):
    # Converti l'immagine da BGR (usato da OpenCV) a RGB (usato da PIL e YOLOv5)
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Applica YOLOv5 per il rilevamento degli oggetti
    results = model(frame_rgb)

    # Ottieni l'immagine con i bounding box sovrapposti
    img_with_boxes = np.squeeze(results.render())

    return img_with_boxes

# Mostra la webcam in tempo reale e applica il modello YOLOv5 sui frame
stframe = st.empty()  # Per aggiornare i frame nel tempo

while cap.isOpened():
    ret, frame = cap.read()  # Acquisisci un frame dalla webcam
    if not ret:
        st.warning("Impossibile acquisire il frame dalla webcam.")
        break

    # Processa il frame con YOLOv5
    frame_with_boxes = process_frame(frame)

    # Mostra il frame processato nella UI di Streamlit
    stframe.image(frame_with_boxes, channels="RGB")

    # Aggiungi un ritardo per rallentare l'aggiornamento (facoltativo)
    if st.button('Stop'):
        break

# Rilascia la webcam quando l'app viene fermata
cap.release()

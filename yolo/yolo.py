import streamlit as st
import numpy as np
from PIL import Image
import cv2  # OpenCV per gestire la webcam
from ultralytics import YOLO
import torch

# Carica il modello YOLOv5 pre-addestrato
model = YOLO('yolov5su.pt')

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Cattura il feed della webcam usando OpenCV
run = st.checkbox('Avvia rilevamento oggetti')

FRAME_WINDOW = st.image([])

camera = cv2.VideoCapture(0)

while run:
    _, frame = camera.read()
    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    # Applica il modello YOLOv5 sul frame corrente
    results = model.predict(frame_rgb)

    # Ottieni l'immagine con i bounding box
    img_with_boxes = results[0].plot()
    
    # Visualizza l'immagine processata
    FRAME_WINDOW.image(img_with_boxes)

else:
    st.write("Rilevamento oggetti fermo.")
    camera.release()

import streamlit as st
import cv2
import torch
import numpy as np
from PIL import Image
from streamlit.components.v1 import html

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Aggiungi un componente HTML per accedere alla fotocamera
html_code = """
<video autoplay playsinline></video>
<script>
const videoElement = document.querySelector('video');
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    videoElement.srcObject = stream;
  });
</script>
"""

html(html_code)

# Simula l'acquisizione del video caricando un'immagine di esempio (o implementa un modo per trasferire il video stream)
uploaded_file = st.file_uploader("Carica un'immagine o un frame video", type=["jpg", "jpeg", "png"])

if uploaded_file is not None:
    img = np.array(Image.open(uploaded_file))

    # Effettua l'object detection
    results = model(img)

    # Disegna i bounding box
    img_with_boxes = np.squeeze(results.render())

    # Mostra l'immagine elaborata
    st.image(img_with_boxes, caption='Rilevamento Oggetti', use_column_width=True)

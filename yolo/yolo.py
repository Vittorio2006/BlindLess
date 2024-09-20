import streamlit as st
import torch
import numpy as np
from PIL import Image
import io
import base64
import cv2
import time
from ultralytics import YOLO  # Importa direttamente la libreria ultralytics

# Carica il modello pre-addestrato YOLOv5
model = YOLO('yolov5s.pt')  # Carica il modello YOLOv5

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Aggiungi un componente HTML per accedere alla webcam e inviare i frame
html_code = """
<video id="videoElement" autoplay playsinline style="display:none;"></video>
<canvas id="canvasElement"></canvas>
<script>
const videoElement = document.querySelector('#videoElement');
const canvasElement = document.getElementById('canvasElement');
const context = canvasElement.getContext('2d');
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    videoElement.srcObject = stream;
  });

function captureFrame() {
  // Imposta la risoluzione del canvas in base alla dimensione del video
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Disegna il video nel canvas
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

  // Converti il frame in base64 e invialo al server
  const dataUrl = canvasElement.toDataURL('image/png');
  fetch('/process_frame', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl })
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('processedFrame').src = data.processed_image;
  });
}

// Cattura un frame ogni 500ms
setInterval(captureFrame, 500);
</script>

<img id="processedFrame" style="width: 100%;"/>
"""

# Inserisci il codice HTML in Streamlit
st.components.v1.html(html_code, height=500)

# Funzione per processare i frame inviati in base64
def process_frame(image_base64):
    # Decodifica l'immagine da base64
    header, image_base64 = image_base64.split(',')
    img_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(img_data))
    image_np = np.array(image)

    # Applica YOLOv5 per il rilevamento degli oggetti
    results = model.predict(image_np)

    # Ottieni l'immagine con i bounding box sovrapposti
    img_with_boxes = np.squeeze(results.render())

    # Converti l'immagine in formato PIL
    img_pil = Image.fromarray(img_with_boxes)

    # Converti l'immagine con i bounding box in base64 per ritornarla al client
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    return img_base64

# Usa il nuovo metodo st.query_params
query_params = st.query_params

if 'image' in query_params:
    image_base64 = query_params['image'][0]
    processed_img_base64 = process_frame(image_base64)
    
    # Restituisci l'immagine elaborata con YOLOv5 come risposta JSON
    st.json({
        "processed_image": f"data:image/png;base64,{processed_img_base64}"
    })

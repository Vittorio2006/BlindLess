import streamlit as st
import numpy as np
from PIL import Image
import io
import base64
from ultralytics import YOLO  # Importa direttamente la libreria ultralytics

# Carica il modello pre-addestrato YOLOv5
model = YOLO('yolov5su.pt')  # Usa il nuovo modello migliorato

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
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  
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

setInterval(captureFrame, 500);
</script>

<img id="processedFrame" style="width: 100%;"/>
"""

st.components.v1.html(html_code, height=500)

def process_frame(image_base64):
    header, image_base64 = image_base64.split(',')
    img_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(img_data)).convert("RGB")  # Assicurati che l'immagine sia in RGB
    image_np = np.array(image)

    # Applica YOLOv5 per il rilevamento degli oggetti
    results = model.predict(image_np, show=True)  # Usa show=True per visualizzare i risultati (opzionale)
    
    # Controlla se ci sono risultati
    if results:
        img_with_boxes = results[0].plot()  # Ritorna l'immagine con i bounding box
    else:
        img_with_boxes = image_np  # Se non ci sono risultati, ritorna l'immagine originale

    img_pil = Image.fromarray(img_with_boxes)

    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    return img_base64

query_params = st.query_params

if 'image' in query_params:
    image_base64 = query_params['image'][0]
    processed_img_base64 = process_frame(image_base64)
    
    st.json({
        "processed_image": f"data:image/png;base64,{processed_img_base64}"
    })

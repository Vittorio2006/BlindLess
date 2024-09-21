import streamlit as st
import numpy as np
from PIL import Image
import io
import base64
from ultralytics import YOLO

@st.cache_resource
def load_model():
    return YOLO('yolov5su.pt')

model = load_model()

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Aggiungi HTML e JavaScript per accedere alla webcam
html_code = """
<video id="videoElement" autoplay playsinline style="display:none;"></video>
<canvas id="canvasElement" style="display:none;"></canvas>
<script>
const videoElement = document.querySelector('#videoElement');
const canvasElement = document.getElementById('canvasElement');
const context = canvasElement.getContext('2d');

navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    videoElement.srcObject = stream;
  })
  .catch((err) => {
    console.error("Errore nell'accesso alla webcam:", err);
  });

function captureFrame() {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
  
  const dataUrl = canvasElement.toDataURL('image/png');

  // Invia l'immagine al server Streamlit
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

setInterval(captureFrame, 500);  // Cattura frame ogni 500 ms
</script>

<img id="processedFrame" style="width: 100%;"/>
"""

# Mostra il codice HTML in Streamlit
st.components.v1.html(html_code, height=500)

# Funzione per processare il frame inviato
def process_frame(image_base64):
    # Rimuove l'intestazione base64 e decodifica l'immagine
    header, image_base64 = image_base64.split(',')
    img_data = base64.b64decode(image_base64)
    
    # Converte i dati in un'immagine PIL
    image = Image.open(io.BytesIO(img_data)).convert("RGB")
    image_np = np.array(image)

    # Applica YOLOv5 per il rilevamento degli oggetti
    results = model.predict(image_np)

    # Se ci sono risultati, applica i bounding box
    if results:
        img_with_boxes = results[0].plot()
    else:
        img_with_boxes = image_np

    # Converti l'immagine numpy con i bounding box in PIL
    img_pil = Image.fromarray(img_with_boxes)

    # Converte l'immagine PIL in base64
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    return img_base64

# Endpoint per processare il frame
if 'image' in st.query_params:
    image_data = st.query_params['image'][0]
    processed_img_base64 = process_frame(image_data)
    
    st.json({
        "processed_image": f"data:image/png;base64,{processed_img_base64}"
    })

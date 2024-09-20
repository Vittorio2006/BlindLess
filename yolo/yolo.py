import streamlit as st
import torch
import numpy as np
from PIL import Image
import io
import base64

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True, trust_repo=True)

st.title("Rilevamento Oggetti in Tempo Reale con YOLOv5")

# Aggiungi un componente HTML per accedere alla fotocamera e inviare i frame al server
html_code = """
<video id="videoElement" autoplay playsinline></video>
<canvas id="canvasElement" style="display: none;"></canvas>
<script>
const videoElement = document.querySelector('video');
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
  
  // Converti il frame in un blob e invia al server come stringa base64
  canvasElement.toBlob((blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      const base64data = reader.result;
      fetch('/process_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: base64data })
      }).then(response => response.json())
        .then(data => {
          document.getElementById('processedFrame').src = data.processed_image;
        });
    };
  }, 'image/png');
}

setInterval(captureFrame, 500);  // Cattura un frame ogni 500ms
</script>

<img id="processedFrame" style="width: 100%;"/>
"""

# Inserisci il codice HTML in Streamlit
st.components.v1.html(html_code, height=300)

# Definisci il punto finale per il caricamento dei frame
query_params = st.query_params

if query_params.get("video_process") == ["true"]:
    # Riceve il frame in formato base64 e lo processa con YOLOv5
    image_base64 = query_params.get("image")[0]
    
    # Decodifica l'immagine
    header, image_base64 = image_base64.split(',')
    img_data = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(img_data))
    image_np = np.array(image)

    # Effettua l'object detection con YOLOv5
    results = model(image_np)

    # Converti l'immagine con i bounding box
    img_with_boxes = np.squeeze(results.render())

    # Converti l'immagine in base64
    img_pil = Image.fromarray(img_with_boxes)
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    img_bytes = buf.getvalue()
    img_base64 = base64.b64encode(img_bytes).decode("utf-8")

    # Restituisci l'immagine elaborata come risposta JSON
    st.json({
        "processed_image": f"data:image/png;base64,{img_base64}"
    })

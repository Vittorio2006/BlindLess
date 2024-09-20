import streamlit as st
from fastapi import FastAPI, File, UploadFile
from starlette.responses import StreamingResponse
import torch
import io
from PIL import Image
import numpy as np
import uvicorn
from threading import Thread

# Carica il modello pre-addestrato YOLOv5
model = torch.hub.load('ultralytics/yolov5', 'yolov5s', pretrained=True)

# Crea un'app FastAPI
app = FastAPI()

# Funzione per processare il frame con YOLOv5
@app.post("/process_frame")
async def process_frame(file: UploadFile = File(...)):
    image = Image.open(file.file)
    image_np = np.array(image)

    # Effettua l'object detection con YOLOv5
    results = model(image_np)

    # Converti l'immagine con i bounding box in un buffer
    img_with_boxes = np.squeeze(results.render())
    img_pil = Image.fromarray(img_with_boxes)
    buf = io.BytesIO()
    img_pil.save(buf, format='PNG')
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/png")

# Funzione per eseguire FastAPI in background
def run_fastapi():
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Avvia FastAPI in un thread separato
thread = Thread(target=run_fastapi)
thread.daemon = True
thread.start()

# Interfaccia utente con Streamlit
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
  
  // Converti il frame in un blob e invia al server
  canvasElement.toBlob((blob) => {
    const formData = new FormData();
    formData.append('frame', blob, 'frame.png');
    
    fetch('http://localhost:8000/process_frame', {
      method: 'POST',
      body: formData
    }).then(response => response.blob())
      .then(processedBlob => {
        const imgUrl = URL.createObjectURL(processedBlob);
        document.getElementById('processedFrame').src = imgUrl;
      });
  }, 'image/png');
}

// Cattura e invia un frame ogni 500ms
setInterval(captureFrame, 500);
</script>

<img id="processedFrame" style="width: 100%;"/>
"""

# Inserisci il codice HTML in Streamlit
st.components.v1.html(html_code)

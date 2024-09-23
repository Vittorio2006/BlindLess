import numpy as np
import cv2
import pyttsx3
import threading
import time
import winsound
from ultralytics import YOLO
import logging

# Configurazione logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# Carica il modello YOLO
def load_model():
    return YOLO('yolov5su.pt')

model = load_model()

# Inizializza il sintetizzatore vocale
engine = pyttsx3.init()
engine.setProperty('volume', 1.0)  # Imposta il volume massimo

# Variabili globali
object_detected = False
current_object_name = None
last_distance = None
bip_playing = False
last_alert_time = 0
ALERT_DEBOUNCE_TIME = 2

# Funzione per stimare la distanza dell'oggetto
def estimate_distance(bbox_width, known_width=0.5, focal_length=800):
    distance = (known_width * focal_length) / bbox_width
    return distance

# Funzione per l'annuncio vocale
def voice_alert(object_name, distance):
    alert_message = f"Attenzione, c'è un {object_name} di fronte a te a {distance:.1f} metri."
    logging.info(f"Annuncio vocale: {alert_message}")
    
    # Prova a utilizzare una voce differente
    voices = engine.getProperty('voices')
    if voices:
        engine.setProperty('voice', voices[0].id)  # Imposta la prima voce disponibile
    
    engine.say(alert_message)
    engine.runAndWait()  # Esegui l'avviso vocale

# Funzione per gestire il bip
def start_bip():
    global bip_playing
    if not bip_playing:
        def play_bip():
            while object_detected:
                winsound.Beep(1000, 500)
                time.sleep(0.5)
        thread = threading.Thread(target=play_bip)
        thread.start()
        bip_playing = True

def stop_bip():
    global bip_playing
    bip_playing = False

# Funzione per elaborare il frame
def process_frame(frame):
    global object_detected, current_object_name, last_distance, last_alert_time
    results = model.predict(frame)
    annotated_frame = results[0].plot()
    
    object_in_center = False

    for result in results:
        boxes = result.boxes
        for box in boxes:
            cls = int(box.cls[0])
            bbox = box.xyxy[0].cpu().numpy()
            bbox_width = bbox[2] - bbox[0]

            distance = estimate_distance(bbox_width)
            frame_center_x = frame.shape[1] // 2
            obj_center_x = (bbox[0] + bbox[2]) // 2

            if abs(frame_center_x - obj_center_x) < 50:
                object_name = model.names[cls]
                object_in_center = True

                current_time = time.time()
                if current_time - last_alert_time > ALERT_DEBOUNCE_TIME or current_object_name != object_name:
                    voice_alert(object_name, distance)  # Annuncio vocale
                    last_alert_time = current_time
                    current_object_name = object_name
                    last_distance = distance
                    object_detected = True
                    start_bip()  # Avvia il bip

    if not object_in_center:
        stop_bip()  # Ferma il bip se l'oggetto non è più al centro
        current_object_name = None
        last_distance = None
        object_detected = False

    return annotated_frame

def main():
    # Acquisizione video dalla webcam
    video_source = cv2.VideoCapture(0)

    if not video_source.isOpened():
        print("Errore nell'apertura della webcam.")
        return

    while True:
        ret, frame = video_source.read()
        if not ret:
            print("Errore nell'acquisizione del video.")
            break

        # Converti il frame da BGR a RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Processa il frame e restituisci l'immagine annotata
        annotated_frame = process_frame(frame)

        # Mostra l'immagine annotata
        cv2.imshow('YOLO Object Detection', cv2.cvtColor(annotated_frame, cv2.COLOR_RGB2BGR))

        # Premere 'q' per uscire
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Rilascia la webcam e chiudi tutte le finestre
    video_source.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()

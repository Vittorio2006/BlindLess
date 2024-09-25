const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
let model = undefined;
let children = [];
let lastSpoken = {}; 
let lastBeepTime = 0;  
let selectedDeviceId = null;  

// Caricamento del modello COCO-SSD.
cocoSsd.load().then(function (loadedModel) {
  model = loadedModel;
  console.log("Modello caricato.");
  requestCameraAccess();  // Avvia la richiesta della fotocamera
});

// Funzione per richiedere l'accesso alla fotocamera una sola volta
function requestCameraAccess() {
  navigator.mediaDevices.enumerateDevices().then(devices => {
    let videoDevices = devices.filter(device => device.kind === 'videoinput');

    // Se non ci sono telecamere disponibili
    if (videoDevices.length === 0) {
      console.error('Nessuna fotocamera disponibile');
      return;
    }

    // Seleziona la fotocamera posteriore principale
    let backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back') && !device.label.toLowerCase().includes('wide') && !device.label.toLowerCase().includes('zoom'));

    // Se non esiste una fotocamera posteriore, seleziona quella anteriore
    let frontCamera = videoDevices.find(device => device.label.toLowerCase().includes('front'));

    // Seleziona la migliore fotocamera
    selectedDeviceId = backCamera ? backCamera.deviceId : frontCamera ? frontCamera.deviceId : videoDevices[0].deviceId;

    // Richiedi accesso alla fotocamera selezionata
    navigator.mediaDevices.getUserMedia({
      video: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined }
    })
    .then((stream) => {
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);  // Avvia l'analisi una volta caricati i dati del video
    })
    .catch(error => {
      console.error('Errore nell\'accesso alla fotocamera:', error);
    });
  }).catch(error => {
    console.error("Errore durante l'elenco dei dispositivi:", error);
  });
}

// Funzione per rilevare oggetti
function predictWebcam() {
  if (!model || !video.srcObject) {
    return;
  }

  // Esegui il rilevamento
  model.detect(video).then(function (predictions) {
    // Rimuove eventuali riquadri di delimitazione precedenti
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Loop su tutte le predizioni
    predictions.forEach(prediction => {
      if (prediction.score > 0.5) {
        // Crea il riquadro di delimitazione
        const highlighter = document.createElement('div');
        const left = liveView.clientWidth - (prediction.bbox[0] + prediction.bbox[2]); // Calcola correttamente la posizione sinistra
        highlighter.classList.add('highlighter');
        highlighter.style.left = ${left}px;
        highlighter.style.top = ${prediction.bbox[1]}px;
        highlighter.style.width = ${prediction.bbox[2]}px;
        highlighter.style.height = ${prediction.bbox[3]}px;

        // Crea un'etichetta
        const p = document.createElement('p');
        p.classList.add('prediction-label');
        p.innerText = ${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence;
        p.style.left = ${left}px;
        p.style.top = ${prediction.bbox[1] - 20}px;

        // Aggiungi riquadro e etichetta
        liveView.appendChild(highlighter);
        liveView.appendChild(p);

        // Memorizza per la rimozione successiva
        children.push(highlighter);
        children.push(p);

        // Annuncia la posizione dell'oggetto
        const videoWidth = liveView.clientWidth;
        const objectCenterX = left + prediction.bbox[2] / 2;
        let position = '';

        if (objectCenterX < videoWidth / 3) {
          position = 'left';
        } else if (objectCenterX > (2 * videoWidth) / 3) {
          position = 'right';
        } else {
          position = 'center';
        }

        // Sintesi vocale
        const currentTime = Date.now();
        if (!lastSpoken[prediction.class] || currentTime - lastSpoken[prediction.class] > 5000) {
          announcePosition(prediction.class, position);
          lastSpoken[prediction.class] = currentTime;
        }

        // Stima la distanza e riproduci un bip se necessario
        const bboxWidth = prediction.bbox[2];
        const distance = estimateDistance(bboxWidth, videoWidth);
        if (distance <= 5 && currentTime - lastBeepTime > 1000) {
          playBeep();
          lastBeepTime = currentTime;
        }
      }
    });

    // Continua a prevedere i frame successivi
    window.requestAnimationFrame(predictWebcam);
  });
}

// Funzioni ausiliarie (annuncio vocale, stima della distanza, suono beep)
function announcePosition(object, position) {
  let message = '';
  if (position === 'center') {
    message = There is a ${object} in the center.;
  } else {
    message = There is a ${object} on your ${position}.;
  }

  const speech = new SpeechSynthesisUtterance(message);
  speech.lang = 'en-US';
  window.speechSynthesis.speak(speech);
}

function estimateDistance(bboxWidth, videoWidth) {
  const normalizedWidth = bboxWidth / videoWidth;
  const distance = 1 / normalizedWidth;
  return distance;
}

function playBeep() {
  const beep = new Audio('beep.mp3');
  beep.play();
}

// Avvia automaticamente lo stream della webcam al caricamento della pagina
document.addEventListener('DOMContentLoaded', requestCameraAccess);
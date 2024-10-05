const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
const paragraphs = document.getElementsByClassName("demo-p");
const header = document.getElementById("demo-header");

let model = undefined;
let isRunning = false;
let children = [];
let lastSpoken = {};
let lastBeepTime = 0;
let cameraAccessGranted = false;
let synth = window.speechSynthesis;  // SpeechSynthesis API
let voices = [];

// Carica le voci per garantire la compatibilità con iOS
function loadVoices() {
    voices = synth.getVoices();
    if (!voices.length) {
        // Su iOS, potrebbe essere necessario attendere che le voci siano caricate
        synth.onvoiceschanged = () => {
            voices = synth.getVoices();
        };
    }
}

window.addEventListener('load', loadVoices);

// Lista degli oggetti validi
const validObjects = ['car', 'bicycle', 'truck', 'bus', 'person', 'cat', 'dog', 'chair', 'dining table', 'motorcycle', 'potted plant', 'vase'];

const videoConstraints = {
    audio: false,
    video: {
        facingMode: "environment",
        height: { ideal: 320 },
        width: { ideal: 480 }
    }
};

function SetVideoVisible() {
    video.style.display = "block";
    header.style.display = "none";
    for (let i = 0; i < paragraphs.length; i++) {
        paragraphs[i].style.display = "none";
    }
}

function SetVideoInvisible() {
    video.style.display = "none";
    header.style.display = "block";
    for (let i = 0; i < paragraphs.length; i++) {
        paragraphs[i].style.display = "block";
    }
}

SetVideoInvisible();

// Carica il modello COCO-SSD
cocoSsd.load().then(function(loadedModel) {
    model = loadedModel;
    console.log("Model loaded.");
});

// Attiva la webcam e avvia il rilevamento degli oggetti
function enableCamAndDetect() {
    console.log("Enabling webcam and starting detection...");
    SetVideoVisible();
    navigator.mediaDevices.getUserMedia(videoConstraints).then(function(stream) {
        video.srcObject = stream;
        cameraAccessGranted = true;
        video.onloadeddata = () => {
            isRunning = true;
            predictWebcam();
        };
    }).catch(function(err) {
        console.error("Error accessing webcam: ", err);
    });
}

// Disattiva la webcam e interrompe il rilevamento degli oggetti
function stopCamAndDetect() {
    console.log("Stopping webcam and object detection...");
    SetVideoInvisible();
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    clearBoundingBoxes();
    isRunning = false;
}

// Pulisce tutte le caselle di delimitazione e le etichette
function clearBoundingBoxes() {
    children.forEach(child => liveView.removeChild(child));
    children = [];
}

// Funzione per il rilevamento degli oggetti tramite webcam
function predictWebcam() {
    if (!video.videoWidth || !video.videoHeight) {
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }
    model.detect(video).then(function(predictions) {
        clearBoundingBoxes();
        predictions.forEach(prediction => {
            if (prediction.score >= 0.55 && validObjects.includes(prediction.class)) {
                const highlighter = document.createElement('div');
                highlighter.classList.add('highlighter');
                highlighter.style.left = `${prediction.bbox[0]}px`;
                highlighter.style.top = `${prediction.bbox[1]}px`;
                highlighter.style.width = `${prediction.bbox[2]}px`;
                highlighter.style.height = `${prediction.bbox[3]}px`;

                const p = document.createElement('p');
                p.classList.add('prediction-label');
                p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
                p.style.left = `${prediction.bbox[0]}px`;
                p.style.top = `${prediction.bbox[1] - 20}px`;

                liveView.appendChild(highlighter);
                liveView.appendChild(p);
                children.push(highlighter, p);

                const objectCenterX = prediction.bbox[0] + prediction.bbox[2] / 2;
                const position = objectCenterX < video.videoWidth / 3 ? 'left' : 
                                 (objectCenterX > (2 * video.videoWidth) / 3 ? 'right' : 'center');

                const currentTime = Date.now();
                if (!lastSpoken[prediction.class] || currentTime - lastSpoken[prediction.class] > 5000) {
                    announcePosition(prediction.class, position);
                    lastSpoken[prediction.class] = currentTime;
                }

                const distance = estimateDistance(prediction.bbox[2], video.videoWidth);
                if (distance <= 5 && currentTime - lastBeepTime > 1000) {
                    playBeep();
                    lastBeepTime = currentTime;
                }
            }
        });

        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
    }).catch(err => {
        console.error("Error during object detection: ", err);
    });
}

// Funzione per annunciare la posizione dell'oggetto
function announcePosition(object, position) {
    if (synth.speaking) {
        console.log("SpeechSynthesis still speaking...");
        return;
    }

    const message = position === 'center' ? 
        `There is a ${object} in the center.` : 
        `There is a ${object} on your ${position}.`;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = 'en-US';
    
    // Assicurati che ci sia una voce caricata, altrimenti usa la voce predefinita
    utterance.voice = voices.length ? voices[0] : null;

    // Prova a parlare solo dopo che l'utente ha interagito (su iOS)
    toggleButton.addEventListener('click', () => {
        window.speechSynthesis.speak(utterance);
    });
}

// Funzione per stimare la distanza
function estimateDistance(bboxWidth, videoWidth) {
    const normalizedWidth = bboxWidth / videoWidth;
    return 1 / normalizedWidth;
}

// Riproduci un segnale acustico quando un oggetto è vicino
function playBeep() {
    const beep = new Audio('beep.mp3');
    beep.play();
}

toggleButton.addEventListener('click', function() {
    if (isRunning) {
        stopCamAndDetect();
        toggleButton.innerText = 'Run';
    } else {
        enableCamAndDetect();
        toggleButton.innerText = 'Stop';
    }
});

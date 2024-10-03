const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
let model = undefined;
let isRunning = false;
let children = [];  // To store dynamically created bounding boxes and labels
let lastSpoken = {};  // To prevent spamming announcements
let lastBeepTime = 0;  // Track the last time a beep was played
let cameraAccessGranted = false;  // Track if camera access has been granted



const cards = document.querySelectorAll('.card'); // Seleziona tutte le card
const prevButton = document.getElementById('prevCard'); // Seleziona il pulsante "previous"
const nextButton = document.getElementById('nextCard'); // Seleziona il pulsante "next"
let currentCardIndex = 0; // Indice della card attualmente visualizzata

// Funzione per aggiornare la visibilità delle card
function updateCards() {
    // Nascondi tutte le card
    cards.forEach((card, index) => {
        card.classList.remove('visible'); // Rimuove la classe 'visible' da tutte le card
        if (index === currentCardIndex) {
            card.classList.add('visible'); // Aggiunge la classe 'visible' solo alla card corrente
        }
    });

    // Disabilita il pulsante 'prev' se siamo alla prima card
    if (currentCardIndex === 0) {
        prevButton.disabled = true;
    } else {
        prevButton.disabled = false;
    }

    // Disabilita il pulsante 'next' se siamo all'ultima card
    if (currentCardIndex === cards.length - 1) {
        nextButton.disabled = true;
    } else {
        nextButton.disabled = false;
    }
}

// Event listener per il pulsante "Next"
nextButton.addEventListener('click', () => {
    if (currentCardIndex < cards.length - 1) {
        currentCardIndex++; // Incrementa l'indice
        updateCards(); // Aggiorna la visibilità delle card
    }
});

// Event listener per il pulsante "Previous"
prevButton.addEventListener('click', () => {
    if (currentCardIndex > 0) {
        currentCardIndex--; // Decrementa l'indice
        updateCards(); // Aggiorna la visibilità delle card
    }
});

// Inizializza la visibilità delle card all'avvio della pagina
updateCards();












// Function to check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Load the COCO-SSD model.
cocoSsd.load().then(function(loadedModel) {
    model = loadedModel;
    console.log("Model loaded.");
});

// Enable the webcam stream.
function enableCam() {
    const constraints = { video: true };

    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        cameraAccessGranted = true;  // Set flag to true when camera access is granted
        console.log("Webcam enabled.");
    }).catch(function(err) {
        console.error("Error accessing webcam: ", err);
    });
}

// Stop webcam stream and clear the bounding boxes.
function stopCam() {
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    clearBoundingBoxes();  // Clear bounding boxes and labels
}

// Clear all bounding boxes and labels from the live view.
function clearBoundingBoxes() {
    children.forEach(child => liveView.removeChild(child));
    children = [];  // Clear the array
}

// Start object detection using the webcam feed.
function predictWebcam() {
    if (!video.videoWidth || !video.videoHeight) {
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);  // Skip frame if video not ready
        }
        return;
    }

    model.detect(video).then(function(predictions) {
        clearBoundingBoxes();  // Clear previous predictions

        predictions.forEach(prediction => {
            if (prediction.score > 0.50) {
                // Create a bounding box and label for the prediction
                const highlighter = document.createElement('div');
                highlighter.classList.add('highlighter');
                highlighter.style.left = `${video.videoWidth - prediction.bbox[0] - prediction.bbox[2]}px`;
                highlighter.style.top = `${prediction.bbox[1]}px`;
                highlighter.style.width = `${prediction.bbox[2]}px`;
                highlighter.style.height = `${prediction.bbox[3]}px`;

                const p = document.createElement('p');
                p.classList.add('prediction-label');
                p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
                p.style.left = `${video.videoWidth - prediction.bbox[0] - prediction.bbox[2]}px`;
                p.style.top = `${prediction.bbox[1] - 20}px`;

                // Add to live view and store elements for later removal
                liveView.appendChild(highlighter);
                liveView.appendChild(p);
                children.push(highlighter, p);

                // Determine object's position
                const objectCenterX = video.videoWidth - (prediction.bbox[0] + prediction.bbox[2] / 2);
                let position = (objectCenterX < video.videoWidth / 3) ? 'left' :
                               (objectCenterX > (2 * video.videoWidth) / 3) ? 'right' : 'center';

                // Announce the position if not recently spoken
                const currentTime = Date.now();
                if (!lastSpoken[prediction.class] || currentTime - lastSpoken[prediction.class] > 5000) {
                    announcePosition(prediction.class, position);
                    lastSpoken[prediction.class] = currentTime; // Update last spoken time
                }

                // Estimate distance using bounding box width
                const distance = estimateDistance(prediction.bbox[2], video.videoWidth);
                if (distance <= 5 && currentTime - lastBeepTime > 1000) {
                    playBeep();
                    lastBeepTime = currentTime;  // Update beep time
                }
            }
        });

        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);  // Continue predicting if running
        }
    }).catch(err => {
        console.error("Error during object detection: ", err);
    });
}

// Function to announce the object's position using speech synthesis
function announcePosition(object, position) {
    const message = (position === 'center') 
        ? `There is a ${object} in the center.` 
        : `There is a ${object} on your ${position}.`;

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';  // Set language to English (US)
    window.speechSynthesis.speak(speech);
}

// Estimate distance based on bounding box width
function estimateDistance(bboxWidth, videoWidth) {
    return 1 / (bboxWidth / videoWidth);  // Estimated distance in meters
}

// Function to play a "beep" sound when an object is close
function playBeep() {
    const beep = new Audio('beep.mp3');  // Load beep sound
    beep.play();
}

// Toggle between starting and stopping the object detection.
toggleButton.addEventListener('click', function() {
    if (!cameraAccessGranted) {
        enableCam();  // Enable camera on first click
    } else if (isRunning) {
        stopCam();  // Stop analysis
        isRunning = false;
        toggleButton.innerText = 'Run';  // Reset button text
        console.log("Object detection stopped.");
    } else {
        if (!video.srcObject) {
            enableCam();  // Request camera access again if needed
        }
        isRunning = true;  // Start running
        predictWebcam();  // Start prediction loop
        toggleButton.innerText = 'Stop';  // Change button text
        console.log("Object detection running...");
    }
});

// Call this function on page load to request camera access initially
document.addEventListener('DOMContentLoaded', function() {
    enableCam();  // Request camera access on load
});

const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
const paragraphs = document.getElementsByClassName("demo-p");
const header = document.getElementById("demo-header");

let model = undefined;
let isRunning = false;
let children = [];  // To store dynamically created bounding boxes and labels
let lastSpoken = {};  // To store when the object was last announced (prevents spamming)
let lastBeepTime = 0;  // To track the last time a beep was played
let cameraAccessGranted = false;  // Track if camera access has been granted

// List of objects to announce
const validObjects = ['car', 'bicycle', 'truck', 'bus', 'person', 'cat', 'dog', 'chair', 'dining table', 'motorcycle', 'potted plant', 'vase'];

const videoConstraints = { 
    audio: false,
    video: {
        facingMode: "environment",  // Ensure we use the rear camera
        height: { ideal: 320 },
        width: { ideal: 480 }
    }
};
 
function SetVideoVisible() {
    video.style.display = "block";
    header.style.display = "none";

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        p.style.display = "none";
    }
}

function SetVideoInvisible() {
    video.style.display = "none";
    header.style.display = "block";

    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i];
        p.style.display = "block";
    }
}

SetVideoInvisible();

// Load the COCO-SSD model
cocoSsd.load().then(function(loadedModel) {
    model = loadedModel;
    console.log("Model loaded.");
});

// Enable the webcam and start object detection
function enableCamAndDetect() {
    console.log("Enabling webcam and starting detection...");

    SetVideoVisible();
    navigator.mediaDevices.getUserMedia(videoConstraints).then(function(stream) {
        video.srcObject = stream;
        cameraAccessGranted = true;

        // Start object detection once the webcam is ready
        video.onloadeddata = () => {
            isRunning = true;
            predictWebcam();  // Start the object detection loop
        };

        console.log("Webcam enabled and object detection started.");
    }).catch(function(err) {
        console.error("Error accessing webcam: ", err);
    });
}

// Stop webcam and stop object detection
function stopCamAndDetect() {
    console.log("Stopping webcam and object detection...");
    
    SetVideoInvisible();
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // Clear bounding boxes and labels
    clearBoundingBoxes();
    isRunning = false;  // Stop the prediction loop
    console.log("Webcam and object detection stopped.");
}

// Clear all bounding boxes and labels
function clearBoundingBoxes() {
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.splice(0);  // Clear the array
}

// Start object detection using the webcam feed
function predictWebcam() {
    if (!video.videoWidth || !video.videoHeight) {
        // Video not ready yet, so skip this frame and request the next one
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }

    model.detect(video).then(function(predictions) {
        // Clear previous bounding boxes and labels
        clearBoundingBoxes();

        // Get the video element dimensions for scaling
        const videoRect = video.getBoundingClientRect();

        // Draw bounding boxes for confident detections
        predictions.forEach(prediction => {
            if (prediction.score >= 0.55 && validObjects.includes(prediction.class)) {
                // Create and add bounding box
                createBoundingBox(prediction, videoRect);

                // Announce object position and distance
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

        // Continue detecting if isRunning is true
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
    }).catch(err => {
        console.error("Error during object detection: ", err);
    });
}

// Create a bounding box and add it to the liveView
function createBoundingBox(prediction, videoRect) {
    const [x, y, width, height] = prediction.bbox;

    // Scale the bounding box coordinates relative to the video element dimensions
    const scaledX = videoRect.left + (x * videoRect.width / video.videoWidth);
    const scaledY = videoRect.top + (y * videoRect.height / video.videoHeight);
    const scaledWidth = width * videoRect.width / video.videoWidth;
    const scaledHeight = height * videoRect.height / video.videoHeight;

    // Create the div for the bounding box
    const highlighter = document.createElement('div');
    highlighter.classList.add('highlighter');
    highlighter.style.left = `${scaledX}px`;
    highlighter.style.top = `${scaledY}px`;
    highlighter.style.width = `${scaledWidth}px`;
    highlighter.style.height = `${scaledHeight}px`;
    highlighter.style.position = 'absolute';

    // Create label for prediction
    const p = document.createElement('p');
    p.classList.add('prediction-label');
    p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
    p.style.left = `${scaledX}px`;
    p.style.top = `${scaledY - 20}px`;

    // Add bounding box and label to liveView
    liveView.appendChild(highlighter);
    liveView.appendChild(p);

    children.push(highlighter);
    children.push(p);
}

// Announce object's position using speech synthesis
function announcePosition(object, position) {
    const message = position === 'center' ? 
        `There is a ${object} in the center.` : 
        `There is a ${object} on your ${position}.`;
    
    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';
    window.speechSynthesis.speak(speech);
}

// Estimate distance based on bounding box width
function estimateDistance(bboxWidth, videoWidth) {
    const normalizedWidth = bboxWidth / videoWidth;
    return 1 / normalizedWidth;  // Estimated distance in meters
}

// Play a beep sound when an object is close
function playBeep() {
    const beep = new Audio('beep.mp3');  // Assuming beep.mp3 exists in the project
    beep.play();
}

// Toggle between starting and stopping the object detection
toggleButton.addEventListener('click', function() {
    if (isRunning) {
        stopCamAndDetect();  // Stop both webcam and object detection
        toggleButton.innerText = 'Run';
    } else {
        enableCamAndDetect();  // Start both webcam and object detection
        toggleButton.innerText = 'Stop';
    }
});

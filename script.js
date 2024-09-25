const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
let model = undefined;
let isRunning = false;
let children = [];  // To store dynamically created bounding boxes and labels
let lastSpoken = {};  // To store when the object was last announced (prevents spamming)
let lastBeepTime = 0;  // To track the last time a beep was played
let cameraAccessGranted = false;  // Track if camera access has been granted

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
    // Clear bounding boxes and labels
    clearBoundingBoxes();
}

// Clear all bounding boxes and labels from the live view.
function clearBoundingBoxes() {
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.splice(0); // Clear the array
}

// Start object detection using the webcam feed.
function predictWebcam() {
    if (!video.videoWidth || !video.videoHeight) {
        // Video not ready yet, so we skip this frame and request the next one.
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
        return;
    }

    model.detect(video).then(function(predictions) {
        // Clear any previous highlighters or labels.
        clearBoundingBoxes();

        // Loop through predictions and draw bounding boxes for confident detections
        predictions.forEach(prediction => {
            if (prediction.score > 0.50) {
                // Create a bounding box (div element)
                const highlighter = document.createElement('div');
                highlighter.classList.add('highlighter');
                highlighter.style.left = `${video.videoWidth - prediction.bbox[0] - prediction.bbox[2]}px`; // Adjusted for mirrored effect
                highlighter.style.top = `${prediction.bbox[1]}px`;
                highlighter.style.width = `${prediction.bbox[2]}px`;
                highlighter.style.height = `${prediction.bbox[3]}px`;

                // Create a label (p element) for the prediction
                const p = document.createElement('p');
                p.classList.add('prediction-label');
                p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
                p.style.left = `${video.videoWidth - prediction.bbox[0] - prediction.bbox[2]}px`; // Adjusted for mirrored effect
                p.style.top = `${prediction.bbox[1] - 20}px`;

                // Add the bounding box and label to the liveView
                liveView.appendChild(highlighter);
                liveView.appendChild(p);

                // Store the elements so we can remove them later
                children.push(highlighter);
                children.push(p);

                // Determine object's position and announce it
                const objectCenterX = video.videoWidth - (prediction.bbox[0] + prediction.bbox[2] / 2);
                let position = '';

                if (objectCenterX < video.videoWidth / 3) {
                    position = 'left';
                } else if (objectCenterX > (2 * video.videoWidth) / 3) {
                    position = 'right';
                } else {
                    position = 'center';
                }

                // Check if the object has been announced recently (avoid repetition)
                const currentTime = Date.now();
                if (!lastSpoken[prediction.class] || currentTime - lastSpoken[prediction.class] > 5000) {
                    announcePosition(prediction.class, position);
                    lastSpoken[prediction.class] = currentTime; // Update last spoken time
                }

                // Estimate the object's distance using bounding box width
                const bboxWidth = prediction.bbox[2];  // Width of the bounding box
                const distance = estimateDistance(bboxWidth, video.videoWidth);

                // If object is close (<= 5 meters) and enough time has passed, play a beep
                if (distance <= 5 && currentTime - lastBeepTime > 1000) {
                    playBeep();
                    lastBeepTime = currentTime;  // Update the time the beep was last played
                }
            }
        });

        // Continue predicting if the webcam is still running.
        if (isRunning) {
            window.requestAnimationFrame(predictWebcam);
        }
    }).catch(err => {
        console.error("Error during object detection: ", err);
    });
}

// Function to announce the object's position using speech synthesis
function announcePosition(object, position) {
    let message = '';

    // Define message in English
    if (position === 'center') {
        message = `There is a ${object} in the center.`;
    } else {
        message = `There is a ${object} on your ${position}.`;
    }

    const speech = new SpeechSynthesisUtterance(message);
    speech.lang = 'en-US';  // Set language to English (US)
    window.speechSynthesis.speak(speech);
}

// Estimate distance based on bounding box width
function estimateDistance(bboxWidth, videoWidth) {
    const normalizedWidth = bboxWidth / videoWidth;  // Ratio of bbox width to video width
    const distance = 1 / normalizedWidth;  // Estimated distance in meters
    return distance;  
}

// Function to play a "beep" sound when an object is close
function playBeep() {
    const beep = new Audio('beep.mp3');  // Assuming you have a beep.mp3 file in the project
    beep.play();
}

// Toggle between starting and stopping the object detection.
toggleButton.addEventListener('click', function() {
    if (!cameraAccessGranted) {
        // Request camera access on the first button click if not already granted
        enableCam();  // Enable camera and set access flag
    } else if (isRunning) {
        // Stop analysis if currently running
        stopCam();
        isRunning = false;
        toggleButton.innerText = 'Run'; // Reset the button text to "Run"
        console.log("Object detection stopped.");
    } else {
        // When the button is pressed again, check if camera access is already granted
        if (!video.srcObject) {
            enableCam();  // If the video source is null, request camera access again
        }
        isRunning = true;  // Set isRunning to true here to control the analysis
        predictWebcam(); // Start the prediction loop
        toggleButton.innerText = 'Stop'; // Change to 'Stop' since we are running now
        console.log("Object detection running...");
    }
});

// Call this function on page load to request camera access initially
document.addEventListener('DOMContentLoaded', function() {
    // Initially, request camera access
    enableCam();  // Request camera access on load
});

const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
var model = undefined;
var isRunning = false;
var children = [];  // To store dynamically created bounding boxes and labels
var lastSpoken = {};  // To store when the object was last announced (prevents spamming)
var lastBeepTime = 0;  // To track the last time a beep was played

// Function to check if webcam access is supported.
function getUserMediaSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Load the COCO-SSD model.
cocoSsd.load().then(function(loadedModel) {
  model = loadedModel;
  console.log("Model loaded.");
});

// Enable the webcam stream and start object detection.
function enableCam() {
  const constraints = { video: true };

  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', predictWebcam);
  });
}

// Stop webcam stream.
function stopCam() {
  const stream = video.srcObject;
  const tracks = stream.getTracks();

  tracks.forEach(track => track.stop());
  video.srcObject = null;
}

// Start object detection using the webcam feed.
function predictWebcam() {
  model.detect(video).then(function(predictions) {
    // Clear any previous highlighters or labels.
    for (let i = 0; i < children.length; i++) {
      liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Loop through predictions and draw bounding boxes for confident detections
    predictions.forEach(prediction => {
      if (prediction.score > 0.50) {
        // Create a bounding box (div element)
        const highlighter = document.createElement('div');

        // Correct the coordinates for mirroring
        const left = liveView.clientWidth - (prediction.bbox[0] + prediction.bbox[2]); // Calculate the left position correctly
        highlighter.classList.add('highlighter');
        highlighter.style.left = `${left}px`;
        highlighter.style.top = `${prediction.bbox[1]}px`;
        highlighter.style.width = `${prediction.bbox[2]}px`;
        highlighter.style.height = `${prediction.bbox[3]}px`;

        // Create a label (p element) for the prediction
        const p = document.createElement('p');
        p.classList.add('prediction-label');
        p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
        p.style.left = `${left}px`;
        p.style.top = `${prediction.bbox[1] - 20}px`;

        // Add the bounding box and label to the liveView
        liveView.appendChild(highlighter);
        liveView.appendChild(p);

        // Store the elements so we can remove them later
        children.push(highlighter);
        children.push(p);

        // Determine object's position and announce it
        const videoWidth = liveView.clientWidth; // Use liveView width instead of video.width
        const objectCenterX = left + prediction.bbox[2] / 2;
        let position = '';

        // Determine position based on corrected coordinates
        if (objectCenterX < videoWidth / 3) {
          position = 'left'; // Object is on the left side of the frame
        } else if (objectCenterX > (2 * videoWidth) / 3) {
          position = 'right'; // Object is on the right side of the frame
        } else {
          position = 'center'; // Object is in the center
        }

        // Check if the object has been announced recently (avoid repetition)
        const currentTime = Date.now();
        if (!lastSpoken[prediction.class] || currentTime - lastSpoken[prediction.class] > 5000) {
          announcePosition(prediction.class, position);
          lastSpoken[prediction.class] = currentTime; // Update last spoken time
        }

        // Estimate the object's distance using bounding box width
        const bboxWidth = prediction.bbox[2];  // Width of the bounding box
        const distance = estimateDistance(bboxWidth, videoWidth);

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
  // This is a rough estimation where we assume that larger objects are closer.
  const normalizedWidth = bboxWidth / videoWidth;  // Ratio of bbox width to video width

  // Arbitrary function to estimate distance based on bounding box size
  // Assuming that if bbox takes ~50% of video width, the object is ~1 meter away
  const distance = 1 / normalizedWidth;

  return distance;  // Estimated distance in meters
}

// Function to play a "beep" sound when an object is close
function playBeep() {
  const beep = new Audio('beep.mp3');  // Assuming you have a beep.mp3 file in the project
  beep.play();
}

// Toggle between starting and stopping the object detection.
toggleButton.addEventListener('click', function() {
  if (isRunning) {
    stopCam();
    isRunning = false;
    toggleButton.innerText = 'Run';
    console.log("Object detection stopped.");
  } else {
    enableCam();
    isRunning = true;
    toggleButton.innerText = 'Stop';
    console.log("Object detection running...");
  }
});

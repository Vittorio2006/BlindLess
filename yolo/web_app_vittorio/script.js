const video = document.getElementById('webcam');
const toggleButton = document.getElementById('toggleButton');
const liveView = document.getElementById('liveView');
var model = undefined;
var isRunning = false;
var children = [];  // To store dynamically created bounding boxes and labels

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
        highlighter.classList.add('highlighter');
        highlighter.style.left = `${prediction.bbox[0]}px`;
        highlighter.style.top = `${prediction.bbox[1]}px`;
        highlighter.style.width = `${prediction.bbox[2]}px`;
        highlighter.style.height = `${prediction.bbox[3]}px`;

        // Create a label (p element) for the prediction
        const p = document.createElement('p');
        p.classList.add('prediction-label');
        p.innerText = `${prediction.class} - ${(prediction.score * 100).toFixed(2)}% confidence`;
        p.style.left = `${prediction.bbox[0]}px`;
        p.style.top = `${prediction.bbox[1] - 20}px`;

        // Add the bounding box and label to the liveView
        liveView.appendChild(highlighter);
        liveView.appendChild(p);

        // Store the elements so we can remove them later
        children.push(highlighter);
        children.push(p);
      }
    });

    // Continue predicting if the webcam is still running.
    if (isRunning) {
      window.requestAnimationFrame(predictWebcam);
    }
  });
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

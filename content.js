// Main content script for YouTube Text Selector

console.log("YouTube Text Selector extension loaded");

// Wait for the video element to be available
function waitForVideoElement() {
  const videoElement = document.querySelector('video.html5-main-video');
  
  if (videoElement) {
    console.log("Video element found, setting up event listeners");
    setupVideoListeners(videoElement);
  } else {
    // If not found, try again after a short delay
    setTimeout(waitForVideoElement, 1000);
  }
}

// Set up event listeners for the video element
function setupVideoListeners(videoElement) {
  // Listen for pause events
  videoElement.addEventListener('pause', handleVideoPause);
  
  // Listen for play events to clean up selection overlay
  videoElement.addEventListener('play', handleVideoPlay);
}

// Handle video pause event
function handleVideoPause() {
  console.log("Video paused - enabling text selection");
  createSelectionOverlay();
}

// Handle video play event
function handleVideoPlay() {
  console.log("Video playing - removing selection overlay");
  removeSelectionOverlay();
}

// Create an overlay for selecting text areas
function createSelectionOverlay() {
  // Remove any existing overlay
  removeSelectionOverlay();
  
  // Get the video player container
  const playerContainer = document.querySelector('.html5-video-container');
  if (!playerContainer) return;
  
  // Create overlay element
  const overlay = document.createElement('div');
  overlay.id = 'yt-text-selector-overlay';
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '2000';
  overlay.style.cursor = 'crosshair';
  
  // Create selection box element
  const selectionBox = document.createElement('div');
  selectionBox.id = 'yt-text-selection-box';
  selectionBox.style.position = 'absolute';
  selectionBox.style.border = '2px dashed red';
  selectionBox.style.display = 'none';
  selectionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
  
  // Append elements
  overlay.appendChild(selectionBox);
  playerContainer.appendChild(overlay);
  
  // Set up mouse event handlers for selection
  setupSelectionEvents(overlay, selectionBox);
}

// Remove the selection overlay
function removeSelectionOverlay() {
  const overlay = document.getElementById('yt-text-selector-overlay');
  if (overlay) {
    overlay.remove();
  }
}

// Set up mouse events for selection
function setupSelectionEvents(overlay, selectionBox) {
  let isSelecting = false;
  let startX, startY;
  
  // Handle mouse down - start selection
  overlay.addEventListener('mousedown', (e) => {
    isSelecting = true;
    startX = e.offsetX;
    startY = e.offsetY;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0';
    selectionBox.style.height = '0';
    selectionBox.style.display = 'block';
  });
  
  // Handle mouse move - update selection size
  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
    const currentX = e.offsetX;
    const currentY = e.offsetY;
    
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  });
  
  // Handle mouse up - end selection and process
  overlay.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    
    const endX = e.offsetX;
    const endY = e.offsetY;
    
    // Calculate the selection coordinates
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    
    // Only process if we have a meaningful selection
    if (width > 10 && height > 10) {
      processSelectedArea(left, top, width, height);
    }
  });
}

// Process the selected area to extract text
function processSelectedArea(left, top, width, height) {
  console.log(`Selected area: (${left}, ${top}) ${width}x${height}`);
  
  // Get the video element
  const videoElement = document.querySelector('video.html5-main-video');
  if (!videoElement) return;
  
  // Create a canvas to capture the video frame
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  
  // Calculate the scaling factor between video dimensions and display dimensions
  const videoRect = videoElement.getBoundingClientRect();
  const scaleX = videoElement.videoWidth / videoRect.width;
  const scaleY = videoElement.videoHeight / videoRect.height;
  
  // Scale the selection coordinates to match the video's native resolution
  const scaledLeft = left * scaleX;
  const scaledTop = top * scaleY;
  const scaledWidth = width * scaleX;
  const scaledHeight = height * scaleY;
  
  // Draw the current video frame to the canvas
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // Crop the canvas to the selected area
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = scaledWidth;
  croppedCanvas.height = scaledHeight;
  const croppedCtx = croppedCanvas.getContext('2d');
  
  croppedCtx.drawImage(
    canvas,
    scaledLeft, scaledTop, scaledWidth, scaledHeight,
    0, 0, scaledWidth, scaledHeight
  );
  
  // Add image preprocessing for better OCR results
  croppedCanvas = preprocessImage(croppedCanvas);
  
  // Load Tesseract.js for OCR
  loadTesseract()
    .then(() => {
      // Show a loading indicator
      showLoadingIndicator();
      
      // Convert the cropped canvas to a data URL
      const imageData = croppedCanvas.toDataURL('image/png');
      
      // Perform OCR on the cropped image
      performOCR(imageData)
        .then(({ data: { text } }) => {
          console.log("Extracted text:", text);
          
          // Copy the text to clipboard
          copyToClipboard(text);
          
          // Hide loading indicator and show success message
          hideLoadingIndicator();
          showSuccessMessage(text);
        }).catch(err => {
          console.error("OCR error:", err);
          hideLoadingIndicator();
          showErrorMessage("Failed to extract text. Please try again.");
        });
    })
    .catch(err => {
      console.error("Failed to load Tesseract:", err);
      showErrorMessage("Failed to load text recognition library. Please try again.");
    });
}

// Load Tesseract.js dynamically
function loadTesseract() {
  return new Promise((resolve, reject) => {
    if (window.Tesseract) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      console.log("Text copied to clipboard");
    })
    .catch(err => {
      console.error("Failed to copy text:", err);
    });
}

// Show loading indicator
function showLoadingIndicator() {
  const overlay = document.getElementById('yt-text-selector-overlay');
  if (!overlay) return;
  
  const loader = document.createElement('div');
  loader.id = 'yt-text-selector-loader';
  loader.textContent = 'Extracting text...';
  loader.style.position = 'absolute';
  loader.style.top = '50%';
  loader.style.left = '50%';
  loader.style.transform = 'translate(-50%, -50%)';
  loader.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  loader.style.color = 'white';
  loader.style.padding = '10px 20px';
  loader.style.borderRadius = '5px';
  loader.style.zIndex = '2001';
  
  overlay.appendChild(loader);
}

// Hide loading indicator
function hideLoadingIndicator() {
  const loader = document.getElementById('yt-text-selector-loader');
  if (loader) {
    loader.remove();
  }
}

// Show success message
function showSuccessMessage(text) {
  const overlay = document.getElementById('yt-text-selector-overlay');
  if (!overlay) return;
  
  const message = document.createElement('div');
  message.id = 'yt-text-selector-message';
  message.innerHTML = `
    <div style="margin-bottom: 10px; font-weight: bold;">Text copied to clipboard!</div>
    <div style="max-height: 100px; overflow-y: auto; margin-bottom: 10px; font-size: 14px;">${text}</div>
    <button id="yt-text-selector-close">Close</button>
  `;
  message.style.position = 'absolute';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  message.style.backgroundColor = 'white';
  message.style.color = 'black';
  message.style.padding = '20px';
  message.style.borderRadius = '5px';
  message.style.zIndex = '2001';
  message.style.maxWidth = '80%';
  message.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  
  overlay.appendChild(message);
  
  // Add event listener to close button
  document.getElementById('yt-text-selector-close').addEventListener('click', () => {
    removeSelectionOverlay();
  });
}

// Show error message
function showErrorMessage(errorText) {
  const overlay = document.getElementById('yt-text-selector-overlay');
  if (!overlay) return;
  
  const message = document.createElement('div');
  message.id = 'yt-text-selector-error';
  message.innerHTML = `
    <div style="margin-bottom: 10px; color: red; font-weight: bold;">Error</div>
    <div style="margin-bottom: 10px;">${errorText}</div>
    <button id="yt-text-selector-close-error">Close</button>
  `;
  message.style.position = 'absolute';
  message.style.top = '50%';
  message.style.left = '50%';
  message.style.transform = 'translate(-50%, -50%)';
  message.style.backgroundColor = 'white';
  message.style.color = 'black';
  message.style.padding = '20px';
  message.style.borderRadius = '5px';
  message.style.zIndex = '2001';
  message.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
  
  overlay.appendChild(message);
  
  // Add event listener to close button
  document.getElementById('yt-text-selector-close-error').addEventListener('click', () => {
    message.remove();
  });
}

// Add image preprocessing for better OCR results
function preprocessImage(canvas) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Increase contrast
  for (let i = 0; i < data.length; i += 4) {
    // Convert to grayscale
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    
    // Apply threshold for black and white
    const threshold = 128;
    const value = avg > threshold ? 255 : 0;
    
    data[i] = value;     // R
    data[i + 1] = value; // G
    data[i + 2] = value; // B
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Add language selection for OCR
function performOCR(imageData, language = 'eng') {
  return Tesseract.recognize(
    imageData,
    language,
    { logger: m => console.log(m) }
  );
}

// Start the extension
waitForVideoElement(); 
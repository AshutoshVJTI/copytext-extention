let removeListeners = null;
let extractButton = null;

async function processImage(imageData) {
  try {
    if (!chrome.runtime.id) {
      throw new Error("Extension context invalidated");
    }
    
    return await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Image processing timed out"));
      }, 30000);
      
      chrome.runtime.sendMessage(
        {
          type: "startOcr",
          image: imageData,
        },
        (response) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else if (!response) {
            reject(new Error("Empty response from processing service"));
          } else {
            resolve(response);
          }
        }
      );
    });
  } catch (error) {
    return "Text extraction failed. Please try again.";
  }
}

function createExtractButton() {
  if (extractButton) return;
  
  const video = document.querySelector(".video-stream.html5-main-video");
  if (!video) return;
  
  const videoContainer = video.closest('.html5-video-container');
  if (!videoContainer) return;
  
  extractButton = document.createElement('button');
  extractButton.id = 'text-extract-btn';
  extractButton.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><text x="5" y="15" font-family="sans-serif" font-size="14" font-weight="bold">T</text><circle cx="17" cy="15" r="5" stroke-width="1.5"></circle><line x1="20" y1="18" x2="22" y2="20"></line></svg>';
  extractButton.title = 'Extract text from video';
  extractButton.style.display = 'none';
  
  extractButton.addEventListener('click', (e) => {
    e.stopPropagation();
    if (removeListeners) {
      removeListeners();
    }
    removeListeners = initSelection();
    extractButton.style.display = 'none';
  });
  
  document.body.appendChild(extractButton);
  
  positionExtractButton();
}

function positionExtractButton() {
  if (!extractButton) return;
  
  const video = document.querySelector(".video-stream.html5-main-video");
  if (!video) return;
  
  const rect = video.getBoundingClientRect();
  extractButton.style.position = 'fixed';
  extractButton.style.top = `${rect.top + 10}px`;
  extractButton.style.left = `${rect.left + 10}px`;
}

function setupVideoListeners() {
  const video = document.querySelector(".video-stream.html5-main-video");
  if (!video) return;
  
  createExtractButton();
  
  window.addEventListener('resize', positionExtractButton);
  
  video.addEventListener('pause', () => {
    if (extractButton) {
      positionExtractButton();
      extractButton.style.display = 'block';
    }
  });
  
  video.addEventListener('play', () => {
    if (extractButton) extractButton.style.display = 'none';
  });
}

function initSelection() {
  const screenshotTarget = document.querySelector(
    ".video-stream.html5-main-video"
  );
  if (!screenshotTarget) {
    alert("No video found on this page");
    return;
  }

  // Pause the video when starting selection
  if (!screenshotTarget.paused) {
    screenshotTarget.pause();
  }

  const preventVideoPlay = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  screenshotTarget.addEventListener('click', preventVideoPlay, true);
  
  screenshotTarget.style.cursor = "crosshair";

  const containerDimensions = screenshotTarget.getBoundingClientRect();
  let pX = containerDimensions.x;
  let pY = containerDimensions.y;
  const box = document.createElement("div");
  let flag = false;
  box.id = "ocr_testDiv";
  box.style.border = "2px solid cyan";
  box.style.position = "absolute";
  document.body.appendChild(box);
  let div = document.getElementById("ocr_testDiv"),
    x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0;
  div.hidden = 1;

  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === 'Escape') {
      cleanupSelection();
      if (extractButton) extractButton.style.display = 'block';
    }
  };
  
  window.addEventListener('keydown', escapeHandler);

  function reCalc() {
    const x3 = Math.min(x1, x2);
    const x4 = Math.max(x1, x2);
    const y3 = Math.min(y1, y2);
    const y4 = Math.max(y1, y2);
    div.style.left = x3 + "px";
    div.style.top = y3 + "px";
    div.style.width = x4 - x3 + "px";
    div.style.height = y4 - y3 + "px";
  }

  window.addEventListener("mousedown", downFunction);
  window.addEventListener("mousemove", moveFunction);
  window.addEventListener("mouseup", cropOnMouseDown);

  function downFunction(e) {
    flag = false;
    if (!flag) {
      div.hidden = 0;
      x1 = e.clientX;
      y1 = e.clientY;
      reCalc();
    }
  }

  function moveFunction(e) {
    if (!flag) {
      x2 = e.clientX;
      y2 = e.clientY;
      reCalc();
    }
  }
  
  function cleanupSelection() {
    screenshotTarget.removeEventListener('click', preventVideoPlay, true);
    window.removeEventListener("mousemove", moveFunction);
    window.removeEventListener("mousedown", downFunction);
    window.removeEventListener("mouseup", cropOnMouseDown);
    window.removeEventListener('keydown', escapeHandler);
    screenshotTarget.style.cursor = "unset";
    flag = true;
    
    if (document.getElementById("ocr_testDiv")) {
      document.getElementById("ocr_testDiv").remove();
    }
  }

  async function cropOnMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    
    screenshotTarget.style.cursor = "unset";
    const boxDimensions = div.getBoundingClientRect();
    div.remove();

    try {
      if (boxDimensions.width < 10 || boxDimensions.height < 10) {
        showTemporaryNotification("Selection too small. Please try again.");
        return;
      }
      
      const uri = screenshot({
        width: boxDimensions.width,
        height: boxDimensions.height,
        x: boxDimensions.x - pX,
        y: boxDimensions.y - pY,
        useCORS: true,
      });

      // Show loading indicator
      const loadingIndicator = createLoadingIndicator();
      document.body.appendChild(loadingIndicator);
      
      const compressedUri = await compressImage(uri, 0.7);
      
      const text = await processImage(compressedUri);
      
      // Remove loading indicator
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      
      if (text && text !== "Text extraction failed. Please try again.") {
        await navigator.clipboard.writeText(text);
        showSuccessNotification(text);
      } else {
        showTemporaryNotification("Text extraction failed. Please try again.");
      }
    } catch (error) {
      console.error(error);
      // Remove loading indicator in case of error
      const loadingIndicator = document.querySelector('.extract-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }
      showTemporaryNotification("Error during text extraction: " + error.message);
    } finally {
      cleanupSelection();
      if (extractButton) extractButton.style.display = 'block';
    }
  }

  function screenshot(options = {}) {
    const canvas = document.createElement("canvas");
    const video = screenshotTarget;
    const ctx = canvas.getContext("2d");

    canvas.width = parseInt(video.offsetWidth);
    canvas.height = parseInt(video.offsetHeight);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let h = options.height;
    let w = options.width;
    const imageData = ctx.getImageData(options.x, options.y, w, h);
    const canvas1 = document.createElement("canvas");
    const ctx_ = canvas1.getContext("2d");
    canvas1.width = w;
    canvas1.height = h;
    ctx_.rect(0, 0, w, h);
    ctx_.putImageData(imageData, 0, 0);
    return canvas1.toDataURL("image/png");
  }

  return () => {
    cleanupSelection();
  };
}

function showTemporaryNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'ocr-notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 2000);
}

function initialize() {
  setupVideoListeners();
  
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        setupVideoListeners();
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

initialize();

chrome.runtime.onMessage.addListener((request) => {
  if (request.type === "startCrop") {
    if (removeListeners) {
      removeListeners();
    }
    removeListeners = initSelection();
    
    // Hide the extract button when starting from keyboard shortcut
    if (extractButton) {
      extractButton.style.display = 'none';
    }
  }
  return true;
});

function renderResultsOverlay() {
  const template = `
    <div class="ocr_box">
      <h2 class="ocr_welcome">Processing your crop</h2>
      <p class="ocr_tip"><small>*Click Outside the box to exit</small></p>
      <p class="ocr_tip ocr_warning">Processing the text can sometimes take a little longer depending on text quantity, quality and your system</p>
      <textarea class="ocr_text" cols="30" rows="10"></textarea>
    </div>
  `;
  const div = document.createElement("div");
  div.className = "ocr_main_overlay";
  div.innerHTML = template;
  document.body.appendChild(div);
  document
    .querySelector(".ocr_main_overlay")
    .addEventListener(
      "click",
      (e) => e.target.className === "ocr_main_overlay" && e.target.remove()
    );
}

function compressImage(dataUrl, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Create a loading indicator element that only covers the video area
function createLoadingIndicator() {
  const video = document.querySelector(".video-stream.html5-main-video");
  if (!video) return null;
  
  const videoRect = video.getBoundingClientRect();
  
  const loadingContainer = document.createElement('div');
  loadingContainer.className = 'extract-loading';
  
  // Position the loading indicator over the video only
  loadingContainer.style.position = 'fixed';
  loadingContainer.style.top = `${videoRect.top}px`;
  loadingContainer.style.left = `${videoRect.left}px`;
  loadingContainer.style.width = `${videoRect.width}px`;
  loadingContainer.style.height = `${videoRect.height}px`;
  
  const spinner = document.createElement('div');
  spinner.className = 'extract-spinner';
  
  const message = document.createElement('div');
  message.className = 'extract-loading-text';
  message.textContent = 'Extracting text...';
  
  loadingContainer.appendChild(spinner);
  loadingContainer.appendChild(message);
  
  return loadingContainer;
}

// Show a more subtle success notification without text preview
function showSuccessNotification(text) {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.extract-success-notification');
  existingNotifications.forEach(notification => notification.remove());
  
  // Create success notification container
  const notification = document.createElement('div');
  notification.className = 'extract-success-notification';
  
  // Create header with success message and icon
  const header = document.createElement('div');
  header.className = 'extract-success-header';
  
  const icon = document.createElement('div');
  icon.className = 'extract-success-icon';
  icon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
  
  const title = document.createElement('div');
  title.className = 'extract-success-title';
  title.textContent = 'Text copied to clipboard';
  
  header.appendChild(icon);
  header.appendChild(title);
  
  // Assemble notification
  notification.appendChild(header);
  
  // Add to document
  document.body.appendChild(notification);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add('extract-fade-out');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          notification.remove();
        }
      }, 300);
    }
  }, 3000);
}

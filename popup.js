// This script handles the popup UI functionality

document.addEventListener('DOMContentLoaded', function() {
  // Check if we're on a YouTube page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    
    if (!currentUrl.includes('youtube.com/watch')) {
      document.body.innerHTML = `
        <div style="color: #cc0000; font-weight: bold; margin-bottom: 10px;">
          Not a YouTube video page
        </div>
        <div>
          Please navigate to a YouTube video page to use this extension.
        </div>
      `;
    }
  });
}); 
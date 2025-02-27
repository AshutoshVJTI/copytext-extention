try {
  async function createOffscreen() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["WORKERS"],
      justification: "Perform OCR",
    });
  }
  
  chrome.runtime.onMessage.addListener(function (request, sender, response) {
    if (request.todo === "showPageAction") {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.pageAction.show(tabs[0].id);
      });
    }
    if (request.type === "startOcr") {
      (async () => {
        try {
          await createOffscreen();
          const text = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error("OCR operation timed out"));
            }, 25000);
            
            chrome.runtime.sendMessage(
              {
                message: "analyze",
                image: request.image,
                offscreen: true,
              },
              (result) => {
                clearTimeout(timeoutId);
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(result);
                }
              }
            );
          });

          response(text);
        } catch (error) {
          response("OCR failed. Please try again.");
        }
      })();
      return true;
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed");
  });

  // Handle keyboard shortcut command
  chrome.commands.onCommand.addListener((command) => {
    if (command === "start-crop") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url.includes("youtube.com/watch")) {
          chrome.tabs.sendMessage(tabs[0].id, { type: "startCrop" });
        }
      });
    }
  });
} catch (error) {
  console.error("Error in background script:", error);
}

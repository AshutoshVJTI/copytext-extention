# YouTube Text Selector

A Chrome extension for extracting text from YouTube videos using OCR.

## Overview

The YouTube Text Selector extension allows users to select and extract text from paused YouTube video frames using OCR powered by Tesseract.js. The extracted text is automatically copied to the clipboard for your convenience.

## Features

- **OCR-based Text Extraction:** Leverages Tesseract.js to perform OCR on selected video frames.
- **Intuitive Cropping Interface:** Easily select the area containing the text with a cropping tool.
- **Keyboard Shortcut:** Use the keyboard shortcut (Ctrl+Shift+O on Windows/Linux or Command+Shift+O on macOS) to activate the selection mode.
- **Auto Copy:** Extracted text is automatically copied to the clipboard.

## Installation

1. **Clone the Repository:**
   ```
   git clone https://github.com/AshutoshVJTI/copytext-extention.git
   cd copytext-extention
   ```
2. **Install Dependencies:**
   ```
   npm install
   ```
3. **Development Build:**
   ```
   npm run dev
   ```
   This command uses webpack with the development configuration and watches for changes.

4. **Production Build:**
   ```
   npm run build
   ```
   This command creates an optimized production build in the `build` directory.

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right corner.
3. Click "Load unpacked" and select the `build` directory created after the production build, or use the root directory if running in development mode.

## Usage

1. Navigate to a YouTube video page.
2. Pause the video.
3. Click the "T" button that appears in the top-left corner of the video, or use the keyboard shortcut.
4. Select the area containing text by clicking and dragging.
5. The extension will process the selected area, perform OCR, and copy the extracted text to your clipboard.

## File Overview

- **src/background.js:** Handles background tasks, message passing, and keyboard shortcut commands.
- **src/contentScript.js:** Manages the video overlay, cropping interface, and initiates OCR processing.
- **src/offscreen.js:** Performs OCR operations using Tesseract.js in an offscreen document.
- **src/manifest.json:** Defines the extension's configuration and permissions.
- **src/popup.html & src/popup.js:** Provide the user interface when clicking the extension icon.
- **webpack.*.js:** Webpack configuration files for development and production builds.

## Troubleshooting

- Ensure you are on a YouTube video page before using the extension.
- If the extension fails to extract text, try pausing the video again and reselecting the text area.
- Check the browser console for error messages if issues persist.

## License

MIT License

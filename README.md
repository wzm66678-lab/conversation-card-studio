# Conversation Card Studio

Create a shareable image from a ChatGPT question and response. This is an independent project and is not affiliated with or endorsed by OpenAI.

## Features

- Preview and edit a response or selected excerpt before sharing.
- Redact selected text and optionally include the question, title, and signature.
- Customize the template, background, text size, corners, and canvas format.
- Export a PNG or copy the image to the clipboard.

## Install locally

1. Open `chrome://extensions` in Chrome and enable **Developer mode**.
2. Select **Load unpacked** and choose this project folder.
3. Refresh any open ChatGPT conversation after installing or reloading the extension.

## Create a card

Select **Create card** under a response. To start with an excerpt, select text within that response before clicking the button. In the editor, switch between the full response and your selected excerpt, edit the preview, choose a template and canvas, then download or copy the image. Select text inside the preview and choose **Redact selection** to replace it with a visible marker. Review the entire card before sharing.

Canvas ratios specify a minimum size: the image grows vertically to avoid cutting off long content. Landscape gives wide tables more room. Extremely long content may need to be shortened before export. Copying may be unavailable in some browser configurations; downloading remains available.

## Content and privacy

The extension reads the question and response you choose on supported ChatGPT pages. Rendering and image generation run locally in the browser; the extension does not upload conversation content. Template, color, text size, corner radius, and canvas preferences are stored locally. Conversation content and signature are not saved by the extension.

Common text, lists, code blocks and HTML tables are reconstructed for the card. Images, charts, interactive content, citations and mathematical formulas may be omitted or altered. Wide tables can be hard to read. Always inspect the full preview and the downloaded image, particularly before sharing sensitive information. Redaction is manual and only removes the text you select in the card.

ChatGPT's page structure may change, which can affect message detection. If buttons do not appear, reload the extension and refresh the conversation. Only currently available page content is used; the extension does not retrieve unloaded conversation history.

## Third-party component

The bundled `vendor/html2canvas.min.js` is html2canvas 1.4.1. Its MIT license is included in `vendor/html2canvas.LICENSE`.

## License

This project is licensed under the [MIT License](LICENSE). Third-party components retain their own licenses.

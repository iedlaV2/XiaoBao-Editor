document.addEventListener('DOMContentLoaded', () => {
    const fontUploader = document.getElementById('font-uploader');
    const removeFontButton = document.getElementById('remove-font');
    const statusDiv = document.getElementById('status');

    function updateStatus(fontName) {
        statusDiv.textContent = fontName ? `Loaded: ${fontName}` : 'No font loaded.';
    }

    function applyFontToPage(fontData) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: "APPLY_CUSTOM_FONT",
                    payload: fontData
                });
            }
        });
    }

    fontUploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const fontData = { name: file.name, url: reader.result };
            chrome.storage.local.set({ customFont: fontData }, () => {
                updateStatus(fontData.name);
                applyFontToPage(fontData);
            });
        };
    });

    removeFontButton.addEventListener('click', () => {
        chrome.storage.local.remove('customFont', () => {
            updateStatus(null);
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: "REMOVE_CUSTOM_FONT" });
                }
            });
        });
    });

    chrome.storage.local.get('customFont', (data) => {
        if (data.customFont) {
            updateStatus(data.customFont.name);
        }
    });
});

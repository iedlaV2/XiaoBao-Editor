const CUSTOM_STYLE_ID = 'custom-font-uploader-style';

function injectCustomFont(fontData) {
    removeCustomFont();
    const style = document.createElement('style');
    style.id = CUSTOM_STYLE_ID;
    style.textContent = `
        @font-face {
            font-family: 'MyCustomFont';
            src: url(${fontData.url});
        }
        * {
            font-family: 'MyCustomFont', sans-serif !important;
        }
    `;
    document.head.appendChild(style);
}

function removeCustomFont() {
    const existingStyle = document.getElementById(CUSTOM_STYLE_ID);
    if (existingStyle) {
        existingStyle.remove();
    }
}


function displayScoresOnPage(scores) {
    const oldPopup = document.getElementById('extension-score-popup');
    if (oldPopup) oldPopup.remove();
    
    const popup = document.createElement('div');
    popup.id = 'extension-score-popup';

    let avgPerformanceIndicator = '';
    if (scores.avg > 0) {
        const avgPercentageChange = ((scores.local - scores.avg) / scores.avg) * 100;
        const avgRoundedChange = avgPercentageChange.toFixed(1);
        if (avgPercentageChange >= 0) {
            avgPerformanceIndicator = `<span style="font-size: 13px; color: #27ae60; margin-left: 8px; font-weight: bold;">(↑ ${avgRoundedChange}%)</span>`;
        } else {
            avgPerformanceIndicator = `<span style="font-size: 13px; color: #c0392b; margin-left: 8px; font-weight: bold;">(↓ ${Math.abs(avgRoundedChange)}%)</span>`;
        }
    }

    let maxPerformanceIndicator = '';
    if (scores.max > 0) {
        const maxPercentageChange = ((scores.local - scores.max) / scores.max) * 100;
        const maxRoundedChange = maxPercentageChange.toFixed(1);
        if (maxPercentageChange >= 0) {
            maxPerformanceIndicator = `<span style="font-size: 13px; color: #27ae60; margin-left: 8px; font-weight: bold;">(↑ ${maxRoundedChange}%)</span>`;
        } else {
            maxPerformanceIndicator = `<span style="font-size: 13px; color: #c0392b; margin-left: 8px; font-weight: bold;">(↓ ${Math.abs(maxRoundedChange)}%)</span>`;
        }
    }

    Object.assign(popup.style, {
        position: 'fixed', top: '105px', right: '20px', width: '280px', padding: '20px',
        backgroundColor: '#ffffff', color: '#333333', zIndex: '99999', border: '1px solid #dddddd',
        borderRadius: '10px', fontFamily: 'Arial, sans-serif', fontSize: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', transform: 'translateX(120%)',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
    });

    popup.innerHTML = `
        <button id="score-popup-close" style="position: absolute; top: 10px; right: 10px; background: none; border: none; font-size: 24px; cursor: pointer; color: #aaaaaa; line-height: 1;">&times;</button>
        <h3 style="margin-top: 0; margin-bottom: 15px; color: #3498db; border-bottom: 1px solid #eeeeee; padding-bottom: 10px;">Scores</h3>
        <p style="margin: 8px 0;">Your Score: <strong style="color: #3498db;">${scores.local}</strong></p>
        <p style="margin: 8px 0;">Class Average: <strong style="color: #f39c12;">${scores.avg}</strong> ${avgPerformanceIndicator}</p>
        <p style="margin: 8px 0;">Class Max Score: <strong style="color: #27ae60;">${scores.max}</strong> ${maxPerformanceIndicator}</p>
    `;

    document.body.appendChild(popup);
    const closeButton = document.getElementById('score-popup-close');
    closeButton.addEventListener('click', () => {
        popup.style.transform = 'translateX(120%)';
        setTimeout(() => { popup.remove(); }, 400);
    });
    setTimeout(() => { popup.style.transform = 'translateX(0)'; }, 50);
}


function injectTopNavButton() {
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
        const referenceElement = Array.from(document.querySelectorAll('a, button, span')).find(el => 
            el.textContent.trim() === 'Assignments'
        );

        if (referenceElement) {
            clearInterval(interval);

            if (document.getElementById('performance-tracker')) {
                console.log("button already exists.");
                return;
            }

            const button = document.createElement('a');
            button.id = 'performance-tracker';
            button.textContent = "Performance Tracker";
            button.href = chrome.runtime.getURL("performance.html");
            button.target = "_blank";

            Object.assign(button.style, {
                display: 'inline-flex',
                alignItems: 'center',  
                justifyContent: 'center',
                padding: '0 8px',
                marginLeft: '15px',
                height: '100%',   
                color: 'white',
                textDecoration: 'none',
                fontFamily: 'arial',
                fontSize: '14px',
                fontWeight: '500',  
                cursor: 'pointer',
                borderBottom: '2px solid transparent',
                transition: 'border-color 0.1s ease-in-out',
                boxSizing: 'border-box', 
                marginTop: '11px' 
            });

            button.addEventListener('mouseenter', () => {button.style.borderBottomColor = '#4285f4';});
            button.addEventListener('mouseleave', () => {button.style.borderBottomColor = 'transparent';});

            referenceElement.insertAdjacentElement('afterend', button);

            console.log("button injected right after Assignments.");
        } else {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                console.log(`Gave up waiting for top nav bar after ${maxAttempts} attempts.`);
            }
        }
    }, 800);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectTopNavButton);
} else {
    injectTopNavButton();
}


chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "APPLY_CUSTOM_FONT") {
        injectCustomFont(message.payload);
    } else if (message.type === "REMOVE_CUSTOM_FONT") {
        removeCustomFont();
    } else if (message.type === "SCORE_DATA") {
        displayScoresOnPage(message.data);
    }
});

chrome.storage.local.get('customFont', (data) => {
    if (data.customFont) {
        injectCustomFont(data.customFont);
    }
});

injectTopNavButton();
window.addEventListener('hashchange', injectTopNavButton);
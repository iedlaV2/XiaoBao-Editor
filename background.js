let processedTaskIds = new Set();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('tsinglanstudent.schoolis.cn')) {
        console.log(`Wiping task memory for Tab ID: ${tabId}.`);
        processedTaskIds.clear();
    }
});


chrome.webRequest.onCompleted.addListener(
    function(details) {
        const isTargetUrl = details.url.toLowerCase().includes("getdetail?learningtaskid=");

        if (isTargetUrl && details.statusCode === 200) {
            
            const match = details.url.match(/learningtaskid=(\d+)/i);
            if (!match || !match[1]) return;
            const taskId = match[1];

            if (processedTaskIds.has(taskId)) {
                console.log(`Task ID ${taskId} already processed.`);
                return;
            }
            
            fetch(details.url, { credentials: 'include' })
                .then(response => {
                    if (!response.ok) throw new Error(`Network response error.`);
                    return response.json();
                })
                .then(parsedJson => {
                    sendScoresToContentScript(parsedJson, details.tabId, taskId);
                })
                .catch(error => {
                    console.error("Error during fetch/parse:", error);
                });
        }
    },
    { urls: ["https://tsinglanstudent.schoolis.cn/*"] }
);

function sendScoresToContentScript(responseData, originalTabId, taskId) {
    try {
        const scores = {
            avg: responseData.data.classAvgScore,
            max: responseData.data.classMaxScore,
            local: responseData.data.score
        };

        const message = { type: "SCORE_DATA", data: scores };

        if (originalTabId >= 0) {
            chrome.tabs.sendMessage(originalTabId, message);
        } else {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, message);
                }
            });
        }

        processedTaskIds.add(taskId);

    } catch (error) {
        console.error("Error extracting ->", error);
    }
}
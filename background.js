let processedTaskIds = new Set();

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('tsinglanstudent.schoolis.cn')) {
        processedTaskIds.clear();
    }
});

chrome.webRequest.onCompleted.addListener(
    function(details) {
        const isTargetUrl = details.url.toLowerCase().includes("getdetail?learningtaskid=");

        if (isTargetUrl && details.statusCode === 200) {
            const match = details.url.match(/learningtaskid=(\d+)/i);
            if (!match || !match[1]) {
                return;
            }
            const taskId = match[1];

            if (processedTaskIds.has(taskId)) {
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
                    console.error("Error fetching or parsing request:", error);
                });
        }
    },
    { urls: ["https://tsinglanstudent.schoolis.cn/*"] }
);

function sendScoresToContentScript(responseData, tabId, taskId) {
    if (tabId < 0) return;

    try {
        const scores = {
            avg: responseData.data.classAvgScore,
            max: responseData.data.classMaxScore,
            local: responseData.data.score
        };

        const message = { type: "SCORE_DATA", data: scores };

        chrome.tabs.sendMessage(tabId, message);
        processedTaskIds.add(taskId);
    } catch (error) {
        console.error("Error processing or sending score data:", error);
    }
}
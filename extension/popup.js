document.addEventListener("DOMContentLoaded", function() {
    chrome.storage.sync.get('checkboxState', function(data) {
        if (data.checkboxState) {
            document.querySelector('input[type="checkbox"]').checked = data.checkboxState;

            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs && tabs.length > 0) {
                    console.log("Sending message to tab:", tabs[0]);
                    chrome.tabs.sendMessage(tabs[0].id, { message: "Hello from popup!" })
                        .catch(error => console.error("Error sending message:", error));
                } else {
                    console.error("No active tabs found.");
                }
            });
        }
    });

    document.querySelector('input[type="checkbox"]').addEventListener('click', function() {
        chrome.storage.sync.set({ 'checkboxState': this.checked });
    });
});
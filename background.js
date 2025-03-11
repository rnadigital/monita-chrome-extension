// background.js

// Optionally set a default for tealiumEnabled
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ tealiumEnabled: false });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only inject once the page is fully loaded
  if (changeInfo.status === "complete") {
    // Check if Tealium logger is enabled
    chrome.storage.sync.get(["tealiumEnabled"], (result) => {
      if (result.tealiumEnabled) {
        // Inject the external script file tealiumPatch.js
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          world: "MAIN", // run in the main page context
          files: ["tealiumPatch.js"],
        });
      }
    });
  }
});

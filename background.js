// background.js

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    tealiumEnabled: false,
    eventPattern: "{{event}}:{{eventName}}:{{eventCategory}}",
  });
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when page load is complete
  if (changeInfo.status === "complete") {
    // 1) Check if Monita is detected, set icon
    chrome.scripting.executeScript(
      {
        target: { tabId },
        world: "MAIN",
        func: () => {
          return !!(
            window.__monita_settings &&
            window.__monita_settings.global &&
            window.__monita_settings.global.monita_token
          );
        },
      },
      (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          return;
        }
        const monitaDetected = results[0].result;

        if (monitaDetected) {
          // Use color icons
          chrome.action.setIcon({
            tabId,
            path: {
              16: "icons/icon16_color.png",
              32: "icons/icon32_color.png",
              48: "icons/icon48_color.png",
              128: "icons/icon128_color.png",
            },
          });
        } else {
          // Use grey icons
          chrome.action.setIcon({
            tabId,
            path: {
              16: "icons/icon16_grey.png",
              32: "icons/icon32_grey.png",
              48: "icons/icon48_grey.png",
              128: "icons/icon128_grey.png",
            },
          });
        }
      },
    );

    // 2) If Tealium logger is enabled, inject the patch
    chrome.storage.sync.get(["tealiumEnabled", "eventPattern"], (result) => {
      if (result.tealiumEnabled) {
        const pattern =
          result.eventPattern || "{{event}}:{{eventName}}:{{eventCategory}}";

        // First inject snippet that sets window.__monita_eventPattern
        chrome.scripting.executeScript(
          {
            target: { tabId },
            world: "MAIN",
            func: (p) => {
              window.__monita_eventPattern = p;
            },
            args: [pattern],
          },
          () => {
            // Then inject tealiumPatch.js
            chrome.scripting.executeScript({
              target: { tabId },
              world: "MAIN",
              files: ["tealiumPatch.js"],
            });
          },
        );
      }
    });
  }
});

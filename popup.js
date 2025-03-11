// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleEl = document.getElementById("tealiumToggle");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const versionInfo = document.getElementById("versionInfo");

  // 1) Get stored toggle state
  chrome.storage.sync.get(["tealiumEnabled"], (result) => {
    toggleEl.checked = !!result.tealiumEnabled;
  });

  // 2) Listen for toggle changes
  toggleEl.addEventListener("change", function () {
    chrome.storage.sync.set({ tealiumEnabled: this.checked });
  });

  // 3) Check if Monita is present on the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const tabId = tabs[0].id;

    chrome.scripting.executeScript(
      {
        target: { tabId },
        // important: run in the MAIN world to access page-level variables
        world: "MAIN",
        func: () => {
          try {
            if (
              window.__monita_settings &&
              window.__monita_settings.global &&
              window.__monita_settings.global.monita_token
            ) {
              return {
                detected: true,
                version:
                  window.__monita_settings.global.script_version || "unknown",
              };
            }
            return { detected: false };
          } catch (e) {
            return { detected: false };
          }
        },
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
        }
        if (!injectionResults || !injectionResults[0]) return;

        const result = injectionResults[0].result;
        if (result.detected) {
          statusDot.classList.remove("grey");
          statusDot.classList.add("green");
          statusText.textContent = "Monita detected";
          versionInfo.textContent = "Version: " + result.version;
        } else {
          statusDot.classList.remove("green");
          statusDot.classList.add("grey");
          statusText.textContent = "Monita not detected";
          versionInfo.textContent = "";
        }
      },
    );
  });
});

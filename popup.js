// popup.js
document.addEventListener("DOMContentLoaded", () => {
  const toggleEl = document.getElementById("tealiumToggle");
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");
  const versionInfo = document.getElementById("versionInfo");
  const eventPatternEl = document.getElementById("eventPattern");

  // 1) Load stored toggle & pattern
  chrome.storage.sync.get(["tealiumEnabled", "eventPattern"], (result) => {
    toggleEl.checked = !!result.tealiumEnabled;
    eventPatternEl.value =
      result.eventPattern || "{{event}}:{{eventName}}:{{eventCategory}}";
  });

  // 2) Listen for toggle changes
  toggleEl.addEventListener("change", function () {
    chrome.storage.sync.set({ tealiumEnabled: this.checked });
  });

  // 3) Listen for pattern changes
  eventPatternEl.addEventListener("input", function () {
    chrome.storage.sync.set({ eventPattern: this.value });
  });

  // 4) Check if Monita is present on the current active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || tabs.length === 0) return;
    const tabId = tabs[0].id;

    chrome.scripting.executeScript(
      {
        target: { tabId },
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

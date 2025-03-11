(function () {
  try {
    // Read the toggle state from Chrome storage.
    chrome.storage.sync.get(["tealiumEnabled"], function (result) {
      if (result.tealiumEnabled) {
        // Prepare our Tealium patch code as a string, to be injected into the main page context.
        const scriptContent =
          "(" +
          function () {
            try {
              let patched = false;

              function patchTealium() {
                try {
                  if (!window.utag || !utag.view || !utag.link) return;
                  if (patched) return;
                  patched = true;

                  const originalView = utag.view;
                  const originalLink = utag.link;

                  // Priority ordering keys
                  const priorityKeys = [
                    "event",
                    "eventAction",
                    "eventCategory",
                    "eventLabel",
                    "interactionSection",
                    "eventName",
                  ];

                  // Reorder keys: priority keys first, then alphabetical
                  function reorderKeys(obj) {
                    const newObj = {};
                    // 1) Priority keys in order
                    priorityKeys.forEach((key) => {
                      if (key in obj) {
                        newObj[key] = obj[key];
                      }
                    });
                    // 2) The rest, sorted alphabetically
                    Object.keys(obj)
                      .filter((k) => !priorityKeys.includes(k))
                      .sort()
                      .forEach((k) => {
                        newObj[k] = obj[k];
                      });
                    return newObj;
                  }

                  // Create a safe JSON snapshot
                  function snapshot(o) {
                    try {
                      return JSON.parse(JSON.stringify(o));
                    } catch (e) {
                      return o; // fallback if it can't be stringified
                    }
                  }

                  function logTealiumCall(methodName, args) {
                    try {
                      const dataObj = args[0] || {};
                      const cleanData = snapshot(dataObj);
                      const reordered = reorderKeys(cleanData);

                      // Log the event
                      console.log(
                        `%cTealium utag.${methodName}() =>`,
                        "background: #4b74e0; color: #fff; padding: 2px 4px; border-radius: 3px;",
                        reordered,
                      );

                      // If Monita is detected, try to send beacon
                      const monitaDetected =
                        window.__monita_settings &&
                        window.__monita_settings.global &&
                        window.__monita_settings.global.monita_token &&
                        typeof monitaSendBeacon === "function";

                      if (monitaDetected) {
                        // Build event name: <event>:<eventName>:<eventCategory>
                        const event = reordered.event || "unknown";
                        const eventName = reordered.eventName || "unknown";
                        const eventCategory =
                          reordered.eventCategory || "unknown";
                        const eventLabel = `${event}:${eventName}:${eventCategory}`;

                        console.log(
                          "monitaSendBeacon is available, sending data...",
                        );
                        try {
                          monitaSendBeacon("Monita", eventLabel, reordered);
                        } catch (e) {
                          console.error("Error sending beacon to Monita:", e);
                        }
                      } else {
                        console.log(
                          "monitaSendBeacon not available at this time.",
                        );
                      }
                    } catch (e) {
                      console.error("Error in logTealiumCall:", e);
                    }
                  }

                  // Patch utag.view
                  utag.view = function () {
                    logTealiumCall("view", arguments);
                    return originalView.apply(this, arguments);
                  };

                  // Patch utag.link
                  utag.link = function () {
                    logTealiumCall("link", arguments);
                    return originalLink.apply(this, arguments);
                  };

                  console.log(
                    "Tealium utag.view/link successfully patched for cleaner console logging.",
                  );
                } catch (err) {
                  console.error("Error in patchTealium:", err);
                }
              }

              // If Tealium is ready, patch immediately; else poll
              if (window.utag && utag.view && utag.link) {
                patchTealium();
              } else {
                const intervalId = setInterval(() => {
                  if (window.utag && utag.view && utag.link) {
                    clearInterval(intervalId);
                    patchTealium();
                  }
                }, 500);
              }
            } catch (e) {
              console.error("Error in injected Tealium patch code:", e);
            }
          } +
          ")();";

        // Inject the script into the page
        const script = document.createElement("script");
        script.textContent = scriptContent;
        (document.head || document.documentElement).appendChild(script);
        script.remove();
      }
    });
  } catch (error) {
    console.error("Error in content script:", error);
  }
})();

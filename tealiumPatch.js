// tealiumPatch.js
(() => {
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
              const eventCategory = reordered.eventCategory || "unknown";
              const eventLabel = `${event}:${eventName}:${eventCategory}`;

              console.log("monitaSendBeacon is available, sending data...");
              try {
                monitaSendBeacon("Monita", eventLabel, reordered);
              } catch (err) {
                console.error("Error sending beacon to Monita:", err);
              }
            } else {
              console.log("monitaSendBeacon not available at this time.");
            }
          } catch (err) {
            console.error("Error in logTealiumCall:", err);
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
    console.error("Error in tealiumPatch.js:", e);
  }
})();

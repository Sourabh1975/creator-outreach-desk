// Creator Desk WhatsApp Auto-Sender Content Script
(() => {
  let activeTimer = null;
  let isCancelled = false;
  let lastProcessedUrl = "";

  function isOutreachUrl() {
    const url = window.location.href;
    return url.includes("send?phone=") || url.includes("send/?phone=");
  }

  function createFloatingBadge() {
    let badge = document.getElementById("creator-desk-auto-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "creator-desk-auto-badge";
      badge.style.cssText = `
        position: fixed;
        top: 18px;
        right: 18px;
        z-index: 9999999;
        background: #70264f;
        color: #ffffff;
        padding: 10px 16px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
      `;
      document.body.appendChild(badge);
    }
    return badge;
  }

  function removeFloatingBadge() {
    const badge = document.getElementById("creator-desk-auto-badge");
    if (badge) badge.remove();
  }

  function showBadgeStatus(text, bg = "#70264f", showCancel = false) {
    const badge = createFloatingBadge();
    badge.style.background = bg;
    badge.innerHTML = `
      <span>⚡ ${text}</span>
      ${showCancel ? `<button id="cd-cancel-btn" style="background:rgba(255,255,255,0.25); border:0; color:#fff; padding:3px 9px; border-radius:6px; cursor:pointer; font-weight:700; font-size:11px;">Cancel</button>` : ""}
    `;
    if (showCancel) {
      const btn = document.getElementById("cd-cancel-btn");
      if (btn) {
        btn.onclick = () => {
          isCancelled = true;
          clearTimeout(activeTimer);
          showBadgeStatus("Auto-Send Cancelled", "#555", false);
          setTimeout(removeFloatingBadge, 2500);
        };
      }
    }
  }

  function attemptClickSend() {
    // 1. Try finding send button
    const sendBtn =
      document.querySelector('span[data-icon="send"]')?.closest("button") ||
      document.querySelector('button[aria-label="Send"]') ||
      document.querySelector('button[data-tab="11"]');

    if (sendBtn) {
      sendBtn.click();
      return true;
    }

    // 2. Try input box + Enter
    const inputDiv =
      document.querySelector('footer div[contenteditable="true"]') ||
      document.querySelector('div[contenteditable="true"][data-tab="10"]');

    if (inputDiv && (inputDiv.innerText || "").trim().length > 0) {
      inputDiv.focus();
      const enterDown = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13
      });
      inputDiv.dispatchEvent(enterDown);
      return true;
    }

    return false;
  }

  function checkInvalidNumberPopup() {
    const modalButtons = document.querySelectorAll('div[role="button"][tabindex="0"], button');
    for (const btn of modalButtons) {
      const bodyText = document.body.innerText || "";
      if (/invalid|not on whatsapp|url is invalid/i.test(bodyText)) {
        btn.click();
        return true;
      }
    }
    return false;
  }

  async function startAutoSendRoutine() {
    if (!isOutreachUrl()) {
      removeFloatingBadge();
      return;
    }

    const currentUrl = window.location.href;
    if (lastProcessedUrl === currentUrl) return;
    lastProcessedUrl = currentUrl;

    // Check if user disabled in settings
    const stored = await chrome.storage.local.get({ autoSendEnabled: true });
    if (!stored.autoSendEnabled) {
      console.log("[Creator Desk Auto-Sender] Disabled in extension settings.");
      return;
    }

    isCancelled = false;
    clearTimeout(activeTimer);

    showBadgeStatus("Creator Desk: Waiting for chat to load...", "#70264f", true);

    const startTime = Date.now();
    const pollInterval = setInterval(() => {
      if (isCancelled) {
        clearInterval(pollInterval);
        return;
      }

      // Check timeout (40 seconds)
      if (Date.now() - startTime > 40000) {
        clearInterval(pollInterval);
        showBadgeStatus("Timeout waiting for chat", "#b23b3b", false);
        setTimeout(removeFloatingBadge, 3000);
        return;
      }

      // Check for invalid number
      if (checkInvalidNumberPopup()) {
        clearInterval(pollInterval);
        showBadgeStatus("Number not on WhatsApp (Skipped)", "#9a6b14", false);
        setTimeout(removeFloatingBadge, 3000);
        return;
      }

      // Check if send button or message is ready
      const sendBtn =
        document.querySelector('span[data-icon="send"]')?.closest("button") ||
        document.querySelector('button[aria-label="Send"]');
      const inputDiv =
        document.querySelector('footer div[contenteditable="true"]') ||
        document.querySelector('div[contenteditable="true"][data-tab="10"]');

      if (sendBtn || inputDiv) {
        clearInterval(pollInterval);

        // 2-second countdown before auto-send
        let countdown = 2;
        showBadgeStatus(`Auto-Sending in ${countdown}s...`, "#70264f", true);

        const countdownInterval = setInterval(() => {
          if (isCancelled) {
            clearInterval(countdownInterval);
            return;
          }
          countdown--;
          if (countdown > 0) {
            showBadgeStatus(`Auto-Sending in ${countdown}s...`, "#70264f", true);
          } else {
            clearInterval(countdownInterval);
            const sent = attemptClickSend();
            if (sent) {
              showBadgeStatus("✓ Message Sent by Creator Desk!", "#28634b", false);
              setTimeout(removeFloatingBadge, 3500);
            } else {
              // Retry once after 1 second
              setTimeout(() => {
                attemptClickSend();
                showBadgeStatus("✓ Message Sent by Creator Desk!", "#28634b", false);
                setTimeout(removeFloatingBadge, 3500);
              }, 1000);
            }
          }
        }, 1000);
      }
    }, 800);
  }

  // Initial run
  if (document.readyState === "complete" || document.readyState === "interactive") {
    startAutoSendRoutine();
  } else {
    window.addEventListener("DOMContentLoaded", startAutoSendRoutine);
  }

  // Observe URL changes (e.g. when website navigates same tab to next creator)
  let prevUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== prevUrl) {
      prevUrl = window.location.href;
      if (isOutreachUrl()) {
        startAutoSendRoutine();
      } else {
        removeFloatingBadge();
      }
    }
  }, 1000);
})();

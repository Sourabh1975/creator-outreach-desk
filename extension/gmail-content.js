// Creator Desk Gmail Auto-Sender Content Script
(() => {
  let activeTimer = null;
  let isCancelled = false;

  function isGmailComposeUrl() {
    const url = window.location.href;
    return url.includes("view=cm") || url.includes("view=compose");
  }

  function createFloatingBadge() {
    let badge = document.getElementById("creator-desk-gmail-badge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "creator-desk-gmail-badge";
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
    const badge = document.getElementById("creator-desk-gmail-badge");
    if (badge) badge.remove();
  }

  function showBadgeStatus(text, bg = "#70264f", showCancel = false) {
    const badge = createFloatingBadge();
    badge.style.background = bg;
    badge.innerHTML = `
      <span>⚡ ${text}</span>
      ${showCancel ? `<button id="cd-gmail-cancel-btn" style="background:rgba(255,255,255,0.25); border:0; color:#fff; padding:3px 9px; border-radius:6px; cursor:pointer; font-weight:700; font-size:11px;">Cancel</button>` : ""}
    `;
    if (showCancel) {
      const btn = document.getElementById("cd-gmail-cancel-btn");
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

  function closeCurrentTab(delayMs = 2200) {
    setTimeout(() => {
      try {
        chrome.runtime.sendMessage({ action: "close_tab" });
      } catch {}
      try {
        window.close();
      } catch {}
    }, delayMs);
  }

  function attemptClickSend() {
    // 1. Try finding Gmail send button
    const sendBtn =
      document.querySelector('div[role="button"][data-tooltip*="Send"]') ||
      document.querySelector('div[role="button"][aria-label*="Send"]') ||
      document.querySelector('div[role="button"][data-tooltip*="भेजें"]') ||
      document.querySelector('div[aria-label*="Send ‪(Ctrl-Enter)‬"]') ||
      document.querySelector('div[role="button"].aoO') ||
      document.querySelector('.T-I.J-J5-Ji.aoO.v7.T-I-atl.L3');

    if (sendBtn) {
      sendBtn.click();
      return true;
    }

    // 2. Keyboard shortcut fallback: Ctrl + Enter
    const bodyBox =
      document.querySelector('div[aria-label*="Message Body"]') ||
      document.querySelector('div[role="textbox"]') ||
      document.activeElement;

    if (bodyBox) {
      bodyBox.focus();
      const ctrlEnter = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        ctrlKey: true
      });
      bodyBox.dispatchEvent(ctrlEnter);
      return true;
    }

    return false;
  }

  async function startGmailAutoSendRoutine() {
    if (!isGmailComposeUrl()) {
      removeFloatingBadge();
      return;
    }

    // Check if master power switch or gmail auto-send is enabled
    const stored = await chrome.storage.local.get({ masterEnabled: true, autoSendEmailEnabled: true });
    if (stored.masterEnabled === false || !stored.autoSendEmailEnabled) {
      console.log("[Creator Desk Gmail Auto-Sender] Extension Master Switch or Gmail Auto-Sender is OFF.");
      removeFloatingBadge();
      return;
    }

    isCancelled = false;
    clearTimeout(activeTimer);

    showBadgeStatus("Creator Desk: Waiting for Gmail compose...", "#70264f", true);

    const startTime = Date.now();
    const pollInterval = setInterval(() => {
      if (isCancelled) {
        clearInterval(pollInterval);
        return;
      }

      // Timeout (45s)
      if (Date.now() - startTime > 45000) {
        clearInterval(pollInterval);
        showBadgeStatus("Timeout waiting for Gmail. Closing tab...", "#b23b3b", false);
        closeCurrentTab(2500);
        return;
      }

      // Check if send button or message body is rendered
      const sendBtn =
        document.querySelector('div[role="button"][data-tooltip*="Send"]') ||
        document.querySelector('div[role="button"][aria-label*="Send"]') ||
        document.querySelector('div[role="button"].aoO');
      const bodyBox =
        document.querySelector('div[aria-label*="Message Body"]') ||
        document.querySelector('div[role="textbox"]');

      if (sendBtn || bodyBox) {
        clearInterval(pollInterval);

        // 2-second countdown before send
        let countdown = 2;
        showBadgeStatus(`Auto-Sending Email in ${countdown}s...`, "#70264f", true);

        const countdownInterval = setInterval(() => {
          if (isCancelled) {
            clearInterval(countdownInterval);
            return;
          }
          countdown--;
          if (countdown > 0) {
            showBadgeStatus(`Auto-Sending Email in ${countdown}s...`, "#70264f", true);
          } else {
            clearInterval(countdownInterval);
            const sent = attemptClickSend();
            if (sent) {
              showBadgeStatus("✓ Email Sent! Closing tab...", "#28634b", false);
              closeCurrentTab(2200);
            } else {
              // Retry once after 1 second
              setTimeout(() => {
                attemptClickSend();
                showBadgeStatus("✓ Email Sent! Closing tab...", "#28634b", false);
                closeCurrentTab(2200);
              }, 1000);
            }
          }
        }, 1000);
      }
    }, 800);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    startGmailAutoSendRoutine();
  } else {
    window.addEventListener("DOMContentLoaded", startGmailAutoSendRoutine);
  }

  // Live listener for Master Switch toggling
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.masterEnabled && changes.masterEnabled.newValue === false) {
      isCancelled = true;
      clearTimeout(activeTimer);
      removeFloatingBadge();
    }
  });
})();

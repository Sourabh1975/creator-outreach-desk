document.addEventListener("DOMContentLoaded", async () => {
  const waToggle = document.getElementById("autoSendToggle");
  const emailToggle = document.getElementById("autoSendEmailToggle");
  const statusBadge = document.getElementById("statusBadge");

  const stored = await chrome.storage.local.get({
    autoSendEnabled: true,
    autoSendEmailEnabled: true
  });

  waToggle.checked = stored.autoSendEnabled;
  emailToggle.checked = stored.autoSendEmailEnabled;
  updateStatus(stored.autoSendEnabled || stored.autoSendEmailEnabled);

  waToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEnabled: waToggle.checked });
    updateStatus(waToggle.checked || emailToggle.checked);
  });

  emailToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEmailEnabled: emailToggle.checked });
    updateStatus(waToggle.checked || emailToggle.checked);
  });

  function updateStatus(anyEnabled) {
    if (anyEnabled) {
      statusBadge.textContent = "Active & Ready";
      statusBadge.style.color = "#28634b";
      statusBadge.style.background = "#e2f4ed";
    } else {
      statusBadge.textContent = "Disabled (Manual mode)";
      statusBadge.style.color = "#8b263e";
      statusBadge.style.background = "#fae5e9";
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  const toggle = document.getElementById("autoSendToggle");
  const statusBadge = document.getElementById("statusBadge");

  const stored = await chrome.storage.local.get({ autoSendEnabled: true });
  toggle.checked = stored.autoSendEnabled;
  updateStatus(stored.autoSendEnabled);

  toggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEnabled: toggle.checked });
    updateStatus(toggle.checked);
  });

  function updateStatus(enabled) {
    if (enabled) {
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

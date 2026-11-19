document.addEventListener("DOMContentLoaded", async () => {
  const waToggle = document.getElementById("autoSendToggle");
  const emailToggle = document.getElementById("autoSendEmailToggle");
  const statusBadge = document.getElementById("statusBadge");
  const igCountBadge = document.getElementById("igCountBadge");
  const exportIgCsvBtn = document.getElementById("exportIgCsvBtn");

  const stored = await chrome.storage.local.get({
    autoSendEnabled: true,
    autoSendEmailEnabled: true,
    cd_instagram_creators: []
  });

  waToggle.checked = stored.autoSendEnabled;
  emailToggle.checked = stored.autoSendEmailEnabled;
  igCountBadge.textContent = (stored.cd_instagram_creators || []).length;
  updateStatus(stored.autoSendEnabled || stored.autoSendEmailEnabled);

  waToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEnabled: waToggle.checked });
    updateStatus(waToggle.checked || emailToggle.checked);
  });

  emailToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEmailEnabled: emailToggle.checked });
    updateStatus(waToggle.checked || emailToggle.checked);
  });

  exportIgCsvBtn.addEventListener("click", async () => {
    const data = await chrome.storage.local.get({ cd_instagram_creators: [] });
    const list = data.cd_instagram_creators || [];
    if (list.length === 0) {
      alert("No Instagram creators collected yet! Browse profiles on Instagram to collect them.");
      return;
    }

    const headers = ["Handle", "Name", "Followers", "Followers_Count", "Email", "WhatsApp_Phone", "Instagram_URL", "External_Link", "Bio", "Date_Added"];
    const rows = list.map(c => [
      `"${c.handle}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.followersRaw || ''}"`,
      c.followersCount || 0,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.profileUrl || ''}"`,
      `"${c.externalLink || ''}"`,
      `"${(c.bio || '').replace(/"/g, '""')}"`,
      `"${c.addedAt || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `instagram_ugc_creators_${list.length}.csv`;
    link.click();
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

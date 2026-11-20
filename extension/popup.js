document.addEventListener("DOMContentLoaded", async () => {
  const masterToggle = document.getElementById("masterToggle");
  const masterCard = document.getElementById("masterCard");
  const masterTitleText = document.getElementById("masterTitleText");
  const masterSubText = document.getElementById("masterSubText");
  const masterStatusIcon = document.getElementById("masterStatusIcon");
  const modulesContainer = document.getElementById("modulesContainer");

  const waToggle = document.getElementById("autoSendToggle");
  const emailToggle = document.getElementById("autoSendEmailToggle");
  const statusBadge = document.getElementById("statusBadge");
  const igCountBadge = document.getElementById("igCountBadge");
  const exportIgCsvBtn = document.getElementById("exportIgCsvBtn");

  const stored = await chrome.storage.local.get({
    masterEnabled: true,
    autoSendEnabled: true,
    autoSendEmailEnabled: true,
    cd_instagram_creators: []
  });

  masterToggle.checked = stored.masterEnabled !== false;
  waToggle.checked = stored.autoSendEnabled !== false;
  emailToggle.checked = stored.autoSendEmailEnabled !== false;
  igCountBadge.textContent = (stored.cd_instagram_creators || []).length;

  applyMasterState(masterToggle.checked);

  // Master Switch Change Listener
  masterToggle.addEventListener("change", async () => {
    const isMasterOn = masterToggle.checked;
    await chrome.storage.local.set({ masterEnabled: isMasterOn });
    applyMasterState(isMasterOn);
  });

  waToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEnabled: waToggle.checked });
    updateStatus();
  });

  emailToggle.addEventListener("change", async () => {
    await chrome.storage.local.set({ autoSendEmailEnabled: emailToggle.checked });
    updateStatus();
  });

  function applyMasterState(isMasterOn) {
    if (isMasterOn) {
      masterCard.className = "master-card active";
      masterTitleText.textContent = "Master Power: ON";
      masterSubText.textContent = "Extension is Active & Running";
      masterStatusIcon.textContent = "🟢";
      modulesContainer.classList.remove("disabled");
    } else {
      masterCard.className = "master-card inactive";
      masterTitleText.textContent = "Master Power: OFF";
      masterSubText.textContent = "Extension is Completely Disabled";
      masterStatusIcon.textContent = "🔴";
      modulesContainer.classList.add("disabled");
    }
    updateStatus();
  }

  function updateStatus() {
    if (!masterToggle.checked) {
      statusBadge.textContent = "🔴 Completely OFF (Dormant)";
      statusBadge.style.color = "#991b1b";
      statusBadge.style.background = "#fee2e2";
    } else if (waToggle.checked || emailToggle.checked) {
      statusBadge.textContent = "🟢 Active & Ready";
      statusBadge.style.color = "#166534";
      statusBadge.style.background = "#dcfce7";
    } else {
      statusBadge.textContent = "🟡 Active (Modules Paused)";
      statusBadge.style.color = "#854d0e";
      statusBadge.style.background = "#fef9c3";
    }
  }

  exportIgCsvBtn.addEventListener("click", async () => {
    const data = await chrome.storage.local.get({ cd_instagram_creators: [] });
    const list = data.cd_instagram_creators || [];
    if (list.length === 0) {
      alert("No Instagram creators collected yet! Browse profiles on Instagram to collect them.");
      return;
    }

    const headers = ["Handle", "Name", "Followers", "Followers_Count", "Email", "WhatsApp_Phone", "Instagram_URL", "DM_Link", "Bio", "Date_Added"];
    const rows = list.map(c => [
      `"${c.handle}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.followersRaw || ''}"`,
      c.followersCount || 0,
      `"${c.email || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.profileUrl || ''}"`,
      `"https://www.instagram.com/direct/t/${c.handle.replace('@','')}/"`,
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
});

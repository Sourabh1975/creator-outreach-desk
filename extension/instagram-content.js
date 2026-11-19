// Creator Desk Instagram UGC Creator Scraper Content Script
(() => {
  let lastUrl = "";
  let isScanningHashtag = false;
  let hashtagScanTimer = null;
  let autoCollectEnabled = false;

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const PHONE_REGEX = /(?:\+?91[\-\s]?)?[6789]\d{9}/g;

  function parseFollowerNumber(str) {
    if (!str) return null;
    const clean = str.toLowerCase().replace(/,/g, '').trim();
    const m = clean.match(/([\d.]+)\s*([km])?/);
    if (!m) return null;
    let val = parseFloat(m[1]);
    if (m[2] === 'k') val *= 1000;
    if (m[2] === 'm') val *= 1000000;
    return Math.round(val);
  }

  function getStoredCreators() {
    return new Promise(resolve => {
      chrome.storage.local.get({ cd_instagram_creators: [], autoCollectUgc: false }, items => {
        autoCollectEnabled = items.autoCollectUgc || false;
        resolve(items.cd_instagram_creators || []);
      });
    });
  }

  function saveStoredCreators(list) {
    return new Promise(resolve => {
      chrome.storage.local.set({ cd_instagram_creators: list }, resolve);
    });
  }

  // --- FLOATING WIDGET UI ---
  function injectFloatingWidget() {
    if (document.getElementById("cd-ig-widget-root")) return;

    const root = document.createElement("div");
    root.id = "cd-ig-widget-root";
    root.innerHTML = `
      <style>
        #cd-ig-widget-root {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 99999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          user-select: none;
        }
        .cd-ig-trigger-btn {
          background: linear-gradient(135deg, #70264f 0%, #b23b72 100%);
          color: #ffffff;
          border: 0;
          padding: 12px 18px;
          border-radius: 30px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 9px;
          box-shadow: 0 8px 24px rgba(112, 38, 79, 0.45);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .cd-ig-trigger-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(112, 38, 79, 0.6);
        }
        .cd-ig-counter {
          background: #ffffff;
          color: #70264f;
          padding: 2px 7px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 800;
        }
        .cd-ig-modal {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 680px;
          max-width: 92vw;
          max-height: 85vh;
          background: #1e1e24;
          color: #f0f0f5;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.7);
          flex-direction: column;
          overflow: hidden;
          z-index: 100000000;
        }
        .cd-ig-modal-header {
          padding: 16px 20px;
          background: #282832;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .cd-ig-modal-title {
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
        }
        .cd-ig-modal-body {
          padding: 16px 20px;
          overflow-y: auto;
          flex: 1;
        }
        .cd-ig-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .cd-ig-table th {
          text-align: left;
          padding: 8px;
          background: rgba(255,255,255,0.06);
          color: #bbb;
          font-weight: 600;
          position: sticky;
          top: 0;
        }
        .cd-ig-table td {
          padding: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          word-break: break-word;
        }
        .cd-ig-badge-fit {
          background: #1b4d3e;
          color: #4ade80;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }
        .cd-ig-badge-high {
          background: #4a3b12;
          color: #facc15;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
        }
        .cd-ig-actions-row {
          padding: 14px 20px;
          background: #282832;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid rgba(255,255,255,0.1);
          flex-wrap: wrap;
          gap: 10px;
        }
        .cd-ig-btn {
          padding: 8px 14px;
          border-radius: 8px;
          border: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          transition: background 0.2s;
        }
        .cd-ig-btn-primary {
          background: #22c55e;
          color: #000;
        }
        .cd-ig-btn-primary:hover { background: #16a34a; }
        .cd-ig-btn-danger {
          background: #ef4444;
          color: #fff;
        }
        .cd-ig-btn-danger:hover { background: #dc2626; }
        .cd-ig-btn-secondary {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .cd-ig-btn-secondary:hover { background: rgba(255,255,255,0.2); }
        .cd-profile-quick-banner {
          position: fixed;
          top: 60px;
          right: 24px;
          background: #24242e;
          color: #fff;
          padding: 12px 18px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.15);
          z-index: 9999999;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 380px;
        }
      </style>

      <button id="cd-ig-trigger" class="cd-ig-trigger-btn">
        <span>📸 UGC Scraper</span>
        <span id="cd-ig-count-badge" class="cd-ig-counter">0</span>
      </button>

      <div id="cd-ig-modal" class="cd-ig-modal">
        <div class="cd-ig-modal-header">
          <div class="cd-ig-modal-title">
            <span>📸 Instagram UGC Creators (<3K / ₹500 Collabs)</span>
          </div>
          <button id="cd-ig-close-modal" style="background:transparent; border:0; color:#fff; font-size:18px; cursor:pointer;">✕</button>
        </div>
        <div class="cd-ig-modal-body">
          <div style="margin-bottom:12px; font-size:12px; color:#aaa; display:flex; justify-content:space-between; align-items:center;">
            <span>Browse any profile, search or hashtag (#ugccreatorindia). Creators will appear here.</span>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; color:#fff;">
              <input type="checkbox" id="cd-ig-auto-toggle"> Auto-save &lt;3k profiles
            </label>
          </div>
          <div id="cd-ig-empty-msg" style="text-align:center; padding:30px 10px; color:#777;">
            No creators collected yet.<br>Visit any creator profile (e.g. from <a href="/explore/tags/ugccreatorindia/" style="color:#b23b72;">#ugccreatorindia</a>) to save!
          </div>
          <table id="cd-ig-creators-table" class="cd-ig-table" style="display:none;">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Name</th>
                <th>Followers</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="cd-ig-creators-tbody"></tbody>
          </table>
        </div>
        <div class="cd-ig-actions-row">
          <div style="display:flex; gap:8px;">
            <button id="cd-ig-export-csv" class="cd-ig-btn cd-ig-btn-primary">📥 Export to Excel / CSV</button>
            <button id="cd-ig-copy-json" class="cd-ig-btn cd-ig-btn-secondary">📋 Copy for Creator Desk</button>
          </div>
          <button id="cd-ig-clear-all" class="cd-ig-btn cd-ig-btn-danger">🗑️ Clear All</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Event listeners
    const modal = document.getElementById("cd-ig-modal");
    document.getElementById("cd-ig-trigger").onclick = () => {
      renderCreatorsTable();
      modal.style.display = "flex";
    };
    document.getElementById("cd-ig-close-modal").onclick = () => {
      modal.style.display = "none";
    };
    document.getElementById("cd-ig-export-csv").onclick = exportCreatorsCsv;
    document.getElementById("cd-ig-copy-json").onclick = copyForCreatorDesk;
    document.getElementById("cd-ig-clear-all").onclick = async () => {
      if (confirm("Are you sure you want to clear all collected creators?")) {
        await saveStoredCreators([]);
        updateCounterBadge(0);
        renderCreatorsTable();
      }
    };
    const autoToggle = document.getElementById("cd-ig-auto-toggle");
    autoToggle.checked = autoCollectEnabled;
    autoToggle.onchange = () => {
      autoCollectEnabled = autoToggle.checked;
      chrome.storage.local.set({ autoCollectUgc: autoCollectEnabled });
    };

    updateCounterBadge();
  }

  async function updateCounterBadge(count = null) {
    const badge = document.getElementById("cd-ig-count-badge");
    if (!badge) return;
    if (count === null) {
      const list = await getStoredCreators();
      badge.textContent = list.length;
    } else {
      badge.textContent = count;
    }
  }

  async function renderCreatorsTable() {
    const list = await getStoredCreators();
    updateCounterBadge(list.length);

    const emptyMsg = document.getElementById("cd-ig-empty-msg");
    const table = document.getElementById("cd-ig-creators-table");
    const tbody = document.getElementById("cd-ig-creators-tbody");

    if (list.length === 0) {
      emptyMsg.style.display = "block";
      table.style.display = "none";
      return;
    }

    emptyMsg.style.display = "none";
    table.style.display = "table";
    tbody.innerHTML = "";

    list.forEach((c, idx) => {
      const isUnder3k = (c.followersCount !== null && c.followersCount <= 3000) || (!c.followersCount && !c.followersRaw?.includes("M") && !c.followersRaw?.includes("K"));
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><a href="https://www.instagram.com/${c.handle.replace('@','')}/" target="_blank" style="color:#b23b72; font-weight:700;">${c.handle}</a></td>
        <td>${c.name || "-"}</td>
        <td>
          <span>${c.followersRaw || "-"}</span>
          <span class="${isUnder3k ? 'cd-ig-badge-fit' : 'cd-ig-badge-high'}">${isUnder3k ? '✓ &lt;3K' : '>3K'}</span>
        </td>
        <td>${c.email ? `<span style="color:#4ade80;">${c.email}</span>` : '<span style="color:#777;">None</span>'}</td>
        <td>${c.phone ? `<span style="color:#60a5fa;">${c.phone}</span>` : '<span style="color:#777;">None</span>'}</td>
        <td><button data-remove="${idx}" style="background:transparent; border:0; color:#ef4444; cursor:pointer; font-size:14px;">✕</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-remove]").forEach(btn => {
      btn.onclick = async () => {
        const removeIdx = parseInt(btn.dataset.remove, 10);
        const curList = await getStoredCreators();
        curList.splice(removeIdx, 1);
        await saveStoredCreators(curList);
        renderCreatorsTable();
      };
    });
  }

  // --- SCRAPING PROFILE DATA FROM CURRENT DOM ---
  function parseCurrentProfile() {
    const path = window.location.pathname.replace(/^\/|\/$/g, "");
    if (!path || path.includes("/") || ["explore", "reels", "direct", "stories", "accounts", "p"].includes(path)) {
      return null;
    }

    const handle = "@" + path;
    const header = document.querySelector("header");
    if (!header) return null;

    // Full Name
    const nameEl = header.querySelector("h1") || header.querySelector("section > div:last-child > span");
    const name = nameEl ? nameEl.innerText.trim() : path;

    // Followers
    let followersRaw = "";
    const listItems = Array.from(header.querySelectorAll("li, a[href*='/followers/']"));
    for (const item of listItems) {
      const text = item.innerText || item.textContent;
      if (/followers?/i.test(text)) {
        followersRaw = text.replace(/followers?/i, "").trim();
        break;
      }
    }
    if (!followersRaw) {
      const titleSpan = header.querySelector("span[title]");
      if (titleSpan) followersRaw = titleSpan.getAttribute("title") || titleSpan.innerText;
    }

    const followersCount = parseFollowerNumber(followersRaw);

    // Bio text
    const bioText = header.innerText || "";

    // Emails
    const emails = bioText.match(EMAIL_REGEX) || [];
    const validEmails = emails.filter(em => !em.includes("instagram.com") && !em.includes("sentry.io"));
    const email = validEmails.length ? validEmails[0].toLowerCase() : "";

    // WhatsApp / Phone
    const phones = bioText.match(PHONE_REGEX) || [];
    const phone = phones.length ? phones[0] : "";

    // External Link (Linktree / Beacons / etc.)
    const linkEl = header.querySelector("a[href*='l.instagram.com'], a[target='_blank']");
    const externalLink = linkEl ? linkEl.href : "";

    return {
      handle,
      name,
      followersRaw: followersRaw || "Unknown",
      followersCount,
      email,
      phone,
      bio: bioText.slice(0, 300).replace(/\n/g, " "),
      externalLink,
      profileUrl: window.location.href,
      addedAt: new Date().toLocaleDateString()
    };
  }

  // --- FLOATING PROFILE QUICK-ACTION BANNER ---
  function showProfileBanner(creator) {
    const existing = document.getElementById("cd-ig-profile-banner");
    if (existing) existing.remove();

    const isUnder3k = (creator.followersCount !== null && creator.followersCount <= 3000) || (!creator.followersCount && !creator.followersRaw.includes("K") && !creator.followersRaw.includes("M"));

    const banner = document.createElement("div");
    banner.id = "cd-ig-profile-banner";
    banner.className = "cd-profile-quick-banner";
    banner.innerHTML = `
      <div>
        <div style="font-weight:700; display:flex; align-items:center; gap:6px;">
          <span>${creator.handle}</span>
          <span class="${isUnder3k ? 'cd-ig-badge-fit' : 'cd-ig-badge-high'}">${isUnder3k ? '✓ &lt;3k (Budget Fit)' : '>3k'}</span>
        </div>
        <div style="font-size:11px; color:#aaa; margin-top:2px;">
          ${creator.followersRaw} followers • ${creator.email ? `<span style="color:#4ade80;">${creator.email}</span>` : 'No email in bio'}
        </div>
      </div>
      <button id="cd-ig-save-btn" style="background:#22c55e; color:#000; border:0; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer; font-size:11px; white-space:nowrap;">
        + Save
      </button>
      <button id="cd-ig-dismiss-banner" style="background:transparent; border:0; color:#888; cursor:pointer; font-size:14px;">✕</button>
    `;

    document.body.appendChild(banner);

    document.getElementById("cd-ig-dismiss-banner").onclick = () => banner.remove();

    const saveBtn = document.getElementById("cd-ig-save-btn");
    saveBtn.onclick = async () => {
      await addCreatorToStorage(creator);
      saveBtn.textContent = "✓ Saved!";
      saveBtn.style.background = "#555";
      saveBtn.style.color = "#fff";
      saveBtn.disabled = true;
      setTimeout(() => banner.remove(), 2000);
    };

    // Auto-save if enabled and matches criteria
    if (autoCollectEnabled && isUnder3k && (creator.email || creator.phone)) {
      addCreatorToStorage(creator);
      saveBtn.textContent = "✓ Auto-Saved!";
      saveBtn.style.background = "#555";
      saveBtn.style.color = "#fff";
      saveBtn.disabled = true;
      setTimeout(() => banner.remove(), 2500);
    }
  }

  async function addCreatorToStorage(creator) {
    const list = await getStoredCreators();
    const existingIdx = list.findIndex(c => c.handle.toLowerCase() === creator.handle.toLowerCase());
    if (existingIdx !== -1) {
      list[existingIdx] = { ...list[existingIdx], ...creator };
    } else {
      list.push(creator);
    }
    await saveStoredCreators(list);
    updateCounterBadge(list.length);
  }

  // --- EXPORT TO CSV / EXCEL ---
  async function exportCreatorsCsv() {
    const list = await getStoredCreators();
    if (list.length === 0) {
      alert("No creators to export!");
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
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `instagram_ugc_creators_${list.length}.csv`;
    link.click();
  }

  async function copyForCreatorDesk() {
    const list = await getStoredCreators();
    if (list.length === 0) {
      alert("No creators to copy!");
      return;
    }
    const simplified = list.map(c => ({
      handle: c.handle.replace("@", ""),
      name: c.name || c.handle.replace("@", ""),
      public_business_email: c.email || "",
      whatsapp: c.phone || "",
      followers: c.followersCount || 1000,
      platform: "instagram",
      instagram_url: c.profileUrl
    }));
    navigator.clipboard.writeText(JSON.stringify(simplified, null, 2));
    alert(`Copied ${list.length} creators to clipboard in Creator Desk format! You can paste or import directly into Creator Desk.`);
  }

  // --- URL CHANGE DETECTION (SPA) ---
  function checkUrlChange() {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      const banner = document.getElementById("cd-ig-profile-banner");
      if (banner) banner.remove();

      setTimeout(() => {
        const creator = parseCurrentProfile();
        if (creator) {
          showProfileBanner(creator);
        }
      }, 1200);
    }
  }

  function init() {
    injectFloatingWidget();
    setInterval(checkUrlChange, 1000);
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init);
  }
})();

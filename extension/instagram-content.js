// Creator Desk Instagram UGC Creator Scraper - BULLETPROOF GRID AUTO-PILOT
(() => {
  let isAutoPilotRunning = false;
  let autoPilotPaused = false;
  let autoPilotScannedCount = 0;
  let autoPilotSavedCount = 0;
  let autoPilotIndex = 0;
  let autoPilotTimer = null;
  let seenUsernames = new Set();
  let seenPostHrefs = new Set();

  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@(?:gmail|yahoo|outlook|hotmail|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const PHONE_REGEX = /(?:\+?91[\-\s]?)?[6789]\d{9}/g;

  function parseFollowerNumber(str) {
    if (!str && str !== 0) return null;
    if (typeof str === "number") return str;
    const clean = String(str).toLowerCase().replace(/,/g, '').trim();
    const m = clean.match(/([\d.]+)\s*([km])?/);
    if (!m) return null;
    let val = parseFloat(m[1]);
    if (m[2] === 'k') val *= 1000;
    if (m[2] === 'm') val *= 1000000;
    return Math.round(val);
  }

  function getStoredCreators() {
    return new Promise(resolve => {
      chrome.storage.local.get({ cd_instagram_creators: [] }, items => {
        resolve(items.cd_instagram_creators || []);
      });
    });
  }

  function saveStoredCreators(list) {
    return new Promise(resolve => {
      chrome.storage.local.set({ cd_instagram_creators: list }, resolve);
    });
  }

  // --- FETCH USER PROFILE FROM INSTAGRAM INTERNAL API ---
  async function fetchUserProfile(username) {
    const cleanUser = username.replace(/^@/, "").replace(/\//g, "").trim();
    if (!cleanUser || ["explore", "reels", "direct", "stories", "accounts", "p", "reel", "tags", "about"].includes(cleanUser)) {
      return null;
    }

    try {
      const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUser}`, {
        headers: {
          "x-ig-app-id": "936619743392459",
          "x-requested-with": "XMLHttpRequest"
        }
      });

      if (res.status === 429) {
        return { error: "RATE_LIMITED" };
      }
      if (!res.ok) return null;

      const json = await res.json();
      const u = json.data?.user;
      if (!u) return null;

      const bio = u.biography || "";
      const bioEmails = bio.match(EMAIL_REGEX) || [];
      const email = u.business_email || bioEmails[0] || "";
      const bioPhones = bio.match(PHONE_REGEX) || [];
      const phone = u.business_phone_number || bioPhones[0] || "";

      return {
        handle: "@" + u.username,
        name: u.full_name || u.username,
        followersCount: u.edge_followed_by?.count || 0,
        followersRaw: (u.edge_followed_by?.count || 0).toLocaleString(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        bio: bio.slice(0, 300).replace(/\n/g, " "),
        externalLink: u.external_url || "",
        profileUrl: `https://www.instagram.com/${u.username}/`,
        isVerified: !!u.is_verified,
        addedAt: new Date().toLocaleDateString()
      };
    } catch (e) {
      return null;
    }
  }

  // --- CLOSE OPEN MODAL ---
  function closeModal() {
    const closeBtn =
      document.querySelector("svg[aria-label='Close']")?.closest("button, div[role='button']") ||
      document.querySelector("div[role='dialog'] button");
    if (closeBtn) {
      closeBtn.click();
    }
    // Keyboard fallback
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
  }

  // --- TOP HUD BAR ---
  function showAutoPilotHUD(show = true) {
    let hud = document.getElementById("cd-autopilot-hud");
    if (!show) {
      if (hud) hud.style.display = "none";
      return;
    }
    if (!hud) {
      hud = document.createElement("div");
      hud.id = "cd-autopilot-hud";
      hud.style.cssText = `
        position: fixed;
        top: 14px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 999999999;
        background: #18181f;
        color: #ffffff;
        border: 2px solid #70264f;
        border-radius: 16px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.85);
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 13px;
        min-width: 540px;
        max-width: 92vw;
      `;
      hud.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">🤖</span>
          <div>
            <div style="font-weight:700; color:#fff;" id="cd-hud-status-text">Auto-Pilot: Crawling posts...</div>
            <div style="font-size:11px; color:#aaa;" id="cd-hud-subtext">Scanning bio, caption, email & WhatsApp</div>
          </div>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.1); border-radius:10px; height:8px; overflow:hidden;">
          <div id="cd-hud-progress-bar" style="width:10%; background:#22c55e; height:100%; transition:width 0.3s;"></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button id="cd-hud-pause-btn" style="background:rgba(255,255,255,0.15); color:#fff; border:0; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:12px;">Pause</button>
          <button id="cd-hud-stop-btn" style="background:#ef4444; color:#fff; border:0; padding:6px 12px; border-radius:8px; cursor:pointer; font-weight:600; font-size:12px;">⏹ Stop & Export</button>
        </div>
      `;
      document.body.appendChild(hud);

      document.getElementById("cd-hud-pause-btn").onclick = toggleAutoPilotPause;
      document.getElementById("cd-hud-stop-btn").onclick = stopAutoPilot;
    }
    hud.style.display = "flex";
  }

  function updateHUDProgress(scanned, saved, currentCreator = "") {
    const statusText = document.getElementById("cd-hud-status-text");
    const subtext = document.getElementById("cd-hud-subtext");
    const bar = document.getElementById("cd-hud-progress-bar");
    if (!statusText || !bar) return;

    statusText.textContent = `Scanned ${scanned} posts | ${saved} Saved (<3k)`;
    subtext.textContent = currentCreator ? `Checking: ${currentCreator}` : `Scanning next post...`;
    const pct = Math.min(100, Math.max(10, scanned * 3));
    bar.style.width = `${pct}%`;
  }

  // --- GRID AUTO-PILOT RUNNER ---
  async function startAutoPilot() {
    if (isAutoPilotRunning) return;

    const modal = document.getElementById("cd-ig-modal");
    if (modal) modal.style.display = "none";

    // Close any open modal first
    closeModal();
    await new Promise(r => setTimeout(r, 600));

    // Get settings
    const maxFollowers = parseInt(document.getElementById("cd-ig-setting-max-followers")?.value || "3000", 10);
    const requireContact = document.getElementById("cd-ig-setting-require-contact")?.checked ?? false;

    isAutoPilotRunning = true;
    autoPilotPaused = false;
    autoPilotScannedCount = 0;
    autoPilotSavedCount = 0;
    autoPilotIndex = 0;
    seenUsernames.clear();
    seenPostHrefs.clear();

    showAutoPilotHUD(true);
    updateHUDProgress(0, 0, "Finding posts on page...");

    runGridScanStep(maxFollowers, requireContact);
  }

  async function runGridScanStep(maxFollowers, requireContact) {
    if (!isAutoPilotRunning) return;
    if (autoPilotPaused) return;

    // Collect all posts on page
    const allPosts = Array.from(document.querySelectorAll("a[href*='/p/'], a[href*='/reel/']"));
    const pendingPosts = allPosts.filter(a => !seenPostHrefs.has(a.getAttribute("href")));

    if (pendingPosts.length === 0) {
      // Scroll down to load more posts
      window.scrollBy(0, 1000);
      updateHUDProgress(autoPilotScannedCount, autoPilotSavedCount, "Loading more posts from Instagram...");
      await new Promise(r => setTimeout(r, 2000));

      const freshPosts = Array.from(document.querySelectorAll("a[href*='/p/'], a[href*='/reel/']")).filter(a => !seenPostHrefs.has(a.getAttribute("href")));
      if (freshPosts.length === 0 || autoPilotScannedCount >= 60) {
        stopAutoPilot();
        return;
      }
    }

    const currentPostEl = pendingPosts[0];
    const postHref = currentPostEl.getAttribute("href");
    seenPostHrefs.add(postHref);
    autoPilotScannedCount++;

    // Scroll into view & click
    currentPostEl.scrollIntoView({ behavior: "smooth", block: "center" });
    await new Promise(r => setTimeout(r, 400));
    currentPostEl.click();

    // Wait for post modal to open (1.2s)
    await new Promise(r => setTimeout(r, 1200));

    // Read modal data
    const dialog = document.querySelector("div[role='dialog']");
    let author = "";
    let captionText = "";

    if (dialog) {
      // Extract author
      const headerLink = dialog.querySelector("header a[href^='/'], article header a[href^='/'], div._aa6a a, div._aa73 a");
      if (headerLink) {
        const href = headerLink.getAttribute("href") || "";
        author = href.replace(/^\/|\/$/g, "");
      }

      // Extract caption
      const captionEl = dialog.querySelector("h1, div._a9zs, span._aade, div._a72d");
      if (captionEl) captionText = captionEl.innerText || "";
    }

    if (author && !seenUsernames.has(author.toLowerCase())) {
      seenUsernames.add(author.toLowerCase());
      updateHUDProgress(autoPilotScannedCount, autoPilotSavedCount, `@${author}`);

      // Scan caption for email/phone first
      const captionEmails = captionText.match(EMAIL_REGEX) || [];
      const captionPhones = captionText.match(PHONE_REGEX) || [];

      // Fetch user profile info
      const profile = await fetchUserProfile(author);

      if (profile && profile.error === "RATE_LIMITED") {
        document.getElementById("cd-hud-status-text").textContent = "⚠️ Instagram cooldown (waiting 20s)...";
        await new Promise(r => setTimeout(r, 20000));
      } else if (profile) {
        // Merge caption email/phone if bio was missing them
        if (!profile.email && captionEmails.length) {
          profile.email = captionEmails[0].toLowerCase();
        }
        if (!profile.phone && captionPhones.length) {
          profile.phone = captionPhones[0];
        }

        const isUnderLimit = profile.followersCount <= maxFollowers;
        const hasContact = profile.email || profile.phone;

        let shouldSave = isUnderLimit;
        if (requireContact && !hasContact) shouldSave = false;

        if (shouldSave) {
          await addCreatorToStorage(profile);
          autoPilotSavedCount++;
          showFlashToast(`✓ Saved: @${author} (${profile.followersRaw} flw | ${profile.email || 'DM only'})`);
        }
      }
    } else {
      updateHUDProgress(autoPilotScannedCount, autoPilotSavedCount, author ? `@${author} (Already checked)` : "Closing post...");
    }

    updateCounterBadge();

    // Close modal cleanly
    closeModal();
    await new Promise(r => setTimeout(r, 800));

    if (autoPilotSavedCount >= 50 || autoPilotScannedCount >= 60) {
      stopAutoPilot();
      return;
    }

    // Next post step
    autoPilotTimer = setTimeout(() => {
      runGridScanStep(maxFollowers, requireContact);
    }, 1200);
  }

  function toggleAutoPilotPause() {
    const btn = document.getElementById("cd-hud-pause-btn");
    if (autoPilotPaused) {
      autoPilotPaused = false;
      if (btn) btn.textContent = "Pause";
      const maxFollowers = parseInt(document.getElementById("cd-ig-setting-max-followers")?.value || "3000", 10);
      const requireContact = document.getElementById("cd-ig-setting-require-contact")?.checked ?? false;
      runGridScanStep(maxFollowers, requireContact);
    } else {
      autoPilotPaused = true;
      clearTimeout(autoPilotTimer);
      if (btn) btn.textContent = "▶ Resume";
      document.getElementById("cd-hud-status-text").textContent = "⏸ Auto-Pilot Paused";
    }
  }

  async function stopAutoPilot() {
    isAutoPilotRunning = false;
    autoPilotPaused = false;
    clearTimeout(autoPilotTimer);
    showAutoPilotHUD(false);
    closeModal();

    const list = await getStoredCreators();
    renderCreatorsTable();
    const modal = document.getElementById("cd-ig-modal");
    if (modal) modal.style.display = "flex";

    alert(`🎉 Auto-Pilot Completed!\nScanned ${autoPilotScannedCount} posts.\nTotal saved: ${list.length} creators.\nReady to Export to Excel!`);
  }

  function showFlashToast(msg) {
    let toast = document.getElementById("cd-flash-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cd-flash-toast";
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 24px;
        background: #1b4d3e;
        color: #4ade80;
        padding: 10px 16px;
        border-radius: 10px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 12px;
        font-weight: 700;
        box-shadow: 0 8px 24px rgba(0,0,0,0.6);
        z-index: 99999999;
        transition: opacity 0.3s;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(() => { if (toast) toast.style.opacity = "0"; }, 2400);
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
          width: 780px;
          max-width: 95vw;
          max-height: 88vh;
          background: #18181f;
          color: #f0f0f5;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.8);
          flex-direction: column;
          overflow: hidden;
          z-index: 100000000;
        }
        .cd-ig-modal-header {
          padding: 16px 20px;
          background: #24242e;
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
        .cd-autopilot-panel {
          background: rgba(112, 38, 79, 0.25);
          border: 1px solid rgba(178, 59, 114, 0.5);
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
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
          background: #24242e;
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
          font-weight: 700;
          transition: background 0.2s;
        }
        .cd-ig-btn-primary { background: #22c55e; color: #000; }
        .cd-ig-btn-primary:hover { background: #16a34a; }
        .cd-ig-btn-danger { background: #ef4444; color: #fff; }
        .cd-ig-btn-danger:hover { background: #dc2626; }
        .cd-ig-btn-secondary { background: rgba(255,255,255,0.12); color: #fff; }
        .cd-ig-btn-secondary:hover { background: rgba(255,255,255,0.2); }
      </style>

      <button id="cd-ig-trigger" class="cd-ig-trigger-btn">
        <span>📸 UGC Scraper</span>
        <span id="cd-ig-count-badge" class="cd-ig-counter">0</span>
      </button>

      <div id="cd-ig-modal" class="cd-ig-modal">
        <div class="cd-ig-modal-header">
          <div class="cd-ig-modal-title">
            <span>📸 Instagram UGC Scraper (&lt;3K Followers / ₹500 Collabs)</span>
          </div>
          <button id="cd-ig-close-modal" style="background:transparent; border:0; color:#fff; font-size:18px; cursor:pointer;">✕</button>
        </div>
        <div class="cd-ig-modal-body">
          
          <!-- AUTO-PILOT CONTROL PANEL -->
          <div class="cd-autopilot-panel">
            <div>
              <div style="font-weight:800; font-size:14px; color:#fff; display:flex; align-items:center; gap:6px;">
                <span>⚡ 100% Hands-Free Auto-Pilot Scraper</span>
              </div>
              <div style="font-size:11px; color:#ddd; margin-top:4px;">
                Opens each post, extracts bio & caption, saves &lt;3k creators with Email/WhatsApp!
              </div>
              <div style="display:flex; align-items:center; gap:12px; margin-top:8px; font-size:11px;">
                <label style="display:flex; align-items:center; gap:4px;">
                  Max Followers:
                  <input type="number" id="cd-ig-setting-max-followers" value="3000" style="width:65px; background:#111; color:#fff; border:1px solid #555; border-radius:4px; padding:2px 6px;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; cursor:pointer;" title="If unchecked, also saves creators without email so you can DM them">
                  <input type="checkbox" id="cd-ig-setting-require-contact"> Require Email / WhatsApp
                </label>
              </div>
            </div>
            <button id="cd-ig-start-autopilot-btn" class="cd-ig-btn cd-ig-btn-primary" style="padding:10px 18px; font-size:13px;">
              ▶ Start Auto-Pilot (Scan All)
            </button>
          </div>

          <div id="cd-ig-empty-msg" style="text-align:center; padding:30px 10px; color:#777;">
            No creators collected yet.<br>Click <b>▶ Start Auto-Pilot</b> to automatically crawl all posts on this page!
          </div>

          <table id="cd-ig-creators-table" class="cd-ig-table" style="display:none;">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Name</th>
                <th>Followers</th>
                <th>Email</th>
                <th>WhatsApp</th>
                <th>DM Link</th>
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

    document.getElementById("cd-ig-start-autopilot-btn").onclick = startAutoPilot;

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
      const cleanHandle = c.handle.replace('@','');
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><a href="https://www.instagram.com/${cleanHandle}/" target="_blank" style="color:#b23b72; font-weight:700;">${c.handle}</a></td>
        <td>${c.name || "-"}</td>
        <td>
          <span>${c.followersRaw || "-"}</span>
          <span class="${isUnder3k ? 'cd-ig-badge-fit' : 'cd-ig-badge-high'}">${isUnder3k ? '✓ &lt;3K' : '>3K'}</span>
        </td>
        <td>${c.email ? `<span style="color:#4ade80; font-weight:600;">${c.email}</span>` : '<span style="color:#777;">DM Only</span>'}</td>
        <td>${c.phone ? `<span style="color:#60a5fa; font-weight:600;">${c.phone}</span>` : '<span style="color:#777;">-</span>'}</td>
        <td><a href="https://www.instagram.com/direct/t/${cleanHandle}/" target="_blank" style="color:#38bdf8; text-decoration:none; font-weight:700;">💬 DM</a></td>
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

  function init() {
    injectFloatingWidget();
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init);
  }
})();

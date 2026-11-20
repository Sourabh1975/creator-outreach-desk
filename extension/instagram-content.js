// Creator Desk Instagram UGC Creator Scraper - UNIQUE PROFILES ONLY & PAUSE CONTROLLER
(() => {
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

  // --- READ PROFILE DOM ON CREATOR'S PAGE ---
  function readProfilePageData() {
    const path = window.location.pathname.replace(/^\/|\/$/g, "");
    if (!path || path.includes("/") || ["explore", "reels", "direct", "stories", "accounts", "p", "tags", "about"].includes(path)) {
      return null;
    }

    const header = document.querySelector("header");
    if (!header) return null;

    const handle = "@" + path;
    const nameEl = header.querySelector("h1") || header.querySelector("section > div:last-child > span");
    const name = nameEl ? nameEl.innerText.trim() : path;

    // Followers count
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

    // Bio text (Full rendered bio)
    const bioText = header.innerText || "";

    // Email extraction from bio
    const emails = bioText.match(EMAIL_REGEX) || [];
    const validEmails = emails.filter(em => !em.includes("instagram.com") && !em.includes("sentry.io"));
    const email = validEmails.length ? validEmails[0].toLowerCase() : "";

    // WhatsApp / Phone extraction from bio
    const phones = bioText.match(PHONE_REGEX) || [];
    const phone = phones.length ? phones[0] : "";

    // External link (Linktree, Beacons, portfolio)
    const linkEl = header.querySelector("a[href*='l.instagram.com'], a[target='_blank']");
    const externalLink = linkEl ? linkEl.href : "";

    return {
      handle,
      name,
      followersRaw: followersRaw || "Unknown",
      followersCount: followersCount || 0,
      email,
      phone,
      bio: bioText.slice(0, 300).replace(/\n/g, " "),
      externalLink,
      profileUrl: `https://www.instagram.com/${path}/`,
      addedAt: new Date().toLocaleDateString()
    };
  }

  // --- PERSISTENT CRAWLER ENGINE (SESSIONSTORAGE) ---
  function getCrawlerState() {
    try {
      const raw = sessionStorage.getItem("cd_profile_crawler");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function setCrawlerState(state) {
    if (!state) {
      sessionStorage.removeItem("cd_profile_crawler");
    } else {
      sessionStorage.setItem("cd_profile_crawler", JSON.stringify(state));
    }
  }

  // --- TOP HUD BAR WITH PAUSE / RESUME & STOP ---
  function showAutoPilotHUD(statusMsg, subMsg = "", isPaused = false) {
    let hud = document.getElementById("cd-autopilot-hud");
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
        min-width: 560px;
        max-width: 92vw;
      `;
      hud.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">🤖</span>
          <div>
            <div style="font-weight:700; color:#fff;" id="cd-hud-status-text">${statusMsg}</div>
            <div style="font-size:11px; color:#aaa;" id="cd-hud-subtext">${subMsg}</div>
          </div>
        </div>
        <div style="flex:1;"></div>
        <div style="display:flex; gap:8px;">
          <button id="cd-hud-pause-btn" style="background:#2563eb; color:#fff; border:0; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:700; font-size:12px; transition:background 0.2s;">
            ${isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button id="cd-hud-stop-btn" style="background:#ef4444; color:#fff; border:0; padding:6px 14px; border-radius:8px; cursor:pointer; font-weight:700; font-size:12px;">
            ⏹ Stop & Export
          </button>
        </div>
      `;
      document.body.appendChild(hud);
      document.getElementById("cd-hud-pause-btn").onclick = toggleCrawlerPause;
      document.getElementById("cd-hud-stop-btn").onclick = stopCrawlerAndExport;
    } else {
      document.getElementById("cd-hud-status-text").textContent = statusMsg;
      document.getElementById("cd-hud-subtext").textContent = subMsg;
      const pauseBtn = document.getElementById("cd-hud-pause-btn");
      if (pauseBtn) {
        pauseBtn.textContent = isPaused ? "▶ Resume" : "⏸ Pause";
        pauseBtn.style.background = isPaused ? "#16a34a" : "#2563eb";
      }
      hud.style.display = "flex";
    }
  }

  function hideAutoPilotHUD() {
    const hud = document.getElementById("cd-autopilot-hud");
    if (hud) hud.style.display = "none";
  }

  // --- PAUSE / RESUME HANDLER ---
  function toggleCrawlerPause() {
    const state = getCrawlerState();
    if (!state) return;

    if (state.paused) {
      // Resume
      state.paused = false;
      setCrawlerState(state);
      showAutoPilotHUD("Resuming crawler...", "Moving to next unique creator...", false);
      showFlashToast("▶ Auto-Pilot Resumed");
      setTimeout(processCrawlerStep, 800);
    } else {
      // Pause
      state.paused = true;
      setCrawlerState(state);
      showAutoPilotHUD("⏸ Auto-Pilot Paused", "Click Resume to continue scanning", true);
      showFlashToast("⏸ Auto-Pilot Paused");
    }
  }

  // --- START REAL PROFILE CRAWLER ---
  async function startRealProfileCrawler() {
    const allPosts = Array.from(document.querySelectorAll("a[href*='/p/'], a[href*='/reel/']"));
    if (allPosts.length === 0) {
      alert("No posts found on this page! Open a hashtag or search page first.");
      return;
    }

    const maxFollowers = parseInt(document.getElementById("cd-ig-setting-max-followers")?.value || "3000", 10);
    const requireContact = document.getElementById("cd-ig-setting-require-contact")?.checked ?? false;

    // Collect all posts on the page
    const postHrefs = allPosts.map(a => a.getAttribute("href")).filter(Boolean);

    // Pre-populate seen authors with anyone ALREADY in database (strictly no repeats!)
    const existingCreators = await getStoredCreators();
    const alreadySavedHandles = existingCreators.map(c => c.handle.toLowerCase().replace("@", ""));

    const state = {
      active: true,
      paused: false,
      searchUrl: window.location.href,
      postHrefs: [...new Set(postHrefs)],
      currentIndex: 0,
      scannedCount: 0,
      savedCount: 0,
      seenAuthors: [...new Set(alreadySavedHandles)], // Never visit existing or repeated creators!
      maxFollowers,
      requireContact
    };

    setCrawlerState(state);

    const modal = document.getElementById("cd-ig-modal");
    if (modal) modal.style.display = "none";

    showAutoPilotHUD("Starting Unique Profile Crawler...", "Loading first unique creator...", false);
    processCrawlerStep();
  }

  // --- STEP PROCESSOR ---
  async function processCrawlerStep() {
    const state = getCrawlerState();
    if (!state || !state.active) return;

    // If currently paused, don't execute
    if (state.paused) {
      showAutoPilotHUD("⏸ Auto-Pilot Paused", "Click Resume to continue scanning", true);
      return;
    }

    // 1. IF CURRENTLY ON A CREATOR'S PROFILE PAGE
    const profile = readProfilePageData();
    if (profile) {
      const cleanHandle = profile.handle.toLowerCase().replace("@", "");

      // Ensure marked as seen
      if (!state.seenAuthors.includes(cleanHandle)) {
        state.seenAuthors.push(cleanHandle);
      }

      state.scannedCount++;
      const isUnderLimit = profile.followersCount <= state.maxFollowers;
      const hasContact = profile.email || profile.phone;

      let shouldSave = isUnderLimit;
      if (state.requireContact && !hasContact) shouldSave = false;

      if (shouldSave) {
        const curList = await getStoredCreators();
        const existingIdx = curList.findIndex(c => c.handle.toLowerCase() === profile.handle.toLowerCase());
        if (existingIdx !== -1) {
          curList[existingIdx] = profile;
        } else {
          curList.push(profile);
        }
        await saveStoredCreators(curList);
        state.savedCount++;
        showFlashToast(`✓ Saved: ${profile.handle} (${profile.followersRaw} flw | ${profile.email || 'DM Only'})`);
      } else {
        showFlashToast(`Skipped ${profile.handle}: ${profile.followersRaw} followers`);
      }

      state.currentIndex++;
      if (state.savedCount >= 30 || state.currentIndex >= state.postHrefs.length) {
        setCrawlerState(null);
        hideAutoPilotHUD();
        alert(`🎉 Profile Crawl Finished!\nScanned ${state.scannedCount} unique creators.\nTotal saved: ${state.savedCount} creators with bio & email!`);
        window.location.href = state.searchUrl;
        return;
      }

      // Save state and navigate back to search page
      setCrawlerState(state);
      await new Promise(r => setTimeout(r, 1400));
      window.location.href = state.searchUrl;
      return;
    }

    // 2. IF CURRENTLY ON SEARCH / HASHTAG PAGE
    if (window.location.href.includes("/explore/") || window.location.href.includes("/tags/") || window.location.href.includes("/search/")) {
      showAutoPilotHUD(
        `Auto-Pilot: Checking Post ${state.currentIndex + 1}/${state.postHrefs.length}`,
        `${state.savedCount} Unique Saved (<3k) | ${state.seenAuthors.length} total creators seen`,
        false
      );

      await new Promise(r => setTimeout(r, 1000));

      // Loop to find the NEXT UNIQUE creator post
      while (state.currentIndex < state.postHrefs.length) {
        if (state.paused) {
          setCrawlerState(state);
          showAutoPilotHUD("⏸ Auto-Pilot Paused", "Click Resume to continue", true);
          return;
        }

        const currentHref = state.postHrefs[state.currentIndex];
        let tile = document.querySelector(`a[href='${currentHref}']`);

        if (!tile) {
          // Scroll down to load more post elements
          window.scrollBy(0, 800);
          await new Promise(r => setTimeout(r, 1200));
          tile = document.querySelector(`a[href='${currentHref}']`);
        }

        if (!tile) {
          state.currentIndex++;
          continue;
        }

        // Open post modal
        tile.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 400));
        tile.click();

        // Wait for modal to render (1.2s)
        await new Promise(r => setTimeout(r, 1200));

        const dialog = document.querySelector("div[role='dialog']");
        const authorLink = dialog ? dialog.querySelector("header a[href^='/'], article header a[href^='/'], div._aa6a a") : null;

        if (authorLink) {
          const href = authorLink.getAttribute("href") || "";
          const author = href.replace(/^\/|\/$/g, "").toLowerCase();

          // DEDUPLICATION CHECK: Has this creator already been seen or saved?
          if (state.seenAuthors.includes(author)) {
            // REPEATED CREATOR! Skip without visiting!
            showFlashToast(`⏭ Skipped repeated: @${author}`);
            closeModal();
            state.currentIndex++;
            await new Promise(r => setTimeout(r, 600));
            continue; // Move to next post immediately!
          }

          // BRAND NEW UNIQUE CREATOR FOUND!
          state.seenAuthors.push(author);
          setCrawlerState(state);
          showFlashToast(`🔍 Visiting unique profile: @${author}...`);
          window.location.href = `https://www.instagram.com/${author}/`;
          return;
        } else {
          // No author link found, close and try next
          closeModal();
          state.currentIndex++;
          await new Promise(r => setTimeout(r, 600));
        }
      }

      // Reached end of post list
      setCrawlerState(null);
      hideAutoPilotHUD();
      alert(`🎉 Crawl Complete!\nAll unique posts on this page have been checked.\nSaved: ${state.savedCount} creators!`);
      renderCreatorsTable();
      const modal = document.getElementById("cd-ig-modal");
      if (modal) modal.style.display = "flex";
    }
  }

  function closeModal() {
    const closeBtn = document.querySelector("svg[aria-label='Close']")?.closest("button, div[role='button']");
    if (closeBtn) closeBtn.click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));
  }

  function stopCrawlerAndExport() {
    setCrawlerState(null);
    hideAutoPilotHUD();
    closeModal();

    renderCreatorsTable();
    const modal = document.getElementById("cd-ig-modal");
    if (modal) modal.style.display = "flex";

    exportCreatorsCsv();
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
          width: 820px;
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
                <span>⚡ Unique Profile Bio Scraper (Hands-Free)</span>
              </div>
              <div style="font-size:11px; color:#ddd; margin-top:4px;">
                Opens each unique creator profile, reads bio/email, skips duplicate creators, with Pause/Resume!
              </div>
              <div style="display:flex; align-items:center; gap:12px; margin-top:8px; font-size:11px;">
                <label style="display:flex; align-items:center; gap:4px;">
                  Max Followers:
                  <input type="number" id="cd-ig-setting-max-followers" value="3000" style="width:65px; background:#111; color:#fff; border:1px solid #555; border-radius:4px; padding:2px 6px;">
                </label>
                <label style="display:flex; align-items:center; gap:4px; cursor:pointer;">
                  <input type="checkbox" id="cd-ig-setting-require-contact"> Require Email / WhatsApp
                </label>
              </div>
            </div>
            <button id="cd-ig-start-autopilot-btn" class="cd-ig-btn cd-ig-btn-primary" style="padding:10px 18px; font-size:13px;">
              ▶ Start Profile Crawl (Scan All)
            </button>
          </div>

          <div id="cd-ig-empty-msg" style="text-align:center; padding:30px 10px; color:#777;">
            No creators collected yet.<br>Click <b>▶ Start Profile Crawl</b> to collect unique creator bios automatically!
          </div>

          <table id="cd-ig-creators-table" class="cd-ig-table" style="display:none;">
            <thead>
              <tr>
                <th>Handle</th>
                <th>Name</th>
                <th>Followers</th>
                <th>Email in Bio</th>
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

    document.getElementById("cd-ig-start-autopilot-btn").onclick = startRealProfileCrawler;

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
        <td>${c.email ? `<span style="color:#4ade80; font-weight:700;">${c.email}</span>` : '<span style="color:#888;">DM Only</span>'}</td>
        <td>${c.phone ? `<span style="color:#60a5fa; font-weight:700;">${c.phone}</span>` : '<span style="color:#777;">-</span>'}</td>
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

  // --- INITIALIZATION ---
  async function init() {
    const stored = await chrome.storage.local.get({ masterEnabled: true });
    if (stored.masterEnabled === false) {
      console.log("[Creator Desk] Master Switch is OFF. Instagram widget disabled.");
      return;
    }

    injectFloatingWidget();

    // Check if an active crawler session is in progress
    const state = getCrawlerState();
    if (state && state.active) {
      if (state.paused) {
        showAutoPilotHUD("⏸ Auto-Pilot Paused", "Click Resume to continue scanning", true);
      } else {
        setTimeout(processCrawlerStep, 1000);
      }
    }
  }

  // Live storage listener for Master Switch on Instagram
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.masterEnabled) {
      if (changes.masterEnabled.newValue === false) {
        const widget = document.getElementById("cd-ig-widget-root");
        if (widget) widget.remove();
        const hud = document.getElementById("cd-autopilot-hud");
        if (hud) hud.remove();
        const toast = document.getElementById("cd-flash-toast");
        if (toast) toast.remove();
        setCrawlerState(null);
      } else if (changes.masterEnabled.newValue === true) {
        injectFloatingWidget();
      }
    }
  });

  if (document.readyState === "complete" || document.readyState === "interactive") {
    init();
  } else {
    window.addEventListener("DOMContentLoaded", init);
  }
})();

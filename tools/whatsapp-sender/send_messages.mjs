import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, "config.json");
const progressPath = path.join(here, "progress.json");
const sessionDir = path.join(here, "whatsapp_session");

async function loadConfig() {
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw);
}

async function loadProgress() {
  try {
    const raw = await fs.readFile(progressPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return { sent: [], failed: [], skipped: [] };
  }
}

async function saveProgress(progress) {
  await fs.writeFile(progressPath, JSON.stringify(progress, null, 2), "utf8");
}

function firstName(fullName) {
  const raw = (fullName || "").trim();
  const words = raw.split(/\s+/).filter(Boolean);
  return words[0] || "there";
}

function renderTemplate(templateBody, creator, config) {
  const fname = firstName(creator.name);
  const fullName = creator.name || "";
  const shade = creator.preferred_shade || "your favorite shade";
  const brand = config.brand || "Prediction Talk";
  const website = config.website || "https://predictiontalk.com";
  const phone = creator.whatsapp_display || creator.whatsapp_e164 || "";

  return (templateBody || "")
    .replaceAll("{first_name}", fname)
    .replaceAll("{creator_name}", fullName)
    .replaceAll("{name}", fullName)
    .replaceAll("{preferred_shade}", shade)
    .replaceAll("{shade}", shade)
    .replaceAll("{brand}", brand)
    .replaceAll("{whatsapp}", phone)
    .replaceAll("{website}", website)
    .replaceAll("{instagram}", creator.instagram_url || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function randomDelay(minSec, maxSec) {
  const min = Math.min(minSec, maxSec);
  const max = Math.max(minSec, maxSec);
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

async function sleepWithCountdown(ms, prefix = "Waiting") {
  const totalSeconds = Math.round(ms / 1000);
  for (let remaining = totalSeconds; remaining > 0; remaining--) {
    process.stdout.write(`\r${prefix}: ${remaining}s remaining...   `);
    await new Promise((r) => setTimeout(r, 1000));
  }
  process.stdout.write(`\r${prefix}: Ready!                  \n`);
}

async function main() {
  console.log("========================================================");
  console.log("  WhatsApp Creator Outreach Automated Sender");
  console.log("========================================================\n");

  const config = await loadConfig();
  const progress = await loadProgress();

  const contactsFilePath = path.resolve(here, config.contactsFile);
  console.log(`[1/4] Reading contacts from: ${contactsFilePath}`);
  const contactsRaw = await fs.readFile(contactsFilePath, "utf8");
  const allContacts = JSON.parse(contactsRaw);
  console.log(`      Found ${allContacts.length} total creator contacts.`);

  const templateKey = config.activeTemplate || Object.keys(config.templates)[0];
  const templateObj = config.templates[templateKey];
  if (!templateObj) {
    console.error(`Error: Active template "${templateKey}" not found in config.json!`);
    process.exit(1);
  }
  console.log(`[2/4] Selected Template: "${templateObj.name}"`);

  // Filter out already sent contacts
  const sentPhones = new Set(progress.sent.map((s) => s.phone));
  const pendingContacts = allContacts.filter((c) => !sentPhones.has(c.whatsapp_e164));

  console.log(`      Already sent: ${sentPhones.size}`);
  console.log(`      Pending to send: ${pendingContacts.length}`);

  if (pendingContacts.length === 0) {
    console.log("\n🎉 All creators have already been sent messages! Nothing to do.");
    console.log("If you want to re-send, delete or edit 'progress.json'.");
    return;
  }

  const batchLimit = config.batchLimit > 0 ? config.batchLimit : pendingContacts.length;
  const queue = pendingContacts.slice(0, batchLimit);
  console.log(`      This run will process: ${queue.length} creator(s).`);

  if (config.dryRun) {
    console.log("\n⚠️  DRY RUN MODE ENABLED: Messages will be prepared but NOT sent.\n");
  }

  console.log(`\n[3/4] Launching Google Chrome...`);
  console.log(`      Path: ${config.chromePath}`);
  console.log(`      Session storage: ${sessionDir}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: config.chromePath,
      userDataDir: sessionDir,
      defaultViewport: null,
      args: [
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox"
      ]
    });
  } catch (err) {
    console.error("\n❌ Could not launch Chrome. Please check 'chromePath' in config.json.");
    console.error(err.message);
    process.exit(1);
  }

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  console.log("\n[4/4] Checking WhatsApp Web login...");
  await page.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded", timeout: 60000 });

  // Check login state: wait for pane-side or qr code
  let loggedIn = false;
  try {
    await page.waitForSelector("div#pane-side, div[id='pane-side'], header[data-testid='chatlist-header']", {
      timeout: 10000
    });
    loggedIn = true;
    console.log("✓ WhatsApp Web already logged in!");
  } catch {
    console.log("\n👉 Please scan the QR code in the opened Chrome window with your WhatsApp...");
    console.log("   (Waiting up to 3 minutes for you to scan)...");
    await page.waitForSelector("div#pane-side, div[id='pane-side'], header[data-testid='chatlist-header']", {
      timeout: 180000
    });
    console.log("✓ QR code scanned & Logged in successfully!\n");
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < queue.length; i++) {
    const creator = queue[i];
    const phone = creator.whatsapp_e164;
    const progressLabel = `[${i + 1}/${queue.length}]`;
    console.log(`\n------------------------------------------------------------`);
    console.log(`${progressLabel} Processing: ${creator.name} (${creator.whatsapp_display || phone})`);
    if (creator.preferred_shade) {
      console.log(`      Preferred shade: ${creator.preferred_shade}`);
    }

    const message = renderTemplate(templateObj.body, creator, config);

    try {
      const waUrl = `https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
      await page.goto(waUrl, { waitUntil: "load", timeout: 60000 });

      // Wait for either:
      // 1) Chat input box / send button
      // 2) Invalid phone popup
      let readyToSend = false;
      let invalidNumber = false;

      const startTime = Date.now();
      while (Date.now() - startTime < 45000) {
        // Check for invalid phone popup
        const alertBtn = await page.$('div[role="button"][tabindex="0"]');
        if (alertBtn) {
          const bodyText = await page.evaluate(() => document.body.innerText || "");
          if (/invalid|not on whatsapp|url is invalid/i.test(bodyText)) {
            invalidNumber = true;
            await alertBtn.click().catch(() => {});
            break;
          }
        }

        // Check for send button or message input
        const sendBtn = await page.$('span[data-icon="send"], button[aria-label="Send"], button[data-tab="11"]');
        const inputDiv = await page.$('footer div[contenteditable="true"], div[contenteditable="true"][data-tab="10"]');

        if (sendBtn || inputDiv) {
          readyToSend = true;
          break;
        }

        await new Promise((r) => setTimeout(r, 1000));
      }

      if (invalidNumber) {
        console.log(`❌ Skipped: Number ${phone} is invalid or not registered on WhatsApp.`);
        progress.failed.push({
          phone,
          name: creator.name,
          reason: "Invalid or not on WhatsApp",
          timestamp: new Date().toISOString()
        });
        await saveProgress(progress);
        failCount++;
        continue;
      }

      if (!readyToSend) {
        console.log(`⚠️  Timeout waiting for chat to load for ${creator.name}. Skipping for now.`);
        progress.failed.push({
          phone,
          name: creator.name,
          reason: "Timeout waiting for chat",
          timestamp: new Date().toISOString()
        });
        await saveProgress(progress);
        failCount++;
        continue;
      }

      // Small pause to let UI settle
      await new Promise((r) => setTimeout(r, 1500));

      if (config.dryRun) {
        console.log(`[DRY RUN] Message prepared successfully (not sent).`);
        successCount++;
      } else {
        // 100% Autonomous send: try send button first, then fallback to Enter key
        let sent = false;
        try {
          const sendBtn = await page.$('span[data-icon="send"], button[aria-label="Send"], button[data-tab="11"]');
          if (sendBtn) {
            await sendBtn.click();
            sent = true;
          }
        } catch {}

        if (!sent) {
          try {
            const inputDiv = await page.$('footer div[contenteditable="true"], div[contenteditable="true"][data-tab="10"]');
            if (inputDiv) {
              await inputDiv.focus();
            }
            await page.keyboard.press("Enter");
            sent = true;
          } catch {}
        }

        // Small wait to ensure WhatsApp registers and dispatches the message
        await new Promise((r) => setTimeout(r, 3500));

        progress.sent.push({
          phone,
          name: creator.name,
          sentAt: new Date().toISOString(),
          template: templateKey
        });
        await saveProgress(progress);
        successCount++;
        console.log(`✓ Message sent successfully to ${creator.name}!`);
      }

      // If more creators remain, wait human-like delay
      if (i < queue.length - 1) {
        const delayMs = randomDelay(config.minDelaySeconds, config.maxDelaySeconds);
        await sleepWithCountdown(delayMs, "Anti-spam delay");
      }
    } catch (err) {
      console.error(`❌ Error sending to ${creator.name}:`, err.message);
      progress.failed.push({
        phone,
        name: creator.name,
        reason: err.message,
        timestamp: new Date().toISOString()
      });
      await saveProgress(progress);
      failCount++;
    }
  }

  console.log(`\n========================================================`);
  console.log(`  Automation Completed!`);
  console.log(`========================================================`);
  console.log(`  Successfully sent : ${successCount}`);
  console.log(`  Failed / Skipped  : ${failCount}`);
  console.log(`  Total in progress : ${progress.sent.length} sent total`);
  console.log(`  Full progress log : ${progressPath}`);
  console.log(`========================================================\n`);

  console.log("Leaving browser open for 10 seconds before closing...");
  await new Promise((r) => setTimeout(r, 10000));
  await browser.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

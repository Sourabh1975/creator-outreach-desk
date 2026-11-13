import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(here, "..", "..", "artifacts");
const dist = path.join(here, "dist");
await fs.mkdir(path.join(dist, "data"), { recursive: true });

const leads = JSON.parse(await fs.readFile(path.join(sourceRoot, "leads.json"), "utf8"));
const relays = JSON.parse(await fs.readFile(path.join(sourceRoot, "relay_emails.json"), "utf8"));
const enriched = leads.map((lead) => ({
  ...lead,
  platform_relay_email: relays[lead.handle] || ""
}));

await fs.copyFile(path.join(here, "src", "index.html"), path.join(dist, "index.html"));
await fs.copyFile(path.join(here, "src", "styles.css"), path.join(dist, "styles.css"));
await fs.copyFile(path.join(here, "src", "app.js"), path.join(dist, "app.js"));
await fs.writeFile(path.join(dist, "data", "leads.json"), JSON.stringify(enriched), "utf8");
console.log(`Built ${enriched.length} creator records into ${dist}`);

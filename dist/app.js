const STORAGE_KEY = "creator-desk-v1";
const TEMPLATE_VERSION = 2;
const defaultTemplate = `Hi {first_name},

Greetings from House of Sandhya!

We are an Indian apparel brand, and we're reaching out to explore an exciting collaboration opportunity with you.

At House of Sandhya, we believe in creating fashion that reflects individuality and personal style. We'd love to collaborate with you on an exclusive fashion collection under your name.

Introducing: House of Sandhya X {creator_name}

The idea is to create and launch a dedicated collection inspired by your personal style, fashion sense, and audience.

Here's how the collaboration would work:

1. Your Exclusive Collection
We will launch a dedicated collection under your name, featuring your identity as part of the collaboration.

2. Branding & Promotion
You would be responsible for promoting and branding your collection through your Instagram platform, including posts, stories, reels, and other promotional content.

3. Revenue Sharing

We are offering two collaboration models:

Option A – Organic Promotion
• You promote your exclusive collection through your social media.
• You receive 30% of the sales revenue generated through your collection.
• Applicable exclusively to prepaid orders.

Option B – Promotion + Paid Advertising
• We launch your exclusive collection and additionally run paid advertisements to promote it.
• You receive 20% of the sales revenue generated through your collection.
• We take care of the advertising and campaign execution.
• Applicable exclusively to prepaid orders.

Our goal is to build a long-term association where both your personal brand and House of Sandhya grow together.

We believe this could be a great opportunity to turn your personal fashion identity into an exclusive collection.

If this interests you, we'd love to discuss the idea further and explore how we can bring this collaboration to life.

Looking forward to hearing from you!

Warm regards,
Team House of Sandhya
House of Sandhya
{website}
{instagram}
{contact_details}`;

const $ = (id) => document.getElementById(id);
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  campaign: { brand:"House of Sandhya", sender:"Sourabh", collabType:"paid or barter", brandLink:"", instagramHandle:"@houseofsandhya", contactDetails:"", template:defaultTemplate },
  statuses: {}, templateVersion:TEMPLATE_VERSION
};
if(state.templateVersion!==TEMPLATE_VERSION){
  state.campaign={...state.campaign,brand:"House of Sandhya",instagramHandle:state.campaign.instagramHandle||"@houseofsandhya",contactDetails:state.campaign.contactDetails||"",template:defaultTemplate};
  state.templateVersion=TEMPLATE_VERSION;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
let leads = [];
let queueIndex = -1;

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function statusOf(handle){ return state.statuses[handle]?.status || "pending"; }
function firstName(lead){
  const clean=(lead.name||lead.handle).replace(/[^a-zA-ZÀ-ÿ\s]/g," ").trim();
  return clean.split(/\s+/)[0] || lead.handle;
}
function messageFor(lead){
  const c=state.campaign;
  return c.template.replaceAll("{first_name}",firstName(lead)).replaceAll("{creator_name}",lead.name||lead.handle)
    .replaceAll("{handle}",lead.handle).replaceAll("{brand}",c.brand).replaceAll("{sender}",c.sender)
    .replaceAll("{collab_type}",c.collabType).replaceAll("{brand_link}",c.brandLink||"[add your website]")
    .replaceAll("{website}",c.brandLink||"[Website]").replaceAll("{instagram}",c.instagramHandle||"[Instagram Handle]")
    .replaceAll("{contact_details}",c.contactDetails||"[Contact Details]");
}
function contactFor(lead){
  if(lead.public_business_email) return `Direct: ${lead.public_business_email}`;
  if(lead.platform_relay_email) return `Relay: ${lead.platform_relay_email}`;
  return "Instagram DM";
}
function formatFollowers(n){ return Intl.NumberFormat("en-IN",{notation:n>=1000?"compact":"standard",maximumFractionDigits:1}).format(n||0); }
function escapeHtml(value){ return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

function updateMetrics(){
  const statuses=leads.map(x=>statusOf(x.handle));
  const sent=statuses.filter(x=>x==="sent"||x==="replied").length;
  const replies=statuses.filter(x=>x==="replied").length;
  $("totalMetric").textContent=leads.length;
  $("sentMetric").textContent=sent;
  $("replyMetric").textContent=replies;
  $("remainingMetric").textContent=statuses.filter(x=>x==="pending").length;
  $("sentPercent").textContent=`${leads.length?Math.round(sent/leads.length*100):0}% complete`;
  $("replyPercent").textContent=sent?`${Math.round(replies/sent*100)}% response rate`:"No replies yet";
}
function render(){
  const q=$("searchInput").value.toLowerCase().trim();
  const filter=$("statusFilter").value;
  const filtered=leads.filter(l=>{
    const hay=[l.name,l.handle,l.city,l.category].join(" ").toLowerCase();
    return (!q||hay.includes(q))&&(filter==="all"||statusOf(l.handle)===filter);
  });
  $("creatorRows").innerHTML=filtered.map(l=>{
    const status=statusOf(l.handle);
    return `<tr><td><div class="creator"><div class="avatar">${escapeHtml(firstName(l)[0]?.toUpperCase()||"C")}</div><div><strong>${escapeHtml(l.name||l.handle)}</strong><small>@${escapeHtml(l.handle)}</small></div></div></td>
      <td><div class="audience"><strong>${escapeHtml(formatFollowers(l.followers))}</strong><small>${l.followers<10000?"Nano":"Micro"} · ${l.engagement_rate?`${(l.engagement_rate*100).toFixed(1)}% ER`:"ER unavailable"}</small></div></td>
      <td class="contact">${escapeHtml(contactFor(l))}</td><td><span class="status ${status}">${status[0].toUpperCase()+status.slice(1)}</span></td>
      <td><div class="row-actions"><button class="mini" data-copy="${escapeHtml(l.handle)}">Copy DM</button><button class="mini primary" data-open="${escapeHtml(l.handle)}">Open & review</button></div></td></tr>`;
  }).join("");
  $("emptyState").hidden=filtered.length>0;
  updateMetrics();
}
function showToast(text){ const el=$("toast");el.textContent=text;el.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove("show"),1800); }
async function copyText(text){ try{await navigator.clipboard.writeText(text);showToast("Personalised message copied");return true;}catch{showToast("Copy failed — select the message manually");return false;} }
function leadByHandle(handle){ return leads.find(l=>l.handle===handle); }
function pendingLeads(){ return leads.filter(l=>statusOf(l.handle)==="pending"); }
function openQueue(lead){
  if(!lead){showToast("No pending creators left");return;}
  queueIndex=leads.indexOf(lead);$("queueCreatorName").textContent=lead.name||lead.handle;$("queueHandle").textContent=`@${lead.handle}`;
  $("queueMeta").textContent=`${Number(lead.followers).toLocaleString("en-IN")} followers · ${lead.city||lead.category||"India"}`;
  $("queueAvatar").textContent=firstName(lead)[0]?.toUpperCase()||"C";$("queueMessage").value=messageFor(lead);$("queueDialog").showModal();
}
function currentLead(){ return leads[queueIndex]; }
function nextPending(){ const pending=pendingLeads(); return pending.find(l=>leads.indexOf(l)>queueIndex)||pending[0]; }
function setStatus(lead,status){ state.statuses[lead.handle]={status,updatedAt:new Date().toISOString()};save();render(); }
function openInstagram(lead){ window.open(lead.profile_url||`https://www.instagram.com/${lead.handle}/`,`_blank`,`noopener,noreferrer`); }

document.addEventListener("click",async(e)=>{
  const copy=e.target.closest("[data-copy]"); if(copy){const lead=leadByHandle(copy.dataset.copy);await copyText(messageFor(lead));}
  const open=e.target.closest("[data-open]"); if(open) openQueue(leadByHandle(open.dataset.open));
});
$("searchInput").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("settingsBtn").addEventListener("click",()=>{$("brandName").value=state.campaign.brand;$("senderName").value=state.campaign.sender;$("collabType").value=state.campaign.collabType;$("brandLink").value=state.campaign.brandLink;$("instagramHandle").value=state.campaign.instagramHandle||"";$("contactDetails").value=state.campaign.contactDetails||"";$("messageTemplate").value=state.campaign.template;$("campaignDialog").showModal();});
$("saveCampaignBtn").addEventListener("click",(e)=>{e.preventDefault();state.campaign={brand:$("brandName").value.trim(),sender:$("senderName").value.trim(),collabType:$("collabType").value,brandLink:$("brandLink").value.trim(),instagramHandle:$("instagramHandle").value.trim(),contactDetails:$("contactDetails").value.trim(),template:$("messageTemplate").value};state.templateVersion=TEMPLATE_VERSION;save();$("campaignDialog").close();showToast("Campaign settings saved");});
$("startQueueBtn").addEventListener("click",()=>openQueue(pendingLeads()[0]));
$("closeQueueBtn").addEventListener("click",()=>$("queueDialog").close());
$("copyBtn").addEventListener("click",()=>copyText($("queueMessage").value));
$("openInstagramBtn").addEventListener("click",async()=>{const lead=currentLead();await copyText($("queueMessage").value);openInstagram(lead);});
$("skipBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"skipped");openQueue(nextPending());});
$("markSentBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"sent");openQueue(nextPending());});
$("markRepliedBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"replied");openQueue(nextPending());});
$("resetBtn").addEventListener("click",()=>{if(confirm("Reset every creator status? Campaign settings will remain.")){state.statuses={};save();render();showToast("Progress reset");}});
$("exportBtn").addEventListener("click",()=>{const rows=[["handle","name","status","updated_at"],...leads.map(l=>[l.handle,l.name||"",statusOf(l.handle),state.statuses[l.handle]?.updatedAt||""])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="creator-outreach-progress.csv";a.click();URL.revokeObjectURL(a.href);});

leads=await fetch("./data/leads.json").then(r=>r.json());render();

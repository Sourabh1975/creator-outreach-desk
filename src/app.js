const STORAGE_KEY = "creator-desk-v1";
const defaultTemplate = `Hi {first_name} 👋\n\nI’m {sender} from {brand}, a women’s clothing brand. We really liked your fashion content and would love to explore a {collab_type} Instagram collaboration with you.\n\nCould you please share your collaboration charges/media kit and preferred contact details?\n\nOur brand: {brand_link}\n\nThank you!`;

const $ = (id) => document.getElementById(id);
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  campaign: { brand:"House of Sandhya", sender:"Sourabh", collabType:"paid or barter", brandLink:"", template:defaultTemplate },
  statuses: {}
};
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
    .replaceAll("{collab_type}",c.collabType).replaceAll("{brand_link}",c.brandLink||"[add your link]");
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
$("settingsBtn").addEventListener("click",()=>{$("brandName").value=state.campaign.brand;$("senderName").value=state.campaign.sender;$("collabType").value=state.campaign.collabType;$("brandLink").value=state.campaign.brandLink;$("messageTemplate").value=state.campaign.template;$("campaignDialog").showModal();});
$("saveCampaignBtn").addEventListener("click",(e)=>{e.preventDefault();state.campaign={brand:$("brandName").value.trim(),sender:$("senderName").value.trim(),collabType:$("collabType").value,brandLink:$("brandLink").value.trim(),template:$("messageTemplate").value};save();$("campaignDialog").close();showToast("Campaign settings saved");});
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

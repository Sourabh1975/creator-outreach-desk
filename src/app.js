const STORAGE_KEY = "creator-desk-v1";
const WA_STORAGE_KEY = "creator-desk-whatsapp-v1";
const TEMPLATE_VERSION = 6;
const COMPANIES = ["House of Sandhya","Brown Anatomy","Prediction Talk"];
const defaultSubject = `Exclusive Collection Collaboration Proposal — {brand}`;
const commissionSubject = `Paid Creator Collaboration Opportunity — Brown Anatomy × Prediction Talk`;
const predictionTalkSubject = `Creator Monetization Opportunity — Prediction Talk`;
const predictionTalkTemplate = `Hi there,

We have been following your work and really appreciate the aesthetic and authenticity you bring to your content.

We are reaching out from the Creator Partnerships team at *Prediction Talk*. We are currently onboarding a few select fashion and lifestyle creators for a *high-earning monetization opportunity*—allowing you to generate *recurring income* from your content alongside *brand-funded paid promotion* for your profile.

Would you be open to us sharing the brief proposal here?

Website: https://predictiontalk.com`;
const commissionTemplate = `Hi {first_name},

We’re currently onboarding 15 creators for a performance-based collaboration with Brown Anatomy and Prediction Talk (predictiontalk.com).

You will receive a 2% commission on the total value of all orders generated through your promotion. The more orders you generate, the more you earn—there is no fixed earning limit.

This is a great opportunity to build a long-term association with both brands while earning through your performance.

If you’re interested, please reply here. I’ll forward your profile to our team, and they will connect with you to explain the collaboration, payment structure, and next steps.

Warm regards,
Team Brown Anatomy & Prediction Talk`;
const defaultTemplate = `Hi {first_name},

Greetings from {brand}!

We are an Indian apparel brand, and we're reaching out to explore an exciting collaboration opportunity with you.

At {brand}, we believe in creating fashion that reflects individuality and personal style. We'd love to collaborate with you on an exclusive fashion collection under your name.

Introducing: {brand} X {creator_name}

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

Our goal is to build a long-term association where both your personal brand and {brand} grow together.

We believe this could be a great opportunity to turn your personal fashion identity into an exclusive collection.

If this interests you, we'd love to discuss the idea further and explore how we can bring this collaboration to life.

Looking forward to hearing from you!

Warm regards,
Team {brand}
{brand}
{website}
{instagram}
{contact_details}`;

const $ = (id) => document.getElementById(id);
const state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  campaign: { brand:"House of Sandhya", offerType:"exclusive", sender:"Sourabh", collabType:"paid or barter", brandLink:"", instagramHandle:"@houseofsandhya", contactDetails:"", subjectTemplate:defaultSubject, template:defaultTemplate },
  statuses: {}, templateVersion:TEMPLATE_VERSION
};
const waState = JSON.parse(localStorage.getItem(WA_STORAGE_KEY) || "null") || {contacts:[],statuses:{}};
state.campaign.offerType=state.campaign.offerType||"exclusive";
if(state.templateVersion!==TEMPLATE_VERSION){
  state.campaign={...state.campaign,contactDetails:state.campaign.contactDetails||"",subjectTemplate:state.campaign.subjectTemplate||defaultSubject};
  if(!state.templateVersion||state.templateVersion<2) state.campaign.template=defaultTemplate;
  if(state.templateVersion&&state.templateVersion<5) state.campaign.template=(state.campaign.template||defaultTemplate).replaceAll("House of Sandhya","{brand}");
  state.templateVersion=TEMPLATE_VERSION;
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
}
let leads = [];
let queueIndex = -1;
let waQueueIndex = -1;

function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function saveWa(){ localStorage.setItem(WA_STORAGE_KEY,JSON.stringify(waState)); }
function statusOf(handle){ return state.statuses[handle]?.status || "pending"; }
function waStatusOf(phone){ return waState.statuses[phone]?.status || "pending"; }
function handleName(lead){
  return (lead.handle||"").replace(/[._-]+/g," ").replace(/\s+/g," ").trim().replace(/\b\w/g,c=>c.toUpperCase());
}
function creatorIdentity(lead){
  const raw=(lead.name||"").trim();
  const words=raw.replace(/[^a-zA-ZÀ-ÿ\s]/g," ").trim().split(/\s+/).filter(Boolean);
  if(words.length>=3&&words.every(word=>word.length===1)){
    const creatorName=handleName(lead)||words.join("").replace(/^./,c=>c.toUpperCase());
    return {firstName:creatorName.split(/\s+/)[0],creatorName};
  }
  const firstSegment=raw.split(/[|/•]/)[0].replace(/[^a-zA-ZÀ-ÿ\s.'-]/g," ").replace(/\s+/g," ").trim();
  const generic=/\b(influencer|creator|fashion|lifestyle|beauty|makeup|artist|artistry|blogger|tech|real estate|model|official)\b/i;
  if(firstSegment&&!generic.test(firstSegment)) return {firstName:firstSegment.split(/\s+/)[0],creatorName:firstSegment};
  return {firstName:"there",creatorName:`@${lead.handle}`};
}
function firstName(lead){ return creatorIdentity(lead).firstName; }
function creatorName(lead){ return creatorIdentity(lead).creatorName; }
function profileFromCampaign(){
  return {brandLink:state.campaign.brandLink||"",instagramHandle:state.campaign.instagramHandle||"",contactDetails:state.campaign.contactDetails||""};
}
function safeCompanyProfile(profile,company){
  const clean={brandLink:profile?.brandLink||"",instagramHandle:profile?.instagramHandle||"",contactDetails:profile?.contactDetails||""};
  if(company==="Brown Anatomy") for(const key of Object.keys(clean)) if(/house\s*of\s*sandhya|houseofsandhya/i.test(clean[key])) clean[key]="";
  if(company==="Prediction Talk"){
    if(!clean.brandLink) clean.brandLink="https://predictiontalk.com";
    if(!clean.instagramHandle) clean.instagramHandle="@predictiontalk_";
  }
  return clean;
}
function ensureCompanyProfiles(){
  if(!state.companyProfiles){
    const current=state.campaign.brand;
    state.companyProfiles={
      "House of Sandhya":current==="House of Sandhya"?profileFromCampaign():{brandLink:"",instagramHandle:"@houseofsandhya",contactDetails:""},
      "Brown Anatomy":current==="Brown Anatomy"?safeCompanyProfile(profileFromCampaign(),"Brown Anatomy"):{brandLink:"",instagramHandle:"",contactDetails:""},
      "Prediction Talk":current==="Prediction Talk"?safeCompanyProfile(profileFromCampaign(),"Prediction Talk"):{brandLink:"https://predictiontalk.com",instagramHandle:"@predictiontalk_",contactDetails:""}
    };
  }
  state.companyProfiles["House of Sandhya"]||={brandLink:"",instagramHandle:"@houseofsandhya",contactDetails:""};
  state.companyProfiles["Brown Anatomy"]||={brandLink:"",instagramHandle:"",contactDetails:""};
  state.companyProfiles["Prediction Talk"]||={brandLink:"https://predictiontalk.com",instagramHandle:"@predictiontalk_",contactDetails:""};
  const active=safeCompanyProfile(state.companyProfiles[state.campaign.brand],state.campaign.brand);
  state.companyProfiles[state.campaign.brand]=active;Object.assign(state.campaign,active);save();
}
function applySelectedCompany(text,selectedCompany){
  return COMPANIES.reduce((result,company)=>result.replaceAll(company,selectedCompany),text||"");
}
function messageFor(lead){
  const c=state.campaign;
  const selectedTemplate=c.brand==="Prediction Talk"||c.offerType==="prediction"?predictionTalkTemplate:c.offerType==="commission"?commissionTemplate:applySelectedCompany(c.template,c.brand);
  const message=selectedTemplate.replaceAll("{first_name}",firstName(lead)).replaceAll("{creator_name}",creatorName(lead))
    .replaceAll("{handle}",lead.handle).replaceAll("{brand}",c.brand).replaceAll("{sender}",c.sender)
    .replaceAll("{collab_type}",c.collabType).replaceAll("{brand_link}",c.brandLink||"")
    .replaceAll("{website}",c.brandLink||"").replaceAll("{instagram}",c.instagramHandle||"")
    .replaceAll("{contact_details}",c.contactDetails||"");
  return message.replace(/\n{3,}/g,"\n\n").trim();
}
function subjectFor(lead){
  const c=state.campaign;
  const selectedSubject=c.brand==="Prediction Talk"||c.offerType==="prediction"?predictionTalkSubject:c.offerType==="commission"?commissionSubject:applySelectedCompany(c.subjectTemplate||defaultSubject,c.brand);
  return selectedSubject.replaceAll("{first_name}",firstName(lead)).replaceAll("{creator_name}",creatorName(lead))
    .replaceAll("{handle}",lead.handle).replaceAll("{brand}",c.brand).replaceAll("{sender}",c.sender);
}
function contactFor(lead){
  if(lead.public_business_email) return `Direct: ${lead.public_business_email}`;
  if(lead.platform_relay_email) return `Relay: ${lead.platform_relay_email}`;
  return "Instagram DM";
}
function emailFor(lead){ return lead.public_business_email || lead.platform_relay_email || ""; }
function gmailComposeUrl(lead){
  const params=new URLSearchParams({view:"cm",fs:"1",to:emailFor(lead),su:subjectFor(lead),body:messageFor(lead)});
  return `https://mail.google.com/mail/?${params.toString()}`;
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
      <td><div class="row-actions">${emailFor(l)?`<button class="mini" data-compose="${escapeHtml(l.handle)}">Open email</button>`:""}<button class="mini" data-copy="${escapeHtml(l.handle)}">Copy DM</button><button class="mini primary" data-open="${escapeHtml(l.handle)}">Open & review</button></div></td></tr>`;
  }).join("");
  $("emptyState").hidden=filtered.length>0;
  updateMetrics();
}
function waLead(contact){
  const handle=(contact.instagram_url||"").match(/instagram\.com\/([^/?#]+)/i)?.[1]||contact.name.replace(/\s+/g,"_").toLowerCase();
  return {name:contact.name,handle,profile_url:contact.instagram_url||""};
}
function waMessageFor(contact){ return messageFor(waLead(contact)); }
function updateWaMetrics(){
  const statuses=waState.contacts.map(contact=>waStatusOf(contact.whatsapp_e164));
  const sent=statuses.filter(status=>status==="sent"||status==="replied").length;
  const replies=statuses.filter(status=>status==="replied").length;
  $("waTotalMetric").textContent=waState.contacts.length;
  $("waSentMetric").textContent=sent;$("waReplyMetric").textContent=replies;
  $("waRemainingMetric").textContent=statuses.filter(status=>status==="pending").length;
  $("waSentPercent").textContent=`${waState.contacts.length?Math.round(sent/waState.contacts.length*100):0}% complete`;
}
function renderWhatsApp(){
  const query=$("waSearchInput").value.toLowerCase().trim();const filter=$("waStatusFilter").value;
  const filtered=waState.contacts.filter(contact=>{
    const hay=[contact.name,contact.whatsapp_display,contact.whatsapp_e164,contact.preferred_shade].join(" ").toLowerCase();
    return (!query||hay.includes(query))&&(filter==="all"||waStatusOf(contact.whatsapp_e164)===filter);
  });
  $("waCreatorRows").innerHTML=filtered.map(contact=>{const status=waStatusOf(contact.whatsapp_e164);return `<tr><td><div class="creator"><div class="avatar">${escapeHtml(firstName(waLead(contact))[0]?.toUpperCase()||"C")}</div><div><strong>${escapeHtml(contact.name)}</strong><small>${contact.instagram_url?`Instagram profile available`:"Old collaborator"}</small></div></div></td><td class="contact">${escapeHtml(contact.whatsapp_display)}</td><td>${escapeHtml(contact.preferred_shade||"—")}</td><td><span class="status ${status}">${status[0].toUpperCase()+status.slice(1)}</span></td><td><div class="row-actions">${contact.instagram_url?`<button class="mini" data-wa-instagram="${escapeHtml(contact.whatsapp_e164)}">Instagram</button>`:""}<button class="mini primary" data-wa-open="${escapeHtml(contact.whatsapp_e164)}">Open WhatsApp</button></div></td></tr>`;}).join("");
  $("waEmptyState").hidden=filtered.length>0;
  if(!waState.contacts.length){$("waEmptyState").hidden=false;$("waEmptyState").textContent="Import the creator contacts JSON file to begin.";}else if(!filtered.length){$("waEmptyState").hidden=false;$("waEmptyState").textContent="No WhatsApp contacts match this filter.";}
  updateWaMetrics();
}
function showToast(text){ const el=$("toast");el.textContent=text;el.classList.add("show");clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove("show"),1800); }
async function copyText(text,successMessage="Copied"){ try{await navigator.clipboard.writeText(text);showToast(successMessage);return true;}catch{showToast("Copy failed — select the text manually");return false;} }
function leadByHandle(handle){ return leads.find(l=>l.handle===handle); }
function pendingLeads(){ return leads.filter(l=>statusOf(l.handle)==="pending"); }
function openQueue(lead){
  if(!lead){showToast("No pending creators left");return;}
  queueIndex=leads.indexOf(lead);$("queueCreatorName").textContent=lead.name||lead.handle;$("queueHandle").textContent=`@${lead.handle}`;
  $("queueMeta").textContent=`${Number(lead.followers).toLocaleString("en-IN")} followers · ${lead.city||lead.category||"India"}`;
  $("queueAvatar").textContent=firstName(lead)[0]?.toUpperCase()||"C";$("queueCompany").value=COMPANIES.includes(state.campaign.brand)?state.campaign.brand:COMPANIES[0];$("queueSubject").value=subjectFor(lead);$("queueMessage").value=messageFor(lead);$("queueDialog").showModal();
}
function currentLead(){ return leads[queueIndex]; }
function nextPending(){ const pending=pendingLeads(); return pending.find(l=>leads.indexOf(l)>queueIndex)||pending[0]; }
function setStatus(lead,status){ state.statuses[lead.handle]={status,updatedAt:new Date().toISOString()};save();render(); }
function openInstagram(lead){ window.open(lead.profile_url||`https://www.instagram.com/${lead.handle}/`,`_blank`,`noopener,noreferrer`); }
function switchCompany(company){
  state.companyProfiles[state.campaign.brand]=safeCompanyProfile(profileFromCampaign(),state.campaign.brand);
  if(company==="Prediction Talk"){state.campaign.offerType="prediction";$("homeOffer").value="prediction";}
  else if(state.campaign.offerType==="prediction"||(company!=="Brown Anatomy"&&state.campaign.offerType==="commission")){state.campaign.offerType="exclusive";$("homeOffer").value="exclusive";}
  state.campaign.brand=company;Object.assign(state.campaign,safeCompanyProfile(state.companyProfiles[company],company));save();$("homeCompany").value=company;$("queueCompany").value=company;
  const lead=currentLead();if(lead&&$("queueDialog").open){$("queueSubject").value=subjectFor(lead);$("queueMessage").value=messageFor(lead);}
  showToast(`Switched to ${company}`);
}
function switchOffer(offerType){
  if(offerType==="commission"&&state.campaign.brand!=="Brown Anatomy") switchCompany("Brown Anatomy");
  if(offerType==="prediction"&&state.campaign.brand!=="Prediction Talk") switchCompany("Prediction Talk");
  state.campaign.offerType=offerType;save();$("homeOffer").value=offerType;
  const lead=currentLead();if(lead&&$("queueDialog").open){$("queueSubject").value=subjectFor(lead);$("queueMessage").value=messageFor(lead);}
  showToast(offerType==="commission"?"2% creator opportunity selected":offerType==="prediction"?"Prediction Talk proposal selected":"Exclusive collection selected");
}
function switchView(view){
  const whatsapp=view==="whatsapp";$("campaignView").hidden=whatsapp;$("whatsappView").hidden=!whatsapp;
  $("campaignNav").classList.toggle("active",!whatsapp);$("whatsappNav").classList.toggle("active",whatsapp);
  if(whatsapp) renderWhatsApp();
}
function waContactByPhone(phone){ return waState.contacts.find(contact=>contact.whatsapp_e164===phone); }
function pendingWaContacts(){ return waState.contacts.filter(contact=>waStatusOf(contact.whatsapp_e164)==="pending"); }
function openWaQueue(contact){
  if(!contact){if($("waQueueDialog").open)$("waQueueDialog").close();showToast(waState.contacts.length?"No pending WhatsApp contacts left":"Import contacts first");return;}
  waQueueIndex=waState.contacts.indexOf(contact);$("waQueueCreatorName").textContent=contact.name;$("waQueueNumber").textContent=contact.whatsapp_display;
  $("waQueueMeta").textContent=contact.preferred_shade?`Previous shade: ${contact.preferred_shade}`:"Old collaborator";
  $("waQueueAvatar").textContent=firstName(waLead(contact))[0]?.toUpperCase()||"C";$("waQueueMessage").value=waMessageFor(contact);$("waQueueDialog").showModal();
}
function currentWaContact(){ return waState.contacts[waQueueIndex]; }
function nextPendingWa(){ const pending=pendingWaContacts();return pending.find(contact=>waState.contacts.indexOf(contact)>waQueueIndex)||pending[0]; }
function setWaStatus(contact,status){waState.statuses[contact.whatsapp_e164]={status,updatedAt:new Date().toISOString()};saveWa();renderWhatsApp();}
function openWhatsApp(contact){const message=$("waQueueDialog").open&&currentWaContact()===contact?$("waQueueMessage").value:waMessageFor(contact);window.open(`https://wa.me/${contact.whatsapp_e164}?text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");}

function normaliseIndianPhone(value){
  let digits=String(value??"").replace(/\D/g,"");
  if(digits.length===10) digits=`91${digits}`;
  return /^91[6-9]\d{9}$/.test(digits)?digits:"";
}
function displayIndianPhone(digits){return `+91 ${digits.slice(2,7)} ${digits.slice(7)}`;}
function normaliseImportedContact(contact){
  const whatsapp_e164=normaliseIndianPhone(contact.whatsapp_e164??contact.whatsapp??contact["WhatsApp"]);
  const name=String(contact.name??contact["Name"]??"").trim();
  if(!name||!whatsapp_e164)return null;
  return {
    name,
    instagram_url:String(contact.instagram_url??contact["Instagram profile"]??"").trim(),
    whatsapp_e164,
    whatsapp_display:String(contact.whatsapp_display??contact["WhatsApp"]??displayIndianPhone(whatsapp_e164)).trim(),
    preferred_shade:String(contact.preferred_shade??contact["Preferred shade"]??"").trim(),
    source:String(contact.source??contact["Source"]??"Imported contact").trim(),
    source_page:contact.source_page??"",
    status:String(contact.status??contact["Outreach status"]??"pending").toLowerCase()
  };
}
function contactsFromSpreadsheet(buffer){
  if(!window.XLSX)throw new Error("Excel reader unavailable");
  const workbook=window.XLSX.read(buffer,{type:"array"});
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  const rows=window.XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});
  const headerIndex=rows.findIndex(row=>row.some(cell=>String(cell).trim().toLowerCase()==="name")&&row.some(cell=>String(cell).trim().toLowerCase()==="whatsapp"));
  if(headerIndex<0)throw new Error("Required columns not found");
  const headers=rows[headerIndex].map(cell=>String(cell).trim());
  return rows.slice(headerIndex+1).map(row=>Object.fromEntries(headers.map((header,index)=>[header,row[index]??""])));
}
async function contactsFromFile(file){
  if(file.name.toLowerCase().endsWith(".json")){
    const parsed=JSON.parse(await file.text());
    if(!Array.isArray(parsed))throw new Error("Invalid JSON file");
    return parsed;
  }
  return contactsFromSpreadsheet(await file.arrayBuffer());
}

document.addEventListener("click",async(e)=>{
  const compose=e.target.closest("[data-compose]"); if(compose){const lead=leadByHandle(compose.dataset.compose);window.open(gmailComposeUrl(lead),"_blank","noopener,noreferrer");}
  const copy=e.target.closest("[data-copy]"); if(copy){const lead=leadByHandle(copy.dataset.copy);await copyText(messageFor(lead),"Message copied");}
  const open=e.target.closest("[data-open]"); if(open) openQueue(leadByHandle(open.dataset.open));
  const waOpen=e.target.closest("[data-wa-open]");if(waOpen) openWaQueue(waContactByPhone(waOpen.dataset.waOpen));
  const waInstagram=e.target.closest("[data-wa-instagram]");if(waInstagram){const contact=waContactByPhone(waInstagram.dataset.waInstagram);window.open(contact.instagram_url,"_blank","noopener,noreferrer");}
});
$("searchInput").addEventListener("input",render);$("statusFilter").addEventListener("change",render);
$("waSearchInput").addEventListener("input",renderWhatsApp);$("waStatusFilter").addEventListener("change",renderWhatsApp);
$("campaignNav").addEventListener("click",()=>switchView("campaign"));$("whatsappNav").addEventListener("click",()=>switchView("whatsapp"));
$("waImport").addEventListener("change",async(e)=>{const file=e.target.files?.[0];if(!file)return;try{const imported=await contactsFromFile(file);const contacts=imported.map(normaliseImportedContact).filter(Boolean);if(!contacts.length)throw new Error("No valid contacts");const unique=new Map(contacts.map(contact=>[contact.whatsapp_e164,contact]));waState.contacts=[...unique.values()];saveWa();renderWhatsApp();showToast(`${waState.contacts.length} WhatsApp contacts imported from ${file.name}`);}catch(error){console.error(error);showToast("Could not import this file. Use the provided Excel or JSON contacts file.");}finally{e.target.value="";}});
$("settingsBtn").addEventListener("click",()=>{$("brandName").value=state.campaign.brand;$("senderName").value=state.campaign.sender;$("collabType").value=state.campaign.collabType;$("brandLink").value=state.campaign.brandLink;$("instagramHandle").value=state.campaign.instagramHandle||"";$("contactDetails").value=state.campaign.contactDetails||"";$("subjectTemplate").value=state.campaign.subjectTemplate||defaultSubject;$("messageTemplate").value=state.campaign.template;$("campaignDialog").showModal();});
$("saveCampaignBtn").addEventListener("click",(e)=>{e.preventDefault();state.campaign={brand:$("brandName").value.trim(),offerType:state.campaign.offerType||"exclusive",sender:$("senderName").value.trim(),collabType:$("collabType").value,brandLink:$("brandLink").value.trim(),instagramHandle:$("instagramHandle").value.trim(),contactDetails:$("contactDetails").value.trim(),subjectTemplate:$("subjectTemplate").value.trim()||defaultSubject,template:$("messageTemplate").value};state.companyProfiles[state.campaign.brand]=safeCompanyProfile(profileFromCampaign(),state.campaign.brand);state.templateVersion=TEMPLATE_VERSION;save();$("campaignDialog").close();showToast("Campaign settings saved");});
$("startQueueBtn").addEventListener("click",()=>openQueue(pendingLeads()[0]));
$("closeQueueBtn").addEventListener("click",()=>$("queueDialog").close());
$("homeCompany").addEventListener("change",()=>switchCompany($("homeCompany").value));
$("homeOffer").addEventListener("change",()=>switchOffer($("homeOffer").value));
$("queueCompany").addEventListener("change",()=>switchCompany($("queueCompany").value));
$("startWaQueueBtn").addEventListener("click",()=>openWaQueue(pendingWaContacts()[0]));
$("closeWaQueueBtn").addEventListener("click",()=>$("waQueueDialog").close());
$("waCopyBtn").addEventListener("click",()=>copyText($("waQueueMessage").value,"Message copied"));
$("openWhatsAppBtn").addEventListener("click",()=>openWhatsApp(currentWaContact()));
$("waSkipBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"skipped");openWaQueue(nextPendingWa());});
$("waMarkSentBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"sent");openWaQueue(nextPendingWa());});
$("waMarkRepliedBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"replied");openWaQueue(nextPendingWa());});
$("copyBtn").addEventListener("click",()=>copyText($("queueMessage").value,"Message copied"));
$("copySubjectBtn").addEventListener("click",()=>copyText($("queueSubject").value,"Subject copied"));
$("openInstagramBtn").addEventListener("click",async()=>{const lead=currentLead();await copyText($("queueMessage").value,"Message copied");openInstagram(lead);});
$("skipBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"skipped");openQueue(nextPending());});
$("markSentBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"sent");openQueue(nextPending());});
$("markRepliedBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"replied");openQueue(nextPending());});
$("resetBtn").addEventListener("click",()=>{if(confirm("Reset every creator status? Campaign settings will remain.")){state.statuses={};save();render();showToast("Progress reset");}});
$("exportBtn").addEventListener("click",()=>{const rows=[["handle","name","status","updated_at"],...leads.map(l=>[l.handle,l.name||"",statusOf(l.handle),state.statuses[l.handle]?.updatedAt||""])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="creator-outreach-progress.csv";a.click();URL.revokeObjectURL(a.href);});

ensureCompanyProfiles();leads=await fetch("./data/leads.json").then(r=>r.json());$("homeCompany").value=COMPANIES.includes(state.campaign.brand)?state.campaign.brand:COMPANIES[0];$("homeOffer").value=state.campaign.offerType;render();renderWhatsApp();

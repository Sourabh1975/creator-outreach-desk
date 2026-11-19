const STORAGE_KEY = "creator-desk-v1";
const WA_STORAGE_KEY = "creator-desk-whatsapp-v1";
const TEMPLATE_VERSION = 7;
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
let campaignEditorMode = "edit";

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
function defaultCampaignsFor(company){
  if(company==="Brown Anatomy") return [
    {id:"exclusive",name:"Exclusive collection",offerType:"exclusive",subjectTemplate:defaultSubject,template:defaultTemplate},
    {id:"commission",name:"2% creator opportunity",offerType:"commission",subjectTemplate:commissionSubject,template:commissionTemplate}
  ];
  if(company==="Prediction Talk") return [
    {id:"prediction",name:"Creator monetization proposal",offerType:"prediction",subjectTemplate:predictionTalkSubject,template:predictionTalkTemplate}
  ];
  return [{id:"exclusive",name:"Exclusive collection",offerType:"exclusive",subjectTemplate:defaultSubject,template:defaultTemplate}];
}
function ensureCampaignLibrary(){
  if(!state.campaignsByCompany){
    state.campaignsByCompany=Object.fromEntries(COMPANIES.map(company=>[company,defaultCampaignsFor(company)]));
    const currentCompany=COMPANIES.includes(state.campaign.brand)?state.campaign.brand:"House of Sandhya";
    const currentType=state.campaign.offerType||"exclusive";
    if(currentType==="exclusive"){
      const record=state.campaignsByCompany[currentCompany].find(item=>item.offerType==="exclusive");
      if(record){record.subjectTemplate=state.campaign.subjectTemplate||defaultSubject;record.template=state.campaign.template||defaultTemplate;}
    }
    state.activeCampaignByCompany=Object.fromEntries(COMPANIES.map(company=>[company,state.campaignsByCompany[company][0].id]));
    const matching=state.campaignsByCompany[currentCompany].find(item=>item.offerType===currentType);
    if(matching) state.activeCampaignByCompany[currentCompany]=matching.id;
  }
  for(const company of COMPANIES){
    state.campaignsByCompany[company]||=defaultCampaignsFor(company);
    state.activeCampaignByCompany||={};
    if(!state.campaignsByCompany[company].some(item=>item.id===state.activeCampaignByCompany[company])) state.activeCampaignByCompany[company]=state.campaignsByCompany[company][0].id;
  }
  save();
}
function campaignsFor(company=state.campaign.brand){return state.campaignsByCompany[company]||[];}
function activeCampaignRecord(company=state.campaign.brand){
  return campaignsFor(company).find(item=>item.id===state.activeCampaignByCompany[company])||campaignsFor(company)[0];
}
function applyCampaignRecord(record){
  if(!record)return;
  state.campaign.offerType=record.offerType;
  state.campaign.subjectTemplate=record.subjectTemplate;
  state.campaign.template=record.template;
}
function renderCampaignOptions(){
  const records=campaignsFor();
  $("homeCampaign").innerHTML=records.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
  $("homeCampaign").value=state.activeCampaignByCompany[state.campaign.brand];
}
function messageFor(lead){
  const c=state.campaign;
  const selectedTemplate=c.template||defaultTemplate;
  const message=selectedTemplate.replaceAll("{first_name}",firstName(lead)).replaceAll("{creator_name}",creatorName(lead))
    .replaceAll("{handle}",lead.handle).replaceAll("{brand}",c.brand).replaceAll("{sender}",c.sender)
    .replaceAll("{collab_type}",c.collabType).replaceAll("{brand_link}",c.brandLink||"")
    .replaceAll("{website}",c.brandLink||"").replaceAll("{instagram}",c.instagramHandle||"")
    .replaceAll("{contact_details}",c.contactDetails||"");
  return message.replace(/\n{3,}/g,"\n\n").trim();
}
function subjectFor(lead){
  const c=state.campaign;
  const selectedSubject=c.subjectTemplate||defaultSubject;
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
const DEFAULT_WA_TEMPLATES = [
  {
    id: "prediction-talk-monetization",
    name: "Prediction Talk Monetization",
    body: `Hi {first_name},

We have been following your work and really appreciate the aesthetic and authenticity you bring to your content.

We are reaching out from the Creator Partnerships team at *Prediction Talk*. We are currently onboarding a few select fashion and lifestyle creators for a *high-earning monetization opportunity*—allowing you to generate *recurring income* from your content alongside *brand-funded paid promotion* for your profile.

Would you be open to us sharing the brief proposal here?

Website: https://predictiontalk.com`
  },
  {
    id: "brown-anatomy-commission",
    name: "Brown Anatomy 2% Commission",
    body: `Hi {first_name},

We’re currently onboarding 15 creators for a performance-based collaboration with Brown Anatomy and Prediction Talk (predictiontalk.com).

You will receive a 2% commission on the total value of all orders generated through your promotion. The more orders you generate, the more you earn—there is no fixed earning limit.

This is a great opportunity to build a long-term association with both brands while earning through your performance.

If you’re interested, please reply here. I’ll forward your profile to our team, and they will connect with you to explain the collaboration, payment structure, and next steps.

Warm regards,
Team Brown Anatomy & Prediction Talk`
  },
  {
    id: "shade-reconnect",
    name: "House of Sandhya (Shade Reconnect)",
    body: `Hi {first_name},

Hope you are doing well!

We loved collaborating with you on shade *{preferred_shade}*. We're currently launching an exclusive new collection at House of Sandhya and would love to partner with you again!

Would you be open to exploring this collaboration? We'd love to share the catalog and proposal with you.

Warm regards,
Team House of Sandhya
https://houseofsandhya.com`
  },
  {
    id: "barter-pr-gifting",
    name: "Barter / PR Gifting Invite",
    body: `Hi {first_name},

We love your content style and would love to send you some of our bestselling pieces as an exclusive PR gift collaboration with {brand}!

No strict deliverables—just genuine styling and a reel/story tag if you love the outfit.

Let us know if you'd be open to this and we'll share the collection lookbook with you!

Warm regards,
Team {brand}`
  }
];

function ensureWaTemplates(){
  if(!Array.isArray(waState.templates) || waState.templates.length === 0){
    waState.templates = DEFAULT_WA_TEMPLATES.map(t=>({...t}));
  }
  if(!waState.activeTemplateId || !waState.templates.some(t => t.id === waState.activeTemplateId)){
    waState.activeTemplateId = waState.templates[0].id;
  }
  waState.creatorTemplates ||= {};
  waState.customMessages ||= {};
  saveWa();
}

function activeWaTemplate(){
  ensureWaTemplates();
  return waState.templates.find(t=>t.id===waState.activeTemplateId) || waState.templates[0];
}

function templateForContact(contact){
  ensureWaTemplates();
  if(contact && waState.creatorTemplates && waState.creatorTemplates[contact.whatsapp_e164]){
    const assigned = waState.templates.find(t=>t.id===waState.creatorTemplates[contact.whatsapp_e164]);
    if(assigned) return assigned;
  }
  return activeWaTemplate();
}

function templateNameFor(contact){
  ensureWaTemplates();
  if(contact && waState.customMessages && waState.customMessages[contact.whatsapp_e164]){
    return "Custom (Edited)";
  }
  return templateForContact(contact).name;
}

function renderWaMessage(templateBody, contact){
  const lead = waLead(contact);
  const fname = firstName(lead);
  const fullName = contact.name || lead.name || "";
  const shade = contact.preferred_shade || "your favorite shade";
  const brand = state.campaign?.brand || "Prediction Talk";
  const website = state.campaign?.brandLink || "https://predictiontalk.com";
  const phone = contact.whatsapp_display || contact.whatsapp_e164 || "";

  return (templateBody || "")
    .replaceAll("{first_name}", fname)
    .replaceAll("{creator_name}", fullName)
    .replaceAll("{name}", fullName)
    .replaceAll("{preferred_shade}", shade)
    .replaceAll("{shade}", shade)
    .replaceAll("{brand}", brand)
    .replaceAll("{whatsapp}", phone)
    .replaceAll("{website}", website)
    .replaceAll("{instagram}", lead.profile_url || "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function waLead(contact){
  const handle=(contact.instagram_url||"").match(/instagram\.com\/([^/?#]+)/i)?.[1]||contact.name.replace(/\s+/g,"_").toLowerCase();
  return {name:contact.name,handle,profile_url:contact.instagram_url||""};
}

function waMessageFor(contact){
  if(contact && waState.customMessages && waState.customMessages[contact.whatsapp_e164]){
    return waState.customMessages[contact.whatsapp_e164];
  }
  const tmpl = templateForContact(contact);
  return renderWaMessage(tmpl.body, contact);
}

function renderWaTemplateOptions(){
  ensureWaTemplates();
  const optionsHtml = waState.templates.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  if($("waHomeTemplate")) {
    $("waHomeTemplate").innerHTML = optionsHtml;
    $("waHomeTemplate").value = waState.activeTemplateId;
  }
  if($("waQueueTemplateSelect")) {
    $("waQueueTemplateSelect").innerHTML = optionsHtml;
    const current = currentWaContact();
    if(current){
      $("waQueueTemplateSelect").value = templateForContact(current).id;
    } else {
      $("waQueueTemplateSelect").value = waState.activeTemplateId;
    }
  }
}

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
  ensureWaTemplates();
  const query=$("waSearchInput").value.toLowerCase().trim();const filter=$("waStatusFilter").value;
  const filtered=waState.contacts.filter(contact=>{
    const hay=[contact.name,contact.whatsapp_display,contact.whatsapp_e164,contact.preferred_shade].join(" ").toLowerCase();
    return (!query||hay.includes(query))&&(filter==="all"||waStatusOf(contact.whatsapp_e164)===filter);
  });
  $("waCreatorRows").innerHTML=filtered.map(contact=>{
    const status=waStatusOf(contact.whatsapp_e164);
    const tmplName=templateNameFor(contact);
    return `<tr>
      <td><div class="creator"><div class="avatar">${escapeHtml(firstName(waLead(contact))[0]?.toUpperCase()||"C")}</div><div><strong>${escapeHtml(contact.name)}</strong><small>${contact.instagram_url?`Instagram profile available`:"Old collaborator"}</small></div></div></td>
      <td class="contact">${escapeHtml(contact.whatsapp_display)}</td>
      <td>${escapeHtml(contact.preferred_shade||"—")}</td>
      <td><span class="template-badge" data-wa-badge="${escapeHtml(contact.whatsapp_e164)}" title="${escapeHtml(tmplName)}">${escapeHtml(tmplName)}</span></td>
      <td><span class="status ${status}">${status[0].toUpperCase()+status.slice(1)}</span></td>
      <td><div class="row-actions">${contact.instagram_url?`<button class="mini" data-wa-instagram="${escapeHtml(contact.whatsapp_e164)}">Instagram</button>`:""}<button class="mini primary" data-wa-open="${escapeHtml(contact.whatsapp_e164)}">Open WhatsApp</button></div></td>
    </tr>`;
  }).join("");
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
  state.campaign.brand=company;Object.assign(state.campaign,safeCompanyProfile(state.companyProfiles[company],company));save();$("homeCompany").value=company;$("queueCompany").value=company;
  applyCampaignRecord(activeCampaignRecord(company));renderCampaignOptions();save();
  const lead=currentLead();if(lead&&$("queueDialog").open){$("queueSubject").value=subjectFor(lead);$("queueMessage").value=messageFor(lead);}
  showToast(`Switched to ${company}`);
}
function switchCampaign(campaignId){
  state.activeCampaignByCompany[state.campaign.brand]=campaignId;
  applyCampaignRecord(activeCampaignRecord());save();renderCampaignOptions();
  const lead=currentLead();if(lead&&$("queueDialog").open){$("queueSubject").value=subjectFor(lead);$("queueMessage").value=messageFor(lead);}
  showToast(`${activeCampaignRecord().name} selected`);
}
function openCampaignEditor(mode){
  campaignEditorMode=mode;
  const record=activeCampaignRecord();
  $("campaignDialogTitle").textContent=mode==="add"?`Add campaign for ${state.campaign.brand}`:"Edit campaign";
  $("campaignName").value=mode==="add"?"":record.name;
  $("brandName").value=state.campaign.brand;$("senderName").value=state.campaign.sender;$("collabType").value=state.campaign.collabType;
  $("brandLink").value=state.campaign.brandLink;$("instagramHandle").value=state.campaign.instagramHandle||"";$("contactDetails").value=state.campaign.contactDetails||"";
  $("subjectTemplate").value=record.subjectTemplate||defaultSubject;$("messageTemplate").value=record.template||defaultTemplate;
  $("saveCampaignBtn").textContent=mode==="add"?"Add campaign":"Save campaign";$("campaignDialog").showModal();
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
  waQueueIndex=waState.contacts.indexOf(contact);
  const lead=waLead(contact);
  const fname=firstName(lead);
  $("waQueueCreatorName").textContent=contact.name;
  $("waQueueNumber").textContent=contact.whatsapp_display;
  $("waQueueMeta").textContent=contact.preferred_shade?`Previous shade: ${contact.preferred_shade}`:"Old collaborator";
  $("waQueueAvatar").textContent=fname[0]?.toUpperCase()||"C";
  $("waScopeSingleLabel").textContent=`Only ${fname||"this creator"}`;

  if(waState.creatorTemplates&&waState.creatorTemplates[contact.whatsapp_e164]){
    $("waScopeSingle").checked=true;
  } else {
    $("waScopeAll").checked=true;
  }

  renderWaTemplateOptions();
  $("waQueueTemplateSelect").value=templateForContact(contact).id;
  $("waQueueMessage").value=waMessageFor(contact);
  $("waQueueDialog").showModal();
}
function currentWaContact(){ return waState.contacts[waQueueIndex]; }
function nextPendingWa(){ const pending=pendingWaContacts();return pending.find(contact=>waState.contacts.indexOf(contact)>waQueueIndex)||pending[0]; }
function setWaStatus(contact,status){waState.statuses[contact.whatsapp_e164]={status,updatedAt:new Date().toISOString()};saveWa();renderWhatsApp();}
function openWhatsApp(contact){const message=$("waQueueDialog").open&&currentWaContact()===contact?$("waQueueMessage").value:waMessageFor(contact);window.open(`https://web.whatsapp.com/send?phone=${contact.whatsapp_e164}&text=${encodeURIComponent(message)}`,"_blank","noopener,noreferrer");}

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
$("settingsBtn").addEventListener("click",()=>openCampaignEditor("edit"));
$("addCampaignBtn").addEventListener("click",()=>openCampaignEditor("add"));
$("saveCampaignBtn").addEventListener("click",(e)=>{
  e.preventDefault();
  const name=$("campaignName").value.trim();if(!name){showToast("Add a campaign name");return;}
  const company=state.campaign.brand;
  const subjectTemplate=$("subjectTemplate").value.trim()||defaultSubject;
  const template=$("messageTemplate").value.trim();
  state.campaign={...state.campaign,brand:company,sender:$("senderName").value.trim(),collabType:$("collabType").value,brandLink:$("brandLink").value.trim(),instagramHandle:$("instagramHandle").value.trim(),contactDetails:$("contactDetails").value.trim(),subjectTemplate,template};
  if(campaignEditorMode==="add"){
    const id=`custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    campaignsFor(company).push({id,name,offerType:id,subjectTemplate,template});state.activeCampaignByCompany[company]=id;state.campaign.offerType=id;
  }else{
    Object.assign(activeCampaignRecord(company),{name,subjectTemplate,template});state.campaign.offerType=activeCampaignRecord(company).offerType;
  }
  state.companyProfiles[company]=safeCompanyProfile(profileFromCampaign(),company);state.templateVersion=TEMPLATE_VERSION;save();renderCampaignOptions();$("campaignDialog").close();showToast(campaignEditorMode==="add"?"Campaign added":"Campaign updated");
});
$("startQueueBtn").addEventListener("click",()=>openQueue(pendingLeads()[0]));
$("closeQueueBtn").addEventListener("click",()=>$("queueDialog").close());
$("homeCompany").addEventListener("change",()=>switchCompany($("homeCompany").value));
$("homeCampaign").addEventListener("change",()=>switchCampaign($("homeCampaign").value));
$("queueCompany").addEventListener("change",()=>switchCompany($("queueCompany").value));
$("startWaQueueBtn").addEventListener("click",()=>openWaQueue(pendingWaContacts()[0]));
$("closeWaQueueBtn").addEventListener("click",()=>$("waQueueDialog").close());
$("waCopyBtn").addEventListener("click",()=>copyText($("waQueueMessage").value,"Message copied"));
$("openWhatsAppBtn").addEventListener("click",()=>openWhatsApp(currentWaContact()));
$("waSkipBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"skipped");openWaQueue(nextPendingWa());});
$("waMarkSentBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"sent");openWaQueue(nextPendingWa());});
$("waMarkRepliedBtn").addEventListener("click",()=>{const contact=currentWaContact();setWaStatus(contact,"replied");openWaQueue(nextPendingWa());});

$("waHomeTemplate").addEventListener("change",()=>{
  const newId=$("waHomeTemplate").value;
  const tmpl=waState.templates.find(t=>t.id===newId);
  if(!tmpl) return;
  waState.activeTemplateId=newId;
  waState.creatorTemplates={};
  waState.customMessages={};
  saveWa();
  renderWaTemplateOptions();
  renderWhatsApp();
  showToast(`"${tmpl.name}" set for all creators`);
});

$("waQueueTemplateSelect").addEventListener("change",()=>{
  const contact=currentWaContact();
  if(!contact) return;
  const newTemplateId=$("waQueueTemplateSelect").value;
  const tmpl=waState.templates.find(t=>t.id===newTemplateId);
  if(!tmpl) return;

  const isAll=$("waScopeAll").checked;
  if(isAll){
    waState.activeTemplateId=newTemplateId;
    waState.creatorTemplates={};
    waState.customMessages={};
    saveWa();
    $("waQueueMessage").value=renderWaMessage(tmpl.body,contact);
    renderWaTemplateOptions();
    renderWhatsApp();
    showToast(`"${tmpl.name}" set for all creators`);
  } else {
    waState.creatorTemplates||={};
    waState.creatorTemplates[contact.whatsapp_e164]=newTemplateId;
    if(waState.customMessages) delete waState.customMessages[contact.whatsapp_e164];
    saveWa();
    $("waQueueMessage").value=renderWaMessage(tmpl.body,contact);
    renderWhatsApp();
    showToast(`"${tmpl.name}" selected for ${contact.name}`);
  }
});

$("waApplyAllBtn").addEventListener("click",()=>{
  const contact=currentWaContact();
  if(!contact) return;
  const currentText=$("waQueueMessage").value.trim();
  if(!currentText){
    showToast("Message cannot be empty");
    return;
  }
  const selectedTemplateId=$("waQueueTemplateSelect").value;
  let tmpl=waState.templates.find(t=>t.id===selectedTemplateId)||waState.templates[0];

  const fname=firstName(waLead(contact));
  const creatorFullName=contact.name||"";
  const shade=contact.preferred_shade||"";
  let generalizedBody=currentText;
  if(fname&&fname!=="there"){
    generalizedBody=generalizedBody.replace(new RegExp(`\\b${fname}\\b`,"i"),"{first_name}");
  }
  if(creatorFullName&&creatorFullName!==fname){
    generalizedBody=generalizedBody.replace(new RegExp(`\\b${creatorFullName}\\b`,"i"),"{name}");
  }
  if(shade){
    generalizedBody=generalizedBody.replace(new RegExp(`\\b${shade.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,"i"),"{preferred_shade}");
  }

  tmpl.body=generalizedBody;
  waState.activeTemplateId=tmpl.id;
  waState.creatorTemplates={};
  waState.customMessages={};
  saveWa();
  renderWaTemplateOptions();
  renderWhatsApp();
  $("waScopeAll").checked=true;
  showToast(`"${tmpl.name}" applied to all creators!`);
});

$("waQueueMessage").addEventListener("input",()=>{
  const contact=currentWaContact();
  if(!contact) return;
  if($("waScopeSingle").checked){
    waState.customMessages||={};
    waState.customMessages[contact.whatsapp_e164]=$("waQueueMessage").value;
    saveWa();
    renderWhatsApp();
  }
});

let waTemplateEditorMode="add";
let waEditingTemplateId=null;

function openWaTemplateEditor(mode,templateId=null){
  waTemplateEditorMode=mode;
  ensureWaTemplates();
  if(mode==="edit"){
    waEditingTemplateId=templateId||($("waQueueDialog").open?$("waQueueTemplateSelect").value:$("waHomeTemplate").value);
    const tmpl=waState.templates.find(t=>t.id===waEditingTemplateId)||waState.templates[0];
    $("waTemplateDialogTitle").textContent=`Edit "${tmpl.name}"`;
    $("waTemplateName").value=tmpl.name;
    $("waTemplateBody").value=tmpl.body;
    $("waDeleteTemplateBtn").style.display=waState.templates.length>1?"block":"none";
  } else {
    waEditingTemplateId=null;
    $("waTemplateDialogTitle").textContent="Add WhatsApp template";
    $("waTemplateName").value="";
    $("waTemplateBody").value=`Hi {first_name},

We love your work and would love to collaborate with you!

Would you be open to hearing more?

Warm regards,
Team {brand}`;
    $("waDeleteTemplateBtn").style.display="none";
  }
  $("waTemplateDialog").showModal();
}

$("waAddTemplateBtn").addEventListener("click",()=>openWaTemplateEditor("add"));
$("waQueueAddTemplateBtn").addEventListener("click",()=>openWaTemplateEditor("add"));
$("waEditTemplateBtn").addEventListener("click",()=>openWaTemplateEditor("edit"));
$("waQueueEditTemplateBtn").addEventListener("click",()=>openWaTemplateEditor("edit"));
$("closeWaTemplateBtn").addEventListener("click",()=>$("waTemplateDialog").close());
$("cancelWaTemplateBtn").addEventListener("click",()=>$("waTemplateDialog").close());

$("saveWaTemplateBtn").addEventListener("click",(e)=>{
  e.preventDefault();
  const name=$("waTemplateName").value.trim();
  const body=$("waTemplateBody").value.trim();
  if(!name){showToast("Please enter a template name");return;}
  if(!body){showToast("Please enter template text");return;}

  ensureWaTemplates();
  if(waTemplateEditorMode==="add"){
    const id=`wa-tmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`;
    const newTmpl={id,name,body};
    waState.templates.push(newTmpl);

    if($("waQueueDialog").open&&$("waScopeSingle").checked&&currentWaContact()){
      waState.creatorTemplates||={};
      waState.creatorTemplates[currentWaContact().whatsapp_e164]=id;
      if(waState.customMessages) delete waState.customMessages[currentWaContact().whatsapp_e164];
      saveWa();
      renderWaTemplateOptions();
      renderWhatsApp();
      $("waQueueTemplateSelect").value=id;
      $("waQueueMessage").value=waMessageFor(currentWaContact());
      showToast(`Template "${name}" added for ${currentWaContact().name}`);
    } else {
      waState.activeTemplateId=id;
      waState.creatorTemplates={};
      waState.customMessages={};
      saveWa();
      renderWaTemplateOptions();
      renderWhatsApp();
      if($("waQueueDialog").open&&currentWaContact()){
        $("waQueueTemplateSelect").value=id;
        $("waQueueMessage").value=waMessageFor(currentWaContact());
      }
      showToast(`Template "${name}" added & set for all creators!`);
    }
  } else {
    const tmpl=waState.templates.find(t=>t.id===waEditingTemplateId);
    if(tmpl){
      tmpl.name=name;
      tmpl.body=body;
      saveWa();
      renderWaTemplateOptions();
      renderWhatsApp();
      if($("waQueueDialog").open&&currentWaContact()){
        $("waQueueMessage").value=waMessageFor(currentWaContact());
      }
      showToast(`Template "${name}" updated!`);
    }
  }
  $("waTemplateDialog").close();
});

$("waDeleteTemplateBtn").addEventListener("click",()=>{
  if(waState.templates.length<=1){
    showToast("At least one template is required");
    return;
  }
  const tmpl=waState.templates.find(t=>t.id===waEditingTemplateId);
  if(!tmpl) return;
  if(!confirm(`Delete template "${tmpl.name}"?`)) return;

  waState.templates=waState.templates.filter(t=>t.id!==waEditingTemplateId);
  if(waState.activeTemplateId===waEditingTemplateId){
    waState.activeTemplateId=waState.templates[0].id;
  }
  if(waState.creatorTemplates){
    for(const [phone,tid] of Object.entries(waState.creatorTemplates)){
      if(tid===waEditingTemplateId) delete waState.creatorTemplates[phone];
    }
  }
  saveWa();
  renderWaTemplateOptions();
  renderWhatsApp();
  if($("waQueueDialog").open&&currentWaContact()){
    $("waQueueTemplateSelect").value=templateForContact(currentWaContact()).id;
    $("waQueueMessage").value=waMessageFor(currentWaContact());
  }
  $("waTemplateDialog").close();
  showToast(`Template "${tmpl.name}" deleted`);
});

document.querySelectorAll(".token-chip-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const token=btn.dataset.token;
    const textarea=$("waTemplateBody");
    const start=textarea.selectionStart;
    const end=textarea.selectionEnd;
    const text=textarea.value;
    textarea.value=text.substring(0,start)+token+text.substring(end);
    textarea.selectionStart=textarea.selectionEnd=start+token.length;
    textarea.focus();
  });
});

$("waSaveAsNewTemplateBtn").addEventListener("click",()=>{
  const contact=currentWaContact();
  const currentText=$("waQueueMessage").value.trim();
  openWaTemplateEditor("add");
  if(contact&&currentText){
    const fname=firstName(waLead(contact));
    const creatorFullName=contact.name||"";
    const shade=contact.preferred_shade||"";
    let body=currentText;
    if(fname&&fname!=="there"){
      body=body.replace(new RegExp(`\\b${fname}\\b`,"i"),"{first_name}");
    }
    if(creatorFullName&&creatorFullName!==fname){
      body=body.replace(new RegExp(`\\b${creatorFullName}\\b`,"i"),"{name}");
    }
    if(shade){
      body=body.replace(new RegExp(`\\b${shade.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`,"i"),"{preferred_shade}");
    }
    $("waTemplateBody").value=body;
    $("waTemplateName").value="Custom Outreach Proposal";
    $("waTemplateName").focus();
    $("waTemplateName").select();
  }
});

// --- WHATSAPP AUTO-PILOT / AUTO-SEND QUEUE ---
let autoQueue = [];
let autoTotal = 0;
let autoIndex = 0;
let autoRunning = false;
let autoPaused = false;
let autoTimerId = null;
let autoCountdownRemaining = 0;

function addAutoLog(text, type = ""){
  const list = $("autoLogList");
  if(!list) return;
  const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const entry = document.createElement("div");
  entry.className = `auto-log-entry ${type}`;
  entry.textContent = `[${time}] ${text}`;
  list.appendChild(entry);
  list.scrollTop = list.scrollHeight;
}

function updateAutoCurrentDisplay(contact){
  if(!contact){
    $("autoCreatorName").textContent = "Queue Completed";
    $("autoCreatorMeta").textContent = "All creators in queue processed";
    $("autoAvatar").textContent = "✓";
    $("autoStatusHint").textContent = "All pending creators have been sent messages!";
    return;
  }
  const lead = waLead(contact);
  const fname = firstName(lead);
  $("autoCreatorName").textContent = contact.name;
  $("autoCreatorMeta").textContent = `${contact.whatsapp_display}${contact.preferred_shade ? ` • Shade: ${contact.preferred_shade}` : ""}`;
  $("autoAvatar").textContent = fname[0]?.toUpperCase() || "C";
  $("autoStatusHint").innerHTML = `WhatsApp tab opened for <strong>${escapeHtml(contact.name)}</strong>. Just press <strong>Enter</strong> on WhatsApp while the loop automatically advances!`;
}

function openWaAutoDialog(){
  ensureWaTemplates();
  const optionsHtml = waState.templates.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  $("waAutoTemplateSelect").innerHTML = optionsHtml;
  $("waAutoTemplateSelect").value = waState.activeTemplateId;

  autoQueue = waState.contacts.filter(c => waStatusOf(c.whatsapp_e164) === "pending");
  autoTotal = autoQueue.length;
  autoIndex = 0;
  autoRunning = false;
  autoPaused = false;
  clearInterval(autoTimerId);

  $("autoProgressLabel").textContent = "Ready to start";
  $("autoProgressCount").textContent = `0 / ${autoTotal} sent`;
  $("autoProgressBar").style.width = "0%";
  $("autoCountdownBadge").hidden = true;

  $("autoRunBtn").style.display = "inline-block";
  $("autoRunBtn").textContent = "▶ Start Auto-Send Loop";
  $("autoRunBtn").disabled = autoTotal === 0;
  $("autoPauseBtn").style.display = "none";
  $("autoPauseBtn").disabled = true;
  $("autoStopBtn").disabled = true;
  $("autoSkipBtn").disabled = true;

  const logList = $("autoLogList");
  logList.innerHTML = `<div class="auto-log-entry">Found ${autoTotal} pending creators ready for outreach.</div>`;

  if(autoQueue.length > 0){
    updateAutoCurrentDisplay(autoQueue[0]);
  } else {
    updateAutoCurrentDisplay(null);
  }

  $("waAutoDialog").showModal();
}

function stopAutoLoop(){
  autoRunning = false;
  autoPaused = false;
  clearInterval(autoTimerId);
  $("autoCountdownBadge").hidden = true;
  $("autoRunBtn").style.display = "inline-block";
  $("autoRunBtn").textContent = "▶ Start Auto-Send Loop";
  $("autoRunBtn").disabled = autoQueue.length === 0;
  $("autoPauseBtn").style.display = "none";
  $("autoStopBtn").disabled = true;
  $("autoSkipBtn").disabled = true;
  $("autoProgressLabel").textContent = "Stopped";
  addAutoLog("⏹ Auto-Send loop stopped");
  showToast("Auto-Send loop stopped");
}

function pauseAutoLoop(){
  if(!autoRunning) return;
  if(autoPaused){
    autoPaused = false;
    $("autoPauseBtn").textContent = "Pause";
    $("autoProgressLabel").textContent = "Sending in progress...";
    addAutoLog("▶ Resumed Auto-Send loop");
    startNextCountdown();
  } else {
    autoPaused = true;
    clearInterval(autoTimerId);
    $("autoPauseBtn").textContent = "▶ Resume";
    $("autoProgressLabel").textContent = "Paused";
    addAutoLog("⏸ Paused Auto-Send loop");
  }
}

function skipAutoCurrent(){
  if(!autoRunning) return;
  clearInterval(autoTimerId);
  addAutoLog("⏭ Skipped timer, advancing to next creator immediately...");
  processNextAutoContact();
}

function startNextCountdown(){
  clearInterval(autoTimerId);
  if(autoQueue.length === 0){
    finishAutoLoop();
    return;
  }
  const delaySec = parseInt($("waAutoDelay").value, 10) || 10;
  autoCountdownRemaining = delaySec;
  $("autoCountdownBadge").hidden = false;
  $("autoCountdownSec").textContent = `Next in ${autoCountdownRemaining}s`;

  autoTimerId = setInterval(() => {
    if(autoPaused) return;
    autoCountdownRemaining--;
    if(autoCountdownRemaining > 0){
      $("autoCountdownSec").textContent = `Next in ${autoCountdownRemaining}s`;
    } else {
      clearInterval(autoTimerId);
      $("autoCountdownBadge").hidden = true;
      processNextAutoContact();
    }
  }, 1000);
}

function processNextAutoContact(){
  if(!autoRunning || autoPaused) return;
  if(autoQueue.length === 0){
    finishAutoLoop();
    return;
  }

  const contact = autoQueue.shift();
  autoIndex++;

  const selectedTemplateId = $("waAutoTemplateSelect").value;
  const tmpl = waState.templates.find(t=>t.id === selectedTemplateId) || activeWaTemplate();
  const message = renderWaMessage(tmpl.body, contact);

  updateAutoCurrentDisplay(contact);

  const url = `https://web.whatsapp.com/send?phone=${contact.whatsapp_e164}&text=${encodeURIComponent(message)}`;
  window.open(url, "wa_outreach_runner_tab");

  setWaStatus(contact, "sent");

  const pct = Math.round((autoIndex / autoTotal) * 100);
  $("autoProgressBar").style.width = `${pct}%`;
  $("autoProgressCount").textContent = `${autoIndex} / ${autoTotal} sent (${pct}%)`;
  $("autoProgressLabel").textContent = `Sending (${pct}%)`;

  addAutoLog(`✓ [${autoIndex}/${autoTotal}] Opened chat for ${contact.name} (${contact.whatsapp_display})`, "success");

  if(autoQueue.length > 0){
    startNextCountdown();
  } else {
    finishAutoLoop();
  }
}

function finishAutoLoop(){
  autoRunning = false;
  autoPaused = false;
  clearInterval(autoTimerId);
  $("autoCountdownBadge").hidden = true;
  $("autoProgressBar").style.width = "100%";
  $("autoProgressLabel").textContent = "Completed!";
  $("autoProgressCount").textContent = `${autoIndex} / ${autoTotal} sent (100%)`;
  $("autoRunBtn").style.display = "inline-block";
  $("autoRunBtn").textContent = "Completed";
  $("autoRunBtn").disabled = true;
  $("autoPauseBtn").style.display = "none";
  $("autoStopBtn").disabled = true;
  $("autoSkipBtn").disabled = true;
  updateAutoCurrentDisplay(null);
  addAutoLog(`🎉 All ${autoTotal} creators completed!`, "success");
  showToast("Auto-Send loop completed successfully!");
}

function startAutoLoop(){
  if(autoQueue.length === 0){
    showToast("No pending creators in queue!");
    return;
  }
  autoRunning = true;
  autoPaused = false;
  $("autoRunBtn").style.display = "none";
  $("autoPauseBtn").style.display = "inline-block";
  $("autoPauseBtn").disabled = false;
  $("autoPauseBtn").textContent = "Pause";
  $("autoStopBtn").disabled = false;
  $("autoSkipBtn").disabled = false;
  $("autoProgressLabel").textContent = "Starting...";
  addAutoLog("🚀 Starting Auto-Send loop...");
  processNextAutoContact();
}

$("startWaAutoBtn").addEventListener("click", openWaAutoDialog);
$("closeWaAutoBtn").addEventListener("click", () => {
  if(autoRunning && !confirm("Auto-Send is currently running. Stop and close?")) return;
  stopAutoLoop();
  $("waAutoDialog").close();
});
$("autoRunBtn").addEventListener("click", startAutoLoop);
$("autoPauseBtn").addEventListener("click", pauseAutoLoop);
$("autoStopBtn").addEventListener("click", stopAutoLoop);
$("autoSkipBtn").addEventListener("click", skipAutoCurrent);
$("waQueueStartAutoBtn").addEventListener("click", () => {
  $("waQueueDialog").close();
  openWaAutoDialog();
});

$("copyBtn").addEventListener("click",()=>copyText($("queueMessage").value,"Message copied"));
$("copySubjectBtn").addEventListener("click",()=>copyText($("queueSubject").value,"Subject copied"));
$("openInstagramBtn").addEventListener("click",async()=>{const lead=currentLead();await copyText($("queueMessage").value,"Message copied");openInstagram(lead);});
$("skipBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"skipped");openQueue(nextPending());});
$("markSentBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"sent");openQueue(nextPending());});
$("markRepliedBtn").addEventListener("click",()=>{const lead=currentLead();setStatus(lead,"replied");openQueue(nextPending());});
$("resetBtn").addEventListener("click",()=>{if(confirm("Reset every creator status? Campaign settings will remain.")){state.statuses={};save();render();showToast("Progress reset");}});
$("exportBtn").addEventListener("click",()=>{const rows=[["handle","name","status","updated_at"],...leads.map(l=>[l.handle,l.name||"",statusOf(l.handle),state.statuses[l.handle]?.updatedAt||""])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="creator-outreach-progress.csv";a.click();URL.revokeObjectURL(a.href);});

ensureCompanyProfiles();
ensureCampaignLibrary();
ensureWaTemplates();
state.campaign.brand=COMPANIES.includes(state.campaign.brand)?state.campaign.brand:COMPANIES[0];
applyCampaignRecord(activeCampaignRecord());
leads=await fetch("./data/leads.json").then(r=>r.json());
if(!waState.contacts || !waState.contacts.length){
  try{
    const defaultContacts=await fetch("./data/creator_contacts.json").then(r=>r.json());
    if(Array.isArray(defaultContacts)&&defaultContacts.length){
      waState.contacts=defaultContacts.map(normaliseImportedContact).filter(Boolean);
      saveWa();
    }
  }catch(e){}
}
$("homeCompany").value=state.campaign.brand;
$("queueCompany").value=state.campaign.brand;
renderCampaignOptions();
renderWaTemplateOptions();
save();
render();
renderWhatsApp();

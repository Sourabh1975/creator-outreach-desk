# WhatsApp Creator Outreach Auto-Sender (1-Click Automated Bot)

Ye script automatically **`creator_contacts.json`** ke sabhi creators ko one-by-one personalized WhatsApp messages send karti hai bina kisi manual click ke.

---

## 🚀 Kaise Chalayein (How to Run)

### Method 1: Ek Click Mein (Windows Shortcut)
* **`run_sender.bat`** file par **double-click** karein.
* Chrome window open hogi.
* Pehli baar WhatsApp Web ka QR code apne phone se scan karein.
* QR scan hone ke baad script automatically loop chalakar sabhi creators ko message send karna shuru kar degi!

### Method 2: Terminal se
```bash
cd "automation/whatsapp-sender"
npm start
```

---

## ⚙️ Configuration (`config.json`)

Aap `config.json` mein sab kuch customise kar sakte hain:

1. **`activeTemplate`**: Kaun sa message bhejna hai:
   * `"prediction-talk-monetization"` *(Default)*
   * `"brown-anatomy-commission"`
   * `"shade-reconnect"`
   * `"barter-pr-gifting"`
2. **`dryRun`**:
   * Agar testing karni hai bina message send kiye, toh `"dryRun": true` set karein.
   * Send karne ke liye `"dryRun": false`.
3. **`batchLimit`**:
   * Agar aap ek baar mein sirf 10 ya 20 creators ko bhejna chahte hain, toh yahan number set kar sakte hain (jaise `15`). `0` ka matlab saare pending creators ko send karega.
4. **`minDelaySeconds` / `maxDelaySeconds`**:
   * Default: 12 se 20 seconds. 
   * Yeh delay WhatsApp spam detection se aapke number ko 100% safe rakhta hai.

---

## 🛡️ Anti-Ban & Safe Workflow Features
* **Auto Resume (`progress.json`)**: Jinko message send ho chuka hai, unka record save hota rehta hai. Agar script beech mein band bhi ho jaye, toh dubara chalane par unhe dubara message nahi jayega; sirf bache hue pending creators ko hi jayega.
* **Session Saved (`whatsapp_session`)**: WhatsApp session local folder mein save rehta hai, baar-baar QR code scan nahi karna padega.
* **Invalid Number Protection**: Agar koi number WhatsApp par nahi hai, toh script crash nahi hogi, use skip karke aage badh jayegi.

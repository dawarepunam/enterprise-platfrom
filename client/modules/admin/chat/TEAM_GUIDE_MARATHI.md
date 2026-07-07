# 💬 Real-Time Chat - Team Member Guide (मराठी)

## 🎯 Real-Time Chat असे काय आहे?

हे तुमच्या team room मध्ये real-time chat करण्यासाठी बनवलेले आहे. ज्याप्रमाणे WhatsApp, Slack किंवा Telegram मध्ये messages भेजता तसेच इथे भेजू शकता.

---

## 🚀 कसे सुरु करायचं?

### Step 1: Chat Page उघडा

```
URL: http://localhost:5000/client/modules/admin/chat/chat.html
```

### Step 2: Login करा

तुमचे credentials लिहा (email + password)

### Step 3: Team Room निवडा

डावीकडे तुमचे सर्व team rooms दिसेल. ज्या team मध्ये chat करायचं, तेवर क्लिक करा.

---

## 💬 Message कसे भेजायचं?

### Text Message:

1. Message input field मध्ये text लिहा
2. "Send" button दाबा किंवा Enter key दाबा
3. Message तातडीने सर्वांना दिसेल

```
तुमचा message लिहा → [Send] Button
```

---

## 👀 लाइव Features

### 1️⃣ Typing Indicator (कोण लिखत आहे?)

जेव्हा कोणी message लिखत असेल, तेव्हा हे दिसेल:

```
Anita is typing...
```

### 2️⃣ Online Status (कोण online आहे?)

- 🟢 **Green Dot** = Member online आहे
- ⚫ **Gray Dot** = Member offline आहे

### 3️⃣ Message History (पुरानी messages)

जेव्हा room open कराल, तेव्हा सर्व पुरानी messages load होतील. नवीन members आले तरी सर्व message history दिसेल.

---

## 📎 File कसे Share करायचं?

### Step-by-Step:

1. **Attach Button क्लिक करा** 📎

   ```
   Message box च्या बाजूला 📎 आयकन आहे
   ```

2. **File निवडा**

   ```
   Computer मधून file निवडा (Size: Max 10MB)
   ```

3. **Optional: Note लिहा**

   ```
   File कशासाठी आहे ते लिहू शकता (optional)
   ```

4. **"Share File" Button दाबा**

   ```
   File Cloudinary ला upload होईल (2-5 सेकंद लागू शकतात)
   ```

5. **All Members ला message मिळेल**
   ```
   File link chat मध्ये दिसेल - कोणी पण download करू शकेल
   ```

---

## 🔍 Room कसे Search करायचं?

ज्यास्त rooms असतील तर:

1. Top मध्ये "Search rooms" box दिसेल
2. Team किंवा Project नाव type करा
3. List automatically filter होईल

```
Example:
"Sales" type केलास → सर्व Sales team rooms दिसतील
"Project A" type केलास → "Project A" related rooms दिसतील
```

---

## ⚙️ Admin Team Lead - यांनीच?

### Admin/Team Lead साठी Extra Features:

1. **सर्व Team Rooms दिसतील**
   - तुम्हाला सर्व teams ला monitor करून chat का सकता

2. **Live Dashboard**

   ```
   - Socket Status: Connected/Disconnected
   - Online Users: कोण online आहे
   - Room Count: किती rooms आहेत
   ```

3. **Team अनुसार Chat**
   - कोणताही team निवडून chat सुरु करता येते
   - File share करता येते

4. **Meeting Start करा**
   - Right side top मध्ये "Start Meeting" button आहे
   - Team members ला meeting invite जाईल

---

## 🔐 Security & Privacy

✅ **तुमच्या messages safe आहेत:**

- MongoDB मध्ये permanently save होतात
- केवळ team members दिसू शकतात
- Admin देख शकतो (if needed)

✅ **Login required:**

- कोणी पण बिना login के chat पाहू शकत नाहीत

✅ **Files safe:**

- Cloudinary (secure cloud storage) मध्ये save होतात

---

## ⚡ Tips & Tricks

### 1. Quick Reply करा

- Typing start करायच्या आधी लिहू शकता
- "message..." दिसल्यावर reply write करा

### 2. Message History देखा

- Page reload केलास तरी सर्व old messages दिसतील

### 3. Multiple Teams

- एकाच वेळी सर्व teams मध्ये chat सुरु करू शकता
- Team switch करा लगेच

### 4. File History

- सर्व shared files chat मध्ये visible रहातात

---

## 🆘 Problem आले तर?

### Problem 1: "Connecting..." दिसत राहते

**Solution:**

```
1. Page Refresh करा (F5)
2. Internet check करा
3. Server running आहे का check करा (Port 5000)
```

### Problem 2: Message नाहीच भेजला जात

**Solution:**

```
1. Team room select केला आहे का? (Left side)
2. Message empty तर नाहीच भेजेल
3. Console (F12) मध्ये error दिसत आहे का?
```

### Problem 3: File upload नाहीच होतं

**Solution:**

```
1. File size check करा (max 10MB)
2. Internet fast आहे का?
3. Cloudinary server down तर?
```

### Problem 4: "Unauthorized" error

**Solution:**

```
1. Re-login करा
2. Token expire झाले असेल
3. Session clear करा (Ctrl+Shift+Del)
```

---

## 🎯 Workflow Example

### Daily Team Chat Scenario:

```
9:00 AM  - Anita: "Good morning everyone! Today's standup"
          (सर्वांना message मिळेल)

9:05 AM  - Raj: लिखत आहे... (Typing indicator दिसेल)
          Raj: "I completed the database migration"

9:10 AM  - Priya shares file: "project_report.pdf"
          (Everyone download करू शकेल)

9:15 AM  - Team Lead: "Great work! Meeting at 10:00"
          (सर्व members ला instant notification)

9:30 AM  - नई member added
          (पण सर्व old messages तेला दिसेल)
```

---

## 📊 Message Types

### ✅ Text Messages

```
"मी ये task पूर्ण केले"
```

### 📎 File Attachments

```
Project_Report.pdf (2.5 MB)
```

### 🔔 System Messages

```
"Anita came online"
"Raj left the chat"
```

---

## 🔄 Real-Time Flow

```
तुम्ही:          Server:        सर्व Members:
Message लिहा →  Save DB →      सर्वांना दिसेल
                Broadcast ↓
                को सर्वांना
                तातडीने
```

---

## 📱 Desktop & Mobile

✅ **काम करते:**

- Desktop browser (Chrome, Firefox, Edge)
- Mobile browser (tested)
- Tablet

⚠️ **Note:** Phone मध्ये responsive design आहे, but desktop version better experience देतो.

---

## 🎓 Learning Resources

### Socketको समजून घेण्यासाठी:

1. Page load होतेय → Server connect होतो
2. Message भेजायच → Server सर्वांना broadcast करतो
3. File share → Cloudinary upload → Link share

### Real-Time Meaning:

```
Real-Time = तातडीने (No page refresh needed)
Socket.IO = Permanent connection like WhatsApp
```

---

## 💡 Best Practices

1. **Respectful Communication**
   - प्रॉफेशनल language वापरा
   - Abusive content नाहीं

2. **File Organization**
   - Clear file names (report_2026_May.pdf ✅)
   - Avoid junk files

3. **Active Participation**
   - Standups मध्ये participate करा
   - Updates share करा

4. **Privacy**
   - Personal info share करू नकोस
   - Company secrets safe ठेवा

---

## 🚀 Future Features (आसन्न)

- ✨ Voice Notes
- 📍 Location Sharing
- 🎥 Video Calls
- 🔔 Read Receipts (✓✓ marks)
- 🔍 Message Search
- 😊 Emoji Reactions
- 📌 Pin Important Messages

---

## 📞 Support

**Issues आले तर:**

1. IT Team ला contact करा
2. Slack/Email report करा
3. Screenshot attach करा

---

## 🎉 Ready to Chat!

**Happy Chatting!**

तुम्ही अब team members सोबत real-time chat करू शकता. मजा करा आणि productive राहा! 🚀

---

**Remember:** यहां हर chat message permanent save होता है. Be professional, be respectful!

**Version:** 1.0 | **Last Updated:** May 2026 | **Status:** ✅ Ready to Use

# ChatFlow 💬

A real-time chat app built from scratch by simulating how a real startup 
team actually works, with a PRD, system design, sprint planning, and 
proper engineering practices from day one.

---

## What it does

ChatFlow is a lightweight messaging app for small teams and individuals 
who want a fast, clean alternative to bloated tools like Slack or Teams. 
No unnecessary features. No onboarding friction. Just open it, log in, 
and start chatting — in under 60 seconds.

Built as a solo full-stack project, owned end to end from database 
schema to real-time socket events to the React UI. You can register an account, log in, and chat with other users in real time. Messages appear instantly on both sides without refreshing the page — just like WhatsApp or Slack.

---

## What I used to build it

- **React** — the frontend UI
- **Node.js + Express** — the backend server and API
- **MongoDB** — stores users, messages, and conversations
- **Socket.io** — handles the real-time messaging
- **JWT + bcrypt** — keeps accounts secure



---

## What's working so far

- Register and log in to your account
- JWT authentication: your session stays alive across page refreshes
- Real-time messaging: send a message and it appears instantly on the other side
- Message history: your messages are saved and load when you reopen a conversation
- Multiple conversations: switch between different chats
- Clean chat UI: colored avatars, message bubbles, timestamps, sender names

---

## What's coming next

- Typing indicators ("John is typing...")
- Online/offline status
- Start a new conversation from inside the app
- Profile settings page
- Deploy it live on the internet

---

## How to run it locally

You'll need Node.js and a free MongoDB Atlas account.

**Start the backend:**
```bash
cd server
npm install
npm run dev
```

Create a `.env` file inside the `server` folder with:
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=any_secret_string_you_choose
```

**Start the frontend:**
```bash
cd client
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

---

## How I built it

I didn't just write code — I planned it like a real product:

- Wrote a PRD (Product Requirement Document) before touching any code
- Broke the project into Epics, Stories, and Tasks like a real Jira board
- Followed a 3-sprint Agile plan with clear goals per sprint
- Built backend first, tested with Postman, then built the frontend on top
- Used Git properly with meaningful commit messages throughout

---

## Author

**Awais Abdullah** 

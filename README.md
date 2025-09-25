# AI Brainstorming Assistant

This project is a real-time brainstorming assistant for creative teams, built as a chat application with AI-powered ideation tools. It supports multiple users, instant messaging, and AI-generated suggestions for mind-mapping and idea scoring.

## Problem & Approach

Creative discussions often stall due to lack of structure or fresh ideas. This app brings AI into the chat, letting teammates brainstorm, score ideas, and visualize mind-maps together. The backend uses Node.js, Express, and Socket.io for instant messaging; the frontend is a minimalist dashboard in HTML/CSS/JS, and the AI service is powered by Google Gemini.

## How to Run

1. Clone the repo.
2. `npm install` to get dependencies.
3. Add your `AI_API_KEY` in a `.env` file.
4. Start with `node server.js` (or use `nodemon server.js` for development).
5. Open `public/index.html` in a browser.
6. Demo: Invite teammates to join via LAN or deploy on Render/Vercel.

--


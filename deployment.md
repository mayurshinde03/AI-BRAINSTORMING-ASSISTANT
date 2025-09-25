# Deployment

## Local

- Requirements: Node.js (v22+), npm
- Run: `npm install` then `node server.js`
- .env: `AI_API_KEY` from Google Gemini, `DATABASE_URL` if using cloud DB

## Cloud (Render, Vercel)

- Set environment variables in Dashboard
- Set start command: `node server.js`
- Static frontend will auto-deploy from the `public/` directory
- Use HTTPS for secure production access

## Dependencies

- Node.js, Express, Socket.io, dotenv, PostgreSQL/SQLite


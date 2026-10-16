# Safe-Chat

Safe-Chat is a MERN application for real-time private messaging with AI-assisted toxicity detection and a parent dashboard for flagged messages.

## Core features

- Student and parent account registration and login
- Password hashing with bcrypt
- JWT-based API and Socket.IO authentication
- Live online-user list, private messages, typing indicators and message history
- Hugging Face text moderation (when configured)
- Persistent flagged-message records and linked-parent alerts
- Responsive React chat UI with search and light/dark themes

## Repository layout

- `chatguard-frontend/` — React UI (Create React App)
- `chatguard-backend/` — Express API, Socket.IO server, Mongoose models and moderation logic

## Requirements

- Node.js 20 or newer
- MongoDB connection string
- JWT secret
- Optional Hugging Face access token for AI moderation

## Run locally

### 1. Backend

```bash
cd chatguard-backend
npm install
```

Create a `.env` file in `chatguard-backend/`:

```env
PORT=4000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
HF_TOKEN=your-hugging-face-token
HF_MODEL=KoalaAI/Text-Moderation
CLIENT_ORIGINS=http://localhost:3000,https://shivendr0309.github.io
```

Start the API:

```bash
npm start
```

The backend exposes `/` and `/api/health` for status checks.

### 2. Frontend

```bash
cd chatguard-frontend
npm install
```

For local development, create `chatguard-frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:4000
```

Start React:

```bash
npm start
```

For production, set `REACT_APP_API_URL` to the HTTPS URL of the deployed backend before building the frontend. Never put `JWT_SECRET`, MongoDB credentials, or `HF_TOKEN` in the frontend environment.

## Deploy

- Deploy `chatguard-backend/` as a Node web service and set the backend environment variables in the hosting dashboard.
- Build and deploy `chatguard-frontend/` to GitHub Pages with `npm run deploy`.
- Set `REACT_APP_API_URL` to the public backend URL when building the frontend.
- Ensure `CLIENT_ORIGINS` contains the exact frontend origin. Do not include a path such as `/Safe-Chat` in the origin.
- After deployment, check `/api/health`, registration/login, authenticated chat, history, moderation and parent alerts.

## Security notes

- Never commit `.env` files or production secrets.
- JWTs are required for Socket.IO connections and protected API routes.
- Sender identity is derived from the verified token, not from the client message payload.
- AI moderation is an assistive classifier, not a guarantee. If the model is unavailable, the message is marked as unclassified and the client receives a warning.
- Parent alerts are limited to the mobile number linked to the student's account. Use appropriate consent and privacy practices before deploying with real student data.

## Important

This refactor should be tested with your own MongoDB, Hugging Face token and deployment environment before production use. Existing messages remain in MongoDB; the new schema adds a recipient-parent field, so older records may not have recipient-side parent alerts.

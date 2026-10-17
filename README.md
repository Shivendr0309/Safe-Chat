# Safe-Chat

Safe-Chat is a MERN application for real-time private messaging with AI-assisted toxicity detection and a parent dashboard for flagged messages.

## Core features

- Student and parent account registration and login
- Password hashing with bcrypt
- JWT-based API and Socket.IO authentication
- Live online-user list, private messages, typing indicators, recent message history, and duplicate-message protection in the UI
- Self-hosted Detoxify toxicity classification through a private Python service
- Persistent flagged-message records and linked-parent alerts
- Responsive React chat UI with search, light/dark themes, connection feedback, and accessible focus states
- Student-generated, expiring one-time parent-link codes for new parent registration
- API and authentication rate limits
- GitHub Actions CI for frontend production builds and backend syntax checks

## Repository layout

- `chatguard-frontend/` — React UI (Create React App)
- `chatguard-backend/` — Express API, Socket.IO server, Mongoose models and moderation client
- `moderation-service/` — FastAPI service running the open-source Detoxify classifier

## Requirements

- Node.js 20 or newer
- MongoDB connection string
- JWT secret
- A deployed Python moderation service URL and shared API key for AI moderation

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
MODERATION_API_URL=https://<your-moderation-service>.onrender.com
MODERATION_API_KEY=<same-long-random-secret-configured-on-the-python-service>
MODERATION_TIMEOUT_MS=8000
CLIENT_ORIGINS=http://localhost:3000
```

Start the API:

```bash
npm start
```

The backend exposes `/` and `/api/health` for status checks. Moderation calls the separate private FastAPI service; if that service is not configured or cannot respond, messages are explicitly marked unclassified rather than assumed safe.

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

- Deploy `moderation-service/` as a Python web service first. In Render, use its `render.yaml` blueprint or set the root directory to `moderation-service`, build command `pip install -r requirements.txt`, and start command `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Set a strong random `MODERATION_API_KEY` secret on the Python service. Keep it private; the service requires it as a Bearer token for every `/moderate` request.
- Deploy `chatguard-backend/` as a Node web service and set `MODERATION_API_URL` to the Python service base URL, the same `MODERATION_API_KEY`, and `MODERATION_TIMEOUT_MS=8000` in the backend environment.
- Build and deploy `chatguard-frontend/` to Vercel (or another static host).
- Set `REACT_APP_API_URL` to the public backend URL when building the frontend.
- Ensure `CLIENT_ORIGINS` contains the exact frontend origin. Do not include a path such as `/Safe-Chat` in the origin.
- After deployment, check `/api/health`, student registration/login, parent code generation and registration, authenticated chat, history, moderation and parent alerts. Confirm `CLIENT_ORIGINS` lists the exact deployed frontend origin.

## Security notes

- Never commit `.env` files or production secrets.
- JWTs are required for Socket.IO connections and protected API routes.
- Sender identity is derived from the verified token, not from the client message payload.
- AI moderation is an assistive classifier, not a guarantee. If the model is unavailable, the message is marked as unclassified and the client receives a warning.
- New parent registrations can connect later using an 8-character one-time code generated in student Settings. Codes expire after 15 minutes and are stored hashed. Existing parent accounts remain able to sign in.
- The current rate limiter is in-memory and applies per backend process; use a shared store such as Redis before scaling to multiple backend instances.
- Parent alerts are filtered by the mobile number linked to the student's account. Use appropriate consent and privacy practices before deploying with real student data.

## Important

The first Detoxify inference downloads model weights and needs enough RAM; choose a hosting instance with sufficient memory (a small/free instance may be killed while loading PyTorch/model weights). Verify both service health endpoints, then test safe, toxic, threatening, and ambiguous examples before production use. Thresholds are configurable in `moderation-service/render.yaml`; tune them against representative messages to manage false positives and false negatives. Existing messages remain in MongoDB; the new schema adds a recipient-parent field, so older records may not have recipient-side parent alerts.

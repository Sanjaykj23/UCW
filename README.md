# Nexus Urban Control Warfare (UCW) - Social & Networking Platform

A full-stack social and networking web application built with **Next.js (App Router)**, **Python FastAPI** backend microservice, **PostgreSQL** database storage, and **Google OAuth 2.0 Identity Authentication**.

---

## 🌟 Key Features

1. **Clean Next.js App Router Navigation**:
   - **`/` (Radar Home)**: Interactive sector map powered by Leaflet & CartoDB displaying nearby registered operators.
   - **`/chats` (Encrypted Comms)**: Real-time active chat channels with connected operators.
   - **`/profile` (Identity & Profile)**: Complete user profile card, bio, skills badges, interests badges, and interactive profile editing modal.
   - **`/user/[username]`**: Public operator profile page.
   - **`/login` & `/register`**: Dedicated brutalist cyberpunk authentication routes.

2. **Complete User Profile Editing & Persistence**:
   - Persists all profile updates directly into PostgreSQL with no hardcoded dummy data.
   - **Editable Fields**: Display Name, Bio, Area Dropdown (`SALIGRAMAM_SEC`, `PORUR_SEC`, `MADIPAKKAM_SEC`, `CHENNAI_CENTRAL`, `VELACHERY_SEC`, `ADYAR_SEC`), Skills, Interests, Phone Number, Profile Picture, Banner Picture.
   - Pre-fills all inputs with existing database records upon opening the Edit Profile modal.

3. **Strict File Upload Engine**:
   - **`POST /api/upload/image`**: Handles image file uploads (`.jpg`, `.jpeg`, `.png`, `.webp`) sent via multipart FormData.
   - Files are saved to `backend/uploads/` on the server disk and served publicly via `FastAPI StaticFiles`.
   - Relative URL paths (e.g., `/uploads/<uuid>.jpg`) are persisted in PostgreSQL (`profile_photo` & `banner_photo` columns).

4. **App-Wide Profile Picture & Avatar Display**:
   - Automatic image formatting across all UI components:
     - Top Navigation Header & Operator Search Dropdown
     - Radar Sector Operator Cards
     - Connected Channels & Conversation Headers
     - Public User Profile Pages

5. **Python FastAPI Backend Microservice (`backend/`)**:
   - Connected to PostgreSQL database using SQLAlchemy.
   - Auto-migrates database schema on startup via `verify_all_tables.py` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
   - Password hashing with `bcrypt` & JWT Token authentication.
   - Google ID Token verification with Google API public keys.

---

## 📁 Project Structure

```text
.
├── backend/
│   ├── main.py              # FastAPI server routes, static file mounts & app entrypoint
│   ├── auth.py              # JWT, bcrypt hashing & Google ID token verification
│   ├── database.py          # SQLAlchemy PostgreSQL database session engine
│   ├── models.py            # SQLAlchemy database models (User, Connection, Notification)
│   ├── schemas.py           # Pydantic request & response validation schemas
│   ├── storage_client.py    # Python HTTP client for Go storage engine microservice (Port 8081)
│   ├── verify_all_tables.py # PostgreSQL database schema auto-patching script
│   ├── migrate_db.py        # Database creation and column migration script
│   ├── uploads/             # Server disk storage for uploaded profile & banner images
│   ├── .gitignore           # Backend gitignore rules
│   └── requirements.txt     # Python backend dependencies
├── storage-engine/          # High-performance Go Pebble/RocksDB encrypted message daemon
│   ├── cmd/
│   │   └── main.go          # Go HTTP daemon entrypoint (Port 8081)
│   ├── internal/
│   │   └── storage/
│   │       └── rocksdb.go   # LSM-Tree Pebble storage engine logic
│   ├── data/
│   │   └── rocksdb/         # WAL & SST storage files
│   ├── go.mod
│   └── go.sum
├── src/
│   ├── app/
│   │   ├── chats/           # Dedicated Chats Route (/chats)
│   │   │   └── page.jsx
│   │   ├── profile/         # Dedicated Profile Route (/profile)
│   │   │   └── page.jsx
│   │   ├── user/[username]/ # Public User Profile Route (/user/[username])
│   │   │   └── page.jsx
│   │   ├── login/           # Dedicated Login Route (/login)
│   │   │   └── page.jsx
│   │   ├── register/        # Dedicated Registration Route (/register)
│   │   │   └── page.jsx
│   │   ├── page.jsx         # Main Radar Dashboard Route (/)
│   │   ├── layout.js        # Root layout with suppressHydrationWarning
│   │   └── globals.css      # Tailwind CSS & brutalist UI tokens
│   └── components/          # UI Header, Navbar, Radar, Chat, Profile components
├── .env                     # Environment secrets (ignored by git)
├── .env.example             # Sample environment configuration template
└── .gitignore               # Root gitignore rules
```

---

## 🛠️ Environment Setup

1. Copy `.env.example` to create your local `.env` file:

```bash
cp .env.example .env
```

2. Environment Configuration (`.env`):

```env
# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# PostgreSQL Database Credentials
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=NexusDB

# JWT Secrets
JWT_SECRET=supersecretjwtkey_ucw_2026
JWT_REFRESH_SECRET=supersecretrefreshkey_ucw_2026
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Python**: v3.10+ or v3.11+
- **PostgreSQL**: Running locally on port 5432 with database `NexusDB`.

### 2. Install Dependencies

**Backend (Python):**
```bash
pip install -r backend/requirements.txt
```

**Frontend (Node):**
```bash
npm install
```

### 3. Run Database Auto-Patch Script
```bash
python backend/verify_all_tables.py
```

### 4. Run Go Storage Engine Daemon (Terminal 1)
```bash
cd storage-engine
go run cmd/main.go
```
> Listens on `http://localhost:8081` for encrypted message persistence.

### 5. Run FastAPI Backend Server (Terminal 2)
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
> Verify server health by visiting `http://localhost:8000/api/health`.

### 6. Run Next.js Frontend Server (Terminal 3)
```bash
npm run dev
```

### 6. Access Application Routes
- **Radar Home**: `http://localhost:3000/`
- **Chats & Comms**: `http://localhost:3000/chats`
- **Profile & Edit Modal**: `http://localhost:3000/profile`
- **Login**: `http://localhost:3000/login`
- **Register**: `http://localhost:3000/register`

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/auth/register` | Registers new user in PostgreSQL |
| `POST` | `/api/auth/login` | Log in via Username/Email & Password |
| `POST` | `/api/auth/google-login` | Log in via Google OAuth 2.0 |
| `GET` | `/api/auth/me` | Returns logged-in user profile from JWT token |
| `PUT` | `/api/users/profile` | Updates user bio, display name, area, phone, skills, interests, photos |
| `POST` | `/api/upload/image` | Uploads profile/banner image file to `backend/uploads/` |
| `GET` | `/api/connections/list` | Fetches accepted connection channels |
| `GET` | `/api/connections/pending` | Fetches pending connection requests |
| `POST` | `/api/connections/request` | Dispatches connection request |
| `POST` | `/api/connections/accept` | Accepts connection request |

---

## 📄 License
This project is licensed under the MIT License.

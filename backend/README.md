# FastAPI Backend Microservice

Python FastAPI backend microservice for the UCW platform, handling authentication, PostgreSQL persistence, file uploads, connection requests, and notifications.

---

## 🛠️ Setup & Execution

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Database Schema Migration
To ensure all required PostgreSQL tables and columns (`banner_photo`, `sender_id`, `skills`, `interests`, `bio`, etc.) exist:
```bash
python verify_all_tables.py
```

### 3. Start Development Server
```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 📁 Directory Layout
- `main.py`: Application entrypoint, FastAPI endpoints, static file mounting (`/uploads`).
- `auth.py`: JWT token generation, password hashing (`bcrypt`), and Google OAuth token verification.
- `database.py`: SQLAlchemy database engine connection setup.
- `models.py`: SQLAlchemy ORM database models (`User`, `Connection`, `Notification`).
- `schemas.py`: Pydantic validation models.
- `verify_all_tables.py`: DB schema patching script (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
- `uploads/`: Server disk storage directory for uploaded user images (ignored by git except `.gitkeep`).
- `.gitignore`: Backend gitignore configuration.

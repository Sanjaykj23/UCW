import sys
from pathlib import Path
from sqlalchemy import text

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
import models

def patch_notifications_table():
    print("[MIGRATION] Patching notifications table in PostgreSQL...")
    try:
        with database.engine.connect() as conn:
            # Notifications table columns
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message VARCHAR(255);"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            
            # Connections table columns
            conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))

            # Users table columns
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_photo TEXT;"))

            conn.commit()
        print("[SUCCESS] PostgreSQL notifications table columns (sender_id, type, message, is_read, created_at) added successfully!")
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")

if __name__ == "__main__":
    patch_notifications_table()

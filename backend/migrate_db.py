import sys
from pathlib import Path
from sqlalchemy import text

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import database
import models

def migrate():
    print("[MIGRATION] Checking and updating PostgreSQL database schema...")
    try:
        # Create missing tables (connections, notifications) if they don't exist
        models.Base.metadata.create_all(bind=database.engine)

        with database.engine.connect() as conn:
            # Add missing columns to users table
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS skills TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS interests TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_photo TEXT;"))
            
            # Add missing columns to connections table if existing table had different columns
            conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))
            conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))

            # Add missing columns to notifications table
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50);"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message VARCHAR(255);"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;"))

            conn.commit()
        
        print("[SUCCESS] Database migration completed successfully! All columns and tables are ready.")
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")

if __name__ == "__main__":
    migrate()

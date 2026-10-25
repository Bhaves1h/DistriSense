import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./distrisense.db")

# SQLite needs check_same_thread=False
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def ensure_schema():
    if DATABASE_URL.startswith("sqlite"):
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                cols = [c[1] for c in conn.execute(text("PRAGMA table_info(recommendation)"))]
                if cols and "days_to_expiry" not in cols:
                    conn.execute(text("ALTER TABLE recommendation ADD COLUMN days_to_expiry INTEGER"))
                    conn.commit()
        except Exception:
            pass

ensure_schema()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


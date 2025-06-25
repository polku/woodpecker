import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./woodpecker.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

from sqlalchemy import Column, String, Integer, DateTime
import uuid
from datetime import datetime

class Performance(Base):
    __tablename__ = "performances"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    puzzle_set = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    elapsed_seconds = Column(Integer, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)

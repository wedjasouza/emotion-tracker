from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlmodel import Field, Session, SQLModel, create_engine, select, func, desc
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from pydantic import BaseModel
from nlp import analyze_sentiment, analyze_emotion

# add the templates

templates = Jinja2Templates(directory="templates")

# build the models

class Entry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    text: str
    emotion: str
    sentiment: str
    timestamp: datetime
    updated_at: datetime | None = None

class EntryCreate(SQLModel):
    text: str

class StatsModel(BaseModel):
    total: int
    positive: int
    negative: int
    neutral: int
    mixed: int
    top_emotions: list[str] | None = None

# create database

sqlite_file_name = "emotions.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, connect_args=connect_args)

# create database and tables on startup

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

# get session per request

def get_session():
    with Session(engine) as session:
        yield session

# get emotion + sentiment from text

def analyze_text(text: str) -> tuple[str, str]:

    text = text.strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    emotion = analyze_emotion(text)

    sentiment = analyze_sentiment(text)

    positive_emotions = {"happy"}
    negative_emotions = {"sad", "anger", "fear", "disgust"}

    emotion_list = emotion if isinstance(emotion, list) else emotion.split(",") if emotion else []
    emotion_set = set(emotion_list)

    if emotion_set & positive_emotions and emotion_set & negative_emotions:
        sentiment = "mixed"

    return emotion, sentiment

# initiate the FastAPI instance

app = FastAPI(lifespan=lifespan)

# add static files

app.mount("/static", StaticFiles(directory="static"), name="static")

# add route to homepage

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        name="index.html",
        request=request,
        context={"request": request}
    )

# get all entries (with filtering options)

@app.get("/entries/", response_model=list[Entry])
async def get_entries(
        sentiment: str | None = None,
        emotion: str | None = None,
        limit: int = 10,
        offset: int = 0,
        session: Session = Depends(get_session)
):
    statement = select(Entry)

    if sentiment:
        statement = statement.where(Entry.sentiment == sentiment)
    if emotion:
        statement = statement.where(Entry.emotion == emotion)

    statement = (
        statement.order_by(Entry.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )

    results = session.exec(statement).all()

    return results

# get stats

@app.get("/stats/", response_model=StatsModel)
async def get_stats(
        session: Session = Depends(get_session)
):
    total_count = session.exec(
        select(func.count()).select_from(Entry)
    ).one()

    positive_count = session.exec(
        select(func.count()).select_from(Entry)
        .where(Entry.sentiment == "positive")
    ).one()

    negative_count = session.exec(
        select(func.count()).select_from(Entry)
        .where(Entry.sentiment == "negative")
    ).one()

    neutral_count = session.exec(
        select(func.count()).select_from(Entry)
        .where(Entry.sentiment == "neutral")
    ).one()

    mixed_count = session.exec(
        select(func.count()).select_from(Entry)
        .where(Entry.sentiment == "mixed")
    ).one()

    results = session.exec(
        select(Entry.emotion, func.count(Entry.id).label("emotion_totals"))
        .where(Entry.emotion != "not detected")
        .group_by(Entry.emotion)
    ).all()

    if not results:
        top_emotion = []
    else:
        max_count = max(r[1] for r in results)
        top_emotions = [r[0] for r in results if r[1] == max_count]

    stats = StatsModel(
        total=total_count,
        positive=positive_count,
        negative=negative_count,
        neutral=neutral_count,
        mixed=mixed_count,
        top_emotions=top_emotions
    )

    return stats

# get single entry

@app.get("/entries/{entry_id}", response_model=Entry)
async def get_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(Entry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    return entry

# add an entry

@app.post("/emotion/", response_model=Entry)
async def create_entry(
        entry: EntryCreate,
        session: Session = Depends(get_session)
):
    """
    This code receives text from the body of a request and
    processes it to detect the overall emotion and sentiment
    of the text.
    """

    emotion, sentiment = analyze_text(entry.text)

    new_entry = Entry(
        text = entry.text,
        emotion = emotion,
        sentiment = sentiment,
        timestamp = datetime.now(timezone.utc)
    )

    session.add(new_entry)
    session.commit()
    session.refresh(new_entry)

    return new_entry

@app.put("/entries/{entry_id}", response_model=Entry)
async def update_entry(
        entry_id: int,
        updated: EntryCreate,
        session: Session = Depends(get_session)
):
    entry = session.get(Entry, entry_id)

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    emotion, sentiment = analyze_text(updated.text)

    entry.text = updated.text
    entry.emotion = emotion
    entry.sentiment = sentiment
    entry.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(entry)

    return entry

# delete an entry

@app.delete("/entries/{entry_id}")
async def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(Entry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"message": "Entry deleted"}
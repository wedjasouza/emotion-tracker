from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.templating import Jinja2Templates
from sqlmodel import Field, Session, SQLModel, create_engine, select
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# add the templates

templates = Jinja2Templates(directory="templates")

# build the models

class Entry(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    text: str
    emotion: str
    sentiment: str
    timestamp: datetime

class EntryCreate(SQLModel):
    text: str

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

# initiate the FastAPI instance

app = FastAPI(lifespan=lifespan)

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
        session: Session = Depends(get_session)
):
    statement = select(Entry)

    if sentiment:
        statement = statement.where(Entry.sentiment == sentiment)
    if emotion:
        statement = statement.where(Entry.emotion == emotion)

    filtered = session.exec(statement).all()
    return filtered

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

    text = entry.text.strip().lower()

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    if "happy" in text:
        emotion = "happy"
    elif "sad" in text:
        emotion = "sad"
    elif "angry" in text or "anger" in text:
        emotion = "anger"
    elif "fear" in text:
        emotion = "fear"
    elif "disgust" in text or "disgusted" in text:
        emotion = "disgust"
    else:
        emotion = "not detected"

    if emotion == "happy":
        sentiment = "positive"
    elif emotion in ["anger", "sad", "fear", "disgust"]:
        sentiment = "negative"
    else:
        sentiment = "neutral"

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

# delete an entry
@app.delete("/entries/{entry_id}")
async def delete_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = session.get(Entry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    session.delete(entry)
    session.commit()
    return {"message": "Entry deleted"}
from fastapi import FastAPI, HTTPException, Request
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# initiate the FastAPI instance

app = FastAPI()

# add the templates

templates = Jinja2Templates(directory=r"C:\Users\azous\OneDrive\Desktop\Programming_Tutorials\Python_Tutorials\emotion-tracker\templates")

# build the pydantic models

class Entry(BaseModel):
    text: str

class EntryResponse(BaseModel):
    id: int
    text: str
    emotion: str
    sentiment: str

# add storage

entries: list[EntryResponse] = []

# add route to homepage

@app.get("/")
async def home(request: Request):
    return templates.TemplateResponse(
        name="index.html",
        request=request,
        context={"request": request}
    )

# get all entries (with filtering options)

@app.get("/entries/", response_model=list[EntryResponse])
async def get_entries(sentiment: str | None = None, emotion: str | None = None):
    filtered = entries
    if sentiment:
        filtered = [entry for entry in filtered if entry.sentiment == sentiment]
    if emotion:
        filtered = [entry for entry in filtered if entry.emotion == emotion]
    return filtered

# get single entry

@app.get("/entries/{entry_id}", response_model=EntryResponse)
async def get_entry(entry_id: int):
    for entry in entries:
        if entry.id == entry_id:
            return entry
    raise HTTPException(status_code=404, detail="Entry not found")

# add an entry

@app.post("/emotion/", response_model=EntryResponse)
async def create_entry(entry: Entry):
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

    positive_words: list[str] = ["happy", "best", "satisfied", "pleased"]
    negative_words: list[str] = ["angry", "disgusted", "afraid", "sad"]

    if emotion in positive_words:
        sentiment = "positive"
    elif emotion in negative_words:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    new_entry = EntryResponse(
        id = len(entries) + 1,
        text = entry.text,
        emotion = emotion,
        sentiment = sentiment
    )

    entries.append(new_entry)

    return new_entry

# delete an entry
@app.delete("/entries/{entry_id}", response_model=EntryResponse)
async def delete_entry(entry_id: int):
    for i, entry in enumerate(entries):
        if entry.id == entry_id:
            return entries.pop(i)
    raise HTTPException(status_code=404, detail="Entry not found")
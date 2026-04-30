import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.stem import WordNetLemmatizer
import re

nltk.download('vader_lexicon')
nltk.download('wordnet')
nltk.download('omw-1.4')

sia = SentimentIntensityAnalyzer()
lemmatizer = WordNetLemmatizer()

def preprocess(text: str):
    words = re.findall(r'\b\w+\b', text.lower())
    return [lemmatizer.lemmatize(word) for word in words]

emotion_lexicon = {
    "happy": ["happy", "joy", "excited", "great"],
    "sad": ["sad", "down", "unhappy", "disappointed"],
    "anger": ["angry", "mad", "furious", "livid", "anger"],
    "fear": ["afraid", "scared", "nervous", "frightened"],
    "disgust": ["disgust", "gross", "appalled"]
}

lemmatized_lexicon = {
    emotion: set(lemmatizer.lemmatize(word) for word in words)
    for emotion, words in emotion_lexicon.items()
}

def analyze_sentiment(text: str) -> str:

    scores = sia.polarity_scores(text)
    compound = scores['compound']

    if compound >= 0.05:
        return 'positive'
    elif compound < -0.05:
        return 'negative'
    else:
        return 'neutral'

def analyze_emotion(text: str) -> str:

    tokens = preprocess(text)
    emotion_scores = {emotion: 0 for emotion in lemmatized_lexicon}

    for token in tokens:
        for emotion, words in lemmatized_lexicon.items():
            if token in words:
                emotion_scores[emotion] += 1

    max_score = max(emotion_scores.values())

    if max_score == 0:
        return ""

    top_emotions = [e for e, s in emotion_scores.items() if s == max_score]

    emotions = ",".join(top_emotions) if top_emotions else "not detected"

    return emotions
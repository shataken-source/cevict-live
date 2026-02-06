import tweepy
import time
import logging
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# X API credentials from .env
API_KEY = os.getenv('TWITTER_API_KEY')
API_SECRET = os.getenv('TWITTER_API_SECRET')
ACCESS_TOKEN = os.getenv('TWITTER_ACCESS_TOKEN')
ACCESS_SECRET = os.getenv('TWITTER_ACCESS_SECRET')

# OpenAI key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Check if keys are present
if not all([API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET, OPENAI_API_KEY]):
    raise ValueError("Missing API keys in .env file! Check TWITTER_... and OPENAI_API_KEY.")

openai_client = OpenAI(api_key=OPENAI_API_KEY)

# YOUR BOT'S NUMERIC USER ID — REPLACE THIS WITH THE REAL NUMBER
# Get it from: https://get-id-x.foundtt.com/en (enter @petreunion)
# Or after upgrade/fix: run the get_id.py script
BOT_USER_ID = 1234567890123456789  # ← CHANGE THIS TO YOUR ACTUAL NUMBER (no quotes!)

# File to remember last processed mention (prevents duplicate replies)
LAST_ID_FILE = 'last_mention_id.txt'

def get_last_mention_id():
    try:
        with open(LAST_ID_FILE, 'r') as f:
            return int(f.read().strip())
    except (FileNotFoundError, ValueError):
        return None

def save_last_mention_id(tweet_id):
    with open(LAST_ID_FILE, 'w') as f:
        f.write(str(tweet_id))

def generate_reply(mention_text, author_username):
    system_prompt = """
You are a compassionate, helpful assistant for @PetReunion — a community dedicated to reuniting lost and found pets quickly and safely.

Your tone is always warm, empathetic, supportive, and positive. Start by acknowledging their situation and showing you care (e.g., "I'm so sorry you're going through this" for lost pets, or "Thank you for helping a pet in need!" for found ones).

Key goals:
- Offer immediate emotional support
- Gently ask for missing details to help spread the word effectively: exact location/area (city/neighborhood/cross streets), pet description (breed, color, size, age, distinctive marks), when/where lost or found, recent clear photo if possible, microchip status, collar/tags?
- Provide 1–3 practical, high-impact tips relevant to the situation:
  - For lost: Post flyers in neighborhood/vets/shelters, check local shelters/rescues daily, notify microchip company if chipped, search at night (pets hide), ask neighbors/Facebook lost pet groups, make post public and ask shares.
  - For found: Keep pet safe indoors/secure, check for chip at vet/shelter, post found notice with location clues (but not exact address for safety), avoid assuming ownership quickly.
- Encourage them to share/boost the original post for more eyes
- End on hope: "We'll get them home soon 🐾" or similar
- Always include #PetReunion and tag @PetReunion if it fits naturally

Rules:
- Replies MUST start with @username to reply properly on X
- Keep total reply under 220 characters (X-friendly)
- Be concise — no long lectures
- Never judge owners (no "they must have been careless" or similar)
- If the mention is vague/spam/not pet-related, reply briefly: "Hi! Could you share more about your pet situation? Happy to help 🐶❤️ #PetReunion"
- Stay supportive even if it's a sad update

Generate only the reply text — nothing else.
"""

    user_prompt = f"User's mention: '{mention_text
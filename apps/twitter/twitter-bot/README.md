# PetReunion X Reply Bot

Automatically replies to @PetReunion mentions with OpenAI-generated, empathetic lost/found pet advice.

## Quick Start

1. Get X API credentials (Basic tier or higher required for mentions): https://developer.x.com
2. Get OpenAI API key: https://platform.openai.com
3. Set environment variables in .env file (created by this script)
4. Update BOT_USER_ID in bot.py with your account's numeric ID
   - To get ID: Run in Python: import tweepy; client = tweepy.Client(...); print(client.get_me().data.id)
5. Install deps: pip install -r requirements.txt
6. Run: python bot.py

Label account as automated in bio & X settings.
Start small — test replies manually first.

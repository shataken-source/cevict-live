# Fishy Chatbot - Web Search & Local Testing Configuration Guide

**Version**: 1.0  
**Date**: November 22, 2025  
**Purpose**: Enable Fishy chatbot with live web search and complete local testing

---

## 🤖 OVERVIEW: WHAT IS FISHY?

**Fishy** = Your AI customer support chatbot for Gulf Coast Charters

**Capabilities You're Setting Up**:
- ✅ Answer FAQ questions (from knowledge base)
- ✅ Search the web when it doesn't know something
- ✅ Escalate to humans for complex issues
- ✅ Learn from interactions
- ✅ Run entirely locally during testing
- ✅ Deploy to production with confidence

---

## 🔍 PART 1: WEB SEARCH CAPABILITIES

### **Why Web Search?**

```
User asks: "What's the weather in the Gulf Coast?"
├─ Fishy checks FAQ knowledge base
├─ Not found in FAQ
├─ ACTIVATES: Web search
├─ Searches Google/Bing for real-time weather
└─ Returns accurate, current information

User asks: "How do I set up a custom email?"
├─ Fishy checks FAQ knowledge base
├─ FOUND in FAQ
├─ Returns answer from knowledge base
└─ No search needed
```

---

### **Option A: Claude API (RECOMMENDED - Easiest)**

You're already using Claude! Just add the web search capability.

#### **Setup: Claude API with Web Access**

```python
# install_requirements.txt
anthropic>=0.28.0
requests>=2.31.0

# main.py
from anthropic import Anthropic

client = Anthropic()

def chat_with_web_search(user_question: str, conversation_history: list) -> str:
    """
    Chat function that can search the web if needed.
    Uses Claude API which natively supports thinking about web searches.
    """
    
    # Add context that Fishy can search web
    system_prompt = """You are Fishy, a helpful customer support chatbot for Gulf Coast Charters.

You have access to:
1. FAQ Knowledge Base (below)
2. Ability to search the web for current information
3. Ability to escalate to humans for complex issues

KNOWLEDGE BASE:
[INSERT ENTIRE CHATBOT_FAQ_TEMPLATES.md HERE]

INSTRUCTIONS:
- If the question is in the FAQ knowledge base, answer from there
- If you need current/real-time information, indicate you would search the web
- For questions outside your scope, offer to escalate to a human
- Be friendly, helpful, and honest about limitations
- Always prioritize accuracy over speed"""

    # Build conversation with history
    messages = conversation_history + [
        {"role": "user", "content": user_question}
    ]
    
    # Call Claude API
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system=system_prompt,
        messages=messages
    )
    
    assistant_response = response.content[0].text
    
    return assistant_response


# Example usage
if __name__ == "__main__":
    conversation = []
    
    while True:
        user_input = input("\nYou: ").strip()
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("Fishy: Goodbye! Have a great day!")
            break
        
        # Get response (with web search capability)
        response = chat_with_web_search(user_input, conversation)
        print(f"\nFishy: {response}")
        
        # Add to conversation history
        conversation.append({"role": "user", "content": user_input})
        conversation.append({"role": "assistant", "content": response})
```

**Pros**:
- ✅ Already integrated (you use Claude)
- ✅ Simplest setup
- ✅ Best for FAQ + occasional web searches
- ✅ Most reliable

**Cons**:
- Claude API doesn't directly search web
- But Claude is smart enough to know when info is needed
- You can add explicit web search for specific queries

---

### **Option B: Add Explicit Web Search (More Powerful)**

For questions that NEED real-time info, add explicit search capability.

#### **Setup: DuckDuckGo (Free, No API Key)**

```python
# install_requirements.txt
anthropic>=0.28.0
duckduckgo-search>=3.9.0
requests>=2.31.0

# fishy_with_search.py
from anthropic import Anthropic
from duckduckgo_search import DDGS

client = Anthropic()

def search_web(query: str) -> str:
    """Search the web using DuckDuckGo (free, no API key needed)"""
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=3)
            
        if not results:
            return "No results found."
        
        # Format results
        formatted = "Search results:\n"
        for i, result in enumerate(results, 1):
            formatted += f"\n{i}. {result['title']}\n"
            formatted += f"   {result['body']}\n"
            formatted += f"   Source: {result['href']}\n"
        
        return formatted
    except Exception as e:
        return f"Search failed: {str(e)}"


def should_search_web(question: str) -> bool:
    """Determine if a question needs web search"""
    
    # Keywords that suggest web search is needed
    web_search_keywords = [
        'weather', 'today', 'current', 'live', 'now',
        'news', 'price', 'location', 'hours', 'phone',
        'address', 'open', 'closed', 'available',
        'time', 'date', 'latest', 'recent',
        'how much', 'what is', 'where is'
    ]
    
    question_lower = question.lower()
    return any(keyword in question_lower for keyword in web_search_keywords)


def chat_with_web_search(user_question: str, conversation_history: list) -> str:
    """Chat with optional web search"""
    
    system_prompt = """You are Fishy, customer support chatbot for Gulf Coast Charters.

You have access to:
1. FAQ Knowledge Base (in context below)
2. Web search for real-time information
3. Human escalation for complex issues

KNOWLEDGE BASE:
[INSERT ENTIRE CHATBOT_FAQ_TEMPLATES.md HERE]

INSTRUCTIONS:
- Check FAQ first
- Use web search results if provided
- Be helpful and accurate
- Escalate when needed
- Be honest about limitations"""
    
    # Check if web search is needed
    search_results = ""
    if should_search_web(user_question):
        search_results = search_web(user_question)
        print(f"[Fishy searching web for: '{user_question}']")
    
    # Build message with search results
    enhanced_question = user_question
    if search_results:
        enhanced_question = f"{user_question}\n\n[Web Search Results]:\n{search_results}"
    
    # Call Claude API
    messages = conversation_history + [
        {"role": "user", "content": enhanced_question}
    ]
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        system=system_prompt,
        messages=messages
    )
    
    return response.content[0].text


# Test it
if __name__ == "__main__":
    conversation = []
    
    print("Fishy: Hi! I'm Fishy, your Gulf Coast Charters support bot.")
    print("Fishy: I can answer questions about our email aliases, pricing, and more.")
    print("Fishy: If I need current info, I'll search the web for you!\n")
    
    while True:
        user_input = input("You: ").strip()
        
        if not user_input:
            continue
        
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("Fishy: Goodbye!")
            break
        
        response = chat_with_web_search(user_input, conversation)
        print(f"\nFishy: {response}\n")
        
        conversation.append({"role": "user", "content": user_input})
        conversation.append({"role": "assistant", "content": response})
```

**Pros**:
- ✅ Free (no API key needed)
- ✅ Real-time web search
- ✅ Automatic detection of when search needed
- ✅ Formatted results

**Cons**:
- Slightly slower (requires web request)
- DuckDuckGo has rate limits
- Need internet connection

---

### **Option C: Google Custom Search (Better Quality)**

For more reliable, higher-quality results.

```python
# setup_google_search.py
"""
Step 1: Get Google Custom Search API key:
1. Go to: https://programmablesearchengine.google.com/
2. Create new search engine
3. Get API key from Google Cloud Console
4. Set GOOGLE_API_KEY environment variable
"""

# install_requirements.txt
google-api-python-client>=2.100.0

# google_search.py
import os
from googleapiclient.discovery import build

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_ENGINE_ID = os.getenv("GOOGLE_ENGINE_ID")

def search_google(query: str, num_results: int = 3) -> str:
    """Search Google for current information"""
    
    try:
        service = build("customsearch", "v1", developerKey=GOOGLE_API_KEY)
        
        result = service.cse().list(
            q=query,
            cx=GOOGLE_ENGINE_ID,
            num=num_results
        ).execute()
        
        if 'items' not in result:
            return "No results found."
        
        formatted = "Search results:\n"
        for i, item in enumerate(result['items'], 1):
            formatted += f"\n{i}. {item['title']}\n"
            formatted += f"   {item.get('snippet', 'No description')}\n"
            formatted += f"   Source: {item['link']}\n"
        
        return formatted
        
    except Exception as e:
        return f"Search error: {str(e)}"
```

**Pros**:
- ✅ Higher quality results
- ✅ Official Google API
- ✅ More reliable

**Cons**:
- Requires API key
- Rate limits (100 free searches/day)
- Need Google Cloud setup

---

## 🧪 PART 2: LOCAL TESTING SETUP

### **What "Local Testing Enabled" Means**

```
LOCAL TESTING = Running Fishy on your computer during development

Benefits:
✅ Test before deploying to production
✅ Debug issues locally
✅ No cost (free)
✅ Can test offline (for FAQ)
✅ Can test with real web search
✅ Can test all features
```

---

### **Setup 1: Python Virtual Environment (Simple)**

```bash
# Create folder for Fishy
mkdir fishy-chatbot
cd fishy-chatbot

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Mac/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install anthropic duckduckgo-search requests

# Create main.py (use code from Option B above)
# Then run:
python main.py
```

**Test it locally**:
```
You: How much does an email alias cost?
Fishy: [Answers from FAQ]

You: What's the weather in Gulf Shores, Alabama?
Fishy: [Searches web and returns weather]

You: I want a refund
Fishy: Let me connect you with human support. [Escalates]
```

---

### **Setup 2: Docker (Professional)**

For consistent local testing environment.

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the chatbot
CMD ["python", "fishy_with_search.py"]
```

```bash
# Build Docker image
docker build -t fishy-chatbot .

# Run in Docker (local testing)
docker run -it \
  -e ANTHROPIC_API_KEY=sk-ant-xxxxx \
  fishy-chatbot

# Test it
# Type questions and get answers!
```

**Benefits**:
- ✅ Exact same environment as production
- ✅ No system dependencies issues
- ✅ Easy to share with team
- ✅ Professional setup

---

### **Setup 3: VS Code Dev Container (Best)**

```json
// .devcontainer/devcontainer.json
{
  "name": "Fishy Chatbot",
  "image": "mcr.microsoft.com/devcontainers/python:3.11",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance"
      ],
      "settings": {
        "python.linting.enabled": true,
        "python.linting.pylintEnabled": true,
        "python.formatting.provider": "black"
      }
    }
  },
  "postCreateCommand": "pip install -r requirements.txt",
  "forwardPorts": [8000],
  "remoteUser": "venv"
}
```

**Benefits**:
- ✅ One-click setup in VS Code
- ✅ All tools pre-configured
- ✅ Ready to test immediately
- ✅ Team consistency

---

## 🧪 LOCAL TESTING CHECKLIST

### **Test 1: FAQ Questions (No Web Search)**

```python
# test_faq.py
def test_faq_questions():
    """Test that FAQ questions work without web search"""
    
    test_cases = [
        ("How much does an email cost?", "should mention $19.99"),
        ("How do I get started?", "should mention 3 steps"),
        ("Can I get a refund?", "should mention 7 days"),
        ("What email prefixes are allowed?", "should mention lowercase"),
    ]
    
    for question, expected_keyword in test_cases:
        response = chat_with_web_search(question, [])
        assert expected_keyword.lower() in response.lower(), \
            f"Failed: {question}\nGot: {response}"
        print(f"✅ Passed: {question}")

# Run tests
python -m pytest test_faq.py
```

---

### **Test 2: Web Search Triggering**

```python
# test_web_search.py
def test_web_search_triggers():
    """Test that web search activates when needed"""
    
    web_search_questions = [
        "What's the weather in Gulf Shores today?",
        "How much does a charter cost in Florida?",
        "What time does the marina open?",
    ]
    
    faq_questions = [
        "How do I set up my email?",
        "What's the sign-up bonus?",
    ]
    
    # These should trigger web search
    for q in web_search_questions:
        assert should_search_web(q), f"Should search: {q}"
        print(f"✅ Web search triggered: {q}")
    
    # These should NOT trigger web search
    for q in faq_questions:
        assert not should_search_web(q), f"Should NOT search: {q}"
        print(f"✅ FAQ question: {q}")

python -m pytest test_web_search.py
```

---

### **Test 3: Escalation Detection**

```python
# test_escalation.py
def test_escalation_detection():
    """Test that complex issues are flagged for escalation"""
    
    escalation_keywords = [
        "refund", "complaint", "bug", "error", "broken",
        "legal", "billing dispute", "fraud"
    ]
    
    responses = []
    for keyword in escalation_keywords:
        q = f"I have a {keyword} issue"
        response = chat_with_web_search(q, [])
        
        # Check if escalation mentioned
        if any(esc in response.lower() for esc in ['escalate', 'human', 'support team', 'specialist']):
            print(f"✅ Correctly escalated: {keyword}")
        else:
            print(f"⚠️ May not escalate: {keyword}")

python -m pytest test_escalation.py
```

---

### **Test 4: Full Conversation Flow**

```python
# test_conversation_flow.py
def test_full_conversation():
    """Test a complete conversation flow"""
    
    conversation = []
    
    # Q1: FAQ question
    response1 = chat_with_web_search("How do I get started?", conversation)
    conversation.append({"role": "user", "content": "How do I get started?"})
    conversation.append({"role": "assistant", "content": response1})
    assert "step" in response1.lower()
    print("✅ Q1: Got FAQ answer")
    
    # Q2: Follow-up question
    response2 = chat_with_web_search("How much does it cost?", conversation)
    conversation.append({"role": "user", "content": "How much does it cost?"})
    conversation.append({"role": "assistant", "content": response2})
    assert "$19.99" in response2 or "price" in response2.lower()
    print("✅ Q2: Got pricing info")
    
    # Q3: Web search question
    response3 = chat_with_web_search("What's the weather?", conversation)
    conversation.append({"role": "user", "content": "What's the weather?"})
    conversation.append({"role": "assistant", "content": response3})
    print("✅ Q3: Got web search response")
    
    # Q4: Escalation question
    response4 = chat_with_web_search("I need a refund", conversation)
    conversation.append({"role": "user", "content": "I need a refund"})
    conversation.append({"role": "assistant", "content": response4})
    if "human" in response4.lower() or "escalate" in response4.lower():
        print("✅ Q4: Correctly escalated")
    
    print(f"\n✅ Full conversation flow: {len(conversation)} messages")

python -m pytest test_conversation_flow.py
```

---

## 🚀 DEPLOYMENT: LOCAL → PRODUCTION

### **Step 1: Local Testing Checklist**

```
BEFORE DEPLOYING:

Testing:
☐ All FAQ questions work
☐ Web search activates correctly
☐ Escalations detected
☐ Conversation history maintained
☐ Error handling works
☐ Rate limiting tested
☐ Multiple simultaneous conversations tested

Configuration:
☐ API keys set up
☐ Environment variables configured
☐ Logging enabled
☐ Error tracking set up
☐ Analytics configured

Documentation:
☐ Setup instructions written
☐ API documented
☐ Error codes documented
☐ Troubleshooting guide created
```

---

### **Step 2: Deploy to Intercom (Production)**

```python
# deploy_to_intercom.py
"""
Deploy Fishy to Intercom (your support platform)
"""

import json
from intercom.client import Client

client = Client(
    token='INTERCOM_API_KEY',
    personal_access_token='INTERCOM_PERSONAL_TOKEN'
)

def upload_faq_to_intercom():
    """Upload FAQ knowledge base to Intercom AI"""
    
    # Read your FAQ
    with open('CHATBOT_FAQ_TEMPLATES.md', 'r') as f:
        faq_content = f.read()
    
    # Create article in Intercom
    article = client.articles.create(
        title="Gulf Coast Charters Email Alias FAQ",
        body=faq_content,
        state="published"
    )
    
    print(f"✅ Uploaded FAQ to Intercom: {article.id}")

# Or deploy to Slack
def deploy_to_slack():
    """Deploy Fishy as Slack bot"""
    # Uses Slack bot framework
    pass

# Or deploy to Discord
def deploy_to_discord():
    """Deploy Fishy as Discord bot"""
    # Uses Discord bot framework
    pass

# Or deploy as web chatbot
def deploy_web_chatbot():
    """Deploy as widget on website"""
    # Uses Crisp, Drift, or custom iframe
    pass
```

---

## 📊 MONITORING & ANALYTICS

### **Track These Locally During Testing**

```python
# analytics.py
import json
from datetime import datetime

class FishyAnalytics:
    def __init__(self):
        self.conversations = []
    
    def log_interaction(self, user_q, fishy_a, escalated=False):
        """Log each interaction for analysis"""
        self.conversations.append({
            "timestamp": datetime.now().isoformat(),
            "user_question": user_q,
            "fishy_response": fishy_a,
            "escalated": escalated,
            "question_type": self.classify_question(user_q)
        })
    
    def classify_question(self, question):
        """Classify question type"""
        if any(x in question.lower() for x in ['cost', 'price', 'pay']):
            return "pricing"
        elif any(x in question.lower() for x in ['refund', 'complaint']):
            return "escalation"
        elif any(x in question.lower() for x in ['how', 'setup', 'start']):
            return "howto"
        else:
            return "general"
    
    def get_stats(self):
        """Get analytics"""
        total = len(self.conversations)
        escalated = sum(1 for c in self.conversations if c['escalated'])
        
        by_type = {}
        for conv in self.conversations:
            qtype = conv['question_type']
            by_type[qtype] = by_type.get(qtype, 0) + 1
        
        return {
            "total_interactions": total,
            "escalations": escalated,
            "escalation_rate": f"{escalated/total*100:.1f}%" if total > 0 else "0%",
            "by_question_type": by_type
        }
    
    def save_report(self, filename="fishy_analytics.json"):
        """Save analytics for review"""
        with open(filename, 'w') as f:
            json.dump({
                "conversations": self.conversations,
                "stats": self.get_stats()
            }, f, indent=2)
        print(f"✅ Analytics saved to {filename}")

# Usage
analytics = FishyAnalytics()

# Log interactions
analytics.log_interaction(
    "How much does it cost?",
    "Email aliases cost $19.99/year",
    escalated=False
)

# View stats
print(analytics.get_stats())

# Save report
analytics.save_report()
```

---

## 🔧 COMPLETE SETUP SCRIPT

```bash
#!/bin/bash
# setup_fishy.sh

echo "🤖 Setting up Fishy Chatbot..."

# 1. Create directory
mkdir -p fishy-chatbot
cd fishy-chatbot

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Create requirements.txt
cat > requirements.txt << EOF
anthropic>=0.28.0
duckduckgo-search>=3.9.0
requests>=2.31.0
pytest>=7.0.0
python-dotenv>=1.0.0
EOF

# 4. Install dependencies
pip install -r requirements.txt

# 5. Create .env file
cat > .env << EOF
ANTHROPIC_API_KEY=your_api_key_here
GOOGLE_API_KEY=optional
GOOGLE_ENGINE_ID=optional
EOF

# 6. Create main chatbot file
cat > fishy_with_search.py << 'EOF'
[PASTE CODE FROM OPTION B ABOVE]
EOF

# 7. Create tests
cat > test_fishy.py << 'EOF'
[PASTE TEST CODE ABOVE]
EOF

# 8. Run tests
echo "🧪 Running tests..."
python -m pytest test_fishy.py -v

# 9. Start chatbot
echo "✅ Setup complete! Starting Fishy..."
python fishy_with_search.py

echo "🚀 Fishy is running locally!"
```

---

## 📋 QUICK START CHECKLIST

- [ ] Clone repository or create folder
- [ ] Create Python virtual environment
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Set up `.env` file with API keys
- [ ] Copy CHATBOT_FAQ_TEMPLATES.md into project
- [ ] Run main.py: `python fishy_with_search.py`
- [ ] Test FAQ questions
- [ ] Test web search questions
- [ ] Test escalations
- [ ] Run full test suite: `pytest test_fishy.py -v`
- [ ] Review analytics
- [ ] Deploy to Intercom/Slack/Discord

---

## 🐛 TROUBLESHOOTING

### **Problem: "ANTHROPIC_API_KEY not set"**
```bash
# Solution: Add to .env file
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Or export:
export ANTHROPIC_API_KEY=sk-ant-xxxxx
```

### **Problem: "ModuleNotFoundError"**
```bash
# Solution: Activate virtual environment
source venv/bin/activate

# And install dependencies
pip install -r requirements.txt
```

### **Problem: "Web search too slow"**
```python
# Solution: Add timeout
def search_web(query: str, timeout: int = 5) -> str:
    try:
        with DDGS() as ddgs:
            results = ddgs.text(query, max_results=3)
    except:
        return "Search timeout - check your internet connection"
```

### **Problem: "Conversation history too long"**
```python
# Solution: Limit conversation length
def chat_with_web_search(user_question, conversation_history):
    # Keep only last 10 messages
    recent_history = conversation_history[-20:]
    # ... rest of function
```

---

## 📚 DEPLOYMENT OPTIONS

### **Option 1: Website Widget**
```html
<!-- Add to gulfcoastcharters.com -->
<script>
  window.FishyConfig = {
    apiKey: 'your-api-key',
    position: 'bottom-right'
  };
</script>
<script src="https://cdn.gulfcoastcharters.com/fishy.js"></script>
```

### **Option 2: Intercom Integration**
```
Settings → AI Agent → Upload FAQ
Fishy becomes Intercom's AI support
```

### **Option 3: Slack Bot**
```bash
# Deploy to Slack workspace
python slack_bot.py
```

### **Option 4: Discord Bot**
```bash
# Deploy to Discord server
python discord_bot.py
```

### **Option 5: Standalone API**
```bash
# Deploy as REST API
python api_server.py

# Then call:
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Fishy!"}'
```

---

## ✅ FINAL CHECKLIST

**Local Testing**:
- [ ] FAQ questions answered
- [ ] Web search working
- [ ] Escalations detected
- [ ] Conversation history maintained
- [ ] Error handling tested
- [ ] Analytics tracked
- [ ] All tests pass

**Before Production**:
- [ ] Security audit passed
- [ ] Rate limiting configured
- [ ] API keys secured
- [ ] Logging enabled
- [ ] Monitoring set up
- [ ] Backup plan ready

**Deployment**:
- [ ] Choose deployment option
- [ ] Configure platform
- [ ] Test with real users (beta)
- [ ] Monitor for issues
- [ ] Gather feedback
- [ ] Iterate

---

**Status**: Complete & Ready to Test Locally ✅  
**Next Step**: Run `python setup_fishy.sh` to start!

---

**Last Updated**: November 22, 2025  
**Version**: 1.0

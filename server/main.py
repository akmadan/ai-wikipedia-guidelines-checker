from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
import json
import re
import logging
import traceback

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wikipedia Contribution Assistant")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Generative AI Client
client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

# Wikipedia Guidelines Context
WIKIPEDIA_GUIDELINES = """
You are an expert Wikipedia editor assistant. Your role is to review content submissions and ensure they comply with Wikipedia's core policies:

**Core Policies:**

1. **Neutral Point of View (NPOV)**:
   - Content must be written from a neutral standpoint
   - Represent all significant views fairly and proportionately
   - Avoid stating opinions as facts
   - Use non-judgmental, disinterested language
   - No promotional or biased language
   - Avoid subjective adjectives

2. **Verifiability (V)**:
   - All material must be attributable to reliable, published sources
   - Readers should be able to verify facts and claims
   - Quotations and challenged material need inline citations
   - "Verifiability, not truth" - information needs authoritative sources

3. **No Original Research (NOR)**:
   - No original thought, analysis, or synthesis
   - All material must be attributable to published sources
   - No new analysis that reaches conclusions not stated in sources
   - Don't use personal knowledge without citing sources

**Additional Guidelines:**
- Use clear, concise language
- Maintain encyclopedic tone
- Avoid peacock terms (e.g., "best", "most important")
- Avoid weasel words (e.g., "some people say")
- Use active voice when possible
- Be specific and factual

When reviewing content, identify specific sentences that violate these policies and provide constructive feedback with suggested improvements.
"""


class ContentSubmission(BaseModel):
    content: str
    title: Optional[str] = None


class Feedback(BaseModel):
    original_sentence: str
    feedback: str
    suggested_text: str
    issue_type: str  # "npov", "verifiability", "original_research", "style"
    severity: str  # "high", "medium", "low"
    start_index: int
    end_index: int


class ReviewResponse(BaseModel):
    feedbacks: List[Feedback]
    overall_score: int  # 0-100
    summary: str
    is_ready: bool


def extract_sentences(text: str) -> List[tuple]:
    """Extract sentences with their positions in the text."""
    # Simple sentence splitter (can be improved with nltk)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    result = []
    current_pos = 0

    for sentence in sentences:
        if sentence.strip():
            start = text.find(sentence, current_pos)
            end = start + len(sentence)
            result.append((sentence, start, end))
            current_pos = end

    return result


@app.post("/api/review", response_model=ReviewResponse)
async def review_content(submission: ContentSubmission):
    """
    Review submitted content against Wikipedia guidelines
    Returns detailed feedback with suggestions.
    """
    print(f"DEBUG: Review request received for title: {submission.title}")
    try:
        # Create the prompt for GPT-4
        prompt = f"""
{WIKIPEDIA_GUIDELINES}

Please review the following Wikipedia article content and provide detailed feedback.

Title: {submission.title or "Untitled"}

Content:
{submission.content}

Analyze each sentence and identify any violations of Wikipedia's policies (NPOV, Verifiability, No Original Research) or style guidelines.

For each issue found, provide:
1. The exact original sentence
2. Specific feedback explaining the issue
3. A suggested rewrite that fixes the issue
4. The type of issue (npov, verifiability, original_research, or style)
5. Severity (high, medium, or low)

Also provide:
- An overall quality score (0-100)
- A brief summary of the main issues
- Whether the content is ready for Wikipedia (true/false)

Return your response in this exact JSON format:
{{
    "feedbacks": [
        {{
            "original_sentence": "exact sentence from content",
            "feedback": "explanation of the issue",
            "suggested_text": "improved version",
            "issue_type": "npov|verifiability|original_research|style",
            "severity": "high|medium|low"
        }}
    ],
    "overall_score": 85,
    "summary": "Brief summary of main issues",
    "is_ready": true
}}

If the content is perfect, return an empty feedbacks array with a score of 100.
"""

        # Call Google Gemini API using new SDK
        print("DEBUG: Calling Gemini API...")
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=types.Part.from_text(text=prompt),
            config=types.GenerateContentConfig(
                temperature=0.3,
                response_mime_type="application/json",
            ),
        )
        print("DEBUG: Gemini API call successful")

        # Parse the response
        result = json.loads(response.text)

        # Extract sentences with positions for matching
        sentences_with_pos = extract_sentences(submission.content)

        # Match feedbacks with positions in the original text
        feedbacks = []
        for fb in result.get("feedbacks", []):
            original = fb["original_sentence"]

            # Find the sentence in the content
            start_idx = -1
            end_idx = -1

            for sentence, start, end in sentences_with_pos:
                if original.strip() in sentence or sentence in original.strip():
                    start_idx = start
                    end_idx = end
                    break

            # If exact match not found, try fuzzy matching
            if start_idx == -1:
                start_idx = submission.content.find(original[:50])
                if start_idx != -1:
                    end_idx = start_idx + len(original)

            feedbacks.append(
                Feedback(
                    original_sentence=original,
                    feedback=fb["feedback"],
                    suggested_text=fb["suggested_text"],
                    issue_type=fb.get("issue_type", "style"),
                    severity=fb.get("severity", "medium"),
                    start_index=max(0, start_idx),
                    end_index=max(0, end_idx) if end_idx > 0 else len(original),
                )
            )

        return ReviewResponse(
            feedbacks=feedbacks,
            overall_score=result.get("overall_score", 50),
            summary=result.get("summary", "Review completed"),
            is_ready=result.get("is_ready", False),
        )

    except Exception as e:
        print("ERROR processing review:")
        traceback.print_exc()
        raise HTTPException(
            status_code=500, detail=f"Error processing review: {str(e)}"
        )


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "Wikipedia Contribution Assistant"}


@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Wikipedia Contribution Assistant API",
        "version": "1.0.0",
        "endpoints": {"review": "/api/review", "health": "/api/health"},
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

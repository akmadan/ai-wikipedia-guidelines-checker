# WikiAssist

WikiAssist is an AI-powered content review system designed to assist Wikipedia contributors in ensuring their submissions comply with Wikipedia's core editorial policies. The application provides real-time feedback on content quality, identifying violations of Neutral Point of View (NPOV), Verifiability, and No Original Research policies, along with style and tone recommendations.

## Aim

The primary objective of WikiAssist is to reduce the barrier to entry for Wikipedia contributions by providing automated, policy-aware content review. The system analyzes submitted text against Wikipedia's editorial guidelines and generates actionable feedback with specific suggestions for improvement. This enables contributors to refine their content before submission, reducing the likelihood of rejection and improving the overall quality of Wikipedia articles.

## Architecture

WikiAssist follows a client-server architecture with clear separation of concerns between the frontend presentation layer and backend processing logic.

### System Architecture

```
┌─────────────────┐         HTTP/REST         ┌─────────────────┐
│                 │  ──────────────────────> │                 │
│  React Frontend │                           │  FastAPI Server │
│  (TypeScript)   │  <────────────────────── │  (Python 3.13)  │
│                 │      JSON Response        │                 │
└─────────────────┘                           └────────┬────────┘
                                                        │
                                                        │ API Call
                                                        ▼
                                               ┌─────────────────┐
                                               │  Google Gemini  │
                                               │  2.5 Flash Lite │
                                               │  (LLM Service)  │
                                               └─────────────────┘
```

The frontend is a single-page application built with React and TypeScript, communicating with a FastAPI backend via RESTful API endpoints. The backend orchestrates content analysis by leveraging Google's Gemini 2.5 Flash Lite model for natural language understanding and policy compliance checking.

### Data Flow

1. User submits content through the React editor interface
2. Frontend sends POST request to `/api/review` with plain text content and optional title
3. Backend constructs a structured prompt incorporating Wikipedia policy guidelines
4. Backend invokes Gemini API with JSON response format constraint
5. Backend parses structured JSON response and performs sentence-level position mapping
6. Backend returns ReviewResponse with feedback items, scores, and metadata
7. Frontend renders feedback in interactive panel with diff-style suggestions
8. User can accept or reject individual feedback items, triggering in-editor text replacement

## Backend

### Technology Stack

- **Framework**: FastAPI 0.115.0
- **Runtime**: Python 3.13
- **ASGI Server**: Uvicorn 0.32.0
- **AI Service**: Google Generative AI SDK (google-genai 0.2.2)
- **Validation**: Pydantic 2.10.3
- **Environment Management**: python-dotenv 1.0.1

### API Endpoints

#### POST /api/review

Reviews submitted content against Wikipedia guidelines and returns structured feedback.

**Request Body**:
```json
{
  "content": "string",
  "title": "string (optional)"
}
```

**Response Model**:
```json
{
  "feedbacks": [
    {
      "original_sentence": "string",
      "feedback": "string",
      "suggested_text": "string",
      "issue_type": "npov|verifiability|original_research|style",
      "severity": "high|medium|low",
      "start_index": 0,
      "end_index": 0
    }
  ],
  "overall_score": 0-100,
  "summary": "string",
  "is_ready": boolean
}
```

**Implementation Details**:

The review endpoint implements a multi-stage processing pipeline:

1. **Prompt Construction**: The system constructs a comprehensive prompt that includes:
   - Wikipedia policy guidelines (NPOV, Verifiability, No Original Research)
   - Style and tone requirements
   - Structured output format specification
   - Content to be analyzed

2. **LLM Invocation**: The backend calls Google Gemini 2.5 Flash Lite with:
   - Temperature: 0.3 (for consistent, policy-focused responses)
   - Response MIME type: `application/json` (ensures structured output)
   - Content formatted as `types.Part.from_text()`

3. **Response Processing**:
   - JSON parsing with error handling
   - Sentence extraction using regex-based tokenization
   - Position mapping: matches feedback sentences to original text positions using substring matching and fuzzy fallback
   - Index calculation for highlighting in frontend editor

4. **Error Handling**: Comprehensive exception handling with detailed logging and HTTP 500 responses for API failures or parsing errors.

#### GET /api/health

Health check endpoint for service monitoring and deployment verification.

**Response**:
```json
{
  "status": "healthy",
  "service": "Wikipedia Contribution Assistant"
}
```

#### GET /

Root endpoint providing API metadata and available endpoints.

### Core Components

#### Content Submission Model

The `ContentSubmission` Pydantic model validates incoming requests:
- `content`: Required string containing the article text
- `title`: Optional string for article title context

#### Feedback Model

The `Feedback` model structures individual policy violations:
- `original_sentence`: Exact text from submission
- `feedback`: Human-readable explanation of the issue
- `suggested_text`: Improved version addressing the violation
- `issue_type`: Categorical classification of policy violation
- `severity`: Impact assessment (high/medium/low)
- `start_index`/`end_index`: Character positions for text highlighting

#### Sentence Extraction

The `extract_sentences()` function performs regex-based sentence tokenization:
- Pattern: `(?<=[.!?])\s+` (sentence boundaries followed by whitespace)
- Returns tuples of (sentence, start_position, end_position)
- Enables precise feedback-to-text mapping

### Configuration

Backend configuration is managed through environment variables:
- `GOOGLE_API_KEY`: Required API key for Gemini service access
- Loaded via `python-dotenv` from `server/.env`

### CORS Configuration

CORS middleware configured to allow:
- Origins: `http://localhost:3000`, `http://localhost:5173`
- Methods: All (`*`)
- Headers: All (`*`)
- Credentials: Enabled

This configuration supports development workflows with Vite dev server (port 5173) and potential alternative React setups (port 3000).

## Frontend

### Technology Stack

- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Rich Text Editor**: TipTap 3.13.0 (ProseMirror-based)
- **Markdown Processing**: marked 17.0.1, turndown 7.2.2
- **HTTP Client**: Native Fetch API
- **Styling**: CSS with CSS Variables for theming

### Component Architecture

#### App Component (`App.tsx`)

Root component managing application state and orchestration:

- **State Management**:
  - `content`: HTML representation of editor content
  - `plainText`: Plain text extraction for API submission
  - `title`: Article title input
  - `reviewData`: Complete review response from backend
  - `isReviewing`: Loading state during API call
  - `selectedFeedback`: Currently highlighted feedback item
  - `feedbackToAccept`: Feedback item pending text replacement
  - `isEditorExpanded`/`isFeedbackExpanded`: Panel visibility state

- **Key Functions**:
  - `handleContentChange()`: Synchronizes HTML and plain text representations
  - `handleReview()`: Initiates API review request with error handling
  - `handleAcceptFeedback()`: Triggers in-editor text replacement
  - `onFeedbackAccepted()`: Updates feedback status after replacement
  - `handleRejectFeedback()`: Marks feedback as dismissed
  - `handleReset()`: Clears all application state

#### Editor Component (`Editor.tsx`)

Rich text editing interface built on TipTap:

- **Editor Configuration**:
  - Extensions: StarterKit (bold, italic, headings, lists), Placeholder
  - Content synchronization: Bidirectional HTML/plain text conversion
  - Markdown mode: Toggle between WYSIWYG and markdown editing

- **Feedback Integration**:
  - Text highlighting: DOM manipulation to wrap problematic sentences in `<mark>` elements
  - Severity-based styling: Color-coded highlights (high/medium/low)
  - Click-to-select: Interactive feedback selection
  - Text replacement: Programmatic content editing via TipTap commands

- **Markdown Support**:
  - Bidirectional conversion: HTML ↔ Markdown using Turndown and marked
  - Real-time synchronization: Markdown changes update editor content
  - Monospace font rendering in markdown mode

#### FeedbackPanel Component (`FeedbackPanel.tsx`)

Review results display with GitHub PR-style interface:

- **Empty State**: Guidelines preview when no review data exists
- **Score Display**: Progress bar visualization of overall quality score
- **Feedback List**: Conversation-style comment threads
- **Diff View**: Side-by-side original/suggested text comparison
- **Action Buttons**: Accept (merge) or reject (dismiss) individual feedback items

#### Header Component (`Header.tsx`)

Application header with branding and navigation:
- SVG logo implementation
- Tagline display
- Sticky positioning for persistent visibility

### Styling System

The frontend implements a comprehensive design system using CSS custom properties:

- **Color Palette**: Semantic color tokens (primary, error, warning, success, neutral scales)
- **Spacing Scale**: Consistent spacing units (xs: 4px → 3xl: 64px)
- **Typography**: Inter font family with weight variants (300-700)
- **Border Radius**: Standardized corner rounding (sm: 4px → 2xl: 16px)
- **Shadows**: Subtle elevation system for depth hierarchy

### State Synchronization

The application maintains dual content representations:
- **HTML**: Preserves formatting for editor display
- **Plain Text**: Extracted for API submission and word/character counting

The `handleContentChange` callback receives both representations from the Editor component, ensuring consistency between visual editing and backend processing.

### Text Replacement Mechanism

Feedback acceptance triggers a sophisticated text replacement algorithm:

1. **Document Traversal**: TipTap document is traversed to build a token map
2. **Text Matching**: Regex-based matching with whitespace normalization
3. **Position Calculation**: Character indices mapped to ProseMirror document positions
4. **Content Replacement**: TipTap chain API deletes original range and inserts suggested text
5. **State Update**: Feedback status updated to 'accepted' in review data

This approach handles edge cases including:
- Text spanning multiple nodes (formatting)
- Whitespace variations
- Partial sentence matches

## Architecture Decisions

### Backend Framework: FastAPI

**Rationale**: FastAPI was selected for its:
- Native async/await support for concurrent request handling
- Automatic OpenAPI documentation generation
- Type validation via Pydantic integration
- High performance (comparable to Node.js and Go)
- Python ecosystem compatibility

**Alternative Considered**: Flask/Django - Rejected due to synchronous nature and heavier framework overhead.

### AI Service: Google Gemini 2.5 Flash Lite

**Rationale**: Gemini 2.5 Flash Lite provides:
- Cost-effective inference for structured output tasks
- JSON response format constraint (reduces parsing complexity)
- Sufficient capability for policy-based content analysis
- Lower latency compared to larger models
- Google's enterprise-grade API reliability

**Alternative Considered**: OpenAI GPT-4 - Rejected due to higher cost and lack of native JSON mode in older SDK versions.

### Frontend Framework: React with TypeScript

**Rationale**: React 19 with TypeScript offers:
- Component-based architecture for maintainable UI
- Type safety reducing runtime errors
- Large ecosystem and community support
- Server-side rendering capability (future scalability)
- Hooks-based state management (simpler than class components)

**Alternative Considered**: Vue.js - Rejected due to smaller ecosystem and team familiarity with React.

### Rich Text Editor: TipTap

**Rationale**: TipTap (ProseMirror wrapper) selected for:
- Extensible extension system
- Programmatic content manipulation API
- Markdown compatibility
- React integration
- Active development and community

**Alternative Considered**: Draft.js, Slate - Rejected due to complexity and less intuitive API for programmatic editing.

### Build Tool: Vite

**Rationale**: Vite provides:
- Fast HMR (Hot Module Replacement) for development
- Optimized production builds with Rollup
- Native ESM support
- Minimal configuration requirements
- Faster cold start compared to Webpack

**Alternative Considered**: Create React App - Rejected due to slower build times and deprecated status.

### Styling Approach: CSS with Variables

**Rationale**: CSS custom properties chosen over CSS-in-JS because:
- Better performance (no runtime style injection)
- Easier theme customization
- Smaller bundle size
- Native browser support
- Simpler debugging with DevTools

**Alternative Considered**: Tailwind CSS, styled-components - Rejected to maintain full control over styling and reduce dependency overhead.

### API Communication: Native Fetch

**Rationale**: Native Fetch API used instead of Axios because:
- Zero additional dependencies
- Built-in browser support
- Sufficient for current use case
- Smaller bundle size
- Modern Promise-based API

**Note**: Axios is listed in dependencies but not actively used; could be removed in future cleanup.

### Sentence Matching: Regex + Fuzzy Fallback

**Rationale**: Hybrid matching approach provides:
- Fast exact matching for most cases
- Graceful degradation when formatting differs
- No external NLP library dependency
- Acceptable accuracy for feedback highlighting

**Limitation**: May fail with heavily reformatted text. Future improvement could integrate sentence tokenization library (e.g., spaCy, NLTK).

### State Management: React Hooks

**Rationale**: Local component state with hooks selected because:
- Application state is relatively simple
- No need for global state management
- Reduces complexity and learning curve
- Sufficient for current feature set

**Future Consideration**: If state complexity grows, consider Zustand or Redux Toolkit.

## Setup Instructions

### Prerequisites

- Python 3.13 or higher
- Node.js 18+ and npm
- Google API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment:
```bash
# Create .env file
echo "GOOGLE_API_KEY=your_api_key_here" > .env
```

Alternatively, use the provided setup script:
```bash
../setup_api_key.sh
```

5. Start backend server:
```bash
python main.py
```

Server runs on `http://localhost:8000` by default.

### Frontend Setup

1. Navigate to ui directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

Frontend runs on `http://localhost:5173` by default.

### Automated Setup

Run the setup script from project root:
```bash
chmod +x setup.sh
./setup.sh
```

This script automates virtual environment creation, dependency installation, and provides instructions for API key configuration.

### Testing Backend

Execute the test suite:
```bash
cd server
python test_backend.py
```

This verifies:
- Health check endpoint availability
- Review endpoint functionality
- API response structure validation

## API Documentation

### Request/Response Examples

#### Review Request
```bash
curl -X POST http://localhost:8000/api/review \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Climate change is the most important issue facing humanity today.",
    "title": "Climate Change"
  }'
```

#### Review Response
```json
{
  "feedbacks": [
    {
      "original_sentence": "Climate change is the most important issue facing humanity today.",
      "feedback": "Contains peacock term 'most important' which violates NPOV policy. Wikipedia requires neutral language.",
      "suggested_text": "Climate change is a significant environmental issue affecting global systems.",
      "issue_type": "npov",
      "severity": "medium",
      "start_index": 0,
      "end_index": 65
    }
  ],
  "overall_score": 65,
  "summary": "Content contains subjective language and lacks citations. Needs neutral tone and verifiable sources.",
  "is_ready": false
}
```

## Development

### Project Structure

```
wikipedia_project/
├── server/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   ├── test_backend.py      # Backend test suite
│   └── venv/                # Virtual environment (gitignored)
├── ui/
│   ├── src/
│   │   ├── App.tsx          # Root component
│   │   ├── components/      # React components
│   │   │   ├── Editor.tsx
│   │   │   ├── FeedbackPanel.tsx
│   │   │   └── Header.tsx
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Node dependencies
│   └── vite.config.ts       # Vite configuration
├── setup.sh                 # Automated setup script
├── setup_api_key.sh         # API key configuration
└── README.md                 # This file
```

### Code Style

- **Python**: Follow PEP 8 conventions
- **TypeScript**: Use strict mode, prefer functional components
- **CSS**: BEM-like naming for component styles

### Future Enhancements

- User authentication and content history
- Batch review processing
- Citation verification integration
- Real-time collaborative editing
- Export to Wikipedia markup format
- Advanced NLP for better sentence matching
- Caching layer for repeated content analysis
- Rate limiting and API quota management
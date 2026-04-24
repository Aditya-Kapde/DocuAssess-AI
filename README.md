# 📄 DocuAssess AI

An AI-powered assessment generator that transforms PDF documents into structured, validated questions — MCQs, True/False, Fill in the Blanks, Ordering, Multi-select, and Match the Following.

Built with **Node.js**, **React**, **MongoDB**, and **Google Gemini API**. Features a multi-stage normalization pipeline that handles inconsistent AI outputs, per-question-type configuration, retry logic, and strict schema validation.

---

## Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [AI Normalization Pipeline](#-ai-normalization-pipeline)
- [Question Types](#-question-types)
- [Reliability & Error Handling](#-reliability--error-handling)
- [Configuration](#-configuration)
- [Known Limitations](#-known-limitations)
- [Future Roadmap](#-future-roadmap)
- [Author](#-author)
- [License](#-license)

---

## 🚀 Overview

DocuAssess AI provides a complete workflow:

1. **Upload** a PDF document via drag-and-drop
2. **Configure** question types with independent per-type counts
3. **Generate** questions using Google Gemini AI
4. **Review** validated, structured results in an interactive UI

The system handles real-world AI unpredictability through a 4-stage normalization pipeline, ensuring valid questions are never silently dropped due to formatting inconsistencies.

---

## 🧠 Key Features

### Document Processing
- PDF upload with drag-and-drop support
- Text extraction via `pdf-parse`
- Automatic detection of scanned/empty/corrupted PDFs
- Intelligent chunking for large documents (configurable word limit)
- MongoDB-backed document and chunk persistence

### Per-Type Question Generation
- **Independent AI calls** per question type (not a single bulk request)
- **Per-type count configuration** — e.g., 5 MCQs + 3 True/False + 2 Fill-in-the-Blanks
- Zero-count types are silently skipped (no wasted API calls)
- Globally unique IDs assigned after merging all types

### 4-Stage AI Output Normalization
1. **Structure normalization** — handles flat arrays, `{ questions: [...] }` wrappers, string-wrapped JSON, single-key objects with wrong key names
2. **Key normalization** — maps 20+ AI key variants (camelCase, alternative snake_case, synonyms) to internal pipeline keys
3. **Pre-validation normalization** — fixes string booleans, blank marker variants, casing/whitespace mismatches in options vs. answers
4. **Schema validation** — strict Zod-based per-type validation with structured error reporting

### Retry Logic
- Up to 3 attempts per question type if AI under-generates
- Accumulates valid results across retries
- Trims to exact count if AI over-generates
- Partial results returned if retries are exhausted

### Frontend Experience
- Dark-themed, modern UI
- 3-step flow: Upload → Configure → Results
- Per-type slider controls for question counts
- Accordion-based results grouped by question type
- Toast notifications, loading states, and error banners
- Responsive layout with smooth transitions

---

## 🏗️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| **Node.js** + **Express** | REST API server |
| **MongoDB** + **Mongoose** | Document & chunk persistence |
| **Google Generative AI SDK** | Gemini API integration |
| **Zod** | Request + output schema validation |
| **pdf-parse** | PDF text extraction |
| **Multer** | File upload handling |
| **Winston** | Structured logging |
| **Helmet** + **CORS** | Security middleware |

### Frontend

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **React Router 7** | Client-side routing |
| **react-hot-toast** | Toast notifications |
| **Vanilla CSS** | Custom design system |

---

## 🔄 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│  Upload Page → Configure Page → Results Page                        │
│  (drag-drop)   (per-type sliders)  (accordion view)                 │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────────────┐
│                           BACKEND                                   │
│                                                                     │
│  ┌─────────┐   ┌──────────┐   ┌────────────┐   ┌───────────────┐  │
│  │ Upload  │──▶│ PDF      │──▶│ Chunk      │──▶│ MongoDB       │  │
│  │ Route   │   │ Extract  │   │ Service    │   │ (FileRecord)  │  │
│  └─────────┘   └──────────┘   └────────────┘   └───────────────┘  │
│                                                        │            │
│  ┌─────────┐   ┌──────────┐   ┌────────────┐          │            │
│  │Generate │──▶│ RAG      │◀──┘  (chunks)   │          │            │
│  │ Route   │   │ Service  │   └────────────┘          │            │
│  └────┬────┘   └────┬─────┘                            │            │
│       │              │                                  │            │
│       ▼              ▼                                  │            │
│  ┌─────────────────────────────────────────┐           │            │
│  │         generatePerType() loop          │           │            │
│  │  ┌─────────────────────────────────┐    │           │            │
│  │  │ For each type in questionConfig │    │           │            │
│  │  │  1. buildPrompt (single type)   │    │           │            │
│  │  │  2. generateFromPrompt (Gemini) │    │           │            │
│  │  │  3. normalizeStructure          │    │           │            │
│  │  │  4. normalizeKeys               │    │           │            │
│  │  │  5. normalizeForValidation      │    │           │            │
│  │  │  6. validateAndNormalize (Zod)  │    │           │            │
│  │  │  7. Retry if shortage (max 3)   │    │           │            │
│  │  └─────────────────────────────────┘    │           │            │
│  │  Merge all → Assign unique IDs          │           │            │
│  └─────────────────────────────────────────┘           │            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
DocuAssess AI/
├── README.md
│
├── docuassess-backend/
│   ├── server.js                        # Entry point — DB connect, graceful shutdown
│   ├── .env.example                     # Environment variable template
│   ├── package.json
│   └── src/
│       ├── app.js                       # Express app setup
│       ├── config/
│       │   ├── app.config.js            # Port, env, CORS origin
│       │   ├── db.js                    # MongoDB connection
│       │   ├── gemini.config.js         # Gemini SDK initialization
│       │   └── multer.config.js         # File upload configuration
│       ├── controllers/
│       │   └── generate.controller.js   # POST /generate handler
│       ├── middleware/
│       │   ├── asyncWrapper.js          # Async error boundary
│       │   ├── errorHandler.js          # Global error handler
│       │   └── validateRequest.js       # Zod validation middleware
│       ├── models/
│       │   └── fileRecord.model.js      # Mongoose schema for files + chunks
│       ├── routes/
│       │   ├── index.js                 # Route aggregator + health check
│       │   ├── generate.routes.js       # /api/v1/generate
│       │   ├── upload.routes.js         # /api/v1/upload
│       │   └── files.routes.js          # /api/v1/files
│       ├── services/
│       │   ├── ai.service.js            # Gemini API wrapper (retry + JSON fix)
│       │   ├── generate.service.js      # Per-type generation orchestrator
│       │   ├── rag.service.js           # Chunk retrieval from MongoDB
│       │   ├── chunk.service.js         # Text chunking logic
│       │   ├── pdf.service.js           # PDF text extraction
│       │   └── upload.service.js        # Upload processing pipeline
│       ├── utils/
│       │   ├── promptBuilder.js         # Gemini prompt construction
│       │   ├── outputNormalizer.js       # Zod-based validation pipeline
│       │   ├── typeMapping.js           # AI output structure + key normalization
│       │   ├── preValidation.js         # Pre-validation formatting fixes
│       │   ├── jsonParser.js            # Safe JSON parse + sanitization
│       │   ├── chunkHelpers.js          # Chunk splitting utilities
│       │   ├── textCleaner.js           # Text preprocessing
│       │   └── logger.js               # Winston logger
│       └── validators/
│           ├── generate.validator.js    # Request body schema (questionConfig)
│           ├── output.validator.js      # Per-type Zod schemas (6 types)
│           └── upload.validator.js      # Upload request validation
│
├── docuassess-frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx                     # React entry point
│       ├── App.jsx                      # Router + Provider setup
│       ├── index.css                    # Design system (CSS variables)
│       ├── api/
│       │   └── client.js               # API client (upload, generate, health)
│       ├── context/
│       │   └── AppContext.jsx           # Global state (useReducer)
│       ├── pages/
│       │   ├── UploadPage.jsx           # Step 1: Drag-drop PDF upload
│       │   ├── ConfigurePage.jsx        # Step 2: Type selection + per-type sliders
│       │   └── ResultsPage.jsx          # Step 3: Grouped question display
│       ├── components/
│       │   ├── Layout.jsx               # App shell + stepper
│       │   ├── Stepper.jsx              # 3-step progress indicator
│       │   ├── FileUploader.jsx         # Drag-drop upload zone
│       │   ├── FileCard.jsx             # Uploaded file info card
│       │   ├── MetadataBadges.jsx       # Page count, char count badges
│       │   ├── QuestionTypeSelector.jsx # Toggle buttons for 6 types
│       │   ├── SliderInput.jsx          # Range slider with label
│       │   ├── GenerateButton.jsx       # Generate action button
│       │   ├── AccordionSection.jsx     # Collapsible question group
│       │   └── ErrorBanner.jsx          # Dismissible error display
│       └── utils/
│           └── questionTypes.js         # Type definitions, labels, colors
```

---

## ⚡ Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MongoDB** (local or Atlas)
- **Google Gemini API key** ([Get one here](https://ai.google.dev/))

### 1. Clone the repository

```bash
git clone https://github.com/Aditya-Kapde/DocuAssess-AI.git
cd DocuAssess-AI
```

### 2. Backend setup

```bash
cd docuassess-backend
npm install
cp .env.example .env
# Edit .env with your actual values (see Environment Variables below)
npm run dev
```

Backend starts at **http://localhost:5000**

### 3. Frontend setup

```bash
cd docuassess-frontend
npm install
npm run dev
```

Frontend starts at **http://localhost:3000**

---

## 🔐 Environment Variables

### Backend (`docuassess-backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Environment |
| `CORS_ORIGIN` | No | `http://localhost:3000` | Allowed CORS origin |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `GEMINI_API_KEY` | **Yes** | — | Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model name |
| `UPLOAD_DIR` | No | `uploads` | Upload directory path |
| `MAX_FILE_SIZE_MB` | No | `20` | Maximum PDF size in MB |
| `CHUNK_MAX_WORDS` | No | `700` | Words per chunk |
| `MAX_CONTEXT_CHARS` | No | `12000` | Max context chars per prompt |
| `RAG_TOP_K` | No | `10` | Number of chunks to retrieve |

### Frontend (`docuassess-frontend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE` | No | `http://localhost:5000/api/v1` | Backend API base URL |

---

## 📡 API Reference

### Health Check

```
GET /api/v1/health
```

```json
{ "success": true, "message": "Server is running", "environment": "development" }
```

---

### Upload PDF

```
POST /api/v1/upload
Content-Type: multipart/form-data
Body: file (PDF, max 20MB)
```

**Success (200):**

```json
{
  "success": true,
  "fileId": "a1b2c3d4-...",
  "meta": {
    "originalName": "chapter5.pdf",
    "sizeMb": "2.40",
    "pageCount": 12,
    "charCount": 18420,
    "chunks": 8
  }
}
```

---

### Generate Questions

```
POST /api/v1/generate
Content-Type: application/json
```

**Request body:**

```json
{
  "fileId": "a1b2c3d4-...",
  "questionConfig": {
    "mcq": 5,
    "true_false": 3,
    "fill_blanks": 2
  }
}
```

- `questionConfig` keys must be valid type names (see [Question Types](#-question-types))
- Values: `0–20` per type (0 = skip that type)
- At least one type with count > 0 is required

**Success (200):**

```json
{
  "success": true,
  "questions": [
    { "id": "q-1", "type": "mcq", "question": "...", "options": [...], "answer": "..." },
    { "id": "q-2", "type": "true_false", "question": "...", "answer": true },
    { "id": "q-3", "type": "fill_blanks", "question": "The ____ is ...", "answer": "..." }
  ],
  "meta": {
    "usedChunks": 5,
    "totalChunks": 8,
    "perType": {
      "mcq": { "requested": 5, "returned": 5, "shortage": 0, "attempts": 1 },
      "true_false": { "requested": 3, "returned": 3, "shortage": 0, "attempts": 1 },
      "fill_blanks": { "requested": 2, "returned": 2, "shortage": 0, "attempts": 2 }
    }
  }
}
```

**Error codes:**

| Code | HTTP | Meaning |
|---|---|---|
| `NO_VALID_TYPES` | 400 | All types in questionConfig have count 0 |
| `CHUNKS_NOT_FOUND` | 404 | File not found or has no chunks |
| `API_CALL_FAILED` | 502 | Gemini API call failed |
| `RETRY_API_CALL_FAILED` | 502 | Retry API call also failed |
| `PARSE_FAILED` | 422 | AI response could not be parsed as JSON |

---

## 🔧 AI Normalization Pipeline

AI models (even with strict prompting) return inconsistent output. This pipeline ensures valid questions are never silently dropped:

```
Raw AI Response
   │
   ▼ Stage 1: normalizeAiOutputStructure()
   │  • Flat array → { type: [...] }
   │  • { questions: [...] } → { type: [...] }
   │  • String JSON → parsed object
   │  • Single wrong-key object → re-keyed
   │
   ▼ Stage 2: normalizeAiOutputKeys()
   │  • multipleChoice → mcq
   │  • trueFalse → true_false
   │  • fill_in_the_blanks → fill_blanks
   │  • 20+ variant mappings
   │
   ▼ Stage 3: normalizeForValidation()
   │  • "true"/"false" strings → boolean
   │  • ___, **__, [blank] → ____
   │  • Case-insensitive answer↔option matching
   │  • Whitespace normalization
   │
   ▼ Stage 4: validateAndNormalize()
      • Zod schema validation per type
      • Invalid items dropped with structured error logging
      • Count enforcement (trim if over)
```

---

## 📝 Question Types

| Type Key | Label | Zod Validations |
|---|---|---|
| `mcq` | Multiple Choice | 2–6 options, answer must match one option |
| `true_false` | True / False | Boolean answer (strict) |
| `fill_blanks` | Fill in the Blanks | Question must contain `____` marker |
| `ordering` | Ordering | `correct_order` must be a permutation of `items` |
| `multi_select` | Multi-select | ≥2 answers, all must match options |
| `match_following` | Match the Following | Every left item must be a key in answer map |

---

## 🛡️ Reliability & Error Handling

| Layer | Mechanism |
|---|---|
| **API calls** | Retry on Gemini failure + JSON-fix retry prompt |
| **Per-type generation** | Up to 3 attempts per type, accumulating valid results |
| **JSON parsing** | Markdown fence stripping, sanitization, safe parse |
| **Output normalization** | 4-stage pipeline handles all known AI inconsistencies |
| **Validation** | Zod schemas with superRefine for cross-field rules |
| **Request validation** | Zod middleware on all endpoints |
| **Frontend** | Error banners, toast notifications, route guards |
| **Server** | Graceful shutdown (SIGTERM/SIGINT), unhandled rejection handler |

---

## ⚙️ Configuration

### Tunable Constants

| Constant | File | Default | Purpose |
|---|---|---|---|
| `MAX_QUESTIONS_PER_TYPE` | `generate.validator.js` | `20` | Max questions allowed per type |
| `MAX_RETRIES` | `generate.service.js` | `3` | Retry attempts per type on shortage |
| `MAX_CONTEXT_LENGTH` | `promptBuilder.js` | `12000` | Max context chars injected into prompt |
| `DEFAULT_TOP_K` | `rag.service.js` | `10` | Chunks retrieved per generation |

### Adding a New Question Type

1. Add schema to `output.validator.js` → register in `SCHEMA_REGISTRY`
2. Add template to `promptBuilder.js` → `SCHEMA_TEMPLATES` + `QUESTION_TYPE_LABELS`
3. Add normalizer to `preValidation.js` → `TYPE_NORMALIZERS`
4. Add alias variants to `typeMapping.js` → `AI_OUTPUT_ALIASES`
5. Add UI entry in `frontend/src/utils/questionTypes.js`

---

## ⚠️ Known Limitations

- **Scanned PDFs** — `pdf-parse` extracts text only; OCR is not implemented
- **Context window** — Very large PDFs are truncated to `MAX_CONTEXT_CHARS`; context selection is sequential (no semantic ranking)
- **Rate limits** — No built-in Gemini API rate limiting; high concurrency may trigger 429 errors
- **No authentication** — The API is open; add auth middleware for production use
- **Single-session state** — Frontend state is in-memory (lost on page refresh)

---

## 🗺️ Future Roadmap

- [ ] Export questions to PDF / CSV / JSON
- [ ] User authentication and session management
- [ ] File history dashboard with past generations
- [ ] Background job queue (BullMQ / Redis) for async generation
- [ ] Streaming AI responses with real-time progress
- [ ] Semantic chunk ranking (vector embeddings)
- [ ] OCR support for scanned PDFs
- [ ] Multi-language question generation
- [ ] Configurable `MAX_QUESTIONS_PER_TYPE` via admin panel

---

## 👨‍💻 Author

**Aditya Kapde**

---

## 📜 License

This project is open-source and available under the [MIT License](LICENSE).

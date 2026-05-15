# 📄 DocuAssess AI

## Executive Summary

**DocuAssess AI** is an enterprise-grade, AI-powered assessment generation platform that automatically transforms PDF documents into structured, validated examination questions across multiple question types. Built with a sophisticated 4-stage normalization pipeline, the system ensures reliable question generation while handling real-world AI output inconsistencies with precision.

The application combines a robust **Node.js/Express** backend with a modern **React** frontend, integrated with **Google Gemini API** for intelligent content analysis and question generation. It leverages **MongoDB** for persistent storage and employs strict schema validation to guarantee output quality.

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Architecture & Design](#-architecture--design)
- [AI Processing Pipeline](#-ai-processing-pipeline)
- [Question Types](#-question-types)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Configuration](#-environment-configuration)
- [Running the Application](#-running-the-application)
- [Error Handling & Reliability](#-error-handling--reliability)
- [Best Practices](#-best-practices)
- [Performance Considerations](#-performance-considerations)
- [Security](#-security)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing Guidelines](#-contributing-guidelines)
- [License](#-license)

---

## 🚀 Overview

DocuAssess AI automates the creation of diverse examination questions from document content through an intelligent, three-stage user workflow:

### User Workflow

1. **Document Upload** – Upload PDF files via drag-and-drop interface with real-time validation
2. **Configuration** – Select desired question types and specify independent counts per type
3. **Question Generation** – AI-powered generation with automatic validation, normalization, and error recovery
4. **Results Review** – Interactive UI with type-grouped questions, exportable results

### Core Capabilities

- **Multi-Format Question Generation** – 6 distinct question types with independent AI processing
- **Intelligent Document Processing** – Automatic chunking, text extraction, and quality validation
- **AI Output Normalization** – 4-stage pipeline to handle AI inconsistencies
- **Retry & Recovery Logic** – Automatic retry mechanism with partial result handling
- **Schema-Based Validation** – Strict Zod validation ensures output quality
- **Persistent State Management** – MongoDB-backed persistence for documents, chunks, and metadata

---

## 🧠 Key Features

### Document Processing Engine
- **PDF Upload Handling**
  - Drag-and-drop interface with real-time file validation
  - File size validation (configurable, default 20MB max)
  - Type validation (PDF-only enforcement)
  - Atomic transaction handling for failed uploads
  
- **Content Extraction**
  - Multi-page PDF text extraction via `pdf-parse`
  - Automatic detection of scanned/corrupted PDFs
  - Character count and page count statistics
  - Extraction warning system for degraded PDFs
  
- **Intelligent Chunking**
  - Dynamic text chunking for large documents
  - Configurable word-count limits (default 1000 words/chunk)
  - Overlap preservation for context continuity
  - Chunk metadata tracking (start/end positions, word counts)

### Adaptive Question Generation

- **Per-Type Configuration**
  - Independent AI calls per question type (no bulk requests)
  - Individual count configuration per type (e.g., 5 MCQs + 3 True/False + 2 Fill-in-Blanks)
  - Zero-count types silently skipped (no wasted API calls)
  - Globally unique sequential IDs assigned post-merge
  
- **Advanced Retry Mechanism**
  - Up to 3 retry attempts per question type on under-generation
  - Result accumulation across retries (not replacement)
  - Automatic trimming if AI over-generates
  - Partial result handling if retries exhausted
  - Detailed metadata on retry attempts

### 4-Stage AI Output Normalization Pipeline

The normalization pipeline handles real-world AI output inconsistencies:

1. **Structure Normalization**
   - Detects and handles flat arrays
   - Unwraps `{ questions: [...] }` and similar object wrappers
   - Parses string-wrapped JSON responses
   - Handles single-key objects with incorrect key names

2. **Key Normalization**
   - Maps 20+ AI key variants to internal pipeline keys
   - Supports camelCase and snake_case variants
   - Handles synonyms and alternative naming patterns
   - Standardizes across different AI models

3. **Pre-Validation Normalization**
   - Converts string booleans (`"true"`, `"false"`) to native booleans
   - Normalizes blank markers across variants
   - Fixes casing/whitespace mismatches in options vs. answers
   - Trims and cleans string values

4. **Schema Validation**
   - Strict Zod-based per-type validation
   - Type-specific required field enforcement
   - Structured error reporting with field paths
   - Validation metadata collection

### Frontend Experience

- **Modern Dark-Themed UI**
  - Responsive design optimized for desktop and tablet
  - Smooth transitions and animations
  - Real-time loading states and progress indicators
  
- **3-Step Intuitive Workflow**
  - Upload → Configure → Results flow
  - Per-type slider controls for question counts
  - Accordion-based results grouped by question type
  - Toast notifications for user feedback
  
- **Result Management**
  - Interactive question preview with type indicators
  - JSON export functionality for external processing
  - Results persistence across browser sessions
  - Error state handling with detailed messages

---

## 🏗️ Technology Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4.22+ | REST API framework |
| **MongoDB** | 5.0+ | NoSQL database |
| **Mongoose** | 9.4+ | MongoDB ODM |
| **Google Generative AI SDK** | 0.24+ | Gemini API client |
| **Zod** | 4.3+ | Schema validation & validation |
| **pdf-parse** | 1.1+ | PDF text extraction |
| **Multer** | 2.1+ | File upload middleware |
| **Winston** | 3.19+ | Structured logging |
| **Helmet** | 8.1+ | Security headers |
| **CORS** | 2.8+ | Cross-origin resource sharing |
| **Morgan** | 1.10+ | HTTP request logging |
| **UUID** | 13.0+ | Unique identifier generation |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 19.2+ | UI framework |
| **React DOM** | 19.2+ | React rendering engine |
| **Vite** | 8.0+ | Build tool & dev server |
| **TailwindCSS** | 4.2+ | Utility-first CSS framework |
| **TailwindCSS Vite** | 4.2+ | Vite integration |
| **React Router DOM** | 7.14+ | Client-side routing |
| **React Hot Toast** | 2.6+ | Toast notifications |

### DevOps & Quality

| Tool | Purpose |
|---|---|
| **Nodemon** | Development auto-reload |
| **ESLint** | Code linting & quality |
| **Dotenv** | Environment variable management |

---

## 🏗️ Architecture & Design

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                       │
│              (React + TailwindCSS Frontend)                 │
│  Upload UI ─→ Configuration ─→ Results & Export             │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           API Layer (Express.js)                            │
│  ┌──────────────┬──────────────┬──────────────┬──────────┐  │
│  │   Upload     │   Generate   │   Export     │  Files   │  │
│  │   Endpoints  │   Endpoints  │   Endpoints  │  Lookup  │  │
│  └──────────────┴──────────────┴──────────────┴──────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌──────────┐  ┌─────────────┐
    │MongoDB │  │Google    │  │File System  │
    │Database│  │Gemini AI │  │(Uploads)    │
    └────────┘  └──────────┘  └─────────────┘
```

### Data Flow Pipeline

```
PDF Upload
    ↓
[File Validation & Storage]
    ↓
[Text Extraction & Processing]
    ↓
[Intelligent Chunking]
    ↓
[MongoDB Persistence]
    ↓
[Per-Type AI Generation] (Sequential)
    ├─→ MCQ Generation
    ├─→ True/False Generation
    ├─→ Fill Blanks Generation
    └─→ Other Type Generations
    ↓
[4-Stage Normalization Pipeline]
    ├─→ Structure Normalization
    ├─→ Key Normalization
    ├─→ Pre-Validation Normalization
    └─→ Zod Schema Validation
    ↓
[Result Aggregation & ID Assignment]
    ↓
[Client Response & Storage]
```

### Module Organization

```
Backend (Express)
├── routes/             [HTTP endpoint definitions]
├── controllers/        [Request handling & response formatting]
├── services/           [Business logic & AI integration]
├── models/             [MongoDB schemas & persistence]
├── validators/         [Zod schema definitions]
├── middleware/         [Request processing pipelines]
├── config/             [Configuration management]
└── utils/              [Helper utilities & normalization]

Frontend (React)
├── pages/              [Route-based page components]
├── components/         [Reusable UI components]
├── context/            [Global state management]
├── api/                [API client & HTTP utilities]
├── utils/              [Helper functions]
└── assets/             [Static resources & images]
```

---

## 🧠 AI Processing Pipeline

### Question Generation Flow

The AI processing pipeline implements a sophisticated multi-stage approach to ensure reliable, validated output:

### Stage 1: Content Preparation

```
Input: fileId, questionConfig { mcq: 5, true_false: 3, ... }
         ↓
1. Retrieve file chunks from MongoDB
2. Filter zero-count types (service-layer optimization)
3. Validate all chunks exist (404 if missing)
4. Prepare shared context for all types
```

### Stage 2: Per-Type Generation (Sequential Processing)

For each question type:

```
Input: chunks, type, count
    ↓
Loop (Max 3 attempts):
  1. Build type-specific prompt
  2. Call Google Gemini API
  3. Validate response structure
  4. Normalize output
  5. Accumulate valid results
  6. If accumulated < required: retry with remaining count
     Else: break loop
    ↓
Output: { type, questions, metadata }
```

### Stage 3: Result Aggregation

```
All per-type results merged:
1. Collect questions from all types
2. Assign globally unique sequential IDs (q-1, q-2, ...)
3. Preserve type information in output
4. Generate comprehensive metadata
```

### Stage 4: Metadata Capture

For each request, comprehensive metadata is captured:

```
{
  "totalChunks": number,
  "perType": {
    "mcq": {
      "attempts": number,
      "retried": boolean,
      "generatedCount": number,
      "validatedCount": number
    },
    ...
  },
  "totalGenerated": number,
  "timestamp": ISO8601
}
```

---

## ❓ Question Types

### Supported Question Types

DocuAssess AI supports six distinct question types, each with independent generation and validation:

#### 1. Multiple Choice Questions (MCQ)

**Structure:**
```json
{
  "type": "mcq",
  "question": "What is the capital of France?",
  "options": [
    "London",
    "Paris",
    "Berlin",
    "Madrid"
  ],
  "correctAnswer": "Paris"
}
```

**Validation Rules:**
- Minimum 4 options, maximum 6 options
- Correct answer must exist in options list
- All options must be non-empty strings
- Question must be non-empty
- Case-sensitive answer matching

---

#### 2. True/False Questions

**Structure:**
```json
{
  "type": "true_false",
  "question": "Paris is the capital of France.",
  "correctAnswer": true
}
```

**Validation Rules:**
- Must be boolean value
- Handles string variants ("true", "false", "True", "False")
- Question must be a declarative statement
- Non-empty question required

---

#### 3. Fill in the Blanks

**Structure:**
```json
{
  "type": "fill_blanks",
  "question": "The Great Wall of China is located in ___.",
  "correctAnswer": "China",
  "options": ["India", "China", "Japan", "Korea"]
}
```

**Validation Rules:**
- Blank marker: `___` (three underscores)
- Multiple valid answers supported (pipe-delimited)
- Options list provided for hint context
- Question must contain blank marker
- At least one correct answer required

---

#### 4. Ordering Questions

**Structure:**
```json
{
  "type": "ordering",
  "question": "Arrange the following events in chronological order:",
  "items": ["First event", "Second event", "Third event", "Fourth event"],
  "correctOrder": [1, 2, 3, 4]
}
```

**Validation Rules:**
- Minimum 3 items, maximum 8 items
- Correct order must be valid sequence indices
- All indices must be present exactly once
- Items must be non-empty strings
- Zero-indexed or one-indexed supported with normalization

---

#### 5. Multi-Select Questions

**Structure:**
```json
{
  "type": "multi_select",
  "question": "Which of the following are capitals of European countries?",
  "options": ["Paris", "Cairo", "Berlin", "Sydney"],
  "correctAnswers": ["Paris", "Berlin"]
}
```

**Validation Rules:**
- Minimum 4 options, maximum 8 options
- Multiple correct answers required (minimum 2)
- All correct answers must exist in options
- Case-sensitive matching
- At least one correct answer required

---

#### 6. Match the Following

**Structure:**
```json
{
  "type": "matching",
  "question": "Match the countries with their capitals:",
  "leftColumn": ["France", "Germany", "Spain"],
  "rightColumn": ["Paris", "Berlin", "Madrid"],
  "correctPairs": [[0, 0], [1, 1], [2, 2]]
}
```

**Validation Rules:**
- Equal number of items in left and right columns
- Minimum 3 pairs, maximum 7 pairs
- Correct pairs must reference valid indices
- All left items must have exactly one match
- No duplicate pairings allowed

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication
Currently, the API is unauthenticated. For production deployment, implement OAuth 2.0 or JWT-based authentication.

### Response Format

All responses follow a consistent format:

**Success Response (HTTP 200-207):**
```json
{
  "success": true,
  "data": { /* response payload */ },
  "meta": { /* request metadata */ }
}
```

**Error Response (HTTP 400-502):**
```json
{
  "success": false,
  "error": {
    "message": "Descriptive error message",
    "code": "ERROR_CODE"
  },
  "meta": { /* optional metadata */ }
}
```

---

### Endpoint: Health Check

**Endpoint:** `GET /health`

**Purpose:** Verify API server status and readiness

**Request:**
```bash
curl -X GET http://localhost:5000/api/v1/health
```

**Response (HTTP 200):**
```json
{
  "success": true,
  "message": "Server is running",
  "environment": "development",
  "timestamp": "2026-05-15T10:30:00Z"
}
```

---

### Endpoint: Upload PDF

**Endpoint:** `POST /upload`

**Purpose:** Upload PDF document and extract content for question generation

**Request:**
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Body Parameters:**
  - `file` (required, file): PDF file (max 20MB)

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/v1/upload \
  -F "file=@document.pdf"
```

**Response (HTTP 201 - Success):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "meta": {
    "originalName": "document.pdf",
    "sizeMb": 2.5,
    "uploadedAt": "2026-05-15T10:30:00Z",
    "pageCount": 42,
    "charCount": 85000,
    "chunks": {
      "count": 8,
      "averageWordCount": 1200
    }
  }
}
```

**Response (HTTP 207 - Partial Success with Warning):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "fileId": "550e8400-e29b-41d4-a716-446655440000",
  "warning": "PDF appears to be scanned. Text extraction may be degraded.",
  "meta": { /* ... */ }
}
```

**Error Responses:**
- **HTTP 400:** Invalid file type or size exceeds limit
- **HTTP 400:** No file provided in request
- **HTTP 500:** Database or file system error

**Error Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "File too large. Maximum allowed size is 20MB"
  }
}
```

---

### Endpoint: Generate Questions

**Endpoint:** `POST /generate`

**Purpose:** Generate questions from uploaded document using AI

**Request:**
- **Method:** POST
- **Content-Type:** application/json
- **Body Parameters:**
  - `fileId` (required, string UUID): File ID from upload response
  - `questionConfig` (required, object): Question type configuration
    - Each key is a question type (`mcq`, `true_false`, `fill_blanks`, `ordering`, `multi_select`, `matching`)
    - Each value is an integer (0-20) specifying count for that type

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/v1/generate \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "questionConfig": {
      "mcq": 5,
      "true_false": 3,
      "fill_blanks": 2,
      "ordering": 0,
      "multi_select": 2,
      "matching": 0
    }
  }'
```

**Response (HTTP 200 - Success):**
```json
{
  "success": true,
  "questions": [
    {
      "id": "q-1",
      "type": "mcq",
      "question": "What is the capital of France?",
      "options": ["London", "Paris", "Berlin", "Madrid"],
      "correctAnswer": "Paris"
    },
    {
      "id": "q-2",
      "type": "true_false",
      "question": "The Earth is flat.",
      "correctAnswer": false
    },
    {
      "id": "q-3",
      "type": "fill_blanks",
      "question": "The Great Wall is in ___.",
      "correctAnswer": "China",
      "options": ["India", "China", "Japan"]
    }
  ],
  "meta": {
    "totalChunks": 8,
    "totalGenerated": 12,
    "perType": {
      "mcq": {
        "attempts": 1,
        "retried": false,
        "generatedCount": 5,
        "validatedCount": 5
      },
      "true_false": {
        "attempts": 2,
        "retried": true,
        "generatedCount": 3,
        "validatedCount": 3
      }
    }
  }
}
```

**Error Responses:**
- **HTTP 400:** Invalid fileId or questionConfig format
- **HTTP 400:** All question type counts are zero (`NO_VALID_TYPES`)
- **HTTP 404:** File not found in database (`CHUNKS_NOT_FOUND`)
- **HTTP 502:** Google Gemini API call failed (`API_CALL_FAILED`)
- **HTTP 422:** JSON parsing failed (`PARSE_FAILED`)

**Error Response Example:**
```json
{
  "success": false,
  "error": {
    "message": "No valid question types selected",
    "code": "NO_VALID_TYPES"
  }
}
```

---

### Endpoint: Get File Record

**Endpoint:** `GET /files/:fileId`

**Purpose:** Retrieve uploaded file metadata and processing status

**Request:**
- **Method:** GET
- **URL Parameters:**
  - `fileId` (required, string UUID): File ID from upload response

**Request Example:**
```bash
curl -X GET http://localhost:5000/api/v1/files/550e8400-e29b-41d4-a716-446655440000
```

**Response (HTTP 200 - Success):**
```json
{
  "success": true,
  "data": {
    "fileId": "550e8400-e29b-41d4-a716-446655440000",
    "originalName": "document.pdf",
    "sizeMb": 2.5,
    "uploadedAt": "2026-05-15T10:30:00Z",
    "pageCount": 42,
    "charCount": 85000,
    "chunkCount": 8,
    "status": "processed",
    "error": null
  }
}
```

**Error Responses:**
- **HTTP 400:** Invalid or missing fileId parameter
- **HTTP 404:** File record not found (`FILE_NOT_FOUND`)
- **HTTP 500:** Database error (`DB_ERROR`)

---

### Endpoint: Export Questions

**Endpoint:** `POST /export`

**Purpose:** Export questions to JSON file with strict schema formatting

**Request:**
- **Method:** POST
- **Content-Type:** application/json
- **Body Parameters:**
  - `questions` (required, array): Questions array from generate endpoint

**Request Example:**
```bash
curl -X POST http://localhost:5000/api/v1/export \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "id": "q-1",
        "type": "mcq",
        "question": "What is the capital of France?",
        "options": ["London", "Paris", "Berlin"],
        "correctAnswer": "Paris"
      }
    ]
  }'
```

**Response (HTTP 200 - File Download):**
- **Content-Type:** application/json
- **Content-Disposition:** attachment; filename=questions_1715770200000.json
- **Body:** Formatted JSON with strict schema validation

**Response Body Example:**
```json
[
  {
    "id": "q-1",
    "type": "mcq",
    "question": "What is the capital of France?",
    "options": ["London", "Paris", "Berlin", "Madrid"],
    "correctAnswer": "Paris"
  },
  {
    "id": "q-2",
    "type": "true_false",
    "question": "The Earth orbits the Sun.",
    "correctAnswer": true
  }
]
```

**Error Responses:**
- **HTTP 400:** Invalid questions format (`EXPORT_VALIDATION_FAILED`)
- **HTTP 400:** Schema validation failed

---

## 📁 Project Structure

```
DocuAssess AI/
├── docuassess-backend/
│   ├── server.js                          # Application entry point
│   ├── package.json                       # Backend dependencies
│   ├── .env                               # Environment variables (create locally)
│   ├── src/
│   │   ├── app.js                         # Express app configuration
│   │   ├── config/
│   │   │   ├── app.config.js              # Application configuration
│   │   │   ├── db.js                      # MongoDB connection & lifecycle
│   │   │   ├── gemini.config.js           # Google Gemini API setup
│   │   │   └── multer.config.js           # File upload configuration
│   │   ├── controllers/
│   │   │   ├── upload.controller.js       # Upload request handling
│   │   │   ├── generate.controller.js     # Generation request handling
│   │   │   ├── export.controller.js       # Export request handling
│   │   │   └── files.controller.js        # File metadata request handling
│   │   ├── middleware/
│   │   │   ├── asyncWrapper.js            # Async error handling
│   │   │   ├── errorHandler.js            # Global error handler
│   │   │   └── validateRequest.js         # Request schema validation
│   │   ├── models/
│   │   │   └── fileRecord.model.js        # MongoDB file record schema
│   │   ├── routes/
│   │   │   ├── index.js                   # Main router setup
│   │   │   ├── upload.routes.js           # Upload endpoints
│   │   │   ├── generate.routes.js         # Generation endpoints
│   │   │   ├── export.routes.js           # Export endpoints
│   │   │   └── files.routes.js            # File metadata endpoints
│   │   ├── services/
│   │   │   ├── upload.service.js          # File processing & extraction
│   │   │   ├── generate.service.js        # AI question generation logic
│   │   │   ├── ai.service.js              # Google Gemini API calls
│   │   │   ├── pdf.service.js             # PDF parsing & handling
│   │   │   ├── chunk.service.js           # Text chunking logic
│   │   │   ├── rag.service.js             # Retrieval-Augmented Generation
│   │   │   ├── imageExtract.service.js    # Image extraction from PDFs
│   │   │   └── imageChunk.service.js      # Image chunking & processing
│   │   ├── validators/
│   │   │   ├── upload.validator.js        # Upload request schemas
│   │   │   ├── generate.validator.js      # Generation request schemas
│   │   │   └── output.validator.js        # Question output schemas
│   │   └── utils/
│   │       ├── logger.js                  # Winston logging setup
│   │       ├── promptBuilder.js           # AI prompt construction
│   │       ├── exportFormatter.js         # Export formatting logic
│   │       ├── outputNormalizer.js        # AI output normalization
│   │       ├── jsonParser.js              # Robust JSON parsing
│   │       ├── textCleaner.js             # Text preprocessing
│   │       ├── chunkHelpers.js            # Chunking utilities
│   │       ├── typeMapping.js             # Question type mappings
│   │       ├── preValidation.js           # Pre-validation logic
│   │       └── validationHelpers.js       # Validation utilities
│   └── uploads/
│       └── images/                        # Extracted images (auto-created)
│
├── docuassess-frontend/
│   ├── package.json                       # Frontend dependencies
│   ├── vite.config.js                     # Vite build configuration
│   ├── index.html                         # HTML entry point
│   ├── eslint.config.js                   # ESLint configuration
│   ├── src/
│   │   ├── main.jsx                       # React entry point
│   │   ├── App.jsx                        # Main App component
│   │   ├── index.css                      # Global styles
│   │   ├── api/
│   │   │   └── client.js                  # API client configuration
│   │   ├── components/
│   │   │   ├── UploadArea.jsx             # File upload component
│   │   │   ├── ConfigPanel.jsx            # Question configuration UI
│   │   │   ├── ResultsView.jsx            # Results display component
│   │   │   ├── QuestionCard.jsx           # Individual question display
│   │   │   └── ...                        # Other UI components
│   │   ├── pages/
│   │   │   ├── HomePage.jsx               # Landing/main page
│   │   │   ├── UploadPage.jsx             # Upload flow page
│   │   │   ├── ConfigPage.jsx             # Configuration page
│   │   │   └── ResultsPage.jsx            # Results display page
│   │   ├── context/
│   │   │   └── AppContext.js              # Global app state
│   │   ├── utils/
│   │   │   ├── formatters.js              # Data formatting utilities
│   │   │   ├── validators.js              # Client-side validators
│   │   │   └── constants.js               # Application constants
│   │   └── assets/
│   │       └── ...                        # Static images & resources
│   └── public/
│       └── ...                            # Public static files
│
├── implementation_plan.md                 # Refactoring documentation
└── README.md                              # This file
```

---

## 📋 Installation & Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher, included with Node.js)
- **MongoDB** (v5.0 or higher) - [Installation Guide](https://docs.mongodb.com/manual/installation/)
- **Git** - [Download](https://git-scm.com/)

**Optional but Recommended:**
- **MongoDB Compass** - GUI for MongoDB [Download](https://www.mongodb.com/products/compass)
- **Postman** - API testing tool [Download](https://www.postman.com/)

### Environment Setup

#### 1. Clone Repository

```bash
git clone https://github.com/your-org/docuassess-ai.git
cd docuassess-ai
```

#### 2. Backend Setup

```bash
# Navigate to backend directory
cd docuassess-backend

# Install dependencies
npm install

# Create environment configuration file
cp .env.example .env
```

Edit `.env` file with your configuration (see [Environment Configuration](#-environment-configuration))

#### 3. Frontend Setup

```bash
# Navigate to frontend directory (from root)
cd docuassess-frontend

# Install dependencies
npm install

# Environment already configured in vite.config.js
# Adjust API_URL if backend is on different host/port
```

---

## ⚙️ Environment Configuration

### Backend Environment Variables (`.env`)

Create a `.env` file in the `docuassess-backend` directory:

```env
# ============================================
# Application Configuration
# ============================================
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:5173

# ============================================
# Database Configuration
# ============================================
MONGODB_URI=mongodb://localhost:27017/docuassess_db
# For MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/docuassess_db

# ============================================
# Google Gemini API Configuration
# ============================================
GOOGLE_API_KEY=your_google_api_key_here
# Obtain from: https://ai.google.dev/

# ============================================
# File Upload Configuration
# ============================================
MAX_FILE_SIZE_MB=20
MAX_FILE_SIZE_BYTES=20971520  # 20MB in bytes
UPLOAD_DIR=./uploads

# ============================================
# Document Processing Configuration
# ============================================
CHUNK_WORD_LIMIT=1000        # Words per chunk
MAX_QUESTIONS_PER_TYPE=20    # Maximum questions per type
MAX_RETRIES=3                # Retry attempts per type
AI_MODEL=gemini-pro          # Google AI model to use

# ============================================
# Logging Configuration
# ============================================
LOG_LEVEL=debug              # debug, info, warn, error
LOG_FILE=./logs/app.log
```

### Key Environment Variables Explained

| Variable | Type | Default | Description |
|---|---|---|---|
| `NODE_ENV` | string | `development` | Environment mode (development/production) |
| `PORT` | number | `5000` | Server port |
| `CORS_ORIGIN` | string | `http://localhost:5173` | Allowed CORS origin (frontend URL) |
| `MONGODB_URI` | string | Required | MongoDB connection string |
| `GOOGLE_API_KEY` | string | Required | Google AI API key |
| `MAX_FILE_SIZE_MB` | number | `20` | Maximum PDF file size in MB |
| `UPLOAD_DIR` | string | `./uploads` | Directory for file uploads |
| `CHUNK_WORD_LIMIT` | number | `1000` | Words per document chunk |
| `MAX_QUESTIONS_PER_TYPE` | number | `20` | Maximum questions per type |
| `MAX_RETRIES` | number | `3` | AI generation retry attempts |
| `AI_MODEL` | string | `gemini-pro` | Google AI model name |
| `LOG_LEVEL` | string | `debug` | Logging verbosity level |

### Obtaining Google Gemini API Key

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Click "Get API Key" button
3. Create new API key or use existing
4. Copy key and paste into `.env` file
5. **Note:** Free tier has rate limits; consider upgrading for production

### MongoDB Connection Options

**Local MongoDB:**
```env
MONGODB_URI=mongodb://localhost:27017/docuassess_db
```

**MongoDB Atlas (Cloud):**
```env
MONGODB_URI=mongodb+srv://username:password@cluster-name.mongodb.net/docuassess_db?retryWrites=true&w=majority
```

---

## 🚀 Running the Application

### Development Mode

#### Backend Development Server

```bash
cd docuassess-backend

# Install dependencies (if not done yet)
npm install

# Start development server with auto-reload
npm run dev
```

Output should show:
```
Server started on port 5000 [development]
```

#### Frontend Development Server

In a new terminal:

```bash
cd docuassess-frontend

# Install dependencies (if not done yet)
npm install

# Start development server
npm run dev
```

Output should show:
```
VITE v8.0.4  ready in 450 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

#### Verify Setup

1. Open browser to `http://localhost:5173`
2. Test health endpoint: `http://localhost:5000/api/v1/health`
3. Try uploading a test PDF file

### Production Build

#### Build Frontend

```bash
cd docuassess-frontend

# Create optimized build
npm run build

# Output goes to dist/ folder
```

#### Start Backend (Production)

```bash
cd docuassess-backend

# Set environment
export NODE_ENV=production

# Start server
npm start
```

---

## 🛡️ Error Handling & Reliability

### Error Categories & Codes

| Code | HTTP Status | Category | Description | Recovery |
|---|---|---|---|---|
| `INVALID_FILE_TYPE` | 400 | Input Validation | Only PDF files accepted | Retry with PDF |
| `FILE_TOO_LARGE` | 400 | Input Validation | File exceeds size limit | Reduce file size |
| `INVALID_PARAMS` | 400 | Input Validation | Missing/invalid parameters | Check request format |
| `NO_VALID_TYPES` | 400 | Business Logic | All question types have zero count | Select at least one type |
| `EXPORT_VALIDATION_FAILED` | 400 | Output Validation | Export schema validation failed | Check question format |
| `FILE_NOT_FOUND` | 404 | Not Found | File record not in database | Upload file again |
| `CHUNKS_NOT_FOUND` | 404 | Not Found | No chunks retrieved for file | Retry generation |
| `PARSE_FAILED` | 422 | Parsing Error | Failed to parse AI response | Retry with retries |
| `API_CALL_FAILED` | 502 | External Service | Google Gemini API error | Retry (handled automatically) |
| `RETRY_API_CALL_FAILED` | 502 | External Service | AI call failed after retries | Check API key/quota |
| `DB_ERROR` | 500 | Database | MongoDB error | Check connection |
| `INTERNAL_ERROR` | 500 | Server Error | Unexpected server error | Check logs |

### Retry Mechanism

The system implements automatic retry logic for question generation:

```
Initial Generation Request
    ↓
[Attempt 1] Generate via Gemini API
    ├─ Success (got all questions) → Return results
    ├─ Partial (got some questions)
    │   ↓
    │ [Attempt 2] Generate for remaining count
    │   ├─ Success → Combine & return
    │   ├─ Partial
    │   │   ↓
    │   │ [Attempt 3] Generate for remaining count
    │   │   ├─ Success → Combine & return
    │   │   └─ Fail → Return partial results
    │   └─ Fail → Return previous results
    └─ Fail → [Attempt 2]
```

**Retry Metadata Capture:**
```json
{
  "meta": {
    "perType": {
      "mcq": {
        "attempts": 2,
        "retried": true,
        "generatedCount": 5,
        "validatedCount": 5
      }
    }
  }
}
```

### Handling Degraded Documents

When PDF extraction detects issues:

```
Upload Attempt
    ↓
[PDF Parsing]
    ├─ Text Extraction Successful → HTTP 201
    ├─ Scanned PDF (no text layer)
    │   └─ Warning: "PDF appears to be scanned..." → HTTP 207
    ├─ Corrupted/Empty PDF
    │   └─ Error: "Could not extract text..." → HTTP 400
    └─ Unsupported Format
        └─ Error: "File type not supported..." → HTTP 400
```

**207 Multi-Status Response:**
Use HTTP 207 (Multi-Status) for partial successes to alert frontend:

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "fileId": "...",
  "warning": "PDF appears to be scanned. Text extraction may be degraded.",
  "meta": { /* ... */ }
}
```

### Logging Strategy

Comprehensive logging at each stage:

```
[INFO] File upload started for 'document.pdf'
[DEBUG] PDF parsing initiated
[INFO] Extracted 42 pages, 85000 characters
[DEBUG] Creating 8 chunks (avg 1250 words)
[DEBUG] Chunks persisted to MongoDB
[INFO] File record saved: 550e8400-e29b-41d4-a716-446655440000
[DEBUG] Generation request: {mcq: 5, true_false: 3}
[DEBUG] [generatePerType] "mcq": attempt 1 yielded 4/5
[DEBUG] [generatePerType] "mcq": attempt 2 yielded 1/1 (total 5)
[INFO] Generation complete: 8 questions from 2 types
[ERROR] [generate] API rate limit exceeded - will retry
```

---

## ✅ Best Practices

### For Users

1. **PDF Preparation**
   - Use text-based PDFs (not scanned images)
   - Ensure clear, well-formatted content
   - Remove sensitive information before uploading
   - Optimal size: 50KB - 15MB

2. **Question Configuration**
   - Start with small counts to test quality
   - Adjust based on content complexity
   - Use all 6 types to assess different dimensions

3. **Result Validation**
   - Review generated questions for accuracy
   - Check for duplicate/similar questions
   - Verify correct answers are truly correct
   - Test with sample student group

### For Developers

1. **Database Management**
   - Regular backup of MongoDB
   - Index frequently queried fields
   - Monitor collection sizes
   - Archive old uploads periodically

2. **API Key Security**
   - Never commit `.env` files
   - Rotate API keys regularly
   - Monitor usage and quotas
   - Implement rate limiting

3. **Error Handling**
   - Always check `success` field in responses
   - Log error codes for debugging
   - Implement exponential backoff for retries
   - Alert on critical errors (502, 500)

4. **Performance Optimization**
   - Cache frequently accessed files/chunks
   - Implement request rate limiting
   - Use connection pooling for MongoDB
   - Monitor API response times

---

## 📊 Performance Considerations

### Scaling Guidelines

| Metric | Limit | Recommendation |
|---|---|---|
| Max File Size | 20 MB | Can increase for on-premise deployments |
| Max Chunks per File | 20 | Automatically managed |
| Chunk Word Limit | 1000 | Configurable via `CHUNK_WORD_LIMIT` |
| Max Questions per Type | 20 | Configurable via `MAX_QUESTIONS_PER_TYPE` |
| Concurrent Requests | Unlimited | Add reverse proxy/load balancer for >100 RPS |
| Response Time (avg) | <10s | Depends on file size & AI model speed |
| API Rate Limit | Depends on Gemini tier | Monitor via `X-RateLimit-*` headers |

### Optimization Tips

1. **Database Optimization**
   ```bash
   # Create indices for faster queries
   db.filerecords.createIndex({ fileId: 1 })
   db.filerecords.createIndex({ uploadedAt: -1 })
   ```

2. **Chunk Strategy**
   - Smaller chunks = faster processing but more API calls
   - Larger chunks = fewer API calls but longer generation time
   - Sweet spot: 800-1200 words per chunk

3. **Caching**
   - Cache Gemini responses for identical prompts
   - Store extracted text to avoid re-parsing
   - Cache frequently accessed file metadata

4. **Monitoring**
   - Track generation time per question type
   - Monitor API quota usage
   - Alert on error rate > 5%

---

## 🔐 Security

### Production Hardening Checklist

- [ ] Enable HTTPS/TLS for all connections
- [ ] Implement authentication (OAuth 2.0 / JWT)
- [ ] Add rate limiting middleware
- [ ] Use MongoDB authentication credentials
- [ ] Implement CORS whitelist for known domains
- [ ] Add request size limits
- [ ] Implement file upload virus scanning
- [ ] Use secure headers (Helmet already configured)
- [ ] Rotate API keys regularly
- [ ] Enable MongoDB encryption at rest
- [ ] Implement audit logging
- [ ] Add request signing/validation

### Recommended Production Modifications

```javascript
// Add to app.js for production
if (process.env.NODE_ENV === 'production') {
  // Enforce HTTPS
  app.use((req, res, next) => {
    if (!req.secure) {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
  
  // Add rate limiting
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use(limiter);
}
```

---

## 🚢 Deployment

### Docker Deployment

#### Backend Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY docuassess-backend/package*.json ./

RUN npm ci --only=production

COPY docuassess-backend .

EXPOSE 5000

CMD ["npm", "start"]
```

#### Frontend Dockerfile

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY docuassess-frontend/package*.json ./

RUN npm ci

COPY docuassess-frontend .

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongo_data:/data/db

  backend:
    build: ./docuassess-backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password@mongodb:27017/docuassess_db
      GOOGLE_API_KEY: ${GOOGLE_API_KEY}
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      - mongodb

  frontend:
    build: ./docuassess-frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

### Cloud Deployment Platforms

- **Vercel/Netlify:** For frontend (React)
- **Heroku/Railway:** For backend (Node.js)
- **MongoDB Atlas:** For database (MongoDB)
- **Google Cloud/AWS:** For full infrastructure

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### Issue: "ECONNREFUSED" on MongoDB Connection

**Symptom:** 
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
1. Verify MongoDB is running: `mongosh` or `mongo`
2. Check connection string in `.env`
3. If using MongoDB Atlas, ensure IP is whitelisted
4. Verify username/password if auth enabled

#### Issue: Google Gemini API Errors

**Symptom:**
```
"error": "Invalid API key provided"
```

**Solution:**
1. Verify API key in `.env`
2. Check key has Generative AI API enabled
3. Verify quota hasn't been exceeded
4. Try regenerating key from Google AI Studio

#### Issue: "File too large" on Small Files

**Symptom:**
```
"error": "File too large. Maximum allowed size is 20MB"
```

**Solution:**
1. Check `MAX_FILE_SIZE_MB` in `.env`
2. Verify `MAX_FILE_SIZE_BYTES` matches (must be bytes)
3. Check system/network limits
4. Try different PDF if file seems small

#### Issue: CORS Errors in Frontend

**Symptom:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
1. Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
2. Check backend is running before frontend
3. Ensure backend health check works: `curl http://localhost:5000/api/v1/health`
4. Check browser console for detailed CORS error

#### Issue: Questions Missing After Generation

**Symptom:**
```
Generated 0 questions (expected 10)
```

**Solution:**
1. Check metadata for retry attempts
2. Verify document chunks were extracted (check GET /files/:fileId)
3. Monitor Google API rate limiting
4. Check logs for validation errors
5. Try with smaller chunk/question counts

### Getting Help

1. **Check Logs**
   ```bash
   # Backend logs
   tail -f docuassess-backend/logs/app.log
   
   # MongoDB logs
   mongosh < query.js
   ```

2. **Enable Debug Mode**
   ```env
   LOG_LEVEL=debug
   ```

3. **Test with Postman**
   - Import API endpoints
   - Test each endpoint individually
   - Verify request/response format

4. **Community Support**
   - Check GitHub Issues
   - Review implementation_plan.md
   - Search Stack Overflow for specific errors

---

## 👥 Contributing Guidelines

Contributions are welcome! Please follow these guidelines:

### Before Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Ensure Node.js v18+ installed
4. Set up development environment (see Installation section)

### Code Style

- Follow ESLint configuration: `npm run lint`
- Use consistent naming (camelCase for variables, PascalCase for classes)
- Add JSDoc comments for functions
- Max line length: 100 characters

### Commit Convention

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(generate): implement retry logic for under-generated questions

- Adds MAX_RETRIES constant
- Implements accumulation strategy
- Tracks attempts in metadata

Closes #123
```

### Pull Request Process

1. Update documentation for new features
2. Add/update tests if applicable
3. Update CHANGELOG.md
4. Request review from maintainers
5. Ensure CI/CD passes

---

## 📄 License

This project is licensed under the **ISC License** — see LICENSE file for details.

### Third-Party Licenses

- **Express.js:** MIT License
- **React:** MIT License
- **MongoDB/Mongoose:** Apache 2.0 License
- **Google Generative AI:** Specific to Google's ToS
- **TailwindCSS:** MIT License

---

## 📞 Support & Contact

- **Documentation:** See implementation_plan.md for detailed refactoring notes
- **Issues:** GitHub Issues (if public)
- **Email:** support@ellipsonic.com
- **Website:** https://ellipsonic.com

---

## 🎯 Roadmap

### Version 1.1 (Planned)
- [ ] Image-based question generation
- [ ] Batch upload & processing
- [ ] Question difficulty scoring
- [ ] Custom prompt templates

### Version 2.0 (Future)
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Question bank management
- [ ] Student assessment integration

---

**Last Updated:** May 15, 2026  
**Version:** 1.0.0  
**Status:** Active Development

---
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

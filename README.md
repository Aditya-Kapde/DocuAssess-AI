# 📄 DocuAssess AI

An AI-powered assessment generator that transforms PDF documents into structured questions like MCQs, True/False, Fill in the Blanks, and more.

Built with a full-stack architecture using **Node.js + React + Google Gemini API**, this tool demonstrates real-world handling of document processing, AI pipelines, and modern frontend UX.

---

## 🚀 Overview

DocuAssess AI allows users to:

1. Upload a PDF document
2. Extract and process text intelligently
3. Generate structured questions using AI
4. View results in a clean, interactive UI

The system is designed with **robust error handling, retry logic, and schema validation**, making it resilient to real-world API limitations.

---

## 🧠 Key Features

### 📂 Document Processing

* PDF upload via drag-and-drop
* Text extraction using `pdf-parse`
* Automatic detection of scanned/empty PDFs
* Intelligent chunking for large documents

### 🤖 AI Question Generation

* Supports multiple question types:

  * MCQ
  * True/False
  * Fill in the Blanks
  * Ordering
  * Multi-select
  * Match the Following
* Uses **Google Gemini API**
* Retry + fallback model system for reliability
* Strict JSON output enforcement

### 🧪 Validation Pipeline

* Zod-based schema validation
* Output normalization and filtering
* Per-type validation rules
* Anti-hallucination prompt design

### 🎨 Frontend Experience

* Clean, modern UI (Google-style)
* Drag-and-drop upload
* Interactive configuration panel
* Accordion-based results view
* Toast notifications + loading states
* Error handling with graceful fallbacks

---

## 🏗️ Tech Stack

### 🔧 Backend

* Node.js
* Express.js
* Zod (validation)
* pdf-parse (PDF extraction)
* Google Generative AI SDK (Gemini)
* Custom RAG pipeline (chunk-based context)

### 🎨 Frontend

* React (Vite)
* Tailwind CSS v4
* React Router v7
* react-hot-toast

### ⚙️ AI & Infrastructure

* Google Gemini API (2.5 Flash / 2.0 Flash fallback)
* Retry + fallback strategy for high availability

---

## 📁 Project Structure

```
docuassess-ai/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── validators/
│   │   ├── utils/
│   │   └── config/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── context/
│   │   ├── api/
│   │   └── utils/
│   └── index.html
```

---

## ⚡ Getting Started

### 🔹 Prerequisites

* Node.js (v18+ recommended)
* npm or yarn
* Google Gemini API Key

---

### 🔹 Backend Setup

```bash
cd docuassess-backend
npm install
```

Create `.env` file:

```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Run backend:

```bash
npm run dev
```

---

### 🔹 Frontend Setup

```bash
cd docuassess-frontend
npm install
npm run dev
```

Frontend runs on:

```
http://localhost:3000
```

Backend runs on:

```
http://localhost:5000
```

---

## 🔗 API Endpoints

### 📤 Upload PDF

```
POST /api/v1/upload
Content-Type: multipart/form-data
```

Response:

```json
{
  "fileId": "uuid",
  "meta": {
    "pageCount": 3,
    "charCount": 6729
  }
}
```

---

### 🧠 Generate Questions

```
POST /api/v1/generate
Content-Type: application/json
```

Request:

```json
{
  "fileId": "uuid",
  "questionTypes": ["mcq", "true_false"],
  "count": 5
}
```

---

## 🔄 System Flow

```
Upload → Extract → Chunk → Build Prompt → AI Generate → Validate → Render UI
```

---

## 🛡️ Reliability Features

* Retry mechanism for API failures (503 handling)
* Fallback models for Gemini
* Strict schema validation (Zod)
* Graceful UI error handling
* Input guards and request validation

---

## 🎯 Future Improvements

* MongoDB persistence layer
* File history dashboard
* Export to PDF/CSV
* User authentication
* Background job queue (BullMQ / Redis)
* Streaming AI responses
* Multi-language support

---

## 🧪 Known Limitations

* AI model may fail under heavy load (handled via retry/fallback)
* Scanned PDFs require OCR (not implemented yet)
* No persistent storage (in-memory for now)

---

## 📸 Screenshots

*(Add your UI screenshots here for portfolio impact)*

---

## 👨‍💻 Author

**Aditya Kapde**

---

## ⭐ Acknowledgements

* Google Gemini API
* OpenAI-inspired prompt engineering techniques
* Tailwind CSS ecosystem

---

## 📜 License

This project is open-source and available under the MIT License.

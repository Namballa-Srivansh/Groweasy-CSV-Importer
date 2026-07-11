# GrowEasy CSV Importer

A full-stack app for uploading CSV lead exports, previewing them in the browser, and sending them through an AI-powered mapping flow that converts messy source data into a structured CRM-like record format.

The current project is built with:
- Frontend: Next.js + React + TypeScript + Tailwind CSS
- Backend: Express + Node.js
- AI integration: OpenAI-compatible API through the OpenAI SDK

## What the app does

1. Upload a CSV file from the frontend.
2. Preview the parsed rows before confirming import.
3. Send the file to the backend.
4. Parse the CSV server-side.
5. Split rows into batches and send them to the AI model for field mapping.
6. Validate and return the mapped records along with any skipped rows.

## Project structure

```text
backend/
├── controllers/
│   └── importController.js
├── middleware/
│   ├── errorHandler.js
│   └── uploadMiddleware.js
├── models/
│   └── CrmRecord.js
├── routes/
│   └── importRoutes.js
├── services/
│   ├── aiExtractionService.js
│   └── csvParserService.js
├── validations/
│   ├── fileValidation.js
│   └── recordValidation.js
├── server.js

frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── PreviewTable.tsx
│   ├── ResultTable.tsx
│   └── UploadStep.tsx
├── lib/
│   ├── api.ts
│   └── types.ts
```

## Setup

### Prerequisites
- Node.js 18 or newer
- npm
- An OpenAI-compatible API key

### Backend

```bash
cd backend
npm install
```

Create a .env file with values such as:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o-mini
MAX_RETRIES=2
BATCH_SIZE=25
```

Start the backend:

```bash
npm run dev
```

The backend runs on http://localhost:4000.

### Frontend

```bash
cd frontend
npm install
```

Create a .env.local file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Start the frontend:

```bash
npm run dev
```

The frontend runs on http://localhost:3000.

## API endpoints

### GET /health
Returns a simple health check response.

### POST /api/import
Uploads a CSV file and returns mapped CRM-style records.

Request:
- multipart/form-data
- field name: file
- accepted format: .csv
- maximum size: 5MB

Response example:

```json
{
  "total_rows": 10,
  "total_imported": 8,
  "total_skipped": 2,
  "records": [],
  "skipped_records": [],
  "warnings": [],
  "source_headers": ["Name", "Email", "Phone"]
}
```

### POST /api/preview
Returns the parsed CSV rows without running the AI mapping step.

## Notes on the current implementation

- The app is intentionally stateless and does not use a database.
- CSV rows are processed in batches to reduce prompt size and improve reliability.
- The backend retries failed AI calls with backoff and marks failed rows as skipped instead of silently dropping them.
- Mapped records are passed through server-side validation before being returned to the client.

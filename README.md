# CipherSQLStudio

CipherSQLStudio is a browser-based SQL practice platform where users can solve SQL assignments using a real PostgreSQL sandbox environment.

## Features

- Assignment Listing Page
- Assignment Attempt Interface
- Monaco SQL Editor
- Real-time Query Execution
- Hidden Solution Validation
- Safe SELECT-only Query Enforcement
- Responsive UI using SCSS
- Hint System (Fallback Mode)

## Tech Stack

Frontend:

- React.js
- Monaco Editor
- SCSS (mobile-first responsive design)

Backend:

- Node.js
- Express.js
- PostgreSQL (sandbox database)

## Security

- Only SELECT queries allowed
- Multiple SQL statements blocked
- Dangerous keywords blocked
- Backend validation before execution

## Setup Instructions

### Backend

cd backend  
npm install  
node server.js

### Frontend

cd frontend  
npm install  
npm run dev

## Environment Variables

PG_HOST  
PG_PORT  
PG_USER  
PG_PASSWORD  
PG_DATABASE

(Optional)
MONGODB_URI  
OPENAI_API_KEY

## Data Flow

See docs/dataflow.jpg for complete system flow diagram.

## Important Note

MongoDB persistence and OpenAI LLM integration are architecturally prepared but currently running in fallback mode due to missing API keys.

The core SQL execution and validation system is fully functional.

## Data Flow Diagram

See docs/dataflow.jpg for the system architecture diagram.

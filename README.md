# Belusys-test-FE

ReactJS + TypeScript + Ant Design frontend for the Student Classroom Management System.

## Requirements

- Node.js 22.18.0 or newer
- npm 11 or newer

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Vite proxies `/api` requests to `http://localhost:3000`.
Set it to the backend base URL for a deployed frontend.

The student page supports searching by ID, first name, last name, and grade;
viewing, creating, editing, and soft-deleting student records; and uses active
prefix, gender, and grade-level options from the backend.

## Commands

```powershell
npm run dev
npm run build
npm run lint
npm run preview
```

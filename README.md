# AI Resume Screener

Upload a resume PDF, optionally paste a job description, and get an instant AI-powered evaluation — ATS score, skill breakdown, strengths, weaknesses, and a hiring recommendation.

Built with **TanStack Start**, **React 19**, **Tailwind CSS**, **shadcn/ui**, and a modern AI SDK.

---

## Features

- **PDF resume upload** — drag-and-drop or click to browse, with client-side text extraction.
- **Inline text editing** — review and fix extracted resume text before re-analyzing.
- **AI-powered analysis** — extracts candidate info, skills, experience, and generates a structured score.
- **Scoring rubrics** — choose from role-specific presets (general, engineering, product, design, etc.) with weighted categories.
- **Job-fit matching** — optionally paste a job description to improve relevance scoring.
- **Step-by-step progress** — visual indicator for parsing, AI extraction, scoring, and final summary.
- **Export reports** — download results as PDF or CSV.
- **Type-safe server functions** — all AI calls run through TanStack `createServerFn`.

---

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) — full-stack React with SSR and server functions.
- **Frontend:** React 19, Tailwind CSS 4, shadcn/ui components.
- **Routing:** TanStack Router (file-based).
- **Server:** TanStack server functions (`createServerFn`), edge-ready.
- **Validation:** Zod.
- **AI SDK:** `ai` + `@ai-sdk/openai-compatible` for structured generation.
- **PDF Parsing:** `pdfjs-dist` for client-side text extraction.
- **Build Tool:** Vite 8.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 20+

### Install

```bash
bun install

An AI-powered Resume Screening and ATS (Applicant Tracking System) application that helps recruiters and hiring managers analyze resumes, calculate ATS scores, identify candidate strengths and weaknesses, and generate intelligent hiring recommendations.

---

## 📌 Overview

AI Resume Screener is a modern web application that leverages Artificial Intelligence to automate resume evaluation. Users can upload resumes, analyze candidate profiles, generate ATS reports, and receive AI-driven recommendations for recruitment.

---

## ✨ Features

- 📄 Upload Resume (PDF)
- 🤖 AI-powered Resume Analysis
- 📊 ATS Score Generation
- 💼 Hiring Recommendation (Hire / Maybe / Reject)
- 🧠 Skill Extraction
- 📚 Experience Analysis
- 🎓 Education Evaluation
- 💪 Strengths & Weaknesses Detection
- 🎯 Job Fit Analysis
- 📈 Professional ATS Report Generation
- 📥 Download ATS Report as PDF
- ⚡ Modern & Responsive UI

---

## 🛠 Tech Stack

### Frontend
- React
- TypeScript
- Vite
- TanStack Start
- Tailwind CSS
- Shadcn/UI

### AI
- OpenAI Compatible SDK
- Prompt Engineering

### PDF Processing
- PDF.js
- jsPDF

### Development Tools
- ESLint
- Prettier
- Lovable

---

## 📂 Project Structure

```
AI-Resume-Screener/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   ├── lib/
│   ├── services/
│   └── utils/
│
├── public/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
└── .env
```

---

## 🚀 Installation

Clone the repository

```bash
git clone https://github.com/krishnaeit067/AI-Resume-Screener.git
```

Go to the project directory

```bash
cd AI-Resume-Screener
```

Install dependencies

```bash
npm install
```

Start the development server

```bash
npm run dev
```

Open your browser

```
http://localhost:5173
```

---

## ⚙ Environment Variables

Create a `.env` file in the project root.

```env
OPENAI_API_KEY=YOUR_API_KEY
```

---

## 🔄 Application Workflow

1. Upload Resume (PDF)
2. Extract Resume Content
3. AI Processes Candidate Information
4. ATS Score is Calculated
5. Skills & Experience are Evaluated
6. Hiring Recommendation is Generated
7. ATS Report is Displayed
8. User Downloads PDF Report

---

## 📊 Generated Report Includes

- ATS Score
- Resume Summary
- Skills Assessment
- Experience Evaluation
- Education Review
- Strengths
- Weaknesses
- Job Match Analysis
- Hiring Recommendation

---

## 🎯 Future Enhancements

- Job Description Matching
- Resume Ranking
- Multi Resume Comparison
- Recruiter Dashboard
- Authentication System
- Candidate Database
- AI Interview Question Generator
- Resume Improvement Suggestions
- Multi-language Support
- Analytics Dashboard

---

## 📸 Screenshots

> Add screenshots of your application here.

- Home Page
- Resume Upload
- ATS Report
- Dashboard

---

## 👨‍💻 Author

**Krishna**

B.Tech Computer Science & Engineering (2022–2026)

J.C. Bose University of Science and Technology, YMCA, Faridabad

---

## 📄 License

This project is developed for educational and learning purposes.

---

## ⭐ Support

If you like this project, please give it a ⭐ on GitHub.

---

**Built with ❤️ using React, TypeScript, Vite, OpenAI, and AI-powered Resume Analysis.**

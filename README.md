# Customer Feedback Analyzer (Sentix AI)

An AI-powered web application that helps businesses automatically analyze customer reviews. Users can paste reviews or upload a CSV file, and the system automatically identifies **sentiment**, **topics**, and **urgency levels**. Results and strategic recommendations are visualized through interactive charts and executive diagnostic reports.

---

## 🚀 Key Features

1. **User Authentication & Profiles**:
   - Secure registration and login powered by bcrypt password hashing and JWT tokens.
   - User-specific review datasets and custom Claude API key management.
   - Guest/demo mode supported out-of-the-box.

2. **Dual-Input Pipeline**:
   - **Paste Reviews**: Bulk text area supporting numbered lists, multi-line entries, or paragraphs with live line counter.
   - **Upload CSV**: Drag-and-drop CSV importer with automatic header detection (`review text`, `customer name`, `rating`, `date`) and live data preview.
   - **One-Click Curated Dataset**: Pre-loaded with 19 realistic reviews spanning e-commerce, hardware, SaaS, billing, and safety scenarios.
   - **Downloadable Sample CSV Template**: Available directly within the UI.

3. **AI Review Analysis Engine**:
   - **Primary Model**: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`) via REST API.
   - **Robust Fallback**: VADER (`vaderSentiment`) compound polarity engine + weighted keyword taxonomy + multi-factor urgency detector (detects legal threats, fraud, safety hazards, severe product defects, and churn risk).
   - **Classifications per Review**:
     - **Sentiment**: Positive / Neutral / Negative with polarity scores (-1.0 to +1.0).
     - **Topic**: Delivery, Quality, Pricing, Customer Service, Usability, Features, Billing, General.
     - **Urgency**: Low, Medium, High, Critical (pulsing alerts for critical customer risks).
     - **AI Summary**: Concise 1-sentence synopsis of the core friction or praise.

4. **Interactive Dashboard**:
   - **Key Metrics**: Total Reviews, Favorable Sentiment %, Negative Complaint %, Average Star Rating, Estimated Net Promoter Score (NPS), and Critical Escalations.
   - **AI Executive Diagnostic Card**: Executive summary overview, systemic operational friction points, prioritized action plan, and urgent risk alerts.
   - **Recharts Data Visualizations**:
     - Sentiment distribution Donut / Pie Chart.
     - Top complaints horizontal Bar Chart.
     - Daily sentiment timeline Area Chart.
     - Urgency severity breakdown bars.

5. **Review Explorer & Filtering**:
   - Filter by sentiment, category topic, urgency level, and rating.
   - Real-time search across review text, customer name, and topics.
   - Multi-column sorting (Date, Rating, Urgency, Sentiment).
   - Toggle between responsive Card View and Table View.
   - Batch actions: Clear database, Refresh, and Delete individual reviews.

6. **Export Capabilities**:
   - **Export CSV**: Instant download of all or filtered customer review records.
   - **Executive PDF Report**: Print-ready, professionally styled executive audit brief with custom `@media print` formatting suitable for stakeholder presentations.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons, Vite
- **Backend**: FastAPI, Python 3.9+, SQLAlchemy, Pydantic v2
- **Database**:
  - **SQLite** (Default for MVP / Local development)
  - **MySQL** (Supported for production via `DATABASE_URL=mysql+pymysql://user:pass@host/dbname`)
- **AI & NLP**:
  - Anthropic Claude API (Claude 3.5 Sonnet)
  - VADER Sentiment Analysis (`vaderSentiment`)
  - Rule-based topic taxonomy and urgency heuristic

---

## 🏃 Quickstart Guide

### 1. Launch the Server

Run the startup script:
```bash
./start.sh
```

Or run manually using the virtual environment:
```bash
source venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Open your browser at:
- **Application UI**: [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Development Server (Optional for hot reload)

If modifying frontend source files with live hot reload:
```bash
export PATH="$(pwd)/.tools/bin:$PATH"
cd frontend
npm run dev
```
Access the Vite dev server at [http://localhost:5173](http://localhost:5173) (automatically proxies API requests to `http://localhost:8000`).

---

## ⚙️ Environment Variables (Optional)

Create a `.env` file in the root directory or set variables in your shell:

```env
# Optional: Anthropic Claude API Key (can also be entered in the UI settings)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Database Connection String
# Defaults to sqlite:///./feedback_analyzer.db
DATABASE_URL=sqlite:///./feedback_analyzer.db

# For Production MySQL:
# DATABASE_URL=mysql+pymysql://root:password@localhost:3306/feedback_analyzer

# JWT Authentication Secret
JWT_SECRET=super-secret-customer-feedback-jwt-key-2026
```

---

## 🧪 Testing

Run backend tests:
```bash
./venv/bin/python -m unittest discover -s backend/tests -p "*test*.py" 2>/dev/null || ./venv/bin/python -c "from backend.main import app; print('App is healthy!')"
```

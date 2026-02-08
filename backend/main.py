import os
import json
import time
import uuid
import sqlite3
from datetime import datetime
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "vigil.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.executescript()
    conn.commit()
    conn.close()

GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

def structure_with_gemini(raw_text: str) -> dict:
    
    try:
        import google.generativeai as genai

        if not GEMINI_KEY:
            raise RuntimeError("No API key")

        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f
        response = model.generate_content(prompt)
        text = response.text.strip()

        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini structuring failed ({e}), using fallback")
        return structure_fallback(raw_text)

def structure_fallback(raw_text: str) -> dict:
    
    sentences = [s.strip() for s in raw_text.replace("\n", ". ").split(".") if s.strip()]
    items = []
    for i, sentence in enumerate(sentences):
        severity = "info"
        category = "general"
        lower = sentence.lower()
        if any(w in lower for w in ["danger", "safety", "hazard", "leak", "warning"]):
            severity = "critical"
            category = "safety"
        elif any(w in lower for w in ["broken", "fail", "repair", "fix", "maintenance", "vibrat"]):
            severity = "warning"
            category = "maintenance"
        elif any(w in lower for w in ["defect", "quality", "inspect", "reject"]):
            severity = "warning"
            category = "quality"
        elif any(w in lower for w in ["output", "rate", "target", "production", "slow"]):
            severity = "info"
            category = "production"

        items.append({
            "id": i + 1,
            "machine_id": "Unspecified",
            "category": category,
            "severity": severity,
            "title": sentence[:60] + ("..." if len(sentence) > 60 else ""),
            "details": sentence,
            "action_required": "Review and address as needed",
        })

    return {
        "summary": f"Shift briefing with {len(items)} items parsed.",
        "items": items,
        "machines_mentioned": [],
        "recurring_patterns": [],
    }

class BriefingCreate(BaseModel):
    raw_text: str
    shift_label: Optional[str] = None
    author: Optional[str] = None

class AttentionLog(BaseModel):
    item_index: int
    avg_engagement: float
    avg_focus: float
    time_spent_ms: int

class AttentionBatch(BaseModel):
    logs: list[AttentionLog]

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    conn = get_db()
    count = conn.execute("SELECT COUNT(*) FROM briefings").fetchone()[0]
    if count == 0:
        seed_demo_data(conn)
    conn.close()
    yield

app = FastAPI(title="Vigil API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def seed_demo_data(conn: sqlite3.Connection):
    
    demo_id = str(uuid.uuid4())
    demo_raw = (
        "Line 3 conveyor belt has been making a grinding noise since around 2 PM. "
        "I put in a maintenance ticket but nobody came yet. Keep an ear on it — if it gets worse, shut it down. "
        "Machine 7 bearing temperature spiked to 185°F about an hour ago, came back down to 160°F but that's still above normal. "
        "I'd recommend scheduling a bearing inspection before end of week. "
        "We hit 94% of target on Line 1, missed goal because of a 20-minute jam at the packaging station around 4 PM. Cleared it but watch for recurrence. "
        "Safety note: there's an oil slick near the south exit by Machine 12. I put cones up but it needs proper cleanup. "
        "New guy Marcus is doing great on QA but still needs supervision on the rejection criteria for Class B defects. "
        "Oh and the coffee machine in the break room is broken again."
    )
    demo_structured = structure_fallback(demo_raw)

    demo_structured = {
        "summary": "Outgoing shift reports a conveyor noise issue on Line 3, elevated bearing temps on Machine 7, a near-miss on Line 1 production targets, and a safety hazard near Machine 12. New QA team member needs continued mentoring.",
        "items": [
            {
                "id": 1,
                "machine_id": "Line 3 Conveyor",
                "category": "maintenance",
                "severity": "warning",
                "title": "Grinding noise on Line 3 conveyor",
                "details": "Conveyor belt making grinding noise since ~2 PM. Maintenance ticket submitted, no response yet.",
                "action_required": "Monitor noise level. If worsening, shut down Line 3 and escalate maintenance ticket."
            },
            {
                "id": 2,
                "machine_id": "Machine 7",
                "category": "maintenance",
                "severity": "critical",
                "title": "Bearing temperature spike on Machine 7",
                "details": "Temperature spiked to 185°F, currently at 160°F (above normal operating range).",
                "action_required": "Schedule bearing inspection before end of week. Monitor temp readings every 30 min."
            },
            {
                "id": 3,
                "machine_id": "Line 1 Packaging",
                "category": "production",
                "severity": "info",
                "title": "Line 1 hit 94% of target — packaging jam",
                "details": "20-minute jam at packaging station around 4 PM caused target miss. Jam was cleared.",
                "action_required": "Watch for recurrence of packaging jam. Check alignment of feed mechanism."
            },
            {
                "id": 4,
                "machine_id": "Machine 12 Area",
                "category": "safety",
                "severity": "critical",
                "title": "Oil slick near south exit — safety hazard",
                "details": "Oil slick on floor near south exit by Machine 12. Cones placed as temporary measure.",
                "action_required": "Arrange proper cleanup immediately. Identify source of oil leak from Machine 12."
            },
            {
                "id": 5,
                "machine_id": "QA Station",
                "category": "quality",
                "severity": "info",
                "title": "New QA operator needs supervision",
                "details": "Marcus is performing well but still learning rejection criteria for Class B defects.",
                "action_required": "Pair Marcus with senior QA for Class B inspection tasks."
            }
        ],
        "machines_mentioned": ["Line 3 Conveyor", "Machine 7", "Line 1 Packaging", "Machine 12", "QA Station"],
        "recurring_patterns": ["Machine 7 bearing issues may indicate recurring thermal problem", "Line 1 packaging jams reported in prior shifts"]
    }

    conn.execute(
        "INSERT INTO briefings (id, raw_text, structured, created_at, shift_label, author) VALUES (?, ?, ?, ?, ?, ?)",
        (demo_id, demo_raw, json.dumps(demo_structured), datetime.now().isoformat(), "Night → Day", "Mike R."),
    )
    conn.commit()

@app.get("/api/briefings")
def list_briefings():
    conn = get_db()
    rows = conn.execute("SELECT * FROM briefings ORDER BY created_at DESC").fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        d["structured"] = json.loads(d["structured"]) if d["structured"] else None
        result.append(d)
    return result

@app.get("/api/briefings/{briefing_id}")
def get_briefing(briefing_id: str):
    conn = get_db()
    row = conn.execute("SELECT * FROM briefings WHERE id = ?", (briefing_id,)).fetchone()
    conn.close()
    if not row:
        raise HTTPException(404, "Briefing not found")
    d = dict(row)
    d["structured"] = json.loads(d["structured"]) if d["structured"] else None
    return d

@app.post("/api/briefings")
def create_briefing(body: BriefingCreate):
    briefing_id = str(uuid.uuid4())
    structured = structure_with_gemini(body.raw_text)
    conn = get_db()
    conn.execute(
        "INSERT INTO briefings (id, raw_text, structured, created_at, shift_label, author) VALUES (?, ?, ?, ?, ?, ?)",
        (briefing_id, body.raw_text, json.dumps(structured), datetime.now().isoformat(), body.shift_label, body.author),
    )

    for item in structured.get("items", []):
        _upsert_knowledge(conn, item)
    conn.commit()
    conn.close()
    return {"id": briefing_id, "structured": structured}

@app.post("/api/briefings/{briefing_id}/attention")
def log_attention(briefing_id: str, body: AttentionBatch):
    conn = get_db()
    row = conn.execute("SELECT id FROM briefings WHERE id = ?", (briefing_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(404, "Briefing not found")

    now = datetime.now().isoformat()
    for log in body.logs:

        missed = 1 if (log.avg_engagement < 0.4 or log.avg_focus < 0.35) else 0
        conn.execute(
            "INSERT INTO attention_logs (briefing_id, item_index, avg_engagement, avg_focus, time_spent_ms, flagged_missed, logged_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (briefing_id, log.item_index, log.avg_engagement, log.avg_focus, log.time_spent_ms, missed, now),
        )
    conn.commit()
    conn.close()
    return {"status": "ok", "logged": len(body.logs)}

@app.get("/api/briefings/{briefing_id}/missed")
def get_missed_items(briefing_id: str):
    conn = get_db()
    rows = conn.execute(
        "SELECT item_index, avg_engagement, avg_focus, time_spent_ms FROM attention_logs WHERE briefing_id = ? AND flagged_missed = 1",
        (briefing_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/knowledge-graph")
def get_knowledge_graph():
    conn = get_db()
    rows = conn.execute("SELECT * FROM knowledge_entries ORDER BY occurrence_count DESC, last_seen DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def _upsert_knowledge(conn: sqlite3.Connection, item: dict):
    machine = item.get("machine_id", "Unknown")
    issue = item.get("category", "general")
    desc = item.get("title", "")
    severity = item.get("severity", "info")
    now = datetime.now().isoformat()

    existing = conn.execute(
        "SELECT id, occurrence_count FROM knowledge_entries WHERE machine_id = ? AND issue_type = ? AND description = ?",
        (machine, issue, desc),
    ).fetchone()

    if existing:
        conn.execute(
            "UPDATE knowledge_entries SET occurrence_count = ?, last_seen = ?, severity = ? WHERE id = ?",
            (existing["occurrence_count"] + 1, now, severity, existing["id"]),
        )
    else:
        conn.execute(
            "INSERT INTO knowledge_entries (machine_id, issue_type, description, severity, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)",
            (machine, issue, desc, severity, now, now),
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
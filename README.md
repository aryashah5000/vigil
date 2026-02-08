

> Every shift change, critical knowledge walks out the door. Vigil captures it.

**UGAHacks 11 · General AI (Tractian) Track · Presage SDK · Reach Capital**

Vigil is a B2B SaaS platform for manufacturing shift handoffs. Outgoing workers speak or type their end-of-shift briefing. AI structures it into actionable items. When the incoming worker reviews the briefing, **Presage tracks their real-time attention via webcam**. Items where their focus dropped are flagged and resurfaced — ensuring nothing critical gets lost between shifts.

Over time, Vigil builds a **knowledge graph** of recurring machine issues, transforming tribal knowledge into persistent institutional memory.

1. Show the dashboard with a pre-loaded briefing
2. Click "Review Briefing" → camera activates, Presage starts tracking
3. Walk through items — the judge sees their own engagement gauges in real-time
4. **Look away or zone out on one item** → system detects low attention
5. After review: "You missed 1 critical item — your attention was at 23%"
6. **Resurface the missed item** with emphasis → the "aha" moment

```bash
cd backend
pip install -r requirements.txt

echo "GEMINI_API_KEY=your_key_here" > .env
python main.py
```

Backend runs on `http://localhost:8000`

```bash
cd frontend
npm install

echo "VITE_PRESAGE_API_KEY=your_key_here" > .env
npm run dev
```

Frontend runs on `http://localhost:5173` (proxies API to backend)

The backend seeds a realistic demo briefing on first run. You can also submit new briefings via the Record page.

| Key | Where to get it |
|-----|----------------|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `VITE_PRESAGE_API_KEY` | MLH prizes page → "Log In To Claim Code" on Presage |

**No keys?** The app works in demo mode — Gemini falls back to rule-based parsing, Presage falls back to simulated attention data.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React UI  │────▶│  FastAPI      │────▶│  Gemini AI  │
│  + Presage  │◀────│  + SQLite     │◀────│  Structurer │
│  Attention  │     │  Knowledge DB │     └─────────────┘
└─────────────┘     └──────────────┘
     │                     │
     │ Webcam via          │ Shift-over-shift
     │ Presage SDK         │ knowledge graph
     ▼                     ▼
  Real-time           Recurring pattern
  engagement          detection & machine
  tracking            tribal knowledge
```

```
vigil/
├── backend/
│   ├── main.py              # FastAPI server + Gemini integration
│   ├── requirements.txt
│   └── .env                 # GEMINI_API_KEY
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main layout + navigation
│   │   ├── components/
│   │   │   ├── Dashboard.jsx       # Overview + stats
│   │   │   ├── RecordBriefing.jsx  # Voice/text input
│   │   │   ├── ReviewBriefing.jsx  # ★ Presage attention tracking
│   │   │   └── KnowledgeGraph.jsx  # Recurring patterns
│   │   └── hooks/
│   │       └── usePresage.js       # Presage SDK hook
│   ├── .env                 # VITE_PRESAGE_API_KEY
│   └── package.json
└── README.md
```

| Track | How Vigil Fits |
|-------|-----------------|
| **General AI (Tractian)** | Directly solves knowledge loss between shifts — a core driver of manufacturing downtime |
| **Presage (MLH)** | Deep integration: real-time engagement monitoring during briefing review, attention-aware item resurfacing |
| **Reach Capital (MLH)** | Built for frontline manufacturing workers — no laptop required, voice-first input |
| **Most Magical** | The moment a judge sees their own attention drop detected and a critical item resurfaced — that's magic |

**Hook:** "In manufacturing, $12 billion a year is lost to knowledge that walks out the door at every shift change."

**WHO:** Plant managers and shift supervisors at manufacturing facilities.

**WHY:** Shift handoffs are verbal, messy, and lossy. Critical info about machine quirks, safety hazards, and partial fixes gets forgotten. The next shift repeats mistakes, causes downtime, or misses safety issues.

**WHAT:** Vigil. Workers speak their briefing — AI structures it. But here's what makes it different: when the incoming worker reviews it, *we're watching their eyes.* [point to camera] Presage tracks engagement in real-time. If you zone out during the bearing temperature warning — we catch it, and we surface it again. Try it. [hand headset to judge]

**DEMO:** [Let judge review briefing, watch their attention live, show the resurfacing]

**SCALE:** Every factory. Every shift change. The knowledge graph compounds — after 30 days, Vigil knows more about your machines than any single worker does.

- React + Vite + Tailwind CSS
- FastAPI + SQLite
- Presage SDK (attention tracking)
- Google Gemini (briefing structuring)
- Web Speech API (voice input)

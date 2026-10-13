# Alonr — Student Room Swap & House‑Share Platform

Alonr is a location‑aware accommodation platform designed for university students in London. It helps students swap rooms, find available student housing, and connect with others for private house shares, all with verified university authentication.

---

## Purpose
Students often struggle with:
- Finding suitable accommodation near their university
- Swapping rooms or releasing contracts
- Discovering house‑share opportunities with compatible flatmates
- Navigating different student housing providers across London

Alonr centralises all of this into one unified app.

---

## Student Authentication
- University login required (UCL, KCL, Imperial, QMUL, LSE, etc.)
- Ensures listings are verified, safe, and student‑only

---

## Map‑Based Accommodation Search
- Interactive map of London
- View accommodation by provider groups:
  - Unite Students
  - King’s Residences
  - iQ
  - UCL Halls
  - Imperial Halls
  - Prestige
  - Additional London providers
- “Between two points” mode:
  - Example: show accommodation between UCL Marshgate and UCL Bloomsbury

---

## Filters

### Location & Accessibility
- Distance to supermarkets
- Nearest public transport
- Accessibility features
- Area / neighbourhood selection

### Accommodation Features
- Ensuite
- Studio
- Shared bathroom
- Shared kitchen
- Twin room
- Catered / non‑catered
- 24/7 reception
- Number of flatmates
- Bicycle rental availability
- Public facilities nearby

### Contract & Budget
- Weekly budget
- Contract length / number of weeks
- Time frame availability

---

## Room Swap & Contract Release
- Students can request room swaps within:
  - Same provider (e.g., Unite ↔ Unite)
  - Different providers (e.g., iQ ↔ UCL Halls)
- Contract release listings
- Swap matching based on:
  - Room type
  - Budget
  - Location
  - Preferences

---

## House Share (Private Accommodation)
A dedicated section for students seeking private house shares.

### House‑Share Filters
- Drinking, parties, smoking preferences
- Music instruments
- Pets (optional)
- Budget
- Personality traits
- Languages spoken
- Number of flatmates desired

---

## Summer Storage
- Optional add‑on service
- Helps international students find short‑term storage during summer breaks

---

## Roadmap
- In‑app chat
- Verified student profiles
- Group‑matching for multi‑room swaps
- Integration with university accommodation offices
- Smart commute time calculator

---

## Summary
Alonr is built to make student accommodation in London:
- Simpler
- More flexible
- More transparent
- More community‑driven

A platform where students can swap, share, and secure housing that fits their lifestyle and academic needs.

---

## For the team
👉 **Read [AGENTS.md](AGENTS.md) first.** It has the full hackathon plan, team split, schema, timeline and rules for AI coding agents.

### Quick start
```bash
npm install
cp .env.example .env.local   # fill in Supabase keys (ask Person C)
npm run dev
```
Data pipeline (Python):
```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r data/requirements.txt
python data/enrich.py && python data/seed.py
```

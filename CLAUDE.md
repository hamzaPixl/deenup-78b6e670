# DeenUp - AI Development Guide

## Project Overview

DeenUp is a competitive Islamic quiz mobile application combining serious theological learning with gamified competition. Think Duolingo for Islamic knowledge + Chess.com's competitive rating system.

**Vision:** Global platform for competitive Islamic quiz validated by theological authorities.

**Target Users:**
- Practicing Muslims
- Those curious about Islam
- Languages: French (launch) → Dutch → English
- Global Muslim community (long-term)

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Mobile** | React Native | Primary platform (iOS/Android) |
| **Web** | Next.js | Simple MVP web interface |
| **Backend** | Node.js | API server |
| **Real-time** | WebSockets | Live matches, chat |
| **Database** | PostgreSQL | Main data store |
| **BaaS** | Supabase (free tier) | Auth, database hosting |
| **Language** | TypeScript | Primary language |

## Project Structure

```
deenup/
├── mobile/           # React Native app
├── web/              # Next.js web app
├── backend/          # Node.js API server
├── shared/           # Shared types, utilities
├── docs/             # Documentation
└── scripts/          # Build/deployment scripts
```

## Core Game Mechanics

### Match Format
- **Duration:** 15 questions per match
- **Question Types:** QCM (4 answers), True/False, Free response (post-MVP)
- **Time Limits:** Easy (15s), Medium (20s), Advanced (30s)
- **Scoring:** Base × (Time remaining / Total time)
  - Easy: 100 pts
  - Medium: 200 pts
  - Advanced: 400 pts

### Themes
1. **Quran** - Verses, context, interpretation
2. **Jurisprudence** - Maliki school only (imam validation required)
3. **Prophets** - Stories and teachings
4. **Prophet Muhammad ﷺ** - Biography and sayings
5. **Islamic History** - Canonical events
6. **Companions** - Biographies of Sahaba
7. **Islamic Texts** - Classical works
8. **General Culture** - Islamic civilization

### DeenUp Points System
- **Starting:** 50 points on signup
- **Earning:** Daily play, fast advanced answers
- **Usage (10 pts each):** +5 seconds, double points, hints
- **Note:** Non-purchasable currency

### ELO Ranking
- **Matchmaking:** ELO-based pairing
- **Placement:** 2 matches determine initial rating
- **Calculation:** Points + level difference
- **Seasons:** Soft reset with rewards (Quran, prayer books, digital badges)

## Critical Features

### 1. Post-Match Review (Strategic Feature)
**Most important differentiator** - Educational validation:
- Display each question with user's answer
- Show correct answer with full explanation
- **Mandatory sources:** Quran verses, Hadith references, Maliki jurisprudence citations
- Goal: Build credibility, encourage deep learning

### 2. Question Validation Workflow
1. Question creation with mandatory source
2. Review by theological council (Maliki jurisprudence)
3. Source verification
4. Publication

### 3. Moderation System
- Chat filtering and reporting
- Question accuracy reporting
- User behavior moderation

## Game Modes

### Online Mode
- Account creation (email/Google/Apple)
- Theme selection
- ELO-based matchmaking
- Post-match review with sources
- Rematch option

### Local Offline
- Room codes for local play
- Host sharing
- Full review system
- Rematch capability

### Ranked vs Unranked
- **Ranked:** Affects ELO rating
- **Unranked:** Learning mode, no rating impact

## Communication Features

### 1v1 Chat
- Available post-match or from profiles
- Persistent conversations
- Integrated challenge button
- Islamic-themed reactions: 🤲 📖 ⭐ 💪
- Online/offline indicators

### Community Salons
- **📖 Quran** - Surah discussions, tafsir
- **🕌 Prophets** - Prophetic stories
- **⭐ General** - Open discussions
- **🏆 Competition** - Strategy, rankings
- Moderated with pinned messages
- User roles: Player, Moderator, Admin

## Learning Module

Pre-game study materials organized by quiz themes:
- Quran: Tafsir excerpts, revelation contexts
- Prophets: Ibn Kathir's "Stories of the Prophets"
- Muhammad ﷺ: Sira extracts
- Direct links to related quizzes
- Progress tracking

## User Profile System

**Profile Data:**
- Avatar/photo, ELO rating, win rate
- Match history, achievement badges
- Specialist theme recognition

**Achievements:**
- 10-win streaks
- 100 victories milestone
- Theme mastery badges

## Development Commands

```bash
# Project setup
npm install
npm run setup

# Development
npm run dev:mobile    # React Native dev server
npm run dev:web      # Next.js dev server
npm run dev:backend  # Node.js API server
npm run dev:all      # All services

# Building
npm run build:mobile  # Build mobile apps
npm run build:web    # Build web app
npm run build:backend # Build API server

# Testing
npm run test         # All tests
npm run test:mobile  # Mobile tests
npm run test:web    # Web tests
npm run test:backend # Backend tests

# Database
npm run db:migrate   # Run migrations
npm run db:seed     # Seed test data
npm run db:reset    # Reset database
```

## Architecture Patterns

### Data Flow
1. **Authentication:** Supabase Auth
2. **Real-time:** WebSocket connections for live matches
3. **State Management:** Context API (mobile), SWR (web)
4. **Database:** PostgreSQL with Supabase client
5. **API Design:** RESTful with real-time WebSocket events

### Security
- JWT tokens via Supabase
- Input validation and sanitization
- Rate limiting on API endpoints
- Theological content verification

### Performance
- React Native optimization patterns
- Database query optimization
- WebSocket connection pooling
- Image compression for avatars

## MVP Scope (3-4 months)

### Included
- French language only
- 3 core themes (Quran, Prophets, Muhammad ﷺ)
- QCM questions only
- Online 1v1 matches
- Basic ELO system
- 100-200 validated questions
- Complete post-match review system
- DeenUp points (one bonus type)

### Excluded from MVP
- Dutch/English localization
- Free response questions
- Complex Maliki jurisprudence
- TV mode
- Physical rewards
- Advanced achievement system

## Development Constraints

- **Solo development** (budget: €0)
- **Timeline:** 3-4 months realistic
- **Quality over speed:** Theological accuracy critical
- **Mobile-first:** React Native priority
- **Scalable architecture:** Plan for growth

## Key Considerations

### Theological Accuracy
- All questions require verified Islamic sources
- Maliki jurisprudence validation by qualified imams
- Clear citation format (Surah:Verse, Hadith collection:number)

### Cultural Sensitivity
- Islamic UI/UX principles
- Appropriate imagery and colors
- Respectful handling of religious content
- Prayer time considerations

### Technical Priorities
1. Real-time match synchronization
2. Offline capability for local matches
3. Scalable chat system
4. Robust question validation workflow
5. Performance optimization for mobile

## External Resources

- Technical PRD (Notion)
- Design specifications (Notion)
- App wireframes (Notion)
- Islamic source validation guidelines
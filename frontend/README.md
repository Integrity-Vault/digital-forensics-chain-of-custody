## Frontend (`frontend/`)

React 18 + Vite dashboard for the Digital Forensics Chain of Custody system.

### Pages

| Page | Purpose |
|------|---------|
| Dashboard | Case/evidence stats, tampering alerts, recent custody |
| Cases | Create and search investigation cases |
| Case Details | Evidence table, integrity status, custody timeline |
| Upload Evidence | Attach files to an **existing** case |
| Verify Evidence | Quick (storage + blockchain) or full (3-layer) verify |
| Chain of Custody | Case timeline viewer |

### Stack

- React 18, Vite 5
- Tailwind CSS 3
- Axios (`src/services/api.js`)
- Lucide React icons

### Run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Backend must run on [http://127.0.0.1:8000](http://127.0.0.1:8000).

### API base URL

Configured in `src/services/api.js`:

```js
baseURL: "http://127.0.0.1:8000/api"
```

### Build

```bash
npm run build
```

Output: `frontend/dist/` (gitignored).

### Legacy files

`UploadEvidence.jsx`, `VerifyEvidence.jsx`, and `EvidenceTimeline.jsx` are unused placeholders from an earlier phase. The live UI is wired through `App.jsx` and the pages listed above.

## Frontend (Phase 3)

This is a React + Vite frontend for evidence upload and integrity verification.

### Features

- Upload page:
  - Select a file.
  - Send file to `POST /upload` as `multipart/form-data`.
  - Display `file_name`, `evidence_id`, and `hash`.
- Verify page:
  - Enter `evidence_id`.
  - Select a file.
  - Send data to `POST /verify` as `multipart/form-data`.
  - Display DB verification (`VALID` / `TAMPERED`) and blockchain verification (`true` / `false`).

### Folder Structure

```text
frontend/
  src/
    components/
    pages/
      Upload.jsx
      Verify.jsx
    services/
      api.js
    App.jsx
```

### Run Frontend

From the `frontend` folder:

```bash
npm install
npm run dev
```

Open: [http://localhost:5173](http://localhost:5173)

### Connect to Backend

- Ensure FastAPI backend is running on: `http://127.0.0.1:8000`
- API base URL is configured in `src/services/api.js`
- Endpoints used:
  - `POST /upload`
  - `POST /verify`

If your backend URL changes, update `baseURL` in `src/services/api.js`.

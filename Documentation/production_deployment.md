# Production Deployment Runbook

This runbook gives a non-local path for hosting with better scan throughput and safer operations.

## 1. Recommended Hosting Topology

1. Frontend: Vercel or Netlify (static React build).
2. Backend API: Render, Railway, Fly.io, or VM/Kubernetes.
3. Worker model: use async queued scans via API (`/api/scan/async`) and poll job status (`/api/scan/jobs/{job_id}`).
4. Persistent state: `backend/data/runtime_state.json` must be mounted on durable disk/volume.

## 2. Required Environment Variables

- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `GEMINI_API_KEY` (optional)
- `SCAN_WORKER_COUNT` (default `4`, increase based on CPU and outbound network limits)

## 3. Backend Start Command

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

For production, avoid `--reload`.

## 4. Frontend Build and Serve

```bash
npm install
npm run build
```

Serve `dist/` via Vercel/Netlify or any static server.

## 5. Async Queue Usage (Faster UX)

### Enqueue scan

```http
POST /api/scan/async
Content-Type: application/json

{
  "domain": "example.com",
  "mode": "Full Deep Scan"
}
```

Response:

```json
{
  "job_id": "<uuid>",
  "status": "queued",
  "domain": "example.com",
  "mode": "Full Deep Scan"
}
```

### Poll status

```http
GET /api/scan/jobs/<job_id>
```

Possible statuses:

- `queued`
- `running`
- `completed`
- `failed`

### List recent jobs

```http
GET /api/scan/jobs?limit=50
```

## 6. Throughput Tuning

1. Raise `SCAN_WORKER_COUNT` carefully (e.g. 4 -> 8).
2. Increase server CPU/RAM before raising concurrency.
3. Keep network egress stable (subdomain/TLS probes are network-bound).
4. Use async scan endpoint in UI/clients to avoid request timeout pressure.

## 7. External Subdomain Coverage Recommendation

For enterprise-grade coverage:

1. Keep `crt.sh`, DNS, SAN and fallback sources active.
2. Add one external passive enumerator in your environment and validate results against your target profile.
3. Track per-source contribution over time so outages are visible during demos.

## 8. Security Notes

1. Keep CORS restricted in production (replace wildcard origins).
2. Store SMTP secrets in host secret manager.
3. Restrict report/email endpoints by role and audit all role changes.
4. Monitor scan job failures and external source timeout rates.

## 9. Persistence Behavior

- Scans now persist across refresh/restart via runtime state file.
- Ensure persistent volume mount, otherwise host restart will lose runtime file.

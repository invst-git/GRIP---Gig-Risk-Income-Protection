# GRIP FastAPI Backend

Minimal FastAPI service for premium and zone-risk inference.

## Run

```bash
python -m venv .venv
. .venv/Scripts/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

## Endpoints

- `GET /health`
- `POST /ml/premium-quote`

Example request body:

```json
{
  "city": "Delhi",
  "operatingZone": "Connaught Place",
  "vehicleType": "Two-Wheeler ICE",
  "avgDailyOrders": 28,
  "avgDailyHours": 10,
  "coverageTier": "Standard"
}
```

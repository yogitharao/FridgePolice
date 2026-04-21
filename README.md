# FridgePolice Prototype

This project is a small React prototype for the FridgePolice challenge.

## What it demonstrates

- Prevents double allocation of the same final portion (race condition on last 25% pizza).
- Expires stale approvals and handles spoilage fairly.
- Distinguishes duplicate item names by unique item IDs.
- Supports manual inventory correction when real fridge state differs from app state.

## Run locally

```bash
npm install
npm run dev
```

Detailed implementation notes are available in `Changes.md`.

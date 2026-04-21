# FridgePolice Prototype - Changes

## What the app does

This prototype is a React single-page app that simulates shared-fridge food handling between roommates.  
It tracks inventory, approvals, consumption, expiration of stale approvals, spoilage, and manual correction of incorrect inventory.

## How each required scenario is handled

### Scenario 1 - Final 25 percent race condition

- Initial state includes `pizza-1` with exactly `25%` remaining.
- The app has a dedicated action: `Run Scenario 1: B + C race for final 25%`.
- Both Roommate B and Roommate C requests are processed in one atomic flow with a local `remaining` counter.
- Once one roommate gets approved, the second request is denied because remaining quantity becomes `0`.
- This guarantees the same final portion is never double-allocated.

### Scenario 2 - Approved but never consumed, then spoiled

- Each approval has an expiration tick (`expiresAt`) and status (`approved`, `consumed`, `expired`, `void_spoiled`).
- Clicking `Advance clock (T+1)` expires stale approvals and releases those portions back to available inventory.
- Clicking `Mark spoiled / thrown` sets item quantity to `0`, marks item as spoiled, and voids still-active approvals for that item.
- Old approvals therefore cannot stay active forever and cannot be unfairly claimed after spoilage.

### Scenario 3 - Duplicate item names

- Inventory includes two items with identical names (`Ketchup`) but different IDs (`ketchup-1`, `ketchup-2`).
- All actions reference `item.id`, not `name`.
- UI displays both the name and unique ID so reviewers can verify operations target the correct physical item.

### Scenario 4 - App says available but real fridge item is gone

- Each item has a `Correct missing -25` action.
- This immediately decrements available inventory (never below zero).
- This supports reconciliation when someone consumed food without logging it.

## Engineering decisions and assumptions

- No backend/database was used by design; all state is in-memory React state.
- Portion amount is normalized to `25` units for clear scenario demonstrations.
- "Fairness" is represented as:
  - no double allocation,
  - stale approvals auto-expire,
  - spoiled food invalidates active approvals.
- Event log keeps recent transitions visible for testability and reviewer clarity.
- Scope intentionally stays minimal and logic-focused instead of production-hardening.

## How correctness is preserved

- Inventory changes are bounded (`Math.max(0, ...)`) to prevent negative stock.
- Scenario 1 race simulation evaluates both conflicting requests against one controlled remaining quantity.
- Approval lifecycle states prevent ambiguous or stale claim behavior.
- Every state transition is reflected in UI sections:
  - Inventory panel
  - Approvals panel
  - Event log

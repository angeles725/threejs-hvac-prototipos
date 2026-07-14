# SURFACE Lineage 1 Archive Manifest

**Asset:** `shell-circulation-facade`  
**Status:** Failed and exhausted  
**Archived:** 2026-07-13  
**Successor:** `Surface Reset 2` / lineage 2 / attempt 1

## Why this lineage was closed

Surface Reset 1 used all three bounded attempts. The blind reviews scored `0.79`, `0.75`, and `0.78`; every attempt failed the critical `canonical-network-endpoints` threshold of `0.80`. The final attempt proved the dedicated RS-485 identifiers, but the complete-network and UG67 compositions still fragmented or obscured the canonical TC300 → RS-485 → UC100 → LoRaWAN → UG67 → Ethernet/Internet → Niagara hierarchy.

Continuing as attempt 4 would violate the bounded correction contract. Surface Reset 2 therefore begins a new evidence lineage with a derived architecture-system diagram board while preserving the accepted physical topology.

## Inventory policy

- `assets/` retains every lineage-1 JSON, manifest, probe, test, syntax, SHA and mechanical artifact.
- `logs/` retains implementation, capture, browser-smoke and gate-state logs.
- Root Markdown files retain all lineage-1 implementation and reset reports.
- `SOURCE-INVENTORY.sha256` records every active lineage-1 artifact before cleanup, including the superseded PNG captures and console sidecars.
- `ARCHIVE-INVENTORY.sha256` records every retained archive payload after cleanup.
- Superseded PNG captures and `.console.json` sidecars were deliberately deleted only after `SOURCE-INVENTORY.sha256` was written and the non-capture audit payload was copied and verified.

No lineage-1 review result is reused as a Surface Reset 2 verdict.

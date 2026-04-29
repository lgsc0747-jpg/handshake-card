---
name: Interaction Method Tagging
description: First profile_view per visit is stamped with entry_method (nfc / qr / link) shown in Interaction Logs occasion column
type: feature
---

**Detection rules** (in `log-interaction` edge function, only on `interaction_type === "profile_view"`):
- `nfc` — `card_id` or `card_serial` present (came in via `/u/<short>` short-link redirect that set `tap_origin` in sessionStorage), OR explicit `metadata.source_method === "nfc"`.
- `qr` — `metadata.source_method === "qr"` (URL had `?src=qr`). NFC Manager QR codes are generated with `?src=qr` appended.
- `link` — fallback (no tap origin, no src param).

The first event's `occasion` becomes `Entry: NFC Tap | QR Scan | Direct Link`, and `metadata.entry_method` is persisted for analytics. PublicProfilePage parses `?src=` from `window.location.search` and forwards `source_method` in the profile_view metadata.

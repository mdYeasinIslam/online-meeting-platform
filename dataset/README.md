# Private local dataset workspace

- `raw/`: private sample JSON or exported bundles. Never commit real samples.
- `exports/`: private browser downloads moved here manually.
- `manifests/vocabulary.json`: trackable provisional vocabulary; no sign definitions or approvals.
- `manifests/*.local.json`: ignored copies for local review annotations. Increment manifest version after changes; keep matching copies with exports.
- `splits/`: generated, private participant-wise split manifests.
- `reports/`: generated, private validation/statistics reports.

Only empty `.gitkeep` files are tracked in data/output directories. Synthetic fixtures live under `tests/helpers/`, not here. Browser downloads go to your normal Downloads location; move them to `raw/` deliberately. The collection page never writes into the repository or uploads a dataset.

Keep the participant-to-person mapping and signed consent records separately in institution-approved private storage. Use one stable pseudonym per signer across all sessions, devices and exports. Removing a participant's data requires removing their samples from all private copies and regenerating splits/reports; Day-4 does not manage identities or backups.

See [recording protocol](../docs/DAY-4-PROTOCOL.md), [schema and Day-5 feature proposal](../docs/DAY-4-SCHEMA.md), and [delivery/verification report](../docs/DAY-4-DELIVERY.md).

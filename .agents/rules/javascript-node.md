---
trigger: model_decision
description: Apply when working on JavaScript/Node.js backend files.
---
- Prefer existing CommonJS or ESM style; do not mix module systems without a deliberate migration.
- Validate external input at API boundaries.
- Keep controllers thin when the project already uses service layers.
- Never log passwords, access tokens, secrets, or full sensitive request bodies.
- Preserve Express error-flow conventions used by the repository.
- For Mongoose updates, consider validation, timestamps, indexes, uniqueness, and atomicity.

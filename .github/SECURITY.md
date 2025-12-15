# Security Guidelines

These rules apply to all contributors and Copilot completions within the Terminus repository.

## Core Principles

- **No secrets in code** — never commit credentials, tokens, or API keys.
- **Environment isolation** — configuration data must be loaded securely at build time.
- **Sandbox boundaries** — WASM and frontend code must never access system or network resources directly.
- **Privacy by design** — only process user data that is required for core functionality.

## Environment and Configuration Rules

- Do **not** read `.env` or any local environment files from Zig, WASM, or frontend code.  
  Environment variables must be injected at build time through `import.meta.env` (Vite) or securely configured pipelines.
- `.env.local` may be used for **local-only** development, but it must remain git-ignored.
- Never print or log secret environment variables to the console or browser.

## WASM and Zig Security

- Do not expose Zig functions that can perform direct file I/O or network calls unless sandboxed through the host runtime.
- All Zig WASM functions should be **pure and deterministic** — they operate on data passed from JavaScript, not external state.
- Avoid direct use of unsafe pointers or unchecked external memory transfers.

## Frontend Safety

- Never use `eval`, `Function()`, or dynamic imports from user input.
- Validate all incoming messages from Web Workers or remote sources with strict type checks.
- Sanitize and constrain URL inputs before using them in any network request.

## Copilot and AI Code Assistance

These rules apply to AI-assisted code suggestions:

- Do **not** suggest reading environment files (`.env`, `.bashrc`, etc.).
- Avoid generating code that contains or references tokens, private keys, or internal endpoints.
- Prefer parameterized configuration or dependency injection over hardcoded constants.
- Require reviewers to manually verify any AI-generated code that touches security or configuration aspects.

## Reporting Security Issues

If you discover a security vulnerability, please follow responsible disclosure practices:

1. **Do not file a public issue.**
2. Contact the maintainers privately via email at `security@terminus.dev`.
3. Allow a reasonable time window for fixes before public disclosure.

All security reports are reviewed quickly and handled confidentially.

---

By following these principles, we keep Terminus — and its users — secure from data leaks, unsafe code generation, and environment exposure.

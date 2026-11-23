# Security Policy for AERIS

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

The AERIS project takes security, data privacy, and credential safety seriously.

If you discover a security vulnerability or credential exposure:
1. **Do not disclose the issue publicly** in GitHub issues, discussions, or social media.
2. Submit a detailed report to the repository maintainers via GitHub Private Vulnerability Reporting or by contacting the maintainers directly.
3. Include reproducible steps, affected endpoints, and suggested remediation if available.

## Credential and Secret Management Rules

- Real credentials (API keys, Supabase service-role keys, database passwords, user passwords) must never be committed to source control.
- All live credentials must be managed via `.env.local` or secure hosting provider environment settings.
- Supabase Row Level Security (RLS) is strictly enforced on all cloud persistence tables (`saved_plans`, `decision_receipts`, `scenario_history`) to prevent unauthorized or cross-user data access.
- Any test credentials that were previously displayed in test logs or demonstration screenshots must be considered compromised and rotated immediately before public deployment.

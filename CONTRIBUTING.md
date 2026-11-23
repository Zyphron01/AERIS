# Contributing to AERIS

Thank you for your interest in contributing to AERIS (Urban Air Quality Decision Companion).

## Core Principles

As outlined in our engineering rules:
1. **Strict TypeScript**: Avoid `any`. All schemas must be validated with Zod.
2. **Scientific Transparency**: Never simulate air quality data silently. Always identify data sources (e.g. Open-Meteo CAMS), model domain, timestamps, and units.
3. **No Unsubstantiated Health Claims**: Environmental decision guidance must be non-clinical.
4. **Security First**: Never commit API keys, database passwords, or personal credentials.
5. **Quality Gate Compliance**: All PRs must pass ESLint, TypeScript type check, Vitest unit tests, and production build.

## Development Workflow

1. Clone the repository and install dependencies:
   ```bash
   npm ci
   ```
2. Copy `.env.example` to `.env.local` and configure your local development keys.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Verify your changes against the quality gate:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```

## Pull Request Guidelines

- Provide a concise description of the feature or bugfix.
- Include automated tests for any new business logic or calculations.
- Maintain responsive, accessible UI components conforming to WCAG 2.2 AA.
- Ensure no sensitive environment variables or credentials are included.

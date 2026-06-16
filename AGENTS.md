# Repository Guidelines

## Project Structure & Module Organization

This repository is currently specification-first. The only project artifact is `Tier List Studio Desktop Specification.pdf`, which should be treated as the source of product requirements until implementation files are added.

When source code is introduced, keep the layout conventional:

- `src/` for application code.
- `tests/` for automated tests.
- `assets/` for images, icons, sample data, and static resources.
- `docs/` for supporting design notes beyond the main specification.

Do not commit generated files, build output, or local tool caches.

## Build, Test, and Development Commands

No build or test commands are defined yet. Add them to the project manifest when the implementation stack is chosen.

Expected commands once tooling exists:

- `npm run dev`: start the local development app.
- `npm test`: run the automated test suite.
- `npm run build`: create a production build.
- `npm run lint`: run static checks and formatting validation.

Do not add undocumented scripts. List contributor-facing scripts here or in the README.

## Coding Style & Naming Conventions

Follow the conventions of the selected framework and language. Prefer readable names over abbreviations.

Recommended defaults until tooling is established:

- Use 2-space indentation for JavaScript, TypeScript, JSON, CSS, and Markdown.
- Use `PascalCase` for UI components and classes.
- Use `camelCase` for variables, functions, and methods.
- Use `kebab-case` for file and directory names unless a framework requires otherwise.

Add a formatter and linter early, then run them before opening a pull request.

## Testing Guidelines

No test framework is configured yet. When code is added, include tests with the related feature or bug fix.

Use behavior-focused test names, for example `creates-tier-from-dropped-image` or `exports-list-as-png`. Co-locate tests when the framework favors it, or place integration tests under `tests/`.

## Commit & Pull Request Guidelines

There is no existing commit history, so no repository-specific convention is established. Use concise, imperative commit messages such as `Add tier drag ordering` or `Document export workflow`.

Pull requests should include:

- A short summary of the change.
- Any linked issue or requirement from the specification.
- Test results or a note explaining why tests were not run.
- Screenshots or recordings for UI changes.

## Contributors

- Codex: https://github.com/codex

## Agent-Specific Instructions

Before editing implementation files, inspect the current tree and preserve user changes. Keep updates scoped, and update this guide whenever structure or workflows change.

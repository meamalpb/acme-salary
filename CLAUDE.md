# CLAUDE.md

Guidance for AI agents working in this repo. Product scope lives in [docs/requirements.md](docs/requirements.md), and the reasoning behind each decision lives in [docs/decisions.md](docs/decisions.md). Read both before making non-trivial changes.

## Project

ACME Salary is employee salary management for an HR manager (~10,000 employees, several countries). The product is a Rails API backend (`backend/`) and a React frontend (`frontend/`).

**Current phase: backend only.** Don't touch `frontend/` unless asked.

## Stack (backend)

- Ruby 3.4.10, Rails 8.1 (API mode), SQLite
- Auth: devise + devise-jwt
- Soft delete: paranoia (`deleted_at` = termination date)
- Pagination: kaminari
- Serialization: Alba
- Tests: RSpec + FactoryBot + shoulda-matchers
- Lint: rubocop-rails-omakase

## Commands (run from `backend/`)

```sh
bin/setup                 # install and prepare the DB
bin/rails db:seed         # 10k employees and HR users (deterministic)
bundle exec rspec         # all tests
bin/rubocop               # lint
bin/rails server          # http://localhost:3000
```

## Working agreement

1. **Small vertical slices.** One feature per change. Don't build ahead of the current slice.
2. **Plan before code.** For anything touching more than ~3 files, propose a short plan and wait for approval.
3. **Tests first.** Write or extend failing specs, then implement. Every slice ends with `bundle exec rspec` and `bin/rubocop` passing.
4. **Never commit or push.** The human reviews the diff and writes the commit.
5. **No new gems** beyond the stack above without asking first.
6. **Never hand-write migration files.** Always create them with a generator (`bin/rails g migration ...`, or `bin/rails g model ...` when a model is being added), then edit the generated file. Never invent or change migration timestamps or filenames. Hand-written migrations have caused broken or out-of-order timestamps in the past.
7. **Don't change decided scope.** If something in `docs/` looks wrong, raise it instead of working around it.

## Architecture conventions

- **Thin controllers** under `Api::V1::`. Routes are prefixed with `/api/v1`.
- **Models** hold validations, enums and simple scopes.
- **Query objects** (`app/queries/`) handle search, filter and sort for the employee list.
- **Services** (`app/services/`) handle multi-step operations: terminating an employee, CSV export, metrics.
- **Serializers** (`app/serializers/`) are Alba resources. They are the only place that decides JSON shape.
- **Fixed lists** (country, department, level, gender) are string-backed Rails enums, so the DB stores readable values.
- **Money:** `salary` is an integer of whole USD. Never use floats.
- **Aggregates in SQL** (e.g. median via window functions), not by loading rows into Ruby.

## API conventions

- List response: `{ data: [...], meta: { page, per_page, total_count, total_pages } }`
- Error response: `{ error: { code, message, details } }`. A 422 puts per-field validation errors in `details`.
- Terminated employees are read-only. Writes to them return 422.

## Testing conventions

- Fast and deterministic: no network, no real time dependency (use `travel_to`), and no reliance on seed data.
- Model specs cover validations and scopes. Query, service and serializer specs are unit specs. Request specs cover the HTTP contract, including auth and error shapes.
- Prefer clear, explicit examples over clever shared helpers.

# ACME Salary

Web-based salary management for ACME's HR team. It replaces the Excel sheets used to manage pay for ~10,000 employees across multiple countries, and lets the HR manager answer questions about how the org pays people.

v1 covers sign in, the employee list (search, filters, sort, paging, all kept in the URL), add and edit, terminate, a read-only Terminated list, CSV export, and per-country insights (median salary, total payroll, top earner). Scope is in [docs/requirements.md](docs/requirements.md) and the reasoning behind each choice is in [docs/decisions.md](docs/decisions.md).

## Stack

| Layer    | Tech                                   |
| -------- | -------------------------------------- |
| Backend  | Ruby on Rails 8.1 (API), Ruby 3.4.10   |
| Database | SQLite                                 |
| Frontend | React 19, Vite 8, Node 24              |

## Structure

- [`backend/`](backend/README.md): Rails API
- [`frontend/`](frontend/README.md): React UI
- [`docs/`](docs/): requirements and the decision log

## Quick start

Needs Ruby 3.4.10 and Node 24. Run each half in its own terminal.

```sh
# Backend: http://localhost:3000
cd backend
bundle install
bin/rails db:prepare     # creates the database and seeds 10,000 employees and 3 HR users
bin/rails server
```

```sh
# Frontend: http://localhost:5173
cd frontend
nvm use
npm install
cp .env.example .env.local   # VITE_API_URL points at the backend (gitignored)
npm run dev
```

Sign in with `hr1@acme.test` / `password123` (also `hr2@` and `hr3@`). These are development-only credentials from the seed script.

## Tests

```sh
cd backend && bundle exec rspec && bin/rubocop
cd frontend && npm test && npm run lint
```

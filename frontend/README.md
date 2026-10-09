# Frontend

React 19 UI for ACME Salary, built with Vite.

## Stack

Reasoning for each choice is in [docs/decisions.md](../docs/decisions.md) (#18-23).

- Plain JavaScript, React 19, Vite
- Mantine (UI and forms)
- TanStack Query (server state) with a thin fetch wrapper
- React Router v7 (filters, sort and page live in the URL)
- JWT in localStorage; a 401 clears it and redirects to login
- Vitest + React Testing Library, mocking the `api` module

## Screens

The 12 v1 screens are in [design/v1-screens.pdf](design/v1-screens.pdf): sign in, Active list, edit, add, terminate, Terminated list, Insights, list loading, list load error, edit saving, edit save failed, and terminated view-only.

Where the designs and the backend differ, the backend and [docs/decisions.md](../docs/decisions.md) (#24, #25) win.

## Requirements

- Node 24 (see `.nvmrc`; run `nvm use`)

## Setup

```sh
npm install
```

## Run

```sh
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

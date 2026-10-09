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

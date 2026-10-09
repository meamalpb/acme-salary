# Decision log

These decisions came out of a structured "grill" session before any code was written. An AI agent interviewed the developer one question at a time, offered options with trade-offs, and the developer made each call. The scope summary is in [requirements.md](requirements.md).

| # | Decision | Alternatives considered | Reasoning |
|---|---|---|---|
| 1 | v1 is primarily a **data-entry tool**, with three insights: median salary, total payroll and top-paid employee, each **by country** | Full analytics dashboard | The HR manager's daily pain is maintaining data in Excel. The insights answer the most common questions without building a BI tool. |
| 2 | Pay comparisons and gap analysis are **deferred** | Include in v1 | Doing them properly needs role and level normalisation. It's better done well later than badly now. |
| 3 | **All salaries are stored in USD** | Local currency only; local currency + static rates; live FX | Simplicity. Global totals work without a rates table. |
| 4 | **Current salary only**, no history | Salary history table with effective dates | v1 metrics don't need history. It pairs naturally with an audit log later. |
| 5 | Employee fields: employee code, full name, email (unique), gender, job title, department, level, country, hire date, salary | Status column | Termination is represented by `deleted_at`, so a status column would duplicate it. |
| 6 | **Termination is a soft delete** (`deleted_at` = termination date) and is **irreversible**. Terminated records are read-only. | Reinstate action; hard delete | Keeps history for reporting while keeping `deleted_at` a trustworthy date. |
| 7 | Soft delete via **paranoia** | `discard`; hand-rolled | Developer preference and familiarity. paranoia's `destroy` stamps `Time.current`, so a `TerminateEmployee` service sets `deleted_at` explicitly to support a custom termination date. `restore` is never exposed. paranoia is in maintenance mode, which is acceptable for this scope. |
| 8 | **Auth: devise + devise-jwt**, multiple users, **no signup**, users created by the seed script, **all users equal** | Open signup; invite flow; roles | A public URL holding salary data must not allow self-registration. There's only one persona, so roles add nothing yet. |
| 9 | CSV/Excel **import deferred to v2**. The seed script is the v1 data path. **CSV export is in v1.** | Import in v1 | Import is a feature in its own right (validation, error reports, duplicates). Export is cheap and immediately useful. |
| 10 | Country, department, level and gender are **fixed lists as string-backed Rails enums** | Lookup tables with admin UI; free text | Guarantees clean grouping for per-country metrics. Readable values in the DB and in CSV exports. |
| 11 | Seed data: **level base × country multiplier × ±15% noise**, uneven country headcount, level pyramid, **fixed random seed** | Uniform random salaries | Makes the per-country metrics meaningful in the demo. A fixed seed makes it reproducible. |
| 12 | Employee list: search (name, email, code), filters (country, department, level), sort, **server-side pagination**, Active and Terminated views, **filters in the URL**, edit in a **drawer** | Client-side pagination; separate edit page | 10k rows shouldn't be loaded into the browser. A drawer keeps the HR manager's place in the filtered list. |
| 13 | **Backend first**, frontend afterwards | Build both in parallel | One layer at a time keeps AI-assisted changes small and reviewable. |
| 14 | **RSpec + FactoryBot + shoulda-matchers** | Minitest | More common in Rails teams, with readable request specs. |
| 15 | **Kaminari** for pagination | Pagy | Developer familiarity. |
| 16 | **Alba** for serialization | Plain Ruby serializers; jbuilder; `as_json` | Declarative and well maintained. Handles collections, and camelCase keys for the React frontend are a one-line option. |
| 17 | Salary is stored as **whole-dollar integer** | Decimal; integer cents | Annual salaries are set in whole dollars. An integer avoids float errors and keeps the API simple. |
| 18 | Frontend is **plain JavaScript** | TypeScript | Keeps the existing Vite scaffold and avoids setup cost. API shapes are documented instead of typed. |
| 19 | **Mantine** for UI components | MUI; Tailwind + headless primitives; plain CSS | Ships Drawer, Table, Select, DateInput, notifications and form hooks, which cover almost every screen. |
| 20 | **TanStack Query** with a thin fetch wrapper for server state | `useEffect` + fetch; SWR | Handles stale responses, keeping the previous page visible while the next loads, and refreshing the list after writes. Simple to learn for someone who knows `useEffect`. |
| 21 | **React Router v7**, with filters, sort and page as `useSearchParams` | TanStack Router; hand-rolled history API | The URL is the single source of truth, so views can be bookmarked and shared. |
| 22 | JWT stored in **localStorage**. Any 401 clears it and redirects to login. | sessionStorage; memory only | The HR manager stays logged in across browser restarts. Trade-off: the token persists on a shared machine until it expires, and is exposed to XSS. |
| 23 | **Vitest + React Testing Library**, mocking our `api` module. About 5-8 tests on critical flows only. | MSW; no tests; Playwright e2e | Light, fast and deterministic. Keeps the "every slice ends with passing tests" rule without heavy setup. |

## Open items

- **Insights screen design** is parked until its slice. The three metrics are in v1 scope.
- **Gender values** are proposed as `female`, `male`, `non_binary`, `prefer_not_to_say`.
- **Deployment host** to be decided.

# Interview notes

A walkthrough of how ACME Salary was built, for the technical discussion. It points to the detailed docs rather than repeating them: [requirements.md](requirements.md) for scope, [decisions.md](decisions.md) for the reasoning behind each call, [design.md](design.md) for the backend spec.

## 1. Architecture in one page

```
React (Vite, Mantine, TanStack Query, React Router)
   │  fetch + JWT in Authorization header
   ▼
Rails 8.1 API  /api/v1
   controllers   thin: authenticate, read params, render
      │
      ├─ queries/    EmployeeSearch (search, filter, sort), SalaryInsightsByCountry (SQL median)
      ├─ services/   CreateEmployee, TerminateEmployee, ExportEmployeesCsv, ImportEmployeesCsv, DemoData
      ├─ jobs/       ImportEmployeesJob → runs the service, records the outcome on EmployeeImport
      ├─ models/     Employee (enums, validations, paranoia), EmployeeImport, User, JwtDenylist
      └─ serializers/ Alba: the only place that decides JSON shape
   ▼
SQLite   employees (soft delete via deleted_at), employee_imports, users, jwt_denylists
```

**Request flow, list:** `GET /employees?country=india&q=ann&page=2` → controller → `EmployeeSearch` builds one scoped, indexed query → Kaminari paginates → `EmployeeSerializer` → `{ data, meta }`. The frontend keeps filters in the URL, so the URL is the source of truth for the view.

**Request flow, import:** upload (CSV) → whole-file checks in the request (size, encoding, syntax, columns, row count; 422 on failure) → `employee_imports` row saved as `queued` → `ImportEmployeesJob` runs `ImportEmployeesCsv` → all rows validated, then one transaction inserts them or nothing is written → row outcome recorded → the frontend polls once a second.

**Why this shape:** each layer has one job (see CLAUDE.md "Architecture conventions"), so a change lands in one place and each piece can be tested alone. Query, service and serializer specs are unit specs. Request specs cover the HTTP contract, including auth and error shapes.

## 2. Key decisions and trade-offs

| Topic | What we chose | The trade-off |
|---|---|---|
| Scope | Data-entry tool plus 3 per-country insights, not a BI dashboard (#1, #2) | Less impressive on a demo, but done properly. Pay-gap analysis needs role and level normalisation. |
| Currency | Everything in USD, whole-dollar integers (#3, #17) | No FX complexity and no float errors. Local-currency reporting would need a schema change. |
| Termination | Soft delete with paranoia, irreversible, read-only afterwards (#6, #7) | `deleted_at` stays a trustworthy termination date. No undo for a mistaken termination. paranoia is in maintenance mode. |
| Auth | devise + devise-jwt, no signup, all users equal (#8) | Safe for salary data on a public URL. No per-user permissions. |
| Fixed lists | String-backed enums (#10) | Clean grouping and readable DB values. Adding a country is a code change. |
| Aggregates | Median via SQL window functions, not Ruby | Fast at 10k rows. SQL is harder to read than a Ruby loop. |
| Import | Create-only, all or nothing, background job (#27, #28, #30) | No half-imported state to reason about, and no bulk salary edits without history. The HR manager must fix the whole file and re-upload. |
| Import size | 10,000-row cap, whole file in memory (#28, #34) | Simple all-or-nothing logic, but on the Render free tier it only works up to about 5,000 rows. |
| Dates in import | `YYYY-MM-DD` only (#31) | `03/04/2026` is ambiguous between the US and UK, so guessing could store wrong dates silently. |
| JWT storage | localStorage (#22) | Stays logged in across restarts. Exposed to XSS, and persists on a shared machine until it expires. |
| Frontend tests | 5-8 tests on critical flows only (#23) | Fast and cheap. Not full coverage. |

## 3. How AI was used

**The workflow, in order**
1. **Grill session first.** Before any code, an AI agent interviewed the developer one question at a time with options and trade-offs, and the developer made every call. The output is decisions.md and requirements.md.
2. **Design doc before code.** The backend was specified in design.md (data model, API, build order) and reviewed before the first slice.
3. **Small vertical slices.** One feature per change, in the order listed in design.md §5. The git history reflects this: model, auth, CRUD, search, meta, seed, insights, then the frontend, then import.
4. **Tests first.** Failing specs, then the implementation. Every slice ends with `bundle exec rspec` and `bin/rubocop` passing.
5. **Plan before code** for anything touching more than about 3 files, with the human approving the plan.
6. **Backend first, then frontend** (#13), so each AI-assisted change stays small and reviewable.
7. **Screens designed before the frontend build** (#25), and the build follows them except where the backend or a decision overrides.

**Guardrails written into CLAUDE.md**
- The AI never commits or pushes. The human reviews the diff and writes the commit.
- No new gems without asking (the `csv` gem and Faker were each added with an explicit decision, #29 and #11).
- No hand-written migrations. They are always generated, because hand-written ones caused broken or out-of-order timestamps in the past.
- "Don't change decided scope." If docs look wrong, the AI raises it instead of working around it.

**Where the human overrode or redirected the AI** (decisions made by the developer, recorded as such)
- #24: removed the termination date picker from the dialog, while reviewing the screen designs.
- #25: chose a centered modal over the side drawer from the original plan.
- #30: chose a background job for import over the simpler synchronous version (measured at about 3.5s for 10k rows).
- #11: replaced a hand-written name list with Faker after it repeated the same full names across 10k employees.
**What I'd say about the limits of the approach:** the AI is fast at producing code that follows a stated convention, so the leverage came from writing the conventions and decisions down first. Reviewing each diff before committing was the check on it.

## 4. Known limitations and next steps

**Known limitations in v1/v2**
- **No salary history or audit log** (#4). Edits overwrite the current value, so there is no record of who changed what.
- **No roles.** Every user can edit, terminate, import and export (#8).
- **JWT in localStorage** (#22). Moving to an httpOnly cookie would remove the XSS exposure, at the cost of CSRF handling.
- **Import depends on a worker.** In development the `:async` adapter loses a queued job on restart. In production solid_queue needs `bin/jobs` or `SOLID_QUEUE_IN_PUMA=1`. A worker that dies mid-import can leave the row `processing` (design.md §6).
- **Import is limited to about 5,000 rows on the hosted demo.** The code allows 10,000, but the whole file is held in memory before the all-or-nothing insert, and the Render free tier runs out of memory above roughly 5,000 rows (decisions #34). The fix is batched validation and insertion inside the same transaction, or a larger instance.
- **No stale-import sweeper**, so the above stays stuck until someone looks.
- **SQLite.** Fine for this scope. A multi-user production deployment would move to Postgres (which also makes the median and other aggregates easier).
- **Demo tools are not environment-gated** (see decision #33). Any signed-in user can wipe all employees.
- **Open items:** gender values are still a proposal, and the deployment host is undecided.

**Next steps, in the order already planned** (requirements.md)
1. Salary history and audit log
2. Pay comparison and gap analysis, by gender within role and level
3. Roles (viewer and editor) and admin-managed users
4. Multi-currency

**Smaller improvements**
- Gate or remove the demo endpoints outside development and demo environments.
- Batch the import (validate and insert in chunks inside one transaction) so memory stays flat and the 10,000-row cap holds on small instances.
- A sweeper job that marks stale `processing` imports as `failed`.
- Optional termination date in the UI (the API already accepts `terminated_on`).
- Read `.xlsx` directly if CSV export from Excel proves to be a friction point (#31).
- A deployment pipeline and a README with timings and `EXPLAIN` results (build slice 10).

## 5. Likely questions, and where the answer is

| Question | Answer lives in |
|---|---|
| Why soft delete, and why irreversible? | decisions #6, #7 |
| Why is the median computed in SQL? | CLAUDE.md "Aggregates in SQL", design.md §2.5 |
| How does it stay fast at 10k rows? | design.md §1.2 (indexes), server-side pagination (#12) |
| Why is import all-or-nothing and asynchronous? | decisions #28, #30 |
| What happens if the import worker dies? | design.md §6 |
| How do you keep AI changes safe? | section 3 above, CLAUDE.md "Working agreement" |
| What would you do with another week? | section 4 above |

# ACME Salary: Requirements (v1)

## Goal

ACME's HR team manages salary data for ~10,000 employees across several countries in Excel. The goal is to replace that with a web application where the HR manager can **maintain employee salary records reliably** and **answer basic questions about how the org pays people**.

**Persona:** an HR manager. They are comfortable with spreadsheets, not technical, and work with the data daily.

**Product stance:** v1 is a **data-entry and record-keeping tool first**, with a small set of insights. It is not an analytics platform.

## Scope: what v1 includes

**1. Authentication**
- Email and password login (Devise + JWT). Multiple HR users, all with equal access.
- Users are created by the seed script only. There is no signup, invite or user management.

**2. Employee records**
- Fields: employee code, full name, email (unique), gender, job title, department, level, country, hire date, annual salary.
- **Salary is stored in USD**, as a whole-dollar integer. Only the current salary is stored, with no history.
- Country, department, level and gender are **fixed lists in code**, validated on every write. This prevents spelling variants that would corrupt per-country metrics.

**3. Employee list (the main screen)**
- Server-side pagination (Kaminari).
- Search by name, email or employee code.
- Filter by country, department and level, which can be combined.
- Sort by name, salary or hire date.
- Filters are reflected in the URL so a view can be bookmarked or shared.
- **CSV export** of the current filtered result (all matching rows).

**4. Add, edit and terminate**
- Add and edit in a centered modal, with per-field validation errors.
- **Terminate** is a soft delete (paranoia). `deleted_at` is the termination date. The UI always records today's date; the API still accepts an explicit `terminated_on`.
- Termination is **irreversible**. Terminated records are **read-only** and are listed in a separate Terminated view.
- Terminated employees are excluded from the active list and from all metrics.

**5. Insights** (screen 7 in [frontend/design/v1-screens.pdf](../frontend/design/v1-screens.pdf))
- Per country: **median salary**, **total payroll cost**, **top-paid employee**.

**6. Seed data**
- 10,000 employees with **realistic salaries**: level base × country multiplier × ±15% noise.
- Uneven headcount across countries, a level pyramid (many Juniors, few Principals), and a **fixed random seed** so every run is identical.

## v2 scope: CSV import

The migration path from Excel. Reasoning is in decisions #27 to #32.

- An **Import CSV** button on the Active list opens a modal: choose a file (a header-only template can be downloaded), wait while it imports, then see how many employees were added or which rows to fix.

- The HR manager uploads a CSV file. **Every row adds a new employee**, and the server assigns the employee code. An import never updates or terminates existing employees.
- **All or nothing.** If any row is invalid, nothing is imported, and every problem is listed by spreadsheet row number and field, so the file can be fixed and uploaded again.
- An email that's already in use (including by a terminated employee) or repeated within the file is a row error.
- Columns use the export's names, matched loosely (case, spaces, Excel's byte order mark), and other columns are ignored. Fixed-list cells accept the value or the label (`united_states` or `United States`). Dates must be `YYYY-MM-DD`. Salaries are whole US dollars.
- A file holds at most 10,000 rows and 5 MB, and must be UTF-8 ("CSV UTF-8" in Excel's Save As). On the hosted demo (Render free tier) the practical limit is about 5,000 rows, because larger imports run out of memory (see decisions #34).
- The import runs in the **background**. Problems with the file as a whole are reported straight away. Row errors are available once the import has run, and the frontend checks for them by polling.

## Deliberately out of scope

| Left out | Why |
|---|---|
| Multi-currency and FX conversion | Storing everything in USD keeps totals and comparisons correct with no rates table or "rate as of when" problem. The schema can add a currency later. |
| Salary history and audit log | v1 metrics only need the current salary. History doubles the data model and UI. It's the natural next step with an audit trail. |
| CSV/Excel import (in v1) | It brings its own validation, error reporting and duplicate handling, so the seed script covered v1. **CSV import is now in v2 scope (above).** Excel `.xlsx` files are not read directly: Excel saves CSV in one step. |
| Pay comparison and pay gap analysis | Gender is stored now so this is possible later. Doing it properly (same role and level, statistical care) is beyond a first iteration. |
| Roles, permissions, user management | There's a single persona with equal access, and the seed script creates users. Not having public signup is a deliberate security choice for salary data. |
| Reinstating terminated employees | Keeping termination irreversible keeps `deleted_at` a trustworthy termination date. |
| Editable country, department and level lists | Fixed lists guarantee clean grouping. An admin UI for lookups isn't core to the HR manager's job. |
| Payroll processing, tax, payslips, approvals | This is a salary *records* tool, not a payroll system. |

## Later iterations (in order)

1. CSV import (built, see v2 scope above)
2. Salary history and audit log
3. Pay comparison and gap analysis (by gender, within role and level)
4. Roles (viewer and editor) and admin-managed users
5. Multi-currency

## Success criteria

- The HR manager can find, add, edit or terminate any employee in under 30 seconds.
- The list stays responsive at 10k rows (paginated API, indexed filter columns).
- Per-country median, total payroll and top-paid figures are correct and exclude terminated employees.
- The core logic is covered by fast, deterministic tests.

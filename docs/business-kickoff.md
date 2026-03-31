# Package Configuration Manager
# Taming the Package Complexity Beast
## Business Kickoff

**Ram Almog, Product Manager**
**Ofra Danilo, Partners Team**
**February 17, 2026** (Updated March 11, 2026 — post operator-portal & API assessment)

---

## Background & Context

- **Current state**: vcita's packaging system is built on ~130 feature flags organized across ~10 domains (Apps, AI, Client Management, Scheduling, Payments, Marketing, Communication, Business Administration, Trial/Spam Prevention). Each package is a unique combination of these flags, quotas (clients, storage, campaign recipients, estimates, invoices), module toggles (hidden/upsell/available), and bundled apps and addons (SMS, staff).

- **Existing tooling**: The **Operator Portal** (Vue 2 + Vuex + Vuetify 1.5) already provides basic package management — CRUD for packages with three tabs (Names & Settings, Quotas, Features), clone, bulk add feature, and a flat feature checkbox list. However, this UI treats packages as bags of individual flags with no domain grouping, no dependency validation, no templates, and no comparison capability. Quotas cannot be edited on existing packages. Features are a flat, uncategorized list with only `name`, `description`, and `packageable` fields — no domain, no business name, no dependency metadata.

- **New app bootstrap**: A new **Package Configuration Manager** frontend (`app/`) has been bootstrapped using Vue 3 + Vite + Pinia + Vuetify 3. It currently implements authentication (login with email/password + MFA) against the operator-portal API and a placeholder dashboard. No package management UI exists yet.

- **Pain points**: The existing Package Configuration UI in the operator portal was built when the system was smaller and simpler. As vcita has grown, the number of packages, partners, plan tiers, and configuration permutations has exploded. Today:
  - Configuring a new package requires understanding the interdependencies between feature flags (e.g., `sms_enabled` must be present for SMS booking confirmations to work; `scheduling_features` is a prerequisite for many scheduling sub-features).
  - There is no clear mapping between business-level decisions ("this tier gets Advanced Scheduling") and the low-level feature flags that implement them.
  - Feature flags have inconsistent naming conventions (`pkg.ai.smart_reply_advanced` vs `bizai_chat` vs `scheduling_features`), some are not relevant to packages (NOT PACKAGEABLE), and descriptions are incomplete or outdated.
  - Quotas, modules, bundles, licenses, and feature flags are configured in different places with different mental models.
  - The spreadsheet ("Package planning template") serves as the source of truth for planning, but translating it into actual package configuration is a manual, error-prone process.

- **Market context**: As vcita expands its partner ecosystem and adds new capabilities, the packaging system needs to support faster iteration on pricing and packaging without operational bottlenecks.

- **Internal context**: The Excel workbook with 4 tabs (FFs list, Features in Package UI, Package planning template, FFs description) is the current planning artifact. It reveals a mature but complex feature flag system with clear domain categorization that can be leveraged as the foundation for a better tool.

---

## Existing System Assessment

### What the Operator Portal Already Provides

The operator-portal API (`/operator_api/v1/`) and its Vue 2 frontend already support:

| Capability | Endpoint(s) | Status |
|-----------|-------------|--------|
| **List packages** | `GET /packages` | Working (client-side search only) |
| **Create package** | `POST /packages` | Working |
| **Update package** | `PUT /packages/:id` | Working, **but quotas are disabled on edit** |
| **Clone package** | Create from existing package ID | Working (UI only, re-sends full create) |
| **View package** (read-only) | `GET /packages/:id` | Working |
| **List features** | `GET /features?packageable=true` | Working |
| **Feature CRUD** | `POST/PUT/DELETE /features/:id` | Working |
| **Add feature to packages** | `POST /packages/add_feature` | Bulk add a single feature to multiple packages |

### Package Entity (Current API Shape)

```
Package {
  id, name, display_name, staff_slots, free,
  created_at, updated_at,
  settings: {
    disable_staff_slots, disable_add_staff_button, disable_sms_purchase_button
  },
  quotas: {
    invoice_monthly_quota, campaign_recipients_monthly_quota,
    estimate_monthly_quota, clients_credit, campaigns_credit,
    booking_credit, sms_monthly_quota: { us_canada, other },
    storage_quota (bytes)
  },
  features: [ { id, name, description, packageable } ]
}
```

### Feature Entity (Current API Shape)

```
Feature { id, name, description, packageable }
```

### Critical Gaps Between Current API and Business Kickoff Vision

| Gap | Impact |
|-----|--------|
| **Feature model has no domain/category** | Cannot group features by business domain; UI will always be a flat list |
| **Feature model has no business name** | Cannot show "Advanced Scheduling" — only raw flag names like `online_scheduling` |
| **Feature model has no dependency metadata** | Cannot build a dependency engine; no prerequisites, conflicts, or module gates |
| **Feature model has no options/values** | Cannot represent multi-value flags (e.g., hidden/upsell/available) |
| **No package template entity or API** | Cannot implement tier-based template system |
| **No package comparison/diff endpoint** | Client must fetch two full packages and diff locally |
| **No audit trail/history endpoint** | Cannot show who changed what and when |
| **No search-by-feature endpoint** | Cannot answer "which packages include feature X?" without fetching all packages |
| **Quotas disabled on package edit** | Operators must recreate packages to change quotas |
| **No domain catalog endpoint** | No way to fetch features organized by domain |
| **No validation endpoint** | Server cannot validate dependency rules before save |

---

## Opportunities

How might we make package configuration as intuitive as the business decisions it represents?

**1. Domain-Based Package Composition**
Instead of toggling 130+ individual feature flags, operators should configure packages by choosing domain-level capabilities (e.g., "Advanced Scheduling," "Basic Payments," "Full Marketing"). The system translates these into the correct feature flag combinations automatically. This eliminates the need to know that "Advanced Scheduling" means enabling `online_scheduling` + `multi_appointment_client_booking` + `booking_restrictions_per_service` + `notification_per_service` + `event_waitlist` + `arrival_window` + `pkg.sch.resources`.

**2. Tier Templates and Inheritance**
The planning spreadsheet already defines clear tiers: Connect and Business Management. A template system would let operators start from a tier preset and customize only what differs for a specific partner or use case.

**3. Validation and Dependency Enforcement**
Many feature flags have implicit dependencies that are only documented in spreadsheet comments (e.g., "SMS booking confirmation requires `sms_enabled` and `scheduling_features`," "Documents quota logic depends on `documents_enabled` + `storage_quota` + `documents_quota_increased`"). Building these dependencies into the tool prevents misconfiguration before it reaches production.

**4. Package Comparison and Audit**
As the number of packages grows, understanding what's different between two packages -- or what changed in a package over time -- becomes critical. A diff/comparison view would surface these differences at both the business-capability level and the feature-flag level.

**5. Planning-to-Configuration Pipeline**
Bridge the gap between the business planning spreadsheet and the actual system configuration. What's planned should be directly translatable into what's configured, with clear traceability.

---

## Goal

Build a Package Configuration Manager that enables operators to create, edit, compare, and manage vcita packages through a domain-organized, template-driven interface with built-in dependency validation -- reducing package configuration time from hours to minutes and eliminating misconfiguration errors.

---

## KPIs

| KPI | Target | How We Measure |
|-----|--------|---------------|
| Package configuration time | Reduce from days to ~1 hour | Time-to-configure tracking in the tool |
| Configuration errors | Zero dependency-related misconfigurations | Validation catches before save; post-deploy error rate |
| Package comparison time | < 2 minutes to diff any list of packages | User task completion time |
| Adoption | 100% of new package creation done through the tool within 3 months | Usage analytics |
| Clear visibility | any employee can view and understand any package content | Usage analytics |

---

## Suggested Solution

**Package Configuration Manager** -- a new Vue 3 frontend (already bootstrapped with auth) that layers domain-organized, template-driven package management on top of the existing operator-portal API, with targeted API extensions to fill the gaps identified above.

The approach: **extend the existing API** where possible, **add new endpoints** where the current model is insufficient.

**1. Domain-Organized Feature Catalog**
Organize all feature flags into their business domains as they already exist in the planning spreadsheet: Apps, AI, Client Management, Scheduling, Payments, Marketing, Communication, Business Administration, Trial/Spam Prevention. Each domain becomes a collapsible section in the configuration UI. Within each domain, features are presented with their business name (not just the flag name), description, available options, and dependencies.

> **API dependency**: The current Feature entity (`id, name, description, packageable`) lacks `domain`, `business_name`, `options`, and `dependency_metadata`. See [Required API Changes](#required-api-changes) below.

**2. Tier Template System**
Pre-built templates for the two standard tiers (Connect, business management) serve as starting points. Creating a new package means selecting a template and overriding only the specific features that differ. Templates encode the inheritance chain, so changing a Medium template automatically suggests corresponding changes to packages based on it.

> **API dependency**: No template entity or endpoints exist. The Package Configuration Manager can bootstrap templates as client-side JSON initially, but persistent templates require new API endpoints. As a temp solution we can create a package that is called TEMPLATE which we can clone and change afterwards.

**3. Dependency Engine**
A rules engine that encodes the relationships between feature flags:
- **Prerequisites**: `online_scheduling` requires `scheduling_features`
- **Coupled features**: SMS booking confirmation requires both `sms_enabled` and `scheduling_features`
- **Module gates**: Payment sub-features require `payments_module`
- **Quota logic**: `unlimited_clients` vs `clients_credit` quota; `invoices_monthly_unlimited` vs invoice quota
- **Upsell/Hidden/Available states**: Marketing module can be hidden (no flags), upsell (only `pkg.marketing.promote`), or available (full marketing flags)

The engine validates in real-time and surfaces warnings before save.

> **Implementation note**: Phase 1 runs dependency validation **client-side** in TypeScript using a declarative rules JSON. Phase 2 moves validation to the server via a new `POST /packages/validate` endpoint so that other consumers (e.g., operator portal, CI scripts) can benefit.

**4. Package Comparison View**
To present comparisong between a list of packages, it will show a side-by-side table, like the current spreadsheet but interactive, with differences highlighted.

> **API note**: Comparison can be done client-side by fetching several packages via `GET /packages/:id`. No new endpoint strictly required for Phase 1, but a `GET /packages/compare?ids=X,Y` endpoint would simplify this for Phase 2.

---

## Required API Changes

The existing operator-portal API needs the following changes to support the Package Configuration Manager vision. Changes are prioritized by phase.

### Phase 1: Must-Have API Changes

**1. Add package audit/history endpoint**

- `GET /packages/:id/history` — return a list of changes (who, when, what changed)
- This requires the backend to start logging package mutations. If audit logging is complex to add, an alternative is to store snapshots on each save and diff them.

### Phase 2: Nice-to-Have API Changes

**2. Extend the Feature entity with metadata**

The current Feature model (`id, name, description, packageable`) is too thin. It needs:

```
Feature (extended) {
  id, name, description, packageable,
  // New fields:
  domain: string,             // e.g. "scheduling", "payments", "marketing"
  business_name: string,      // e.g. "Advanced Scheduling", "Payment Module"
  value_type: string,         // "boolean" | "enum" | "number"
  options: string[],          // e.g. ["hidden", "upsell", "available"] for enum types
  dependencies: [{
    feature_name: string,     // prerequisite feature
    type: string,             // "requires" | "conflicts" | "coupled"
    description: string       // human-readable explanation
  }],
  sort_order: number          // display order within domain
}
```

- **Endpoint changes**: `PUT /features/:id` and `POST /features` must accept the new fields. `GET /features` must return them.
- **Migration**: Existing features retain current fields; new fields default to `null`/empty. A seed script populates metadata from the planning spreadsheet.
- **New query parameter**: `GET /features?domain=scheduling` to filter by domain.

> **Phase 1 workaround**: rely on a predefined spreadsheet without changing the existing code.

**3. Add search/filter for packages by feature**

Currently, `GET /packages` returns all packages with no filtering capability. Add:

- `GET /packages?feature_name=online_scheduling` — return packages containing the specified feature
- `GET /packages?search=essentials` — server-side search by name/display_name (currently client-side only)

**4. Package templates CRUD**

```
POST   /operator_api/v1/package_templates          — create template
GET    /operator_api/v1/package_templates          — list templates
GET    /operator_api/v1/package_templates/:id      — get template
PUT    /operator_api/v1/package_templates/:id      — update template
DELETE /operator_api/v1/package_templates/:id      — delete template
```

Template shape mirrors Package but includes `tier_level` (connect, business_management) and `is_base_template` flag.

> **Phase 1 workaround**: Templates stored as JSON in the Package Configuration Manager frontend. Operators select a template, which pre-fills the package form. No backend persistence — templates are version-controlled in the app repo. Or we can we can create a package that is called TEMPLATE which we can clone and change afterwards.

**5. Package validation endpoint**

- `POST /packages/validate` — accepts a package payload, returns validation results (errors, warnings, info) based on dependency rules

> **Phase 1 workaround**: handle this client-side; this endpoint enables other consumers to validate.

**6. Package comparison endpoint**

- `GET /packages/compare?ids=X,Y` — returns a structured diff of two packages

> **Phase 1 workaround**:  handle this client-side; this endpoint enables comparison from other tools.

**7. Feature catalog endpoint (domain-organized)**

- `GET /features/catalog` — returns features grouped by domain with full metadata, optimized for the configuration UI

> **Phase 1 workaround**:  fetche all features and groups client-side; this endpoint reduces client logic. Or rely on a predefined spreadsheet.

### Summary of API Changes

| Change | Priority | Backend Effort | Phase 1 Workaround |
|--------|----------|---------------|-------------------|
| Package audit/history | **Must-have** | Medium–High | None for Phase 1; defer to late Phase 1 |
| Extend Feature entity with domain, business_name, dependencies | Nice-to-have | Medium (schema + migration) | None — this is blocking |
| Enable quota editing on PUT /packages/:id | Nice-to-have | Low–Medium (investigate) | None — this is blocking |
| Package search/filter by feature | Nice-to-have | Low | Client-side filter (fetch all) |
| Package templates CRUD | Nice-to-have | Medium | Client-side JSON templates |
| Package validation endpoint | Nice-to-have | Medium | Client-side validation |
| Package comparison endpoint | Nice-to-have | Low | Client-side diff |
| Feature catalog endpoint | Nice-to-have | Low | Client-side grouping |

---

## Core Use Cases (Phase 1)

### Package Creation
- "I need to create a new package for Partner X based on the Business Management tier, but with AI features disabled and only 100 SMS"
- "I want to clone the current Essentials package and add the Documents module"
- "I need a Connect-level package that also includes the Zapier integration and Reserve with Google"

### Package Editing
- "We're rolling out Agentic AI -- I need to add `pkg.ai.smart_reply_advanced` and `bizai_cs_recommendations` to all High-tier packages"
- "Partner Y wants to downgrade -- switch their package from Advanced Payments to Basic Payments (upsell mode)"
- "I need to change the SMS quota from 250 to 500 for this partner's Medium package"

### Package Review and Comparison
- "Show me what's different between the Starter and Professional packages"
- "What features does this package have that the template doesn't? What's customized?"
- "List all packages that include the `event_waitlist` feature flag"

### Validation and Safety
- "I'm trying to enable `multi_appointment_client_booking` but the system should warn me that `online_scheduling` is required first"
- "I removed `sms_enabled` -- the system should flag that SMS reminders and SMS campaigns will stop working"
- "I set the marketing module to 'hidden' -- the system should auto-remove all marketing sub-features"

### Audit and Search
- "Which packages currently have the Campaign Pro app bundled?"
- "Show me the change history for this package -- who changed what and when"
- "Find all packages where `allow_custom_field_creation` is enabled but `enable_forms_customization` is not"

---

## UX Principles

**1. Business Language First**
The UI speaks in business terms ("Advanced Scheduling," "Payment Module") not flag names (`online_scheduling`, `payments_module`). Flag names are shown as secondary information for technical users.

**2. Progressive Disclosure**
Start with domain-level toggles (Scheduling: Basic / Advanced / Hidden). Expanding a domain reveals individual features. Expanding a feature reveals its flags, quotas, and dependencies. 

**3. Guardrails, Not Gates**
The dependency engine warns about issues but doesn't block saves entirely. Sometimes operators need to create non-standard configurations. Warnings are categorized: errors (will break), warnings (may cause issues), and info (unusual but valid).

**4. Template-Driven Workflow**
New package can starts from a template but can also created from scratch. If a package was created from a tempalte custom overrides are visually highlighted so it's clear what's different from the base template.

**5. Always Show the Diff**
Any editing action shows what will change -- both at the business level ("Marketing module: hidden → available") and at the flag level ("+`blasts`, +`campaigns_library`, +`activate_automatic_campaigns`...").

**6. Search Everything**
Every feature flag, domain, package, and configuration value is searchable. "Find all packages with Documents enabled" should take seconds.

---

## Scope - Phase 1

### Already Complete
- ✅ Vue 3 + Vite + Pinia + Vuetify 3 app scaffolding
- ✅ Authentication (login with email/password + MFA) against operator-portal API
- ✅ JWT management, auth guards, operator profile fetch
- ✅ Layout system (Default with app bar, Blank for login)

### To Build (Frontend)
- Feature flag catalog with all ~130 flags organized by domain, with descriptions, options, and dependency metadata
- Tier templates for Connect and Business Management (seeded from the Package Planning Template spreadsheet; stored as client-side JSON in Phase 1)
- Package creation wizard: select template → customize by domain → validate → save (calls existing `POST /packages`)
- Package editing with real-time dependency validation (calls existing `PUT /packages/:id`)
- Quota editing will stay blocked at this point
- Package diff view: compare any list of packages side by side (client-side diff `GET /packages/:id` responses)
- Search: find packages by feature flag, domain, or configuration value (client-side filter over `GET /packages` in Phase 1; server-side in Phase 2)
- Import: seed the system from the existing Excel workbook data
- Basic audit trail: who changed what, when (requires new API endpoint)

### To Build (API — see [Required API Changes](#required-api-changes))
Below changes are not relevant to phase1
- Extend Feature entity with `domain`, `business_name`, `value_type`, `options`, `dependencies`, `sort_order`
- Confirm/enable quota editing on `PUT /packages/:id`
- Add `GET /packages?feature_name=X` and `GET /packages?search=X` query parameters
- Add `GET /packages/:id/history` audit endpoint

---

## Out of Scope - Phase 1

- Partner-facing self-service package configuration (internal tool only)
- Automatic deployment/sync of packages to production systems
- Matrix view (all packages in one grid)
- Bulk operations across multiple packages (the operator portal's "add feature to packages" dialog remains available for this)
- Server-side package validation endpoint (`POST /packages/validate` — deferred to Phase 2; client-side validation in Phase 1)
- Server-side package templates CRUD (client-side JSON templates in Phase 1)
- Server-side package comparison endpoint (`GET /packages/compare` — deferred to Phase 2)
- Feature catalog endpoint (`GET /features/catalog` — client-side grouping in Phase 1)
- Replacing the operator portal's package UI (both tools coexist; the operator portal remains the fallback)

---

## Key Risk: Feature Flag Dependency Accuracy -- and How We De-Risk It

The value of this tool hinges on encoding accurate dependency relationships between feature flags. If dependencies are wrong or incomplete, the tool gives false confidence and operators may create broken packages. The current source of truth (spreadsheet comments and tribal knowledge) is incomplete and sometimes contradictory.

### Technical Experiments (Early Phase)

**Experiment 1: Dependency Audit**
Systematically walk through every feature flag in the "Package Planning Template" spreadsheet and document its dependencies, prerequisites, and interactions. Cross-reference with the "FFs description" tab and with the actual codebase where these flags are consumed. Target: produce a validated dependency graph for the top 30 most commonly configured flags.

**Experiment 2: Shadow Validation**
Take 10 existing production packages and run them through the dependency engine. Compare the engine's warnings against known issues in those packages. This tests both accuracy (are the rules correct?) and completeness (are we missing rules?).

### Success Criteria for Experiments

| Metric | Unacceptable | Acceptable | Target |
|--------|-------------|-----------|--------|
| Dependency accuracy (top 30 flags) | < 80% of dependencies correct | 90% correct | 100% correct |
| False positive rate | > 20% of warnings are incorrect | < 10% | < 5% |
| Shadow validation match | < 70% of known issues caught | 85% caught | 95% caught |

---

## Tech Stack (Confirmed)

The `app/` folder has been bootstrapped. The tech stack is confirmed as:

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | **Vue 3 + TypeScript** | Modern Vue ecosystem; TypeScript for complex configuration state |
| Build Tool | **Vite 6** | Fast dev server and build; native ESM support |
| UI Framework | **Vuetify 3** | Rich form controls, collapsible panels, data tables, and diff views; consistent with operator-portal's Vuetify lineage |
| State Management | **Pinia** | Official Vue 3 state management; lightweight and TypeScript-native |
| HTTP Client | **Axios** | Shared with operator-portal; interceptors for auth token injection and 401 handling |
| Dependency Engine | TypeScript rule engine (client-side) | Real-time validation without server round-trips; rules are declarative JSON |
| Backend API | **Existing operator-portal API** (`/operator_api/v1/`) | CRUD for packages and features; requires extensions (see [Required API Changes](#required-api-changes)) |
| Auth | **Operator-portal auth** | Login, MFA, JWT — already implemented in the app |
| Data Seed | Python script (Excel → JSON) | One-time import from the existing workbook to bootstrap the catalog |

---

## Final Thoughts

- The packaging system is a foundational part of vcita's monetization and partner strategy. Investing in proper tooling here unblocks faster experimentation with pricing and packaging, reduces operational errors, and scales with the business as it adds more capabilities (AI, Resources, etc.)
- **The operator portal assessment reveals a clear build-on-top strategy**: the existing API provides solid CRUD foundations, but the Feature entity is too thin for the vision. Extending it with domain, business name, and dependency metadata is the single most important backend investment.
- **The new Vue 3 app is off to a good start** with auth complete. The next visible milestone is the domain-organized package list — this is where operators will first see the value difference from the current flat-list UI.
- Both the operator portal and the Package Configuration Manager will coexist, hitting the same API. This de-risks adoption — operators can fall back to the portal for edge cases while the new tool proves itself for the common workflows.
- This kickoff focuses on the internal operator experience. A follow-up initiative could extend the tool to partner self-service, but getting the internal workflow right first is essential.
- Feedback welcome -- especially from anyone who has configured a package recently and can share what hurt the most.

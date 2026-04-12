# Package Configuration Manager — Design & Guidelines Document

> **Last updated:** April 9, 2026
> **Source of truth:** `docs/domain-feature-ff-mapping.csv` (synced from Google Sheet)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Application Screens](#2-application-screens)
3. [Domain & Feature Organization](#3-domain--feature-organization)
4. [Package Editor — Controls & Logic](#4-package-editor--controls--logic)
   - 4.1 [Package Information](#41-package-information)
   - 4.2 [Feature Controls by Type](#42-feature-controls-by-type)
   - 4.3 [Checkbox + Dropdown Features (Full Reference)](#43-checkbox--dropdown-features-full-reference)
   - 4.4 [Linked Flag Groups](#44-linked-flag-groups)
   - 4.5 [Inverted Flag Features](#45-inverted-flag-features)
   - 4.6 [Multi-Select Flag Groups](#46-multi-select-flag-groups)
   - 4.7 [Friendly Flag Labels](#47-friendly-flag-labels)
5. [Sidebar — Settings, Quotas & Bundles](#5-sidebar--settings-quotas--bundles)
   - 5.1 [Settings](#51-settings)
   - 5.2 [Quotas](#52-quotas)
   - 5.3 [Bundles](#53-bundles)
6. [Validation & Domain Gate Rules](#6-validation--domain-gate-rules)
7. [Defaults for New Packages](#7-defaults-for-new-packages)
8. [Package List — Filters & Actions](#8-package-list--filters--actions)
9. [Package Comparison](#9-package-comparison)
10. [Feature Catalog (Domains)](#10-feature-catalog-domains)
11. [Apps Catalog](#11-apps-catalog)
12. [Data Types & Enums Reference](#12-data-types--enums-reference)

---

## 1. Overview

The **Package Configuration Manager** is a Vue 3 SPA that manages vcita subscription packages — specifically which **feature flags**, **quotas**, **settings**, and **app catalog** items apply to each package. It communicates with the **operator-portal** API.

The app organizes ~120 feature flags across **11 business domains** and provides a purpose-built editor UI with intelligent controls (dropdowns, linked toggles, inverted checkboxes, validation rules) that abstract the complexity of raw feature-flag management.

---

## 2. Application Screens

| Route | Screen | Purpose |
|-------|--------|---------|
| `/` | Package List | Browse, search, filter, sort all packages |
| `/packages/new` | Package Editor (Create) | Create a new package (optionally from a template) |
| `/packages/:id` | Package Detail | Read-only view of a package |
| `/packages/:id/edit` | Package Editor (Edit) | Edit an existing package |
| `/features` | Feature Catalog | Browse all feature flags grouped by domain |
| `/apps` | Apps Catalog | Browse marketplace apps with pricing |
| `/templates` | Template List | Browse template packages; filter by feature |
| `/compare` | Package Comparison | Side-by-side comparison of 2+ packages |
| `/login` | Login | Email/password authentication |

---

## 3. Domain & Feature Organization

All feature flags are organized into **11 domains**. Each domain has an icon and color used throughout the UI.

| Domain | Slug | Icon | Color | Description |
|--------|------|------|-------|-------------|
| Bundles (displayed as "Apps") | `bundles` | `mdi-apps` | `#7E57C2` | Marketplace app inclusions |
| License | `license` | `mdi-license` | `#673AB7` | License-related flags |
| AI | `ai` | `mdi-brain` | `#3F51B5` | AI features |
| Client Management | `client_management` | `mdi-account-group-outline` | `#009688` | Client management features |
| Scheduling | `scheduling` | `mdi-calendar-clock` | `#4CAF50` | Scheduling features |
| Payments | `payments` | `mdi-credit-card-outline` | `#2196F3` | Payments and invoicing |
| Communication | `communication` | `mdi-message-text-outline` | `#FF9800` | Communication features |
| Marketing | `marketing` | `mdi-bullhorn-outline` | `#9C27B0` | Marketing and campaigns |
| Business Administration | `business_administration` | `mdi-briefcase-outline` | `#607D8B` | Business admin features |
| Trial / Spam Prevention | `trial_spam_prevention` | `mdi-shield-alert-outline` | `#F44336` | Trial and spam prevention |
| Other | `other` | `mdi-dots-horizontal-circle-outline` | `#9E9E9E` | Miscellaneous flags |

> **Note:** The "Bundles" domain is **renamed to "Apps"** in the Package Editor and Comparison views.

Within each domain, feature flags are grouped by **business feature name** (e.g., "Payment Module" groups `payments_module` and `pkg.payments.promote`). This grouping drives the control type rendered in the editor.

---

## 4. Package Editor — Controls & Logic

The Package Editor is the core screen. Features are displayed inside collapsible **domain accordion panels**, each showing a counter badge (`enabled / total`).

### 4.1 Package Information

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| Display Name | Text input | Required | Human-readable name, e.g. "Partner X — Professional" |
| Name | Text input | Required | Machine key, e.g. "partner_x_professional" |
| Deprecated | Checkbox | — | Only visible in **edit mode**; marks package as deprecated |

### 4.2 Feature Controls by Type

The editor renders **four different control types** based on the feature group:

| Control Type | When Used | UI Component |
|---|---|---|
| **Checkbox + Dropdown** | Feature group is defined in `checkboxDropdownFeatures` | Checkbox to enable/disable + `v-select` dropdown to pick the mode |
| **Linked Flag Group** | Feature group is in `linkedFlagGroups` set | Single checkbox that toggles **all** flags in the group at once |
| **Inverted Flag** | Feature group is in `invertedFlagFeatures` set | Checkbox with **inverted logic** (checked = flag absent) |
| **Single Checkbox** | Group has exactly 1 flag (and no special behavior) | Simple checkbox toggle |
| **Checkbox + Multi-Select** | Group has 2+ flags (and no special behavior) | Checkbox + multi-select dropdown for individual sub-flags |

### 4.3 Checkbox + Dropdown Features (Full Reference)

These are the most complex controls. Each has a checkbox to enable/disable the feature and a dropdown to select the operating mode. When the checkbox state or dropdown value changes, the system **adds/removes the correct combination of feature flags** automatically.

---

#### Email Templates Customization
- **Domain:** Client Management
- **Base Flag:** `pkg.business_administration.email_templates` (always set when enabled)

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | *(base flag only)* |
| `client` | Client emails only | `cliche_client_features` |
| `all` | Client & Business emails | `cliche_all_features` |

---

#### Documents / Storage
- **Domain:** Client Management

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | `pkg.documents.promote` |
| `available` | Available | `documents_enabled` |

---

#### Reviews
- **Domain:** Client Management

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | `collect_reviews` |
| `available` | Available | `enable_reviews_auto_publishing` |

---

#### Payment Module
- **Domain:** Payments
- **Domain Gate:** Required for other Payments features (see [Section 6](#6-validation--domain-gate-rules))

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | `pkg.payments.promote` |
| `available` | Available | `payments_module` |

---

#### SMS Module
- **Domain:** Communication
- **Base Flag:** `sms_enabled` (always set when enabled)
- **Domain Gate:** Required for other Communication features

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `available` | Available | *(base flag only)* |
| `deduct_marketing` | Deduct only marketing from quota | `purchase_sms_credits` |
| `deduct_all` | Deduct all SMS from quota | `sms_deduct_all_chargeables` |

---

#### Marketing Module
- **Domain:** Marketing
- **Domain Gate:** Required for other Marketing features

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | `pkg.marketing.promote` |
| `available` | Available | `marketing_module` |

---

#### Reports
- **Domain:** Business Administration

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `upsell` | Upsell mode | `reports` |
| `available` | Available | `reports` + `detailed_reports` |

---

#### Automated Campaigns
- **Domain:** Marketing

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `activate` | Activate only | `activate_automatic_campaigns` |
| `activate_create` | Activate + Create/Delete | `activate_automatic_campaigns` + `create_delete_automatic_campaigns` |

---

#### Onboarding Wizard
- **Domain:** Business Administration
- **Default state:** Unchecked (checkbox OFF adds `pkg.business_administration.registration_wizard.deny`)
- **Unchecked flags:** `pkg.business_administration.registration_wizard.deny`

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `full` | Full onboarding | *(no additional flags)* |
| `slim` | Slim onboarding | `pkg.business_administration.slim_registration_wizard` |

**Logic:** When checkbox is **OFF**, the deny flag is set (blocking onboarding). When **ON**, the deny flag is removed and the selected mode applies.

---

#### Getting Started Wizard
- **Domain:** Business Administration
- **Default state:** Unchecked (checkbox OFF adds `pkg.business_administration.getting_started.deny`)
- **Unchecked flags:** `pkg.business_administration.getting_started.deny`

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `getting_started` | Getting Started | *(no additional flags)* |
| `setup_wizard` | Setup wizard (Thryv) | `setup_wizard_menu_item` |

**Logic:** Same inversion pattern as Onboarding Wizard.

---

#### Event Attendees
- **Domain:** Scheduling
- **Default state:** Unchecked (defaults to 5 attendees)
- **Tooltip:** "Unselecting Event Attendees feature results in 5 attendees limit"

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `5att` | 5 Attendees | *(no additional flags)* |
| `unlimited` | Unlimited | `event_attendees_limit_increased` |

---

#### Services
- **Domain:** Scheduling
- **Default state:** Unchecked (defaults to 5 services)
- **Tooltip:** "Unselecting Services feature results in 5 services limit"

| Dropdown Option | Label | Flags Set |
|---|---|---|
| `1svc` | 1 Service limit | `single_service_booking` |
| `3svc` | 3 Services limit | `3_services_limitation` |
| `5svc` | 5 Services limit | *(no additional flags)* |
| `150svc` | 150 Services limit | `unlimited_services` + `remove_service_limit` |
| `unlimited` | Unlimited Services | `unlimited_services` |

---

### 4.4 Linked Flag Groups

These features use a **single checkbox** that toggles **all flags** in the group simultaneously (all on or all off).

| Feature Group Name | Domain | Flags Toggled Together |
|---|---|---|
| External Calendar Sync (Google and Outlook) | Scheduling | `external_calendar_sync`, `googlewaysync_include_in_plan`, `outlookwaysync_include_in_plan` |
| Zoom | Scheduling | `zoom_packageable`, `old_integration_zoom_include_in_plan` |

### 4.5 Inverted Flag Features

These features have **inverted checkbox logic**: the checkbox being **checked** means the flag is **absent** from the package (the feature is allowed). Unchecking the checkbox **adds** the flag (blocking the feature).

| Feature Name | Domain | Flag (set when UNCHECKED) | Meaning When Unchecked |
|---|---|---|---|
| SMS Campaigns | Communication | `hide_sms_channel_from_marketing` | SMS channels hidden from marketing |
| Pendo | Business Administration | `pkg.bus.pendo.deny` | Pendo onboarding tool disabled |
| Block Links in Messages | Trial / Spam Prevention | `allow_to_send_link` | Links in messages are allowed (inverted naming) |

### 4.6 Multi-Select Flag Groups

When a business feature maps to **multiple flags** and is not defined as a checkbox-dropdown or linked group, it renders as a **checkbox + multi-select dropdown** where individual sub-flags can be toggled independently.

Notable examples:

| Feature Group | Domain | Sub-Flags | Friendly Labels |
|---|---|---|---|
| Multi Staff | Business Administration | `multistaff_features`, `joint_availability`, `staff_role_permissions`, `auto_reassign` | MultiStaff for Service, Any Employee Selector, Custom Roles & Permissions, Staff Assignment Rules |
| Thryv (Communication) | Communication | `tatango`, `dedicated_promotional_number`, `bye_zipwip`, `disable_messages_notifications` | Tatango, Dedicated Promotional Number, Twilio, Disable Messages Notifications |
| Thryv - Pro Campaigns | Marketing | `pro_campaigns`, `send_pro_campaigns`, `ace_add_on` | Pro Campaigns, Send Pro Campaigns, ACE Add-on |
| Thryv - Yext Reviews | Other | `yext_reviews`, `pkg.thryv.listings_settings`, `reviews_respond`, `review_publishing` | Yext Reviews, Listings Settings, Reviews Respond, Review Publishing |
| Thryv - ThryvPay | Other | `thryv_pay`, `ThryvPay_wizards` | ThryvPay, ThryvPay Wizards |

### 4.7 Friendly Flag Labels

The following flags have human-readable labels used in multi-select dropdowns:

| Flag Key | Display Label |
|---|---|
| `tatango` | Tatango |
| `dedicated_promotional_number` | Dedicated Promotional Number |
| `bye_zipwip` | Twilio |
| `disable_messages_notifications` | Disable Messages Notifications |
| `multistaff_features` | MultiStaff for Service |
| `joint_availability` | Any Employee Selector |
| `staff_role_permissions` | Custom Roles & Permissions |
| `auto_reassign` | Staff Assignment Rules |
| `pro_campaigns` | Pro Campaigns |
| `send_pro_campaigns` | Send Pro Campaigns |
| `ace_add_on` | ACE Add-on |
| `no_powered_by` | vcita - Hide Powered By vcita |
| `backoffice_branding` | vcita - Backoffice Branding |
| `yext_reviews` | Yext Reviews |
| `pkg.thryv.listings_settings` | Listings Settings |
| `reviews_respond` | Reviews Respond |
| `review_publishing` | Review Publishing |
| `thryv_pay` | ThryvPay |
| `ThryvPay_wizards` | ThryvPay Wizards |

---

## 5. Sidebar — Settings, Quotas & Bundles

The right sidebar contains three collapsible cards.

### 5.1 Settings

| Setting | Field Type | API Key | Description |
|---|---|---|---|
| Additional Staff require upgrade | Checkbox | `disable_add_staff_button` | Hides the "Add Staff" button, showing upgrade prompt instead |
| Additional SMS require upgrade | Checkbox | `disable_sms_purchase_button` | Hides SMS purchase, showing upgrade prompt instead |
| Free package | Checkbox | `free` | Marks the package as a free tier |

### 5.2 Quotas

| Quota | API Key | Type | Can Be Unlimited | Unlimited Flag |
|---|---|---|---|---|
| Client Limit | `clients_credit` | Number | Yes | `unlimited_clients` |
| Booking Credits | `booking_credit` | Number | No | — |
| Storage | `storage_quota` | Number + Unit dropdown (`MB` / `GB`) | No | — |
| Monthly Invoices | `invoice_monthly_quota` | Number | Yes | `invoices_monthly_unlimited` |
| Monthly Estimates | `estimate_monthly_quota` | Number | Yes | `estimates_monthly_unlimited` |
| Campaign Recipients | `campaign_recipients_monthly_quota` | Number | Yes | `campaign_recipients_monthly_unlimited` |
| Campaign Credits | `campaigns_credit` | Number | No | — |

**Storage unit dropdown options:** `MB`, `GB`

**Unlimited behavior:** When the "Unlimited" checkbox is checked:
- The corresponding unlimited **feature flag** is added to the package
- The numeric input is disabled and shows "Unlimited" placeholder
- The quota value is sent as `null`

**Hidden quota-control flags:** The following flags are automatically managed by the quota UI and are **hidden from the feature checkbox list**: `unlimited_clients`, `invoices_monthly_unlimited`, `estimates_monthly_unlimited`, `campaign_recipients_monthly_unlimited`, `unlimited_seats`.

### 5.3 Bundles

| Bundle Item | API Key / Flag | Type | Can Be Unlimited | Unlimited Flag |
|---|---|---|---|---|
| Staff Seats | `staff_slots` | Number | Yes | `unlimited_seats` |
| SMS (US, Canada, IL) | `sms_monthly_quota_us_canada` | Number | No | — |
| SMS (other) | `sms_monthly_quota_other` | Number | No | — |

---

## 6. Validation & Domain Gate Rules

### Domain Gate Rules

Three domains have **gate rules** — a prerequisite module must be enabled before other features in the domain can be activated:

| Domain | Gate Feature | Required State | Error Message |
|---|---|---|---|
| **Payments** | Payment Module | Must be set to **"Available"** (not "Upsell") | "Payment Module must be set to 'Available' to use other Payments features. Either make it Available or remove the selected payment features (including unlimited flags for invoices and estimates)." |
| **Communication** | SMS Module | Must be **enabled** (any dropdown option) | "SMS Module must be enabled to use other Communication features. Either enable SMS Module or remove the selected communication features." |
| **Marketing** | Marketing Module | Must be set to **"Available"** (not "Upsell") | "Marketing Module must be set to 'Available' to use other Marketing features. Either make it Available or remove the selected marketing features (including unlimited campaign recipients)." |

**Visual behavior:**
- When a gate violation is detected, the domain panel auto-opens
- A red "Error" chip appears on the domain header
- A red alert banner appears inside the panel
- Conflicting feature rows get a red left-border highlight (`gate-conflict` class)
- The **Save button is disabled** while gate errors exist

### Form-Level Validation

- **Name** and **Display Name** are required fields
- Save is disabled when `formValid` is `false` (missing required fields OR domain gate errors)

---

## 7. Defaults for New Packages

When creating a **brand new package** (not from a template), the following defaults apply:

### Default Feature Flags (pre-set)

These inverted-logic flags are **added by default** so that the corresponding features are initially restricted:

| Flag | Effect |
|---|---|
| `hide_sms_channel_from_marketing` | SMS Campaigns: OFF by default |
| `pkg.bus.pendo.deny` | Pendo: OFF by default |
| `allow_to_send_link` | Block Links in Messages: OFF by default (links allowed) |

### Default Quota & Bundle Values

All quota and bundle fields default to **null** (empty / not set) when creating a new package.

### Default Settings

| Setting | Default |
|---|---|
| Additional Staff require upgrade | Off |
| Additional SMS require upgrade | Off |
| Free package | Off |

---

## 8. Package List — Filters & Actions

### Filters

| Filter | Type | Description |
|---|---|---|
| Search | Text input | Filters by display name or package name (substring match) |
| Feature flag | Autocomplete (`v-autocomplete`) | Filters packages containing a specific feature flag. Options show `"Business Name (flag_name)"` for every flag in the catalog. |
| Active only | Toggle switch | Hides deprecated packages (persisted to `localStorage`) |

### Sort Columns

| Column | Default Direction | Type |
|---|---|---|
| Display Name | Ascending (A-Z) | Alphabetical |
| Name | Ascending (A-Z) | Alphabetical |
| Created | Descending (newest) | Date |
| Updated | Descending (newest) | Date |

### Row Actions (context menu)

| Action | Description |
|---|---|
| View | Navigate to package detail page |
| Edit | Navigate to package editor |
| Clone | Create a new package pre-filled with all values from the selected package |
| Set as Template / Remove Template | Toggle the `is_template` flag |

### Create Package Options

| Option | Description |
|---|---|
| New Package | Opens editor with defaults |
| From Template | Opens a dialog with an autocomplete to select a template package; then opens editor pre-filled from that template |

---

## 9. Package Comparison

### Package Selector

- **Autocomplete** (`v-autocomplete`, multiple, chips): Select 2+ packages by display name or internal name
- Packages can also be pre-selected via URL query params: `?ids=id1,id2` or `?a=id1&b=id2`

### Comparison Sections

Each section is collapsible and shows a comparison table with differences highlighted in amber.

| Section | Compared Properties |
|---|---|
| **Settings** | Additional Staff require upgrade, Additional SMS require upgrade, Free package |
| **Bundles** | Staff Seats (with Unlimited detection), SMS (US, Canada, IL), SMS (other) |
| **Quotas** | Client Limit, Booking Credits, Storage, Monthly Invoices, Monthly Estimates, Campaign Recipients, Campaign Credits |
| **Features by Domain** | All feature flags grouped by domain, with smart state detection |

### Feature State Display in Comparison

For checkbox-dropdown features, the comparison shows contextual state labels:

| State | Display |
|---|---|
| Standard feature present | Green check icon |
| Feature absent | Grey empty-circle icon |
| Upsell mode | Pink "Upsell mode" chip |
| Custom state (e.g., "Slim onboarding") | Yellow chip with label |
| Available | Green check icon (no chip) |
| Deny/disabled (inverted) | Orange eye-off icon |

### Additional Controls

| Control | Description |
|---|---|
| Show FFs toggle | Reveals raw feature flag names under each cell |
| Search | Filters all sections by feature name, flag name, or state label |
| Export CSV | Downloads the full comparison as a CSV file |

---

## 10. Feature Catalog (Domains)

The Feature Catalog page (`/features`) displays all feature flags grouped by domain, browsable with:

- **Search** across feature business names, flag names, and descriptions
- **Expandable domain panels** with flag counts
- Each feature shows: business name, flag name (code), and description

---

## 11. Apps Catalog

The Apps Catalog page (`/apps`) displays marketplace apps with pricing, organized by category:

| Category | Apps |
|---|---|
| **Client Management** | app.rove ($7), Facebook Messenger ($10), Lead Forms (free) |
| **Other** | Email Signature ($5), Google Analytics ($10), Zapier (free), Website Builder ($23.95), Website Builder - DIFM ($49.95) |
| **Payments** | QuickBooks ($10) |
| **Marketing** | Pro Campaign Editor ($10) |
| **Communication** | Calls & Texting ($15), Business Calls ($20), Business Texting ($15), AI Receptionist - 75 calls ($75), AI Receptionist - 200 calls ($30) |
| **Scheduling** | SmartSlots ($24.95), Reserve with Google (free) |

Prices shown are USD; EUR, GBP, and CHF pricing is also tracked.

---

## 12. Data Types & Enums Reference

### Feature Value Types

```
'boolean' | 'enum' | 'number'
```

Currently all features use `boolean`. `enum` and `number` are reserved for future use.

### Audit Actions

```
'created' | 'updated' | 'cloned'
```

### Storage Unit Options

```
'MB' | 'GB'
```

### Package Settings (Boolean Toggles)

```typescript
interface PackageSettings {
  disable_staff_slots: boolean
  disable_add_staff_button: boolean
  disable_sms_purchase_button: boolean
}
```

### Package Quotas

```typescript
interface PackageQuotas {
  invoice_monthly_quota: number | null
  campaign_recipients_monthly_quota: number | null
  estimate_monthly_quota: number | null
  clients_credit: number | null
  campaigns_credit: number | null
  booking_credit: number | null
  sms_monthly_quota_us_canada: number | null
  sms_monthly_quota_other: number | null
  storage_quota: number | null
}
```

---

## Appendix: Complete Domain → Feature → Flag Mapping

The full mapping is maintained in `docs/domain-feature-ff-mapping.csv` and synced via `npm run sync:feature-flags`. Below is a summary count:

| Domain | Feature Groups | Total Flags |
|---|---|---|
| Bundles (Apps) | 8 | 8 |
| License | 1 | 1 |
| AI | 4 | 4 |
| Client Management | 8 | 12 |
| Scheduling | 12 | 17 |
| Payments | 10 | 12 |
| Communication | 5 | 9 |
| Marketing | 5 | 8 |
| Business Administration | 11 | 16 |
| Trial / Spam Prevention | 4 | 4 |
| Other | 12 | 16 |
| **Total** | **~80** | **~107** |

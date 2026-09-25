# cidrly for iOS: Product and Engineering Plan

Companion to `01-codebase-review.md`. This document is the plan of record for building a native,
paid iOS and iPadOS application for enterprise network architects and engineers.

Platform assumption: the plan is written against iOS 26 / iPadOS 26, Xcode 26, Swift 6.2, and the
iPhone 17 and M5 iPad Pro generation, which is what the author can verify. iOS 27 shipped this month.
Section 5.4 lists the iOS 27 areas to confirm against the WWDC26 session catalog before the design
freeze, so the app adopts them deliberately rather than by guesswork.

---

## 1. Positioning

**One sentence.** cidrly for iOS is the address-planning workstation that fits in your pocket:
model a network, let the engine size and place every subnet, see the address space, and hand the
result to your switches, your cloud, and your colleagues, all offline, all private, all native.

**Who pays.** Network architects, senior network engineers, and infrastructure consultants at
organizations with more than a few hundred subnets. They already own an iPhone and often an iPad Pro.
They are in wiring closets, data halls, customer sites, and change windows where a laptop is awkward
and a web app has no signal.

**Why they pay.** Three jobs the CLI cannot do and a web app does badly:

1. **Plan on the spot.** Draft, resize, and re-place subnets during a site walk or design review,
   with the engine's guarantees (alignment, no overlaps, VLAN rules) enforced live.
2. **Answer questions instantly.** "What is free in 10.40/16?", "which VLAN is 10.40.12.77 in?",
   "does this /27 fit?" from Siri, Spotlight, a widget, or a two-second glance at the address map.
3. **Ship the artifact.** Vendor config, Terraform, PDF, or a shared plan, straight from the device,
   into Mail, Files, Git, or a colleague's app.

**What makes it feel like part of the OS.** It is a document app, not a dashboard. It uses the
system's split view, inspector, search, share sheet, Files, Shortcuts, Spotlight, widgets, and
keyboard conventions instead of re-inventing them. Every list is a real `List`, every sheet is a real
sheet, every number change animates, every destructive action is undoable, and the whole app works
with no account and no network.

---

## 2. Product principles

1. **The engine is the product.** Every allocation must be provably identical to the CLI for the same
   input (conformance fixtures, section 7.3) and provably correct where the CLI was wrong (review D1–D4).
2. **Native or nothing.** SwiftUI first, UIKit only where SwiftUI has no equivalent. No web views,
   no cross-platform UI toolkits, no custom navigation chrome.
3. **Offline is the default state, not a fallback.** Sync is additive.
4. **Enterprise trust.** No analytics SDKs, no third-party trackers, data stays in the user's iCloud
   or on device, documented privacy manifest, MDM-configurable.
5. **Respect the professional.** Dense information, monospaced addresses, keyboard-first on iPad,
   precise numbers, no gamification, no dark patterns in the paywall.

---

## 3. Feature specification

### 3.1 Launch scope (v1.0)

**Plans and subnets**
- Plan library with iCloud sync, folders, tags, search, recents, pinned plans.
- Plan editor: base network or assigned blocks (IPAM-lite), growth percentage, allocation mode
  (VLSM; FLSM with minimum prefix is in v1.0 because it is cheap and often requested).
- Subnet editor: name, VLAN, expected devices, description, lock, manual address, source block.
  Inline validation with the CLI's VLAN rules and reserved-range checks.
- Live recalculation as you type, with an explicit "Apply" only for changes that would move locked
  subnets.
- Multi-select, bulk edit, duplicate, reorder, undo/redo through the system undo manager.

**Address space map** (the signature view)
- A zoomable, scrubbable visualization of the supernet or each assigned block: allocated subnets as
  proportional segments, free fragments as dashed segments, locked subnets marked.
- Tap a segment to inspect, long-press for the context menu, drag a subnet into a free fragment to
  place it manually, pinch to zoom into a /16 down to /30 granularity.
- Rendered with Swift Charts for the overview and a custom `Canvas` for the detail band.

**Subnet detail** (ipcalc parity)
- Network, mask, wildcard, first/last host, broadcast, usable count, planned vs expected, binary
  representation, gateway, source block.
- Copy any field with one tap; the whole card as text or as a share-sheet image.

**IPAM-lite**
- Assign blocks, view utilization per block, list free fragments, auto-fit with a preview diff
  before applying, early-warning "won't fit" while typing a device count.

**Import**
- CSV, YAML, and the seven vendor formats via `fileImporter`, drag and drop, the Share extension
  (from Mail or Files), and the clipboard.
- Camera import: point the camera at a terminal, a printout, or a whiteboard table; VisionKit
  document recognition extracts the rows, the user confirms in a preview.

**Export**
- YAML, CSV, PDF, Terraform (AWS/Azure/GCP), Cisco IOS/NX-OS, Arista EOS, Junos, FortiOS, Netgear,
  EdgeOS, via `fileExporter`, `ShareLink`, and `Transferable` (drag out of the app on iPad).
- PDF is rendered with `ImageRenderer` from the same SwiftUI views the user sees, so the report looks
  like the app.

**Search and system integration**
- Spotlight indexes every plan, subnet, VLAN, and address.
- App Intents: "Find subnet for 10.40.12.77", "Free space in Campus plan", "Add subnet to plan",
  "Export plan as Cisco IOS". These power Siri, Shortcuts, Spotlight, Action button, and the
  Apple Intelligence integrations.
- Widgets: plan utilization (small/medium), free-space at a glance, and a Lock Screen quick-calc.
- Control Center control: "Subnet calculator" opens the calculator instantly.
- Quick Look preview extension so `.cidrly` files preview in Files, Mail, and Messages.
- Handoff between iPhone, iPad, and Mac.

**Calculator (free tier surface)**
- Standalone IPv4 and IPv6 calculator: CIDR in, everything out, with a supernet/split helper.
  This is the funnel; it must be excellent.

**IPv6**
- v1.0 supports IPv6 in the calculator and in plans (prefix planning with nibble alignment, /64
  per VLAN default, /48 and /56 site blocks). Allocation reuses the same engine over a 128-bit type.
  Vendor exports gain `ipv6 address` lines where the platform supports them.

### 3.2 First updates (v1.1 to v1.3)

- Team sharing (CloudKit `CKShare`): shared plan libraries, per-plan read/write roles, presence.
- Change history: every applied change is a versioned snapshot; visual diff between versions.
- Reserved-address policy: gateways, HSRP/VRRP pairs, DHCP exclusions, management ranges.
- Hierarchy: region -> site -> plan with summarization up the tree (closes issue #46 properly).
- More vendors: Palo Alto PAN-OS, Meraki (CSV), Aruba AOS-CX, MikroTik RouterOS.
- Cloud topology: transit / hub-spoke awareness for the Terraform exports.
- "Where am I": detect the current Wi-Fi network's subnet and highlight the matching plan entry
  (requires the Access Wi-Fi Information entitlement and Location permission; opt-in).

### 3.3 Explicitly out of scope for v1

- Live device polling, SNMP, or SSH. cidrly plans; it does not monitor.
- An account system of its own. Identity is the Apple ID (iCloud) plus optional Sign in with Apple
  only when team features require it.
- Android or web. A Mac build comes for free from the same SwiftUI code (section 5.5).

---

## 4. Native platform integration matrix

Each row is a capability of the current platform and how cidrly uses it so the app reads as a
function of the device rather than a port.

| Platform capability | cidrly use | Tier |
| --- | --- | --- |
| Liquid Glass (iOS 26 design system) | System toolbar, tab bar, sheets, and `glassEffect` on the floating calculator and map legend; no custom chrome | All |
| `NavigationSplitView` + `Inspector` | Plans / subnets / detail on iPad and Mac; collapses correctly on iPhone | All |
| `searchable` with tokens and scopes | Search by name, VLAN, address, block; scopes for plan vs library | All |
| SwiftData + CloudKit | Local store, private iCloud sync, later `CKShare` team libraries | Pro / Team |
| Document types (`UTType`, `Transferable`) | `.cidrly` (JSON, CLI-compatible) as a first-class file: Files, Quick Look, drag and drop, Mail | All |
| App Intents / Shortcuts / Siri / Apple Intelligence | Entity-backed intents for plans, subnets, addresses; interactive snippets for "free space" and "which subnet" | Pro |
| Foundation Models (on-device LLM) | Natural-language plan drafting ("three buildings, 200 users each, guest Wi-Fi"), explain-this-allocation, parse messy pasted config into rows. Runs offline, no data leaves the device | Pro |
| Spotlight (`CSSearchableItem`, `IndexedEntity`) | Every subnet and address is findable from the Home Screen | All |
| WidgetKit (Home, Lock Screen, StandBy) | Utilization, free space, quick calculator | Pro |
| Controls (Control Center, Action button) | Launch calculator, launch "which subnet" | All |
| Live Activities / Dynamic Island | Long imports and auto-fit runs on large plans show progress | Pro |
| VisionKit `DataScannerViewController`, Vision document recognition | Camera import of tables and configs | Pro |
| Swift Charts (incl. 3D where useful) | Address space map, utilization over versions | All |
| `ImageRenderer` | PDF reports from live views | Pro |
| Hardware keyboard (`keyboardShortcut`, menu commands) | CLI keymap parity on iPad and Mac; command palette (`⌘K`) | All |
| Apple Pencil (hover, squeeze) | Hover to preview a fragment on the map; squeeze opens the context palette | All |
| iPadOS 26 windowing and menu bar | Multiple plans in separate windows; full menu bar on iPad and Mac | All |
| Undo manager, `sensoryFeedback`, `contentTransition(.numericText())` | Every edit is undoable, every count animates, allocation success has a haptic | All |
| TipKit | Progressive onboarding instead of a tutorial | All |
| StoreKit 2 (`SubscriptionStoreView`, offer codes, win-back) | Paywall and entitlements without third-party SDKs | n/a |
| Managed App Configuration, Apple Business Manager | MDM-pushed defaults (growth %, base blocks, export policy) and custom-app distribution | Enterprise |
| Privacy manifest, data protection, Keychain, App Attest | Enterprise security review readiness | All |
| Accessibility (Dynamic Type, VoiceOver, Accessibility Reader, Reduce Motion) | Full support; the map has a table alternative | All |

---

## 5. Architecture

### 5.1 Packages

```
cidrly-ios/
  CidrlyCore/          Swift package, no UI imports, Swift 6 strict concurrency
    Sources/CidrlyCore/
      Addressing/      IPv4Address, IPv6Address, Prefix, CIDRRange (unsigned, value types)
      Model/           NetworkPlan, Subnet, AssignedBlock ... (Codable, Sendable, Identifiable)
      Engine/          Sizing, VLSM/FLSM allocation, IPAM free-list, auto-fit, overlap, supernet
      Rules/           VLAN rules, reserved ranges, vendor warnings
      Import/          Parsers (protocol + 9 implementations, auto-detect)
      Export/          Formatters (YAML, CSV, Terraform x3, vendors x7)
      Migration/       Plan file schema v1 -> v2
    Tests/             Swift Testing; conformance fixtures from the TypeScript engine
  CidrlyApp/           iOS/iPadOS/macOS app target (SwiftUI)
    Features/          Library, PlanEditor, AddressMap, SubnetDetail, Calculator, Import, Export, Settings, Paywall
    Persistence/       SwiftData models, CloudKit configuration, document I/O
    Intents/           App Intents, entities, snippets
    DesignSystem/      tokens, typography, components
  CidrlyWidgets/       WidgetKit extension
  CidrlyQuickLook/     Quick Look preview extension
  CidrlyShare/         Share extension (import)
  CidrlyIntents/       App Intents extension (runs without launching the app)
```

The engine is a separate package so it can be published later as the basis of the CLI's successor,
a macOS command-line tool, or a server. Keeping it UI-free is what makes the conformance suite honest.

### 5.2 Core design decisions

- **Addressing type.** One `IPv4Address` (UInt32) and one `IPv6Address` (UInt128, or two UInt64s if
  targeting older toolchains) with `Prefix` and `CIDRRange` value types. All arithmetic is unsigned.
  This single decision eliminates review defects D3 and D4 and the five duplicated parsers.
- **Plan is a value; store is the identity.** `NetworkPlan` is a `struct`. SwiftData holds a
  `PlanRecord` that owns the encoded plan plus indexable columns (name, tags, counts, addresses for
  Spotlight). Every mutation is `plan.apply(.updateSubnet(id:, ...)) -> Result<NetworkPlan, PlanError>`
  and is keyed by id, never by index.
- **Derived data is never persisted.** `supernet` and `spaceReport` are computed on read and cached in
  memory. The file format still writes `supernet` for CLI compatibility.
- **Calculation does not reorder.** The engine returns allocations keyed by subnet id; sort order is a
  view setting stored per plan.
- **Deterministic engine.** No `Date()` or random ids inside the engine. Ids are `UUID`s minted by the
  store; timestamps live on the record. This is what makes fixture tests exact.
- **Concurrency.** Engine functions are pure and `Sendable`. Large plan calculation, import parsing,
  and PDF rendering run on a background actor; the UI observes an `@Observable` `PlanSession`.

### 5.3 Data and sync

- **Local:** SwiftData with `NSFileProtectionCompleteUntilFirstUserAuthentication`.
- **Sync:** SwiftData + CloudKit private database, automatic. Conflict policy: last-writer-wins on
  the record, with the losing version preserved as a history snapshot so nothing is lost.
- **Team (v1.1):** `CKShare` on a `PlanLibrary` root; participants get read or write. Presence and
  per-subnet edit conflicts surface as a merge sheet, never as silent overwrite.
- **Files:** `.cidrly` is JSON identical to the CLI's plan file plus `schemaVersion: 2`. The app reads
  every v1 file (including the `efficiency` legacy field) and writes v2. The CLI is updated to read v2.
- **Enterprise without iCloud:** plans can live entirely in on-device storage or in a managed
  Files provider (SharePoint, Box, Git clients) via the document workflow. No cidrly server is
  required for any tier.

### 5.4 iOS 27 verification list

Before design freeze, check the WWDC26 session catalog and release notes for changes in these areas
and update the matrix in section 4:

1. Liquid Glass API additions and any changed defaults for toolbars, tab bars, and sheets.
2. Foundation Models: model size, context window, structured-output and tool-calling changes.
3. App Intents: new snippet and Spotlight surfaces, Apple Intelligence entity requirements.
4. SwiftData: sharing, history, and CloudKit changes that could simplify section 5.3.
5. iPadOS windowing, menu bar, and pointer changes.
6. StoreKit: new offer types, subscription UI, and App Store Server API changes.
7. Swift language and toolchain (e.g., `UInt128` availability, strict concurrency defaults).

### 5.5 Mac and beyond

The SwiftUI app compiles for macOS as a native Mac app (not Catalyst, not "Designed for iPad") with
the same package. Ship it in the same App Store listing as a universal purchase after the iOS launch.
visionOS is a later experiment (the address map is a natural volumetric object) and is not planned.

---

## 6. Design system

- **Typography.** SF Pro for UI, SF Mono for every address, mask, and prefix. Tabular figures on all
  numeric columns. Dynamic Type across the board, with a compact density toggle on iPad.
- **Color.** System semantic colors, one accent. Allocation states use a fixed, colorblind-safe
  palette: allocated, locked, free, conflict, warning. Dark mode is the primary design surface because
  that is where network engineers live.
- **Layout.** iPhone: tab bar (Plans, Calculator, Search) with the map as a plan sub-view. iPad and
  Mac: three-column split view with a trailing inspector; the map can open in its own window.
- **Motion.** Numeric transitions for counts, matched-geometry zoom from a map segment into its
  detail, spring physics only where the system uses them. Reduce Motion respected.
- **Feedback.** Haptics on successful allocation, on lock/unlock, and on conflict. Never on scroll.
- **Iconography.** SF Symbols only, with variable-color symbols for utilization.
- **Empty states.** `ContentUnavailableView` with one clear action, never a blank screen.
- **Onboarding.** No walkthrough. A sample plan opens on first launch, TipKit surfaces the map, the
  calculator, and the share sheet in context.

---

## 7. Quality and verification

### 7.1 Engine correctness

- Property-based tests: every allocation is aligned, no two allocations overlap, every allocation
  lies within its source block, every supernet contains every subnet, IPv6 nibble alignment holds.
- Round-trip tests: export -> import for CSV, YAML, and every vendor format that carries enough data.
- Golden tests: vendor and Terraform outputs pinned as fixtures and reviewed by a human on change.

### 7.2 App quality

- Swift Testing for logic, XCUITest for the five critical flows (create, calculate, import, export,
  purchase), snapshot tests for the map and the PDF.
- Accessibility audit in every release (Xcode Accessibility Inspector, VoiceOver walkthrough).
- Performance budget: 500-subnet plan recalculates under 50 ms on iPhone 17, map renders at 120 Hz,
  cold launch to library under 400 ms. Measured with XCTest metrics in CI.
- Xcode Cloud or GitHub Actions macOS runners for build, test, and TestFlight distribution.

### 7.3 Conformance with the CLI

The TypeScript repo gains `npm run fixtures`, which serializes engine inputs and outputs for sizing,
allocation, IPAM-lite, overlap, supernet, and each import/export format into `fixtures/`. The Swift
package's test target reads the same files. A fixture that fails in Swift is either a port bug or one
of the documented upstream defects, and the fixture is annotated accordingly. Both projects must pass
the same set before v1.0.

---

## 8. Monetization

App Store rules require all digital unlocks to go through in-app purchase (guideline 3.1.1). No
third-party payment or license keys. StoreKit 2 handles entitlements, receipts, and Family Sharing.

### 8.1 Tiers

| Tier | Price (suggested) | What it unlocks |
| --- | --- | --- |
| Free | $0 | IPv4/IPv6 calculator, one plan up to 16 subnets, JSON and CSV export, Spotlight |
| Pro | $59.99 / year or $7.99 / month, 14-day trial | Unlimited plans and subnets, IPAM-lite, all vendor and Terraform exports, PDF reports, iCloud sync, App Intents and widgets, Foundation Models assistant, camera import |
| Team | $119.99 / seat / year (min 3) | Everything in Pro plus shared libraries, roles, change history, org branding on reports |
| Enterprise | Custom, via Apple Business Manager volume purchase | Team plus MDM configuration, custom-app distribution, priority support, procurement paperwork |

Also offer a one-time **Pro Lifetime** at $179.99. A meaningful share of this audience expenses
tools once and distrusts subscriptions; the option converts them without cannibalizing Team.

### 8.2 Why it feels worth it

The paywall must demonstrate, not describe. The free tier includes the full calculator and a real
plan, so the user has already done work when they hit the limit. The upgrade sheet shows their own
plan's map, their own vendor export preview, and their own PDF, blurred, one tap from being theirs.
That is a `SubscriptionStoreView` with a custom marketing header, not a generic feature list.

### 8.3 Enterprise mechanics

- Distribute through Apple Business Manager with volume purchase of the Enterprise IAP tier or as a
  custom app for organizations that require it.
- Managed App Configuration keys: `defaultGrowthPercentage`, `allowedExportFormats`,
  `defaultAssignedBlocks`, `disableCloudSync`, `disableOnDeviceAssistant`, `reportBranding`.
- A one-page security whitepaper: data flow, what is stored where, no telemetry, privacy manifest
  contents, encryption at rest, App Attest for the (optional) team sync.

### 8.4 Launch offers

- Introductory 30% off the first year for the first 90 days.
- Win-back offers for lapsed Pro subscribers.
- Offer codes for conference talks, the CLI's README, and the Homebrew post-install message, which
  becomes the CLI's bridge to the app.

---

## 9. Roadmap

Six months to a shippable v1.0 with a team of two iOS engineers, a part-time designer, and the
founder as domain owner and reviewer. Weeks overlap; the milestones are the gates.

| Phase | Weeks | Deliverable | Gate |
| --- | --- | --- | --- |
| 0. Foundations | 1–3 | Repo, packages, CI, design tokens, fixture generator in the TS repo, upstream fixes D1–D4 | Fixtures generated; TS tests green |
| 1. Engine parity | 3–8 | `CidrlyCore` with IPv4 sizing, VLSM/FLSM, IPAM-lite, overlap, supernet, all parsers and formatters, IPv6 addressing | 100% fixture pass; property tests green |
| 2. App shell | 6–12 | SwiftData store, library, plan and subnet editors, calculator, detail view, import/export, Liquid Glass navigation, iPad split view, keyboard shortcuts | Internal TestFlight; five critical flows automated |
| 3. Signature and system | 12–18 | Address space map, App Intents, Spotlight, widgets, controls, Quick Look, Share extension, camera import, Foundation Models assistant, PDF | External TestFlight with 25 network engineers |
| 4. Sync and paywall | 16–22 | iCloud sync, StoreKit 2 tiers, paywall, MDM configuration, privacy manifest, security whitepaper | App Review submission |
| 5. Launch | 22–26 | Marketing site, App Store assets, CLI bridge, support docs, launch offers | v1.0 on the App Store |
| 6. Post-launch | 26+ | Team sharing, history and diff, reserved-address policy, hierarchy, more vendors, Mac | v1.1 to v1.3 |

Design happens two to three weeks ahead of each phase; the map is prototyped during phase 1 so its
interaction model is settled before phase 3.

---

## 10. Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Port diverges from the CLI silently | Users get different answers on desktop and phone | Conformance fixtures, both projects gated on them, shared file format |
| Foundation Models quality varies by device | Assistant feels flaky | Assistant is additive and Pro-only; every output goes through the deterministic engine and a confirm sheet; falls back to the form when unavailable |
| CloudKit team sharing complexity | v1.1 slips | Ship v1.0 with private sync only; design the schema for sharing from day one |
| App Review pushback on enterprise tier | Launch delay | Follow 3.1.1 strictly, no external purchase links, submit the enterprise tier as ordinary IAP |
| Small team, large surface | Scope creep | Section 3.3 is enforced; anything not in 3.1 waits |
| iOS 27 API drift from this plan | Rework | Section 5.4 checklist before design freeze; target iOS 26 minimum for the first year |
| License | Commercial use of CC BY-NC-SA code | Single copyright holder relicenses the engine before external contributions |

---

## 11. Decisions needed from the owner

1. Minimum OS: iOS 26 (recommended, one major back) or iOS 27 only.
2. Whether the TypeScript engine stays the engine of record for the CLI or is eventually replaced by
   a Swift command-line tool built from `CidrlyCore`.
3. Pricing confirmation for the tiers in 8.1 and whether Lifetime is offered.
4. Whether to relicense only the engine or the whole repository, and to what license.
5. Team sharing in v1.0 (adds roughly six weeks) or v1.1 as planned.

---

## Appendix A. CLI keymap carried to iPad and Mac

| CLI | App shortcut | Action |
| --- | --- | --- |
| `a` | `⌘N` | New subnet |
| `e` / `Return` | `⌘E` / `Return` | Edit selected |
| `d` | `⌘⌫` | Delete selected (undoable) |
| `c` | `⌘R` | Recalculate |
| `m` | `⌘M` | Modify network address / lock |
| `s` | `⌘S` | Save (explicit snapshot; autosave is always on) |
| `l` / `n` | `⌘O` / `⇧⌘N` | Open plan / new plan |
| `i` / `x` | `⌘I` / `⌘⇧E` | Import / export |
| `v` | `Space` | Quick Look detail |
| `p` | `⌘,` | Settings |
| `Tab` + arrows | click column header, `⌘1…7` | Sort |
| `j` / `k` | `↓` / `↑` | Move selection |
| `⌘K` | command palette (new) |

## Appendix B. Plan file schema v2 (delta from v1)

- `schemaVersion: 2` (required; absent means v1).
- `subnets[].id` becomes a UUID string; v1 `subnet-<ts>-<rand>` ids are preserved on read.
- `addressFamily: "ipv4" | "ipv6"` per plan (default `ipv4`).
- `allocationMode: "vlsm" | "flsm"` and `minimumPrefix` become real, documented fields.
- `supernet` is written for compatibility but is derived; `spaceReport` is no longer written.
- `reservations[]` (v1.1) and `history[]` (v1.1) reserved names.
- `requiredHosts` means `plannedDevices + 2` everywhere; v1 files with the old meaning are migrated.

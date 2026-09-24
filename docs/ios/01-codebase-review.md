# cidrly Codebase Review (for the native iOS port)

Reviewed at commit `13b5a4c` (v0.5.1), September 2026.
Scope: everything under `src/`, the test suite, CI, packaging, and the open issue backlog.
Purpose: decide what the iOS app inherits, what it must fix, and what it must not copy.

## 1. Summary

cidrly is a well-structured TypeScript CLI (about 20,500 lines of source, 1,000 tests) with a clean
separation between a pure domain engine and an Ink terminal UI. The engine is the asset. The UI, file
layer, and process model are terminal-specific and should not be ported.

Health at HEAD:

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `eslint` | 0 errors, 156 warnings |
| `jest` | 998 / 1000 pass. The 2 failures are permission tests that only fail when run as root. |
| Open issues | 16, including IPv6 (#9), FLSM (#53), supernetting (#46), API mode (#23) |
| Copyright | Single author (chuckycastle), CC BY-NC-SA 4.0. Relicensing for a commercial app needs no third-party consent. |

The port should treat the engine as a specification, not as code to transliterate. Four confirmed
correctness defects and several structural weaknesses are listed below. Each one should be fixed in the
Swift core, and ideally also fixed upstream so the CLI and the app stay in agreement.

## 2. Architecture as built

```
src/
  core/            pure domain: models, calculators, validators      <- port
  schemas/         zod runtime validation of the plan JSON            <- port as Codable + validation
  services/        plan mutations, import/export orchestration        <- port (logic), replace (I/O)
  formatters/      YAML, CSV, PDF, Terraform (AWS/Azure/GCP), 7 vendor configs   <- port
  services/import/ CSV, YAML, 7 vendor config parsers                <- port
  infrastructure/  validation constants, path security                <- port constants only
  store/ hooks/    zustand + immer state, React hooks                 <- replace with Observation/SwiftData
  components/      Ink terminal UI (DashboardView is 2,319 lines)     <- replace entirely
  commands/ cli    pastel CLI commands                                <- not applicable
```

Layering is honest: `core/` has no I/O and no UI imports. `NetworkPlanService` is a pure function
library over immutable plans. That is exactly the shape a Swift package wants.

### Domain model (what the app must preserve)

- `NetworkPlan { name, baseIp, subnets[], growthPercentage, supernet?, assignedBlocks?, spaceReport?, createdAt, updatedAt }`
- `Subnet { id, name, vlanId, expectedDevices, description?, subnetInfo?, networkLocked, manualNetworkAddress?, sourceBlockId? }`
- `SubnetInfo { expectedDevices, plannedDevices, requiredHosts, subnetSize, cidrPrefix, usableHosts, networkAddress? }`
- `AssignedBlock` / `AvailableFragment` / `SpaceAllocationReport` for IPAM-lite.

### Algorithms (the real IP the app inherits)

1. Sizing: `planned = ceil(expected × (1 + growth/100))`, host bits = smallest 2^n ≥ planned + 2.
2. Allocation: largest-first VLSM with boundary alignment and gap-aware skipping around locked subnets.
3. IPAM-lite: free-range discovery, optimal CIDR fragmentation of gaps, best-fit allocation into fragments,
   auto-fit bin packing across multiple blocks with utilization warnings.
4. Supernet: smallest power-of-two container, plus two metrics (utilization, range efficiency).
5. Overlap detection with complete/partial classification.
6. VLAN rules: IEEE reserved IDs, VLAN 1 confirmation, per-vendor warning ranges.
7. Import: SVI/VLAN extraction from Cisco IOS, NX-OS, Arista, Junos, FortiOS, Netgear, EdgeOS, plus CSV/YAML
   with format auto-detection.
8. Export: the same seven vendors, three Terraform providers, YAML, CSV with lossless metadata headers, PDF.

## 3. Confirmed defects

Each was reproduced with a script against HEAD. Severity is judged from the point of view of a paying
network engineer who will push generated configs to production gear.

### D1. Vendor exports emit the wrong gateway for any subnet whose last octet is not 0 (High)

`src/formatters/vendors/utils.ts:12` sets `octets[3] = 1` regardless of the network address.

```
calculateGatewayIp('10.0.0.128/25') -> 10.0.0.1   (should be 10.0.0.129)
calculateGatewayIp('10.0.0.4/30')   -> 10.0.0.1   (should be 10.0.0.5)
```

Every vendor formatter and every SVI line uses this. A /25, /26, /27 ... that lands in the upper half
of a /24 gets a gateway that lives in a different subnet. This is the most dangerous bug in the repo
because its output is meant to be pasted into a switch.

Fix: gateway = network address + 1, computed on the 32-bit integer.

### D2. Reported supernet does not always contain the subnets (High)

`calculateSubnetRanges` computes the supernet size from the sum of subnet sizes, then anchors it at
`baseIp` masked to that prefix (`src/core/models/network-plan.ts`, step 7).

```
baseIp 10.0.1.0, two /24s -> subnets 10.0.1.0/24 and 10.0.2.0/24, supernet 10.0.0.0/23
```

10.0.2.0/24 is outside 10.0.0.0/23. The same field feeds Terraform `base_cidr`, the PDF summary, and the
CSV header. In IPAM-lite plans the supernet is computed from `baseIp` even though allocations come from
assigned blocks, so it is meaningless there.

Fix: compute the supernet as the smallest aligned CIDR that covers min(start) .. max(end) of the actual
allocations, and report "no single supernet" when blocks are disjoint.

### D3. IPAM-lite silently breaks for blocks at or above 128.0.0.0 (High)

`src/utils/block-parser.ts:24` converts IPs with signed shifts and no `>>> 0`. Any block in 172.16/12
or 192.168/16 gets a negative `startInt`/`endInt`. The availability calculator compares those against
unsigned subnet ranges, so subnets never match their block.

```
blocks 192.168.0.0/16, 172.16.0.0/12 -> startInt -1062731776, -1408237568
allocate 50 devices -> 192.168.0.0/25 is handed out
space report -> used 0, available 1,114,112, 0 subnets attributed to either block
```

Utilization stays at 0% forever, and subsequent allocations are not fenced off by earlier ones.
The two most common enterprise private ranges are exactly the ones that break.

Fix: one shared, unsigned `IPv4Address` type. The repo currently has five private copies of
`ipToInt` (subnet-calculator, availability-calculator, overlap-detector, block-parser, validation-rules)
with three different behaviors.

### D4. /0 netmask returns 255.255.255.255 (Low)

`calculateNetmask(0)` and `calculateWildcard(0)` use `1 << 32`, which is 1 in JavaScript.
`cidrToSubnetMask` in the vendor utils special-cases 0 correctly, so the two disagree.

### Root-only test failures (Not a product bug)

`tests/unit/export.service.test.ts` and `tests/unit/terraform/terraform-export.service.test.ts`
assert that writing to `/etc/passwd` and `/invalid/path` fails. As root those writes succeed. CI runs
unprivileged so this never shows there. Worth guarding with a `process.getuid() !== 0` skip.

## 4. Structural weaknesses the port must not copy

- **Index-based mutation.** `updateSubnet`, `removeSubnet`, `setManualNetworkAddress`, and
  `setNetworkLocked` take a positional index while the table is sorted and virtualized. The UI carries
  `getSelectedSubnet()` guards to compensate. The iOS core must key every mutation by `Subnet.id`.
- **Two `NetworkPlan` types.** `core/models/network-plan.ts` declares an interface; `schemas/network-plan.schema.ts`
  exports a second `NetworkPlan` inferred from zod. The zod one carries `allocationMode` and
  `minimumSubnetMask` that nothing reads (FLSM is open issue #53). One source of truth is needed.
- **Calculation reorders the user's list.** `calculateSubnetRanges` returns subnets sorted largest-first
  with locked ones appended. Display order should be a view concern, not a side effect of calculating.
- **Quadratic IPAM-lite allocation.** Each unlocked subnet recomputes the full space report
  (`calculateAvailableSpace` inside the map). Fine for 50 subnets, visible at 500. The Swift core should
  maintain the free list incrementally.
- **`requiredHosts` is inconsistent.** Code sets it to `expectedDevices`; shipped example plans store
  `plannedDevices + 2`. Pick one meaning and migrate.
- **Timestamps are `Date` objects on the model.** Every mutation calls `new Date()`, which makes the
  engine impure and makes golden-fixture tests awkward. Move `updatedAt` to the persistence layer.
- **Path security is CLI-specific.** `security-utils.ts` guards against traversal in a home directory.
  On iOS the sandbox, security-scoped bookmarks, and `NSFileProtection` replace all of it.
- **`DashboardView.tsx` at 2,319 lines** owns every dialog, every async I/O call, and the keymap.
  Nothing here is reusable, but the keymap itself (`a e d c m s l i n x v p q`, `j/k`, `Tab` sort) is
  worth carrying to iPad hardware keyboards so CLI users feel at home.

## 5. Quality assets worth carrying over

- 1,000 tests, most of them table-driven over pure functions. These are the seed of a
  cross-language conformance suite: dump inputs and outputs to JSON fixtures, then run the same fixtures
  through the Swift package. That is the cheapest way to prove the port is faithful.
- Per-file coverage thresholds on the calculator, validators, and services.
- Semgrep rules and `npm audit` in CI.
- The plan JSON format with backward-compatible migrations (`efficiency` -> `utilization`,
  defaulted `growthPercentage`, `rangeEfficiency`). The app must read every file the CLI has ever
  written.

## 6. Gaps a professional product will be judged on

These are not bugs; they are the reasons an enterprise architect would still reach for another tool.

1. **No IPv6** (issue #9). Non-negotiable for an enterprise-priced product in 2026.
2. **No FLSM / minimum-prefix policy** (issue #53). Many shops standardize on /24s regardless of size.
3. **No true supernetting or hierarchy** (issue #46). Regions -> sites -> VLANs is how real address
   plans are structured; cidrly has one flat list per plan.
4. **No reserved-address policy.** Gateways, HSRP/VRRP pairs, DHCP exclusions, and management IPs are
   all assumed to be ".1 and nothing else".
5. **No history, diff, or audit trail** (issue #30). Enterprise users need "what changed and when."
6. **No collaboration.** Plans are local JSON files.
7. **Vendor coverage stops at SVIs.** No VRF awareness, no DHCP pools, no ACL object groups, no
   Palo Alto / Meraki / Aruba / MikroTik.
8. **Cloud exports are VPC-level only.** No Transit Gateway / hub-spoke / peering-aware planning,
   which is where cloud address planning actually hurts.

The iOS plan (02) sequences which of these ship at launch and which come after.

## 7. Recommended upstream changes before or during the port

These keep the CLI and app on one engine of record and make the conformance suite possible.

1. Fix D1 to D4 in TypeScript with regression tests.
2. Introduce a single `IPv4` module (unsigned int <-> string, CIDR parse, mask, range, containment)
   and delete the five copies.
3. Key every service mutation by subnet id; keep an index-based shim for the terminal UI.
4. Add `schemaVersion` to the plan file (v1 = today's format) and stop writing `spaceReport`, which is
   derived data.
5. Add `npm run fixtures` that serializes engine inputs and outputs to `fixtures/*.json`.
   The Swift package consumes those in its test target.
6. Relicense the engine directory (or the whole repo) under terms compatible with a commercial app.
   With one copyright holder this is a single decision; do it before external contributions arrive.

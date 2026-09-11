# Safety rules

These rules are enforced in code and the database, not just written down —
each one links to where.

## Absolute rules (never automated)

| Rule | Enforced by |
|---|---|
| Never automate final payment | `payments.status = 'RELEASED'` requires a decided `RELEASE_PAYMENT` approval — DB trigger `enforce_payment_release_gate` in `database/migrations/008_approvals_purchase.sql`; app-level check in `packages/shared/src/approval-gates.ts` |
| Never sign contracts automatically | Purchase orders require a decided `APPROVE_PURCHASE` approval before `APPROVED`/`ISSUED` — DB trigger `enforce_po_approval_gate` |
| Never fabricate customs descriptions | `customs_records.customs_verified` defaults `false` and can only become `true` with a `verified_by` user — DB trigger `enforce_customs_verification` |
| Never label usable parts as scrap/ferraille unless truly scrap | `parts.condition` is set by a human from the inspection/dismantling record, never inferred; AI is never used for this classification (see `packages/ai` task list — no "classify scrap" task exists) |
| Never fabricate VIN, mileage, engine model, supplier info, HS codes, shipping prices, inspection results | Every such field is nullable and the UI/API must render `UNKNOWN` rather than guess — see `packages/shared/src/types.ts` `UNKNOWN` constant, used throughout `compatibility.ts` |
| Final HS classification must support manual verification | `customs_records` always carries `candidate_hs_code` + `confidence` + `source` + `reason`, separate from the verified flag |
| GIR 2(a) risk must be surfaced, never hidden | `packages/shared/src/customs.ts` `checkCompleteVehicleRisk` returns the exact message `CUSTOMS REVIEW REQUIRED — POSSIBLE GIR 2(a) CLASSIFICATION` whenever component coverage crosses the threshold |

## The four hard approval gates

`APPROVE_SUPPLIER`, `APPROVE_INSPECTION`, `APPROVE_PURCHASE`, `RELEASE_PAYMENT`.

- Who may decide each gate: `packages/shared/src/approval-gates.ts` `canDecideGate` (also unit-tested in `tests/unit/approval-gates.test.ts`).
- No n8n workflow decides a gate — WF-013 only **creates** an approval request; deciding it is only possible through the dashboard's authenticated `/api/approvals/[id]/decide` route, which re-checks the same role table server-side.
- Every decision writes an `audit_logs` row (`packages/database/src/repositories/approvals.ts`).

## Critical audit events

Per the "Never automate final payment" family of rules, these events are
always written to `audit_logs` with an action name and reason:
supplier approval, inspection approval, purchase approval, payment release,
bank data change (`packages/database/src/repositories/suppliers.ts`
`addSupplierBankAccount`), customs override.

## Bank account changes

`packages/shared/src/bank-account-guard.ts` `evaluateBankAccountChange`
blocks `RELEASE_PAYMENT` whenever a supplier's bank account changed and
either (a) the new account isn't verified yet, or (b) there's a
payment already in flight — even if the new account is verified, that
combination requires explicit owner re-approval.

## Fraud freeze

`packages/shared/src/fraud-detection.ts` `detectFraud` returns
`freezeRequired: true` only for a `CRITICAL` rule (duplicate VIN, unexpected
bank account change). The opportunity's `FROZEN` status is a real state in
the state machine (`packages/shared/src/state-machine.ts`) that only resumes
back to the exact status it was frozen from — never forward.

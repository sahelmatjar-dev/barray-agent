#!/usr/bin/env node
/**
 * Generates n8n/workflows/WF-*.json from the spec table below.
 *
 * Every generated workflow follows the same skeleton so the 27 files are
 * structurally consistent and demonstrably valid n8n import format:
 *   Trigger -> Check Idempotency (Postgres) -> IF already run -> Stop (NoOp)
 *                                            -> Main Logic (Code, documents
 *                                               the deterministic rule / API
 *                                               call this workflow performs)
 *                                            -> Persist Result (Postgres)
 *                                            -> Record Success (Postgres)
 * `settings.errorWorkflow` points at the placeholder id "WF-027" — after
 * importing WF-027-error-handler.json into your n8n instance, edit each
 * workflow's Settings > Error Workflow to select it by its real n8n ID
 * (n8n does not support referencing workflows by name in an import file).
 * No credentials are embedded anywhere; nodes reference named n8n
 * credentials (see n8n/credentials-example/README.md) that you create once
 * in the n8n UI after import.
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "n8n", "workflows");

const PG_CREDENTIAL = { id: "PLACEHOLDER_POSTGRES_CRED", name: "Barray Postgres" };
const GMAIL_CREDENTIAL = { id: "PLACEHOLDER_GMAIL_CRED", name: "Barray Gmail" };
const DRIVE_CREDENTIAL = { id: "PLACEHOLDER_DRIVE_CRED", name: "Barray Google Drive" };
const TELEGRAM_CREDENTIAL = { id: "PLACEHOLDER_TELEGRAM_CRED", name: "Barray Telegram" };
const HTTP_CREDENTIAL = { id: "PLACEHOLDER_DASHBOARD_API_CRED", name: "Barray Dashboard API" };

let yPos = 300;

function node(overrides) {
  const n = {
    id: overrides.id,
    name: overrides.name,
    type: overrides.type,
    typeVersion: overrides.typeVersion ?? 1,
    position: overrides.position,
    parameters: overrides.parameters ?? {},
  };
  if (overrides.credentials) n.credentials = overrides.credentials;
  if (overrides.continueOnFail) n.continueOnFail = true;
  if (overrides.notes) n.notes = overrides.notes;
  return n;
}

function triggerNode(spec) {
  if (spec.trigger.type === "schedule") {
    return node({
      id: "trigger",
      name: "Schedule Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1.2,
      position: [0, yPos],
      parameters: { rule: { interval: [{ field: "cronExpression", expression: spec.trigger.cron }] } },
      notes: spec.trigger.notes,
    });
  }
  if (spec.trigger.type === "webhook") {
    return node({
      id: "trigger",
      name: "Webhook Trigger",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [0, yPos],
      parameters: { path: spec.trigger.path, httpMethod: spec.trigger.method || "POST", responseMode: "onReceived" },
      notes: spec.trigger.notes,
    });
  }
  if (spec.trigger.type === "error") {
    return node({
      id: "trigger",
      name: "Error Trigger",
      type: "n8n-nodes-base.errorTrigger",
      typeVersion: 1,
      position: [0, yPos],
    });
  }
  return node({
    id: "trigger",
    name: "Manual Trigger",
    type: "n8n-nodes-base.manualTrigger",
    typeVersion: 1,
    position: [0, yPos],
    notes: spec.trigger.notes,
  });
}

function buildWorkflow(spec) {
  const nodes = [];
  const connections = {};

  const trig = triggerNode(spec);
  nodes.push(trig);

  if (spec.trigger.type === "error") {
    // WF-027 itself: log the failed execution and alert the owner.
    const logFailure = node({
      id: "log_failure",
      name: "Log Failed Execution",
      type: "n8n-nodes-base.postgres",
      typeVersion: 2.5,
      position: [280, yPos],
      parameters: {
        operation: "executeQuery",
        query:
          "UPDATE workflow_runs SET status = 'FAILED', error = $1, finished_at = now() " +
          "WHERE n8n_execution_id = $2",
        options: {},
        queryReplacement: "={{ [$json.execution.error?.message ?? 'unknown error', $json.execution.id] }}",
      },
      credentials: { postgres: PG_CREDENTIAL },
    });
    const alertOwner = node({
      id: "alert_owner",
      name: "Alert Owner (Telegram)",
      type: "n8n-nodes-base.telegram",
      typeVersion: 1.2,
      position: [560, yPos],
      parameters: {
        chatId: "={{ $env.TELEGRAM_OWNER_CHAT_ID }}",
        text: "=⚠️ n8n workflow failed: {{ $json.workflow.name }} — {{ $json.execution.error?.message }}",
        additionalFields: {},
      },
      credentials: { telegramApi: TELEGRAM_CREDENTIAL },
    });
    nodes.push(logFailure, alertOwner);
    connections["Error Trigger"] = { main: [[{ node: "Log Failed Execution", type: "main", index: 0 }]] };
    connections["Log Failed Execution"] = { main: [[{ node: "Alert Owner (Telegram)", type: "main", index: 0 }]] };
    return { nodes, connections };
  }

  const checkIdem = node({
    id: "check_idempotency",
    name: "Check Idempotency",
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    position: [280, yPos],
    parameters: {
      operation: "executeQuery",
      query:
        `SELECT id FROM workflow_runs WHERE workflow_code = '${spec.code}' AND idempotency_key = $1 AND status = 'SUCCESS'`,
      queryReplacement: `={{ [${spec.idempotencyExpression}] }}`,
    },
    credentials: { postgres: PG_CREDENTIAL },
    notes: "Idempotency: skips if this workflow already succeeded for this key (see workflow_runs unique index).",
  });

  const ifAlreadyRun = node({
    id: "if_already_run",
    name: "IF Already Run",
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [560, yPos],
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
        conditions: [{ leftValue: "={{ $json.id }}", rightValue: "", operator: { type: "string", operation: "exists" } }],
        combinator: "and",
      },
    },
  });

  const stopNoOp = node({
    id: "stop_already_run",
    name: "Stop (Already Processed)",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [840, yPos - 120],
  });

  const startRun = node({
    id: "start_run",
    name: "Start Workflow Run",
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    position: [840, yPos + 120],
    parameters: {
      operation: "executeQuery",
      query:
        `INSERT INTO workflow_runs (workflow_code, idempotency_key, entity, status) ` +
        `VALUES ('${spec.code}', $1, '${spec.entity}', 'RUNNING') RETURNING id`,
      queryReplacement: `={{ [${spec.idempotencyExpression}] }}`,
    },
    credentials: { postgres: PG_CREDENTIAL },
  });

  const mainLogic = node({
    id: "main_logic",
    name: spec.mainNodeName || "Main Logic",
    type: spec.mainNodeType || "n8n-nodes-base.code",
    typeVersion: spec.mainNodeType ? spec.mainNodeTypeVersion ?? 1 : 2,
    position: [1120, yPos + 120],
    parameters: spec.mainNodeParameters ?? {
      jsCode: spec.mainLogicComment,
    },
    credentials: spec.mainNodeCredentials,
    continueOnFail: true,
    notes: spec.mainLogicNote,
  });

  const persistResult = node({
    id: "persist_result",
    name: "Persist Result",
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    position: [1400, yPos + 120],
    parameters: {
      operation: "executeQuery",
      query: spec.persistQuery,
      queryReplacement: spec.persistQueryReplacement ?? "={{ [] }}",
    },
    credentials: { postgres: PG_CREDENTIAL },
    continueOnFail: true,
  });

  const finishRun = node({
    id: "finish_run",
    name: "Record Success",
    type: "n8n-nodes-base.postgres",
    typeVersion: 2.5,
    position: [1680, yPos + 120],
    parameters: {
      operation: "executeQuery",
      query:
        `UPDATE workflow_runs SET status = 'SUCCESS', finished_at = now() ` +
        `WHERE workflow_code = '${spec.code}' AND idempotency_key = $1`,
      queryReplacement: `={{ [${spec.idempotencyExpression}] }}`,
    },
    credentials: { postgres: PG_CREDENTIAL },
  });

  nodes.push(checkIdem, ifAlreadyRun, stopNoOp, startRun, mainLogic, persistResult, finishRun);

  connections[trig.name] = { main: [[{ node: "Check Idempotency", type: "main", index: 0 }]] };
  connections["Check Idempotency"] = { main: [[{ node: "IF Already Run", type: "main", index: 0 }]] };
  connections["IF Already Run"] = {
    main: [
      [{ node: "Stop (Already Processed)", type: "main", index: 0 }],
      [{ node: "Start Workflow Run", type: "main", index: 0 }],
    ],
  };
  connections["Start Workflow Run"] = { main: [[{ node: mainLogic.name, type: "main", index: 0 }]] };
  connections[mainLogic.name] = { main: [[{ node: "Persist Result", type: "main", index: 0 }]] };
  connections["Persist Result"] = { main: [[{ node: "Record Success", type: "main", index: 0 }]] };

  return { nodes, connections };
}

const SPECS = require("./n8n-workflow-specs");

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const spec of SPECS) {
  if (spec.persistQuery) spec.persistQuery = spec.persistQuery.replace("__CODE__", spec.code);
  const { nodes, connections } = buildWorkflow(spec);
  const workflow = {
    name: spec.name,
    nodes,
    connections,
    active: false,
    settings: {
      executionOrder: "v1",
      errorWorkflow: "WF-027-error-handler",
      saveManualExecutions: true,
      saveExecutionProgress: true,
    },
    meta: {
      barrayWorkflowCode: spec.code,
      description: spec.description,
      requiredCredentials: spec.requiredCredentials ?? [],
    },
  };
  const filePath = path.join(OUT_DIR, `${spec.code}-${spec.slug}.json`);
  fs.writeFileSync(filePath, JSON.stringify(workflow, null, 2) + "\n");
  console.log(`Wrote ${filePath}`);
}

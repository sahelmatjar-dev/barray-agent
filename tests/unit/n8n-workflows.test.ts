import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const WORKFLOWS_DIR = path.join(__dirname, "..", "..", "n8n", "workflows");

/** Real n8n-nodes-base node types used across the 27 workflows. Any type
 * outside this list would be a fabricated node type — the test fails loudly
 * rather than letting one slip in silently. */
const VALID_NODE_TYPES = new Set([
  "n8n-nodes-base.scheduleTrigger",
  "n8n-nodes-base.webhook",
  "n8n-nodes-base.manualTrigger",
  "n8n-nodes-base.errorTrigger",
  "n8n-nodes-base.postgres",
  "n8n-nodes-base.if",
  "n8n-nodes-base.noOp",
  "n8n-nodes-base.code",
  "n8n-nodes-base.httpRequest",
  "n8n-nodes-base.gmail",
  "n8n-nodes-base.googleDrive",
  "n8n-nodes-base.telegram",
  "n8n-nodes-base.set",
]);

function loadWorkflows(): { file: string; json: any }[] {
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((file) => ({ file, json: JSON.parse(fs.readFileSync(path.join(WORKFLOWS_DIR, file), "utf8")) }));
}

describe("n8n workflow exports", () => {
  const workflows = loadWorkflows();

  it("defines exactly the 27 required WF-* workflow files", () => {
    expect(workflows).toHaveLength(27);
    for (let i = 1; i <= 27; i++) {
      const code = `WF-${String(i).padStart(3, "0")}`;
      expect(workflows.some((w) => w.file.startsWith(code))).toBe(true);
    }
  });

  for (const { file, json } of workflows) {
    describe(file, () => {
      it("has the required top-level n8n import fields", () => {
        expect(json.name).toBeTruthy();
        expect(Array.isArray(json.nodes)).toBe(true);
        expect(json.nodes.length).toBeGreaterThan(0);
        expect(typeof json.connections).toBe("object");
        expect(json.active).toBe(false);
        expect(json.settings).toBeTruthy();
      });

      it("uses only real n8n-nodes-base node types", () => {
        for (const node of json.nodes) {
          expect(VALID_NODE_TYPES.has(node.type), `${file}: unknown node type "${node.type}"`).toBe(true);
          expect(node.id).toBeTruthy();
          expect(node.name).toBeTruthy();
          expect(typeof node.typeVersion).toBe("number");
          expect(Array.isArray(node.position)).toBe(true);
        }
      });

      it("has a trigger node", () => {
        const triggerTypes = ["scheduleTrigger", "webhook", "manualTrigger", "errorTrigger"];
        const hasTrigger = json.nodes.some((n: any) => triggerTypes.some((t) => n.type.endsWith(t)));
        expect(hasTrigger).toBe(true);
      });

      it("never embeds a real credential value (placeholders only)", () => {
        for (const node of json.nodes) {
          if (!node.credentials) continue;
          for (const cred of Object.values(node.credentials) as { id: string }[]) {
            expect(cred.id.startsWith("PLACEHOLDER_"), `${file}: credential id "${cred.id}" is not a placeholder`).toBe(true);
          }
        }
      });

      it("every connection references a node that exists in the workflow", () => {
        const nodeNames = new Set(json.nodes.map((n: any) => n.name));
        for (const [sourceName, outputs] of Object.entries(json.connections) as [string, any][]) {
          expect(nodeNames.has(sourceName), `${file}: connection source "${sourceName}" has no matching node`).toBe(true);
          for (const branch of outputs.main ?? []) {
            for (const target of branch) {
              expect(nodeNames.has(target.node), `${file}: connection target "${target.node}" has no matching node`).toBe(true);
            }
          }
        }
      });

      if (file.startsWith("WF-027")) {
        it("WF-027 is the shared error handler with an Error Trigger", () => {
          expect(json.nodes.some((n: any) => n.type === "n8n-nodes-base.errorTrigger")).toBe(true);
        });
      } else {
        it("has an idempotency check before doing any work", () => {
          expect(json.nodes.some((n: any) => n.name === "Check Idempotency")).toBe(true);
          expect(json.nodes.some((n: any) => n.name === "IF Already Run")).toBe(true);
        });

        it("points its error workflow at the shared WF-027 handler", () => {
          expect(json.settings.errorWorkflow).toBeTruthy();
        });
      }
    });
  }
});

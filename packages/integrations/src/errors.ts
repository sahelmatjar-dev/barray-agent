export class IntegrationNotConfiguredError extends Error {
  constructor(integration: string, requiredEnvVars: string[]) {
    super(
      `${integration} is not configured. Set the following environment variable(s): ${requiredEnvVars.join(", ")}. ` +
        `See README.md "Credential setup" and n8n/credentials-example/.`,
    );
    this.name = "IntegrationNotConfiguredError";
  }
}

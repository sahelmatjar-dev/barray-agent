import { getGoogleAccessToken, GoogleOAuthConfig } from "../google/oauth";

export interface SendEmailInput {
  to: string;
  subject: string;
  bodyHtml: string;
  threadId?: string;
  inReplyToMessageId?: string;
}

function buildRawMessage(input: SendEmailInput): string {
  const headers = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/html; charset=utf-8",
    input.inReplyToMessageId ? `In-Reply-To: ${input.inReplyToMessageId}` : null,
    input.inReplyToMessageId ? `References: ${input.inReplyToMessageId}` : null,
  ].filter(Boolean);
  const message = `${headers.join("\r\n")}\r\n\r\n${input.bodyHtml}`;
  return Buffer.from(message).toString("base64url");
}

/** Thin wrapper over the Gmail REST API. Threads messages by opportunity via threadId. */
export class GmailClient {
  constructor(private oauthConfig: GoogleOAuthConfig) {}

  async sendEmail(input: SendEmailInput): Promise<{ messageId: string; threadId: string }> {
    const accessToken = await getGoogleAccessToken(this.oauthConfig);
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw: buildRawMessage(input), threadId: input.threadId }),
    });
    if (!response.ok) {
      throw new Error(`Gmail send failed: ${response.status} ${await response.text()}`);
    }
    const data = (await response.json()) as { id: string; threadId: string };
    return { messageId: data.id, threadId: data.threadId };
  }

  async listThreadMessages(threadId: string): Promise<unknown> {
    const accessToken = await getGoogleAccessToken(this.oauthConfig);
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Gmail thread fetch failed: ${response.status} ${await response.text()}`);
    }
    return response.json();
  }
}

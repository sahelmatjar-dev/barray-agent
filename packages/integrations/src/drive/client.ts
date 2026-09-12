import { getGoogleAccessToken, GoogleOAuthConfig } from "../google/oauth";

/** Thin wrapper over the Google Drive REST API. Builds/reuses the
 * EL BARRAY RA / China Sourcing / YEAR / DONOR_ID / NN Category hierarchy
 * (see folder-hierarchy.ts) rather than dumping files flat. */
export class DriveClient {
  constructor(private oauthConfig: GoogleOAuthConfig) {}

  private async accessToken(): Promise<string> {
    return getGoogleAccessToken(this.oauthConfig);
  }

  async findFolder(name: string, parentId: string | null): Promise<string | null> {
    const accessToken = await this.accessToken();
    const parentClause = parentId ? ` and '${parentId}' in parents` : "";
    const q = encodeURIComponent(
      `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`,
    );
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(`Drive folder search failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as { files: { id: string }[] };
    return data.files[0]?.id ?? null;
  }

  async createFolder(name: string, parentId: string | null): Promise<string> {
    const accessToken = await this.accessToken();
    const response = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: parentId ? [parentId] : undefined,
      }),
    });
    if (!response.ok) throw new Error(`Drive folder create failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as { id: string };
    return data.id;
  }

  /** Idempotent: walks the path, creating any missing segment. */
  async ensureFolderPath(pathSegments: string[]): Promise<string> {
    let parentId: string | null = null;
    for (const segment of pathSegments) {
      const existing = await this.findFolder(segment, parentId);
      parentId = existing ?? (await this.createFolder(segment, parentId));
    }
    if (!parentId) throw new Error("ensureFolderPath requires at least one path segment");
    return parentId;
  }

  async uploadFile(folderId: string, fileName: string, mimeType: string, content: Buffer): Promise<string> {
    const accessToken = await this.accessToken();
    const boundary = "barray-drive-upload-boundary";
    const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${content.toString("base64")}\r\n` +
      `--${boundary}--`;

    const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    });
    if (!response.ok) throw new Error(`Drive upload failed: ${response.status} ${await response.text()}`);
    const data = (await response.json()) as { id: string };
    return data.id;
  }
}

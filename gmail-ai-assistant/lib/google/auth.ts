import { Credentials, OAuth2Client } from "google-auth-library";
import { getGoogleOAuthConfig } from "./config";

// Scopes needed for Gmail, Calendar, and Drive
export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
];

export function createOAuth2Client() {
  const config = getGoogleOAuthConfig();
  return new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export function getAuthUrl(state?: string) {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES.join(' '), // Explicitly join scopes with space
    state,
    prompt: "consent", // Force consent screen to get refresh token
    include_granted_scopes: true, // Include previously granted scopes
  });
}

export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export function createAuthenticatedClient(tokens: Credentials) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials(tokens);
  return oauth2Client;
}

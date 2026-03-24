const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = "openid email profile";
const VERIFIER_KEY = "eventboard.pkce.verifier";

export type GoogleTokens = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
};

export type GoogleProfile = {
  name: string;
  email: string;
  picture?: string;
};

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(length: number) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (value) => charset[value % charset.length]).join("");
}

async function sha256(plain: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest("SHA-256", data);
}

export async function buildGoogleAuthUrl() {
  const verifier = randomString(64);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = base64UrlEncode(await sha256(verifier));

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string;
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "consent");

  return url.toString();
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) {
    throw new Error("Missing PKCE verifier");
  }
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET as string | undefined;
  const redirectUri = import.meta.env.VITE_GOOGLE_REDIRECT_URI as string;

  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
  if (clientSecret) {
    body.set("client_secret", clientSecret);
  }

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    let errorMessage = "Token exchange failed";
    try {
      const payload = (await response.json()) as { error?: string; error_description?: string };
      if (payload?.error_description) {
        errorMessage = payload.error_description;
      } else if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore JSON parse errors and keep generic message.
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<GoogleTokens>;
}

export async function fetchGoogleProfile(accessToken: string): Promise<GoogleProfile> {
  const response = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json() as Promise<GoogleProfile>;
}

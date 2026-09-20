/**
 * Server-only Upload-Post REST helpers.
 * The API key never leaves the server; callers are authenticated server fns.
 */

const API_BASE = "https://api.upload-post.com/api";

export function uploadPostKey(): string | null {
  return process.env["UPLOAD_POST_API_KEY"] || null;
}

function requireKey(): string {
  const key = uploadPostKey();
  if (!key) throw new Error("Posting service is not set up yet. Add the Upload-Post API key in Settings.");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Apikey ${requireKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    console.error(`[upload-post] ${path} failed [${res.status}]: ${text}`);
    throw new Error(`Upload-Post request failed [${res.status}]: ${text.slice(0, 300)}`);
  }
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error(`Upload-Post returned invalid JSON: ${text.slice(0, 200)}`);
  }
}

export type SocialAccountInfo = {
  username?: string;
  handle?: string;
  display_name?: string;
  social_images?: string;
  reauth_required?: boolean;
};

export type UploadPostProfile = {
  username: string;
  created_at?: string;
  social_accounts?: Record<string, SocialAccountInfo | string | null>;
};

/** Every Upload-Post profile owned by this workspace. */
export async function listProfiles(): Promise<UploadPostProfile[]> {
  const data = await call<{ profiles?: UploadPostProfile[] }>("/uploadposts/users", { method: "GET" });
  return data.profiles ?? [];
}

export async function createProfile(username: string): Promise<void> {
  await call("/uploadposts/users", { method: "POST", body: JSON.stringify({ username }) });
}

export async function deleteProfile(username: string): Promise<void> {
  await call("/uploadposts/users", { method: "DELETE", body: JSON.stringify({ username }) });
}

/** Single-use white-label connect URL for one profile, TikTok only. */
export async function connectUrlForProfile(username: string, redirectUrl: string): Promise<string> {
  const data = await call<{ access_url?: string }>("/uploadposts/users/generate-jwt", {
    method: "POST",
    body: JSON.stringify({
      username,
      redirect_url: redirectUrl,
      platforms: ["tiktok"],
      show_calendar: false,
      connect_title: "Connect your TikTok account",
      connect_description: "Creative Factory will post your approved videos to this account.",
    }),
  });
  if (!data.access_url) throw new Error("Upload-Post did not return a connect link.");
  return data.access_url;
}

/** Profile names are namespaced per app user so one workspace key serves everyone. */
export function profilePrefix(userId: string) {
  return `cf-${userId.replace(/-/g, "")}-`;
}

export function newProfileName(userId: string) {
  return `${profilePrefix(userId)}${Date.now().toString(36)}`;
}

export function tiktokAccount(profile: UploadPostProfile): SocialAccountInfo | null {
  const raw = profile.social_accounts?.["tiktok"];
  if (!raw || typeof raw === "string") return null;
  if (!raw.username) return null;
  return raw;
}

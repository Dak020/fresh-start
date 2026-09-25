import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/tiktok/callback")({
  head: () => ({
    meta: [
      { title: "Finishing TikTok connection — Creative Factory" },
      {
        name: "description",
        content: "Completing the TikTok account connection for Creative Factory.",
      },
      { property: "og:title", content: "Finishing TikTok connection — Creative Factory" },
      { property: "og:description", content: "Completing the TikTok account connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TikTokCallback,
});

/**
 * TikTok redirects the popup here with `code`/`state` (or `error`) in the
 * query string. This page does no token exchange itself — it just relays
 * what TikTok sent back to the opener tab via postMessage, since the opener
 * is the one holding the original `state` value to check against and the
 * signed-in session to complete the connect with.
 */
function TikTokCallback() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");
    const errorDescription = params.get("error_description");

    if (!window.opener) {
      setMessage("This window wasn't opened from Creative Factory. You can close it.");
      return;
    }

    if (error) {
      window.opener.postMessage(
        { type: "tiktokConnectResult", ok: false, error: errorDescription || error },
        window.location.origin,
      );
      setMessage("TikTok sign-in was cancelled. You can close this window.");
      window.close();
      return;
    }

    if (!code || !state) {
      window.opener.postMessage(
        {
          type: "tiktokConnectResult",
          ok: false,
          error: "TikTok's response was missing required data.",
        },
        window.location.origin,
      );
      setMessage("Something went wrong. You can close this window.");
      window.close();
      return;
    }

    window.opener.postMessage(
      { type: "tiktokConnectResult", ok: true, code, state },
      window.location.origin,
    );
    setMessage("Connected. You can close this window.");
    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/upload-post/return")({
  head: () => ({
    meta: [
      { title: "Finishing TikTok connection — Creative Factory" },
      { name: "description", content: "Completing the TikTok account connection for Creative Factory." },
      { property: "og:title", content: "Finishing TikTok connection — Creative Factory" },
      { property: "og:description", content: "Completing the TikTok account connection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: UploadPostReturn,
});

function UploadPostReturn() {
  const [message, setMessage] = useState("Finishing connection…");

  useEffect(() => {
    window.opener?.postMessage({ type: "uploadPostConnectComplete" }, window.location.origin);
    setMessage("Connected. You can close this window.");
    window.close();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

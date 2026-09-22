import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { TikTokAccountsSettings } from "@/components/TikTokAccountsSettings";

export const Route = createFileRoute("/_authenticated/accounts")({
  head: () => ({
    meta: [
      { title: "Accounts — Creative Factory" },
      {
        name: "description",
        content: "Connect and manage the TikTok accounts your approved videos post to.",
      },
      { property: "og:title", content: "Accounts — Creative Factory" },
      {
        property: "og:description",
        content: "Connect and manage the TikTok accounts your approved videos post to.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounts"
        description="The TikTok accounts your approved videos are posted to."
      />
      <div className="grid gap-6">
        <TikTokAccountsSettings />
      </div>
    </div>
  );
}

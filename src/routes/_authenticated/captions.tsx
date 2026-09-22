import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/ui-kit";
import { CaptionLibrarySettings } from "@/components/CaptionLibrarySettings";

export const Route = createFileRoute("/_authenticated/captions")({
  head: () => ({
    meta: [
      { title: "Caption Library — Creative Factory" },
      {
        name: "description",
        content: "Reusable caption templates, hashtag packs and CTAs for your TikTok posts.",
      },
      { property: "og:title", content: "Caption Library — Creative Factory" },
      {
        property: "og:description",
        content: "Reusable caption templates, hashtag packs and CTAs for your TikTok posts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaptionsPage,
});

function CaptionsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Caption Library"
        description="Save captions once and reuse them when scheduling posts."
      />
      <div className="grid gap-6">
        <CaptionLibrarySettings />
      </div>
    </div>
  );
}

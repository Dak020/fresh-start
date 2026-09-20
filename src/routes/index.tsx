import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "New project" },
      { name: "description", content: "A blank project, ready to build." },
      { property: "og:title", content: "New project" },
      { property: "og:description", content: "A blank project, ready to build." },
    ],
  }),
  component: Home,
});

function Home() {
  return <main className="min-h-screen bg-background" />;
}

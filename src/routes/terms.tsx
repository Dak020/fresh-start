import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Creative Factory" },
      {
        name: "description",
        content:
          "Terms of Service for Creative Factory, a private tool for generating, scheduling and publishing short-form video content.",
      },
      { property: "og:title", content: "Terms of Service — Creative Factory" },
      {
        property: "og:description",
        content: "The terms that govern use of the Creative Factory video production and scheduling tool.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 25 September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-medium text-foreground">1. The service</h2>
          <p>
            Creative Factory is a private content production tool. It lets an account holder generate hook
            copy, render vertical videos, store captions and schedule those videos for publication to social
            accounts they own and have connected themselves.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">2. Accounts</h2>
          <p>
            You are responsible for keeping your login credentials secure and for all activity carried out
            under your account. You must be permitted to act on behalf of any social account you connect.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">3. Acceptable use</h2>
          <p>
            You agree not to use Creative Factory to publish unlawful, misleading, infringing or abusive
            content, and to comply with the terms and community guidelines of every platform you publish to,
            including TikTok, YouTube and Instagram.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">4. Your content</h2>
          <p>
            You keep ownership of the media, captions and videos you upload or create. You grant Creative
            Factory only the permissions needed to store, process, render and publish that content on your
            instruction.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">5. Connected platforms</h2>
          <p>
            When you connect a social account, you authorise Creative Factory to upload and publish content to
            that account on your behalf. You may revoke this at any time from the platform's own settings or by
            removing the account inside the app.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">6. Availability and liability</h2>
          <p>
            The service is provided "as is", without warranty. We are not liable for failed or delayed posts,
            content removed by a platform, or any indirect loss arising from use of the service.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">7. Changes and termination</h2>
          <p>
            We may update these terms or discontinue features. Continued use after a change means you accept
            the updated terms. You can stop using the service and delete your data at any time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">8. Contact</h2>
          <p>Questions about these terms can be sent to the operator of this Creative Factory instance.</p>
        </section>
      </div>
    </main>
  );
}

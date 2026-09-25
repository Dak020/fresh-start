import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Creative Factory" },
      {
        name: "description",
        content:
          "How Creative Factory collects, stores and uses account data, media and connected social account information.",
      },
      { property: "og:title", content: "Privacy Policy — Creative Factory" },
      {
        property: "og:description",
        content: "Details on data storage, connected social accounts, retention and deletion in Creative Factory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: 25 September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
        <section>
          <h2 className="text-base font-medium text-foreground">1. What we collect</h2>
          <p>
            We collect the email address and password hash used to sign in, the media files and captions you
            upload or generate, rendered video output, scheduling details, and basic performance figures you
            choose to record.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">2. Connected social accounts</h2>
          <p>
            When you connect a social account such as TikTok, we store the account identifier, display name and
            the access tokens required to publish on your behalf. Tokens are held server-side only, are never
            exposed to the browser, and are used solely to upload the content you schedule.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">3. How we use your data</h2>
          <p>
            Your data is used only to operate the service: authenticating you, rendering videos, storing your
            libraries, and publishing scheduled posts. We do not sell your data or use it for advertising.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">4. Third parties</h2>
          <p>
            We rely on hosting, database, storage and AI text-generation providers to run the service, and on
            the social platforms you connect in order to publish. Data is shared with them only to the extent
            needed to perform those functions.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">5. Retention and deletion</h2>
          <p>
            Data is kept for as long as your account is active. You can delete media, captions, renders and
            connected accounts from inside the app at any time; removing a connected account deletes its stored
            tokens immediately.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">6. Security</h2>
          <p>
            Access is protected by authentication and row-level access rules so each account can only reach its
            own records. Traffic is encrypted in transit.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">7. Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data by contacting the
            operator of this Creative Factory instance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-medium text-foreground">8. Contact</h2>
          <p>Privacy questions can be sent to the operator of this Creative Factory instance.</p>
        </section>
      </div>
    </main>
  );
}

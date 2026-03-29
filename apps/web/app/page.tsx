import Link from "next/link";

const pillars = [
  {
    title: "Reliable Inputs",
    description:
      "Riot match data is ingested on the backend, stored raw, and normalized before any reporting logic runs."
  },
  {
    title: "Deterministic Analytics",
    description:
      "Core calculations live outside the API layer so product behavior stays auditable, testable, and stable."
  },
  {
    title: "Structured AI Commentary",
    description:
      "OpenAI receives curated features instead of raw payloads, keeping prompts versioned and outputs easier to control."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(18,107,95,0.16),_transparent_40%),linear-gradient(180deg,_#f7fbfc_0%,_#eff4f7_100%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-ink/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-accent">
              Rift Foundation
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              League analytics with disciplined product boundaries
            </h1>
          </div>
          <div className="flex gap-3">
            <Link className="rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm text-ink/70 shadow-panel" href="/login">
              Log in
            </Link>
            <Link className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-panel" href="/signup">
              Create account
            </Link>
          </div>
        </header>

        <section className="grid flex-1 gap-10 py-12 lg:grid-cols-[1.4fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              Raw match ingestion now included
            </span>
            <div className="space-y-4">
              <h2 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                A secure analytics and coaching platform for ranked Solo/Duo players.
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-ink/75">
                The current milestone adds authenticated ranked Solo/Duo ingestion for owned Riot profiles, including raw match and timeline persistence before any normalization work.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {pillars.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-panel backdrop-blur"
                >
                  <h3 className="text-base font-bold">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/70">
                    {pillar.description}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-ink/10 bg-ink p-8 text-white shadow-panel">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold">
              Current milestone
            </p>
            <div className="mt-5 space-y-4">
              <h3 className="text-2xl font-bold">Ranked ingestion shell</h3>
              <p className="text-sm leading-7 text-white/75">
                Accounts now own Riot profiles, ingestion runs can fetch recent queue-420 matches, and raw Riot payloads are stored for later normalization.
              </p>
              <ul className="space-y-3 text-sm text-white/85">
                <li>Authenticated users can trigger ingestion from an explicit owned Riot profile.</li>
                <li>Raw match detail and timeline payloads are persisted before clean schema work.</li>
                <li>Normalization, analytics, and the real dashboard still land later.</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

import Link from "next/link";

const audienceCards = [
  {
    eyebrow: "Traveler",
    title: "Book with more confidence.",
    description:
      "Use Timeshare Connect if you want resort-style stays with clearer pricing and a simpler request flow than piecing everything together manually.",
    steps: [
      "Search destinations and compare listings, dates, and value.",
      "Open a listing and request the week that fits your trip.",
      "Track offer, booking, and payment progress from My Trips.",
      "Review owners and resorts after completed stays.",
    ],
    ctaHref: "/search",
    ctaLabel: "Browse listings",
  },
  {
    eyebrow: "Owner",
    title: "Turn owned inventory into bookable stays.",
    description:
      "Use Timeshare Connect if you own timeshare inventory and want a structured way to publish availability, manage requests, and move bookings forward.",
    steps: [
      "Save your resort ownership details in Inventory for reuse.",
      "Create a listing with dates, pricing, photos, and resort context.",
      "Review traveler requests and accept the best fit.",
      "Submit booking updates and proof as the booking progresses.",
    ],
    ctaHref: "/login",
    ctaLabel: "Sign up as owner",
  },
];

const decisionPoints = [
  {
    title: "Choose traveler if...",
    body: "You want to browse available weeks, compare value, and request a stay.",
  },
  {
    title: "Choose owner if...",
    body: "You need inventory tools, listing controls, and offer management for your owned time.",
  },
  {
    title: "Good to know",
    body: "This is still a private beta, so some payment and verification steps are semi-manual.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="tc-page mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <section className="tc-hero tc-fade-up rounded-3xl p-6 md:p-9">
        <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-start">
          <div className="md:col-span-8">
            <span className="tc-badge">How it works</span>
            <h1 className="tc-title mt-4 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
              Pick the path that matches how you use timeshare inventory.
            </h1>
            <p className="tc-muted mt-4 max-w-3xl text-sm md:text-base">
              Timeshare Connect serves two different jobs: helping travelers find and request resort stays, and
              helping owners publish and manage bookable inventory. This page is the quick read before signup.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link className="tc-btn-primary rounded px-4 py-2 text-sm font-semibold" href="/login">
                Login / Sign up
              </Link>
              <Link className="tc-btn-secondary rounded px-4 py-2 text-sm font-semibold" href="/search">
                Explore destinations
              </Link>
            </div>
          </div>
          <aside className="tc-glass rounded-2xl p-5 md:col-span-4 md:ml-auto md:max-w-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--tc-ink-soft)]">Fast decision guide</p>
            <div className="mt-4 space-y-4">
              {decisionPoints.map((point) => (
                <div key={point.title}>
                  <h2 className="tc-title text-2xl font-semibold">{point.title}</h2>
                  <p className="tc-muted mt-2 text-sm leading-6">{point.body}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {audienceCards.map((card) => (
          <article key={card.eyebrow} className="tc-surface tc-fade-up rounded-3xl p-6 md:p-7">
            <p className="text-xs uppercase tracking-[0.14em] text-[color:var(--tc-ink-soft)]">{card.eyebrow}</p>
            <h2 className="tc-title mt-3 text-4xl font-semibold md:text-5xl">{card.title}</h2>
            <p className="tc-muted mt-3 max-w-2xl text-sm leading-6 md:text-base">{card.description}</p>
            <ol className="mt-5 space-y-3 text-sm text-[color:var(--foreground)] md:text-base">
              {card.steps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="tc-badge min-w-8 justify-center px-0">{index + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6">
              <Link className="tc-btn-secondary rounded px-4 py-2 text-sm font-semibold" href={card.ctaHref}>
                {card.ctaLabel}
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="tc-surface-soft rounded-3xl p-6 md:p-7">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <h2 className="tc-title text-3xl font-semibold md:text-4xl">What travelers get</h2>
            <p className="tc-muted mt-3 text-sm leading-6">
              A search-first experience with listing details, pricing cues, request flow, and trip tracking.
            </p>
          </div>
          <div>
            <h2 className="tc-title text-3xl font-semibold md:text-4xl">What owners get</h2>
            <p className="tc-muted mt-3 text-sm leading-6">
              Inventory templates, listing creation, offer review, and booking milestone tools in one workspace.
            </p>
          </div>
          <div>
            <h2 className="tc-title text-3xl font-semibold md:text-4xl">Where to start</h2>
            <p className="tc-muted mt-3 text-sm leading-6">
              If you want to stay at a resort, start as a traveler. If you control timeshare availability, start as
              an owner.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

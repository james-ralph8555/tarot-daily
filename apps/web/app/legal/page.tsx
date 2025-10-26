import { headers } from "next/headers";
import { Navigation } from "../../components/Navigation";
import { validateRequestFromHeaders } from "../../server/auth";

function BaroqueDivider() {
  return (
    <div className="relative py-8">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gilded-400/30 to-transparent" />
      </div>
      <div className="relative flex justify-center">
        <svg width="40" height="40" viewBox="0 0 40 40" className="text-gilded-400">
          <path
            d="M20 8 L24 16 L32 16 L26 22 L28 30 L20 26 L12 30 L14 22 L8 16 L16 16 Z"
            fill="currentColor"
            opacity="0.6"
          />
          <circle cx="20" cy="20" r="3" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}

export default async function LegalPage() {
  const headerList = await headers();
  const auth = await validateRequestFromHeaders(headerList);
  const user = auth
    ? {
        id: auth.user.id,
        email: auth.user.email
      }
    : null;

  return (
    <div className="min-h-screen bg-gradient-lapis relative">
      {/* Sacred overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(230,199,92,0.08),transparent_50%)] pointer-events-none" />
      
      {/* Navigation */}
      <Navigation user={user} />
      
      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8">
        {/* Title Section */}
        <header className="text-center mb-12">
          <h1 className="font-display text-5xl md:text-6xl tracking-[0.08em] text-gilded-400 mb-4">
            Legal
          </h1>
          <p className="font-serif text-xl text-incense-300 italic">
            Disclaimers & Terms
          </p>
        </header>

        {/* Baroque Divider */}
        <BaroqueDivider />

        {/* Legal Content */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-[32px] border border-gilded-400/35 bg-parchment-50/95 p-8 text-ash-950 shadow-halo vellum">
            <div className="space-y-6 text-base leading-relaxed">
              <p className="reading-text">
                Tarot Daily is designed for reflection and entertainment. The guidance offered is not a substitute for
                professional medical, legal, financial, or mental health advice.
              </p>
              <p className="reading-text">
                Readings are generated using large language models hosted by Groq. While prompts are optimized with DSPy and
                evaluated nightly, outputs may still contain inaccuracies or hallucinations. Always use your own judgment.
              </p>
              <p className="reading-text">
                By using the service you consent to the collection of feedback data—thumbs up/down signals, optional rationale,
                and interaction metadata—for the purpose of improving prompt quality. Identifiers are stored in DuckDB with
                strict access controls.
              </p>
              <p className="reading-text">
                Web push notifications require explicit opt-in and can be revoked at any time from browser settings or this
                app's settings page.
              </p>
              <p className="reading-text">
                Contact support at <a href="mailto:support@example.com" className="text-lapis-700 underline hover:text-lapis-800">support@example.com</a>.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

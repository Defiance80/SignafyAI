export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      {/* Logo mark */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">S</span>
        </div>
        <span className="text-2xl font-semibold tracking-tight text-white">
          SignafyAI
        </span>
      </div>

      {/* Badge */}
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
        Beta — Coming Soon
      </div>

      {/* Headline */}
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white leading-tight mb-6">
        Your AI-Powered{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
          Growth Operating System
        </span>
      </h1>

      {/* Sub */}
      <p className="max-w-xl text-lg text-zinc-400 mb-10 leading-relaxed">
        Generate leads, create on-brand content, automate social responses, and
        drive traffic — all from one intelligent dashboard connected to your
        business profile.
      </p>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href="#waitlist"
          className="inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
        >
          Join the Beta Waitlist
        </a>
        <a
          href="#features"
          className="inline-flex items-center justify-center rounded-xl border border-zinc-700 hover:border-zinc-500 transition-colors px-6 py-3 text-sm font-semibold text-zinc-300 hover:text-white"
        >
          See How It Works
        </a>
      </div>

      {/* Module grid */}
      <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl w-full">
        {[
          { icon: "🎯", label: "Lead Generation", desc: "Find & score prospects" },
          { icon: "✍️", label: "Content Engine", desc: "On-brand across 6 platforms" },
          { icon: "💬", label: "Social Responses", desc: "Brand-matched replies" },
          { icon: "📈", label: "SEO & Traffic", desc: "Keyword clusters & briefs" },
        ].map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-left hover:border-zinc-700 transition-colors"
          >
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="text-sm font-semibold text-white mb-1">{m.label}</div>
            <div className="text-xs text-zinc-500">{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-16 text-xs text-zinc-600">
        © {new Date().getFullYear()} SignafyAI. All rights reserved.
      </p>
    </main>
  );
}

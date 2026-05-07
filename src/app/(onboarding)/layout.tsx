export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Ambient orbs */}
      <div
        className="absolute top-[-15%] left-[5%] w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(109,40,217,0.10) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[0%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 65%)",
          filter: "blur(50px)",
        }}
      />
      <div className="relative z-10 w-full max-w-5xl">{children}</div>
    </div>
  );
}

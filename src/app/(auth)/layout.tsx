export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-scheme="dark"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "#09090f",
      }}
    >
      {/* Ambient glow — top left */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: "-15%",
          left: "5%",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(109,40,217,0.18) 0%, transparent 65%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      {/* Ambient glow — bottom right */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          bottom: "-10%",
          right: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 65%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
        }}
      />
      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          padding: "32px 16px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Auth layout — provides only the dark shell.
// Sign-in page owns its own split-screen structure.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-scheme="dark"
      style={{
        minHeight: "100vh",
        background: "#07070d",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

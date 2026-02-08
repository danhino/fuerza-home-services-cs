import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fuerza Admin",
  description: "Internal admin view for Fuerza Home Services"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          margin: 0,
          background: "#0b1220",
          color: "#e6edf6"
        }}
      >
        {children}
      </body>
    </html>
  );
}



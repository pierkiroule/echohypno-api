import type { ReactNode } from "react";

export const metadata = {
  title: "EchoHypno API",
  description: "EchoHypno API backend",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

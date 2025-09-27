export const metadata = {
  title: "Contekst Dashboard",
  description: "Memory and approval requests dashboard",
};

import "./globals.css";
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-custom-purple-100">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}



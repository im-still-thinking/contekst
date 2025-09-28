export const metadata = {
  title: "Contekst Dashboard",
  description: "Memory and approval requests dashboard",
};

import "./globals.css";
import { Providers } from "./providers";
import { ClientOnly } from "./components/ClientOnly";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-custom-purple-100">
        <ClientOnly>
          <Providers>
            {children}
          </Providers>
        </ClientOnly>
      </body>
    </html>
  );
}



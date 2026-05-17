import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Providers from "@/components/Providers";
import ChatWindow from "@/components/ChatWindow";

export const metadata: Metadata = {
  title: "career.net",
  description: "İş arama platformu",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-gray-50 min-h-screen">
        <Providers>
          <Header />
          <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
          {/* AI chat penceresi tüm sayfalarda sağ altta görünür */}
          <ChatWindow />
        </Providers>
      </body>
    </html>
  );
}

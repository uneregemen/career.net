"use client";

import { useRef, useState } from "react";
import { MessageCircle, X, Send, Briefcase } from "lucide-react";
import { aiApi } from "@/lib/api";
import { ChatResponse, JobCard } from "@/types";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  text: string;
  jobCards?: JobCard[];
}

export default function ChatWindow() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Merhaba! İş aramana yardımcı olabilirim. Ne aramak istersin?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const sessionId = useRef(crypto.randomUUID()).current;
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await aiApi.chat(sessionId, userMsg);
      const data: ChatResponse = res.data;
      setMessages((m) => [...m, { role: "assistant", text: data.text, jobCards: data.jobCards }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Bir hata oluştu, lütfen tekrar deneyin." }]);
    } finally {
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  return (
    <>
      {/* Açma/Kapama Butonu */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 z-50"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* Chat Penceresi */}
      {open && (
        <div className="fixed bottom-20 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col" style={{ height: "500px" }}>

          {/* Başlık */}
          <div className="bg-blue-600 text-white px-4 py-3 rounded-t-2xl font-semibold text-sm flex items-center gap-2">
            <MessageCircle size={16} /> career.net Asistan
          </div>

          {/* Mesaj Listesi */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] space-y-2`}>
                  {/* Metin balonu */}
                  <div className={`px-4 py-2 rounded-2xl text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                  }`}>
                    {msg.text}
                  </div>

                  {/* İş kartları */}
                  {msg.jobCards && msg.jobCards.length > 0 && (
                    <div className="space-y-2">
                      {msg.jobCards.map((card) => (
                        <div key={card.id} className="border border-gray-200 rounded-xl p-3 bg-white text-sm space-y-1">
                          <p className="font-semibold text-gray-800">{card.title}</p>
                          <p className="text-gray-500 text-xs">{card.company} · {card.city}</p>
                          {card.requirements && (
                            <p className="text-gray-400 text-xs line-clamp-2">{card.requirements}</p>
                          )}
                          <Link href={`/jobs/${card.id}`}
                            className="inline-flex items-center gap-1 mt-1 text-xs text-blue-600 hover:underline font-medium">
                            <Briefcase size={12} /> Detay & Başvur
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl px-4 py-2 text-sm text-gray-400 animate-pulse">
                  Yanıt yazılıyor...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Mesaj Giriş Alanı */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="İstanbul'da yazılımcı ilanı ara..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={send} disabled={loading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

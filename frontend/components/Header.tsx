"use client";

import Link from "next/link";
import { Bell, Briefcase, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { Notification } from "@/types";
import { useState } from "react";

export default function Header() {
  const [showNotifs, setShowNotifs] = useState(false);

  // Her 30 saniyede okunmamış bildirimleri çek
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getUnread().then((r) => r.data),
    refetchInterval: 30_000,
  });

  const unreadCount = notifications.length;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-blue-600">
          career.net
        </Link>

        {/* Navigasyon linkleri */}
        <nav className="flex items-center gap-6">
          <Link href="/search" className="text-sm text-gray-600 hover:text-blue-600">
            İş Ara
          </Link>
          <Link href="/alerts" className="text-sm text-gray-600 hover:text-blue-600">
            İş Alarmları
          </Link>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">
            Şirket Paneli
          </Link>
        </nav>

        {/* Sağ taraf: bildirim + profil */}
        <div className="flex items-center gap-4">

          {/* Bildirim Zili */}
          <div className="relative">
            <button
              onClick={() => setShowNotifs(!showNotifs)}
              className="relative p-2 text-gray-500 hover:text-blue-600"
            >
              <Bell size={20} />
              {/* Okunmamış bildirim sayısı */}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Bildirim dropdown'ı */}
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b font-medium text-sm">Bildirimler</div>
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-500">Yeni bildirim yok</p>
                ) : (
                  notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={`/jobs/${n.jobId}`}
                      onClick={() => {
                        notificationsApi.markRead(n.id);
                        setShowNotifs(false);
                      }}
                      className="block px-4 py-3 hover:bg-gray-50 border-b last:border-0"
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500">{n.message}</p>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Profil / Giriş */}
          <Link
            href="/auth/login"
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
          >
            <User size={18} />
            Giriş Yap
          </Link>
        </div>
      </div>
    </header>
  );
}

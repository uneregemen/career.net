"use client";

import Link from "next/link";
import { LogOut, User, Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, profileApi, applicationsApi } from "@/lib/api";
import { Notification, UserProfile, Application } from "@/types";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  const qc = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"menu" | "notifications">("menu");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser()
      .then(() => setIsLoggedIn(true))
      .catch(() => setIsLoggedIn(false));

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        setIsLoggedIn(true);
        qc.invalidateQueries({ queryKey: ["notifications"] });
        qc.invalidateQueries({ queryKey: ["profile"] });
      }
      if (payload.event === "signedOut") {
        setIsLoggedIn(false);
        qc.clear();
      }
    });

    return () => unsubscribe();
  }, []);

  // Dropdown dışına tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getUnread().then((r) => r.data),
    enabled: isLoggedIn,
    refetchInterval: isLoggedIn ? 30_000 : false,
  });

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => profileApi.get().then((r) => r.data),
    enabled: isLoggedIn,
  });

  const { data: applications = [] } = useQuery<Application[]>({
    queryKey: ["my-applications"],
    queryFn: () => applicationsApi.myApplications().then((r) => r.data),
    enabled: isLoggedIn,
  });

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    router.push("/");
  };

  const initials = profile?.name
    ? `${profile.name[0]}${profile.surname?.[0] ?? ""}`.toUpperCase()
    : null;

  const displayName = profile?.name
    ? `${profile.name} ${profile.surname ?? ""}`.trim()
    : null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        <Link href="/" className="text-xl font-bold text-blue-600">career.net</Link>

        <nav className="flex items-center gap-6">
          <Link href="/search" className="text-sm text-gray-600 hover:text-blue-600">İş Ara</Link>
          <Link href="/alerts" className="text-sm text-gray-600 hover:text-blue-600">İş Alarmları</Link>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-blue-600">Şirket Paneli</Link>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Profil avatar + dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => { setDropdownOpen(!dropdownOpen); setActiveTab("menu"); }}
                  className="relative w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  {initials ?? <User size={18} />}
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {notifications.length > 9 ? "9+" : notifications.length}
                    </span>
                  )}
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">

                    {/* Kullanıcı bilgisi */}
                    {displayName && (
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-800">{displayName}</p>
                        {profile?.email && (
                          <p className="text-xs text-gray-500">{profile.email}</p>
                        )}
                      </div>
                    )}

                    {/* Tab seçimi */}
                    <div className="flex border-b border-gray-100">
                      <button
                        onClick={() => setActiveTab("menu")}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                          activeTab === "menu"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Bilgilerim
                      </button>
                      <button
                        onClick={() => setActiveTab("notifications")}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                          activeTab === "notifications"
                            ? "text-blue-600 border-b-2 border-blue-600"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Bildirimler
                        {notifications.length > 0 && (
                          <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                            {notifications.length}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Bilgilerim sekmesi */}
                    {activeTab === "menu" && (
                      <div>
                        <Link
                          href="/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                        >
                          <User size={16} className="text-gray-400" />
                          Profilimi Düzenle
                        </Link>

                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          Başvurularım
                        </div>

                        <div className="h-[174px] overflow-y-auto scroll-smooth">
                          {applications.length === 0 ? (
                            <p className="px-4 pb-4 text-sm text-gray-400">
                              Henüz başvuru yapılmadı.
                            </p>
                          ) : (
                            applications.map((app) => (
                              <Link
                                key={app.id}
                                href={`/jobs/${app.jobId}`}
                                onClick={() => setDropdownOpen(false)}
                                className="flex items-start justify-between px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-800 line-clamp-1">
                                    {app.jobTitle}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    {new Date(app.appliedAt).toLocaleDateString("tr-TR")}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 mt-0.5 ${
                                  app.status === "PENDING"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : app.status === "ACCEPTED"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {app.status === "PENDING" ? "Beklemede"
                                    : app.status === "ACCEPTED" ? "Kabul"
                                    : app.status ?? "Beklemede"}
                                </span>
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bildirimler sekmesi */}
                    {activeTab === "notifications" && (
                      <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-gray-400 text-center">
                            Yeni bildirim yok
                          </p>
                        ) : (
                          notifications.map((n) => (
                            <Link
                              key={n.id}
                              href={`/jobs/${n.jobId}`}
                              onClick={() => {
                                notificationsApi.markRead(n.id);
                                setDropdownOpen(false);
                              }}
                              className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                            >
                              <p className="text-sm font-medium text-gray-800">{n.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                            </Link>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Çıkış yap ikonu */}
              <button
                onClick={handleSignOut}
                title="Çıkış Yap"
                className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link href="/auth/login"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600">
              <User size={18} /> Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

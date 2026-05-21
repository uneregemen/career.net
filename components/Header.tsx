"use client";

import Link from "next/link";
import { LogOut, User, Bell, Bookmark, ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, profileApi, applicationsApi } from "@/lib/api";
import { Notification, UserProfile, Application } from "@/types";
import { useState, useEffect, useRef } from "react";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { useRouter } from "next/navigation";

const statusLabel: Record<string, string> = {
  PENDING: "Beklemede",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
};
const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

export default function Header() {
  const router = useRouter();
  const qc = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"applications" | "notifications">("notifications");
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

  const unreadCount = notifications.length;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-6">

        <Link href="/" className="text-xl font-bold text-blue-600 shrink-0">
          career.net
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/search", label: "İş Ara" },
            { href: "/alerts", label: "İş Alarmları" },
            { href: "/admin", label: "Şirket Paneli" },
          ].map(({ href, label }) => (
            <Link key={href} href={href}
              className="px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          {isLoggedIn ? (
            <>
              {/* Kaydedilenler */}
              <Link href="/saved"
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Kaydettiklerim">
                <Bookmark size={18} />
              </Link>

              {/* Bildirim + profil dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => { setDropdownOpen(!dropdownOpen); }}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                      {initials ?? <User size={15} />}
                    </div>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                    {displayName ?? "Hesabım"}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">

                    {/* Kullanıcı başlığı */}
                    <div className="px-4 py-3.5 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold shrink-0">
                        {initials ?? <User size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{displayName ?? "Kullanıcı"}</p>
                        {profile?.email && <p className="text-xs text-gray-400 truncate">{profile.email}</p>}
                      </div>
                    </div>

                    {/* Hızlı linkler */}
                    <div className="px-2 py-2 border-b border-gray-100">
                      <Link href="/profile" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                        <User size={15} className="text-gray-400" /> Profilim
                      </Link>
                      <Link href="/saved" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-xl transition-colors">
                        <Bookmark size={15} className="text-gray-400" /> Kaydettiklerim
                      </Link>
                    </div>

                    {/* Tab: Başvurularım | Bildirimler */}
                    <div className="flex border-b border-gray-100">
                      {(["applications", "notifications"] as const).map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-2.5 text-xs font-semibold transition-colors relative ${
                            activeTab === tab
                              ? "text-blue-600 border-b-2 border-blue-600"
                              : "text-gray-400 hover:text-gray-600"
                          }`}>
                          {tab === "applications" ? "Başvurularım" : (
                            <span className="flex items-center justify-center gap-1">
                              Bildirimler
                              {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                                  {unreadCount}
                                </span>
                              )}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Başvurularım */}
                    {activeTab === "applications" && (
                      <div className="max-h-60 overflow-y-auto">
                        {applications.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-gray-400 text-center">Henüz başvuru yapılmadı.</p>
                        ) : (
                          applications.map((app) => (
                            <Link key={app.id} href={`/jobs/${app.jobId}`}
                              onClick={() => setDropdownOpen(false)}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{app.jobTitle}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {new Date(app.appliedAt).toLocaleDateString("tr-TR")}
                                </p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${statusColor[app.status] ?? "bg-blue-50 text-blue-600"}`}>
                                {statusLabel[app.status] ?? "Başvuruldu"}
                              </span>
                            </Link>
                          ))
                        )}
                      </div>
                    )}

                    {/* Bildirimler */}
                    {activeTab === "notifications" && (
                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-4 py-6 text-sm text-gray-400 text-center">Yeni bildirim yok</p>
                        ) : (
                          notifications.map((n) => (
                            <Link key={n.id} href={`/jobs/${n.jobId}`}
                              onClick={() => {
                                qc.setQueryData<Notification[]>(["notifications"], (old) =>
                                  (old ?? []).filter((x) => x.id !== n.id)
                                );
                                notificationsApi.markRead(n.id).catch(() =>
                                  qc.invalidateQueries({ queryKey: ["notifications"] })
                                );
                                setDropdownOpen(false);
                              }}
                              className="flex gap-3 px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0">
                              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                              </div>
                            </Link>
                          ))
                        )}
                      </div>
                    )}

                    {/* Çıkış */}
                    <div className="px-2 py-2 border-t border-gray-100">
                      <button onClick={handleSignOut}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <LogOut size={15} /> Çıkış Yap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/auth/login"
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors">
              <User size={15} /> Giriş Yap
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

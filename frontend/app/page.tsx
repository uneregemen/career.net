"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Clock, TrendingUp, Bookmark, ChevronRight, X } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { Job } from "@/types";
import JobCard from "@/components/JobCard";

interface RecentSearch { position: string; city: string; }
const RECENT_KEY = "careernet_recent_searches";
const SAVED_KEY = "careernet_saved_jobs";

function loadRecent(): RecentSearch[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
}
function saveRecent(entry: RecentSearch) {
  const list = loadRecent().filter((s) => !(s.position === entry.position && s.city === entry.city));
  list.unshift(entry);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
}
function loadSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}

const HOT_POSITIONS = ["Software Developer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Scientist", "Product Manager"];

export default function HomePage() {
  const router = useRouter();
  const [position, setPosition] = useState("");
  const [city, setCity] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [detectedCity, setDetectedCity] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    setRecentSearches(loadRecent());
    setSavedCount(loadSaved().length);
  }, []);

  // Konum tespiti
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`
        );
        const data = await res.json();
        const addr = data.address || {};
        const found = addr.city ||
                      addr.province ||
                      addr.state?.replace(/ (İli|Province|Region)$/i, "") ||
                      addr.county?.replace(/ İlçesi$/i, "") || "";
        setDetectedCity(found);
        if (!city) setCity(found);
      } catch (_) {}
    });
  }, []);

  const { data: nearbyJobs = [] } = useQuery<Job[]>({
    queryKey: ["nearby", detectedCity],
    queryFn: () => jobsApi.nearby(detectedCity).then((r) => r.data),
    enabled: !!detectedCity,
  });

  const { data: latestJobs = [] } = useQuery<Job[]>({
    queryKey: ["nearby", ""],
    queryFn: () => jobsApi.nearby("").then((r) => r.data),
    enabled: !detectedCity,
  });

  const displayJobs = detectedCity ? nearbyJobs : latestJobs;

  const handlePositionChange = async (val: string) => {
    setPosition(val);
    if (val.length < 2) { setPositionSuggestions([]); return; }
    const res = await jobsApi.autocompletePosition(val);
    setPositionSuggestions(res.data);
  };

  const handleCityChange = async (val: string) => {
    setCity(val);
    if (val.length < 2) { setCitySuggestions([]); return; }
    const res = await jobsApi.autocompleteCity(val);
    setCitySuggestions(res.data);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (position) params.set("position", position);
    if (city) params.set("city", city);
    if (position || city) {
      saveRecent({ position, city });
      setRecentSearches(loadRecent());
    }
    router.push(`/search?${params.toString()}`);
  };

  const removeRecent = (i: number) => {
    const list = loadRecent();
    list.splice(i, 1);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    setRecentSearches(list);
  };

  return (
    <div className="space-y-8">

      {/* ── Hero arama ───────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-1">Hayalindeki İşi Bul</h1>
        <p className="text-blue-200 text-sm mb-6">Binlerce ilan arasından sana uygun fırsatı keşfet</p>

        <div className="bg-white rounded-2xl p-1.5 flex gap-1.5 flex-wrap shadow-lg">
          {/* Pozisyon */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              value={position}
              onChange={(e) => handlePositionChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Pozisyon veya şirket"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 placeholder-gray-400"
            />
            {positionSuggestions.length > 0 && (
              <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                {positionSuggestions.map((s) => (
                  <li key={s} onClick={() => { setPosition(s); setPositionSuggestions([]); }}
                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-gray-700">{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Şehir */}
          <div className="relative flex-1 min-w-[140px]">
            <MapPin size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Şehir"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 placeholder-gray-400"
            />
            {citySuggestions.length > 0 && (
              <ul className="absolute z-20 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg overflow-hidden">
                {citySuggestions.map((s) => (
                  <li key={s} onClick={() => { setCity(s); setCitySuggestions([]); }}
                    className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer text-sm text-gray-700">{s}</li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={handleSearch}
            className="px-7 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors shrink-0">
            Ara
          </button>
        </div>

        {/* Popüler pozisyonlar */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-blue-200 text-xs font-medium mr-1 self-center">Popüler:</span>
          {HOT_POSITIONS.map((p) => (
            <button key={p} onClick={() => { setPosition(p); setPositionSuggestions([]); }}
              className="text-xs bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full transition-colors backdrop-blur-sm">
              {p}
            </button>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Sol sidebar ───────────────────────────────────── */}
        <aside className="lg:col-span-1 space-y-4">

          {/* Son Aramalarım */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Son Aramalarım</span>
            </div>
            {recentSearches.length === 0 ? (
              <p className="text-xs text-gray-400 py-1">Henüz arama yapılmadı</p>
            ) : (
              <div className="space-y-0.5">
                {recentSearches.map((s, i) => {
                  const label = [s.position, s.city].filter(Boolean).join(" · ");
                  if (!label) return null;
                  return (
                    <div key={i} className="group flex items-center justify-between rounded-lg hover:bg-blue-50 transition-colors">
                      <button
                        onClick={() => {
                          const p = new URLSearchParams();
                          if (s.position) p.set("position", s.position);
                          if (s.city) p.set("city", s.city);
                          router.push(`/search?${p.toString()}`);
                        }}
                        className="flex-1 text-left px-3 py-2 text-xs font-medium text-gray-600 group-hover:text-blue-600 truncate"
                      >
                        {label}
                      </button>
                      <button onClick={() => removeRecent(i)}
                        className="pr-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity">
                        <X size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Kaydedilenler */}
          {savedCount > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bookmark size={14} className="text-blue-500" />
                  <span className="text-sm font-semibold text-gray-700">Kaydettiklerim</span>
                </div>
                <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">{savedCount}</span>
              </div>
              <button onClick={() => router.push("/saved")}
                className="mt-3 w-full text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1 py-2 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                Tümünü Gör <ChevronRight size={12} />
              </button>
            </div>
          )}

          {/* Popüler kategoriler */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Popüler Kategoriler</span>
            </div>
            <div className="space-y-0.5">
              {[
                { label: "Yazılım & Teknoloji", q: "Developer" },
                { label: "Veri & Analitik", q: "Data" },
                { label: "Tasarım & UX", q: "Designer" },
                { label: "DevOps & Cloud", q: "DevOps" },
                { label: "Ürün Yönetimi", q: "Product" },
              ].map(({ label, q }) => (
                <button key={q}
                  onClick={() => router.push(`/search?position=${encodeURIComponent(q)}`)}
                  className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-between group">
                  {label}
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ── Ana içerik ────────────────────────────────────── */}
        <section className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              {detectedCity ? `${detectedCity} Yakınındaki İlanlar` : "Öne Çıkan İlanlar"}
            </h2>
            <button onClick={() => router.push("/search")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Tümünü Gör <ChevronRight size={14} />
            </button>
          </div>

          {displayJobs.length === 0 ? (
            <p className="text-sm text-gray-400">İlan bulunamadı</p>
          ) : (
            <div className="space-y-3">
              {displayJobs.map((job) => <JobCard key={job.id} job={job} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

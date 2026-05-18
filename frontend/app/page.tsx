"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, Clock } from "lucide-react";
import { jobsApi, searchApi } from "@/lib/api";
import { Job, JobSearch } from "@/types";
import JobCard from "@/components/JobCard";

export default function HomePage() {
  const router = useRouter();
  const [position, setPosition] = useState("");
  const [city, setCity] = useState("");
  const [positionSuggestions, setPositionSuggestions] = useState<string[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [detectedCity, setDetectedCity] = useState("");
  const sessionId = useRef(crypto.randomUUID()).current;

  // Tarayıcının konumunu al → şehre çevir (OpenStreetMap Nominatim — ücretsiz, API key gerekmez)
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1`
        );
        const data = await res.json();
        const addr = data.address || {};
        // Türkiye için il (province/state) kullan, ilçe (town/suburb) değil
        const found = addr.city ||
                      addr.province ||
                      addr.state?.replace(/ (İli|Province|Region)$/i, "") ||
                      addr.county?.replace(/ İlçesi$/i, "") ||
                      "";
        setDetectedCity(found);
        if (!city) setCity(found);
      } catch (_) {}
    });
  }, []);

  // Tespit edilen şehirdeki ilanları çek
  const { data: nearbyJobs = [] } = useQuery<Job[]>({
    queryKey: ["nearby", detectedCity],
    queryFn: () => jobsApi.nearby(detectedCity).then((r) => r.data),
    enabled: !!detectedCity,
  });

  // Son aramaları çek
  const { data: recentSearches = [] } = useQuery<JobSearch[]>({
    queryKey: ["recent-searches"],
    queryFn: () => searchApi.recent(sessionId).then((r) => r.data),
  });

  // Pozisyon autocomplete — kullanıcı 2 karakter yazınca API'yi çağır
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
    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-10">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 shadow-lg">
        <h1 className="text-3xl font-bold text-white mb-1">Hayalindeki İşi Bul</h1>
        <p className="text-blue-200 text-sm mb-6">Binlerce ilan arasından sana uygun fırsatı keşfet</p>
        <div className="flex gap-3 flex-wrap">

          {/* Pozisyon */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3 top-3.5 text-blue-200" />
            <input
              value={position}
              onChange={(e) => handlePositionChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Pozisyon (ör: Java Developer)"
              className="w-full pl-9 pr-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/15 text-white placeholder-blue-200 backdrop-blur"
            />
            {positionSuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg">
                {positionSuggestions.map((s) => (
                  <li key={s} onClick={() => { setPosition(s); setPositionSuggestions([]); }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Şehir */}
          <div className="relative flex-1 min-w-[200px]">
            <MapPin size={18} className="absolute left-3 top-3.5 text-blue-200" />
            <input
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Şehir"
              className="w-full pl-9 pr-4 py-3 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 bg-white/15 text-white placeholder-blue-200 backdrop-blur"
            />
            {citySuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl mt-1 shadow-lg">
                {citySuggestions.map((s) => (
                  <li key={s} onClick={() => { setCity(s); setCitySuggestions([]); }}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm">{s}</li>
                ))}
              </ul>
            )}
          </div>

          <button onClick={handleSearch}
            className="px-8 py-3 bg-white text-blue-700 rounded-xl hover:bg-blue-50 font-semibold shadow transition-colors shrink-0">
            Ara
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

        {/* Son Aramalarım */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3 text-gray-700 font-semibold text-sm">
              <Clock size={15} />
              Son Aramalarım
            </div>
            {recentSearches.length === 0 ? (
              <p className="text-xs text-gray-400">Henüz arama yapılmadı</p>
            ) : (
              <div className="space-y-1">
                {recentSearches.map((s) => {
                  const label = [s.position, s.city].filter(Boolean).join(" · ");
                  if (!label) return null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => {
                        const p = new URLSearchParams();
                        if (s.position) p.set("position", s.position);
                        if (s.city) p.set("city", s.city);
                        router.push(`/search?${p.toString()}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors group"
                    >
                      <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600 truncate">
                        {label}
                      </p>
                      {s.filters?.workingPreference && (
                        <p className="text-xs text-gray-400">{s.filters.workingPreference}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Yakındaki İlanlar */}
        <section className="lg:col-span-3 space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">
            {detectedCity ? `${detectedCity} Yakınındaki İlanlar` : "Öne Çıkan İlanlar"}
          </h2>
          {nearbyJobs.length === 0
            ? <p className="text-sm text-gray-400">İlan bulunamadı</p>
            : nearbyJobs.map((job) => <JobCard key={job.id} job={job} />)
          }
        </section>
      </div>
    </div>
  );
}

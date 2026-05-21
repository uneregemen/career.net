"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, SlidersHorizontal } from "lucide-react";
import { searchApi } from "@/lib/api";
import { Job, JobPage } from "@/types";
import JobCard from "@/components/JobCard";

const RECENT_KEY = "careernet_recent_searches";

const workingOptions = [
  { value: "FULLTIME", label: "Tam Zamanlı" },
  { value: "PARTTIME", label: "Yarı Zamanlı" },
  { value: "REMOTE", label: "Uzaktan" },
  { value: "HYBRID", label: "Hibrit" },
];

function saveToRecent(position: string, city: string) {
  if (!position && !city) return;
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    const filtered = list.filter((s: any) => !(s.position === position && s.city === city));
    filtered.unshift({ position, city });
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 6)));
  } catch {}
}

function SearchContent() {
  const params = useSearchParams();

  const [filters, setFilters] = useState({
    position: params.get("position") || "",
    city: params.get("city") || "",
    country: params.get("country") || "",
    town: params.get("town") || "",
    workingPreference: params.get("workingPreference") || "",
    page: 0,
  });
  const [showFilters, setShowFilters] = useState(false);

  // URL'den gelen aramaları localStorage'a kaydet
  useEffect(() => {
    saveToRecent(filters.position, filters.city);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["search", filters],
    queryFn: () => searchApi.search({ ...filters, size: 20 }).then((r) => r.data as JobPage),
  });

  const setFilter = (key: string, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: 0 }));
  const removeFilter = (key: string) => setFilter(key, "");

  const activeFilters = Object.entries(filters).filter(
    ([k, v]) => v && k !== "page" && k !== "position" && k !== "city"
  );

  return (
    <div className="space-y-4">

      {/* Başlık + filtre toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {filters.position || filters.city
              ? `"${[filters.position, filters.city].filter(Boolean).join(" · ")}" Araması`
              : "Tüm İlanlar"}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.totalElements ?? 0} ilan bulundu</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
            showFilters || activeFilters.length > 0
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
          }`}
        >
          <SlidersHorizontal size={15} />
          Filtrele
          {activeFilters.length > 0 && (
            <span className="bg-white/30 text-xs rounded-full px-1.5">{activeFilters.length}</span>
          )}
        </button>
      </div>

      {/* Aktif filtre etiketleri */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(([k, v]) => (
            <span key={k}
              className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-3 py-1.5 rounded-full font-medium">
              {k === "workingPreference"
                ? workingOptions.find((o) => o.value === v)?.label ?? v
                : v as string}
              <button onClick={() => removeFilter(k)} className="hover:text-blue-900">
                <X size={11} />
              </button>
            </span>
          ))}
          <button onClick={() => setFilters((f) => ({ ...f, country: "", town: "", workingPreference: "", page: 0 }))}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Tümünü temizle
          </button>
        </div>
      )}

      <div className="flex gap-6">

        {/* ── Sol filtre paneli ─────────────────────────── */}
        {showFilters && (
          <aside className="w-56 shrink-0 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ülke</label>
                <input value={filters.country} onChange={(e) => setFilter("country", e.target.value)}
                  placeholder="Türkiye"
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">İlçe</label>
                <input value={filters.town} onChange={(e) => setFilter("town", e.target.value)}
                  placeholder="Kadıköy"
                  className="mt-1.5 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Çalışma Şekli</label>
                <div className="mt-2 space-y-2">
                  {workingOptions.map(({ value, label }) => (
                    <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                      <div
                        onClick={() => setFilter("workingPreference", filters.workingPreference === value ? "" : value)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          filters.workingPreference === value
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300 group-hover:border-blue-400"
                        }`}>
                        {filters.workingPreference === value && (
                          <div className="w-2 h-2 bg-white rounded-sm" />
                        )}
                      </div>
                      <span className="text-sm text-gray-600">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* ── Sonuç listesi ─────────────────────────────── */}
        <div className="flex-1 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : data?.content?.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <p className="text-gray-500 font-medium">Sonuç bulunamadı</p>
              <p className="text-sm text-gray-400 mt-1">Farklı anahtar kelimeler veya filtreler deneyin</p>
            </div>
          ) : (
            <>
              {data?.content?.map((job: Job) => <JobCard key={job.id} job={job} />)}

              {data && data.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  {Array.from({ length: data.totalPages }).map((_, i) => (
                    <button key={i} onClick={() => setFilters((f) => ({ ...f, page: i }))}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        filters.page === i
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>;
}

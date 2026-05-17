"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { searchApi } from "@/lib/api";
import { Job, JobPage } from "@/types";
import JobCard from "@/components/JobCard";

const workingOptions = ["FULLTIME", "PARTTIME", "REMOTE", "HYBRID"];
const workingLabel: Record<string, string> = {
  FULLTIME: "Tam Zamanlı", PARTTIME: "Yarı Zamanlı", REMOTE: "Uzaktan", HYBRID: "Hibrit",
};

function SearchContent() {
  const router = useRouter();
  const params = useSearchParams();

  const [filters, setFilters] = useState({
    position: params.get("position") || "",
    city: params.get("city") || "",
    country: params.get("country") || "",
    town: params.get("town") || "",
    workingPreference: params.get("workingPreference") || "",
    page: 0,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["search", filters],
    queryFn: () => searchApi.search({ ...filters, size: 20 }).then((r) => r.data as JobPage),
    enabled: true,
  });

  const setFilter = (key: string, value: string) =>
    setFilters((f) => ({ ...f, [key]: value, page: 0 }));

  const removeFilter = (key: string) => setFilter(key, "");

  // Aktif filtreler — boş olmayanlar
  const activeFilters = Object.entries(filters)
    .filter(([k, v]) => v && k !== "page" && k !== "position" && k !== "city")
    .map(([k, v]) => ({ key: k, value: v as string }));

  return (
    <div className="flex gap-8">

      {/* Sol filtre paneli */}
      <aside className="w-64 shrink-0 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700">Filtreler</h2>

          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Ülke</label>
            <input value={filters.country} onChange={(e) => setFilter("country", e.target.value)}
              placeholder="Türkiye"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Şehir</label>
            <input value={filters.city} onChange={(e) => setFilter("city", e.target.value)}
              placeholder="İstanbul"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">İlçe</label>
            <input value={filters.town} onChange={(e) => setFilter("town", e.target.value)}
              placeholder="Kadıköy"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Çalışma Şekli</label>
            <div className="mt-2 space-y-1">
              {workingOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="wp" value={opt}
                    checked={filters.workingPreference === opt}
                    onChange={() => setFilter("workingPreference", opt)}
                    className="accent-blue-600" />
                  <span className="text-sm">{workingLabel[opt]}</span>
                </label>
              ))}
              {filters.workingPreference && (
                <button onClick={() => removeFilter("workingPreference")}
                  className="text-xs text-red-500 hover:underline mt-1">Temizle</button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Sağ: Sonuç listesi */}
      <div className="flex-1 space-y-4">

        {/* Başlık + aktif filtre chipleri */}
        <div className="flex items-center flex-wrap gap-2">
          <h1 className="text-lg font-semibold text-gray-800 mr-2">
            {data?.totalElements ?? 0} İlan Bulundu
          </h1>
          {/* Aktif filtre chip'leri — X'e tıklayınca kaldırılır */}
          {activeFilters.map(({ key, value }) => (
            <span key={key}
              className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full">
              {key === "workingPreference" ? workingLabel[value] : value}
              <button onClick={() => removeFilter(key)}><X size={12} /></button>
            </span>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        ) : data?.content?.length === 0 ? (
          <p className="text-sm text-gray-400">Sonuç bulunamadı</p>
        ) : (
          data?.content?.map((job: Job) => <JobCard key={job.id} job={job} />)
        )}

        {/* Sayfalama */}
        {data && data.totalPages > 1 && (
          <div className="flex gap-2 mt-4">
            {Array.from({ length: data.totalPages }).map((_, i) => (
              <button key={i} onClick={() => setFilters((f) => ({ ...f, page: i }))}
                className={`px-3 py-1 rounded text-sm ${filters.page === i ? "bg-blue-600 text-white" : "bg-white border"}`}>
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return <Suspense><SearchContent /></Suspense>;
}

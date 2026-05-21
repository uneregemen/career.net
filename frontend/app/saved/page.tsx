"use client";

import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { Job } from "@/types";
import JobCard from "@/components/JobCard";

const SAVED_KEY = "careernet_saved_jobs";

export default function SavedPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      setSavedIds(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"));
    } catch {
      setSavedIds([]);
    }

    const onStorage = () => {
      try { setSavedIds(JSON.parse(localStorage.getItem(SAVED_KEY) || "[]")); } catch {}
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const results = useQueries({
    queries: savedIds.map((id) => ({
      queryKey: ["job", id],
      queryFn: () => jobsApi.getById(id).then((r) => r.data as Job),
    })),
  });

  const jobs = results.map((r) => r.data).filter(Boolean) as Job[];
  const loading = results.some((r) => r.isLoading);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Bookmark size={20} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-800">Kaydettiklerim</h1>
        {savedIds.length > 0 && (
          <span className="text-sm text-gray-400 ml-1">({savedIds.length} ilan)</span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Bookmark size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Henüz ilan kaydedilmedi</p>
          <p className="text-sm text-gray-400 mt-1">İlan kartlarındaki yer imi ikonuna tıklayarak kaydet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}

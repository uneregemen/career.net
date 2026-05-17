"use client";

import { use, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Building2, Briefcase } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { Job } from "@/types";

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => jobsApi.getById(id).then((r) => r.data),
  });

  const handleApply = async () => {
    setApplying(true);
    try {
      await jobsApi.apply(id);
      setApplied(true);
    } catch (e: any) {
      alert(e.response?.data?.error || "Başvuru sırasında hata oluştu");
    } finally {
      setApplying(false);
    }
  };

  if (isLoading) return <p className="text-gray-400">Yükleniyor...</p>;
  if (!job) return <p className="text-gray-400">İlan bulunamadı</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-8">

        {/* Başlık */}
        <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
          <span className="flex items-center gap-1"><Building2 size={15} /> {job.companyName}</span>
          <span className="flex items-center gap-1"><MapPin size={15} /> {job.city}{job.town ? `, ${job.town}` : ""}</span>
          <span className="flex items-center gap-1"><Briefcase size={15} /> {job.workingPreference}</span>
          {job.salaryRange && <span className="font-medium text-gray-700">{job.salaryRange}</span>}
        </div>

        {/* Açıklama */}
        {job.description && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-700 mb-2">İş Tanımı</h2>
            <p className="text-gray-600 whitespace-pre-line">{job.description}</p>
          </div>
        )}

        {/* Gereksinimler */}
        {job.requirements && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-700 mb-2">Aranan Nitelikler</h2>
            <p className="text-gray-600 whitespace-pre-line">{job.requirements}</p>
          </div>
        )}

        {/* Başvur butonu */}
        <div className="mt-8">
          {applied ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-5 py-3 text-sm font-medium">
              ✓ Başvurunuz alındı!
            </div>
          ) : (
            <button
              onClick={handleApply}
              disabled={applying}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {applying ? "Başvuruluyor..." : "Başvur"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

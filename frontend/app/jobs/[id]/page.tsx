"use client";

import { use, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Building2, Briefcase, Clock, Bookmark, BookmarkCheck, ChevronLeft, Banknote, Users } from "lucide-react";
import { jobsApi } from "@/lib/api";
import { Job } from "@/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "aws-amplify/auth";
import JobCard from "@/components/JobCard";

const prefLabel: Record<string, string> = {
  FULLTIME: "Tam Zamanlı", PARTTIME: "Yarı Zamanlı", REMOTE: "Uzaktan", HYBRID: "Hibrit",
};
const prefColor: Record<string, string> = {
  FULLTIME: "bg-blue-50 text-blue-700",
  PARTTIME: "bg-orange-50 text-orange-700",
  REMOTE:   "bg-emerald-50 text-emerald-700",
  HYBRID:   "bg-violet-50 text-violet-700",
};

const SAVED_KEY = "careernet_saved_jobs";
function getSaved(): string[] { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; } }
function toggleSaved(id: string): boolean {
  const list = getSaved();
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1); else list.push(id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  return idx < 0;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Bugün";
  if (days === 1) return "1 gün önce";
  if (days < 30) return `${days} gün önce`;
  return `${Math.floor(days / 30)} ay önce`;
}

const avatarColors = ["bg-blue-500","bg-violet-500","bg-emerald-500","bg-orange-500","bg-rose-500","bg-cyan-500","bg-amber-500"];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ["job", id],
    queryFn: () => jobsApi.getById(id).then((r) => r.data),
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["job-count", id],
    queryFn: () => jobsApi.applicationCount(id).then((r) => r.data),
    enabled: !!job,
  });

  const { data: relatedJobs = [] } = useQuery<Job[]>({
    queryKey: ["related-jobs", job?.city, job?.workingPreference],
    queryFn: () => jobsApi.nearby(job!.city).then((r) => r.data),
    enabled: !!job?.city,
    select: (jobs) => jobs.filter((j) => j.id !== id).slice(0, 3),
  });

  useEffect(() => {
    setSaved(getSaved().includes(id));
  }, [id]);

  const handleApply = async () => {
    try {
      await getCurrentUser();
    } catch {
      router.push(`/auth/login?redirect=/jobs/${id}`);
      return;
    }
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

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/2" />
      <div className="bg-white rounded-2xl h-64 border border-gray-200" />
    </div>
  );
  if (!job) return <p className="text-gray-400">İlan bulunamadı</p>;

  const avatarColor = avatarColors[(job.companyName?.charCodeAt(0) ?? 0) % avatarColors.length];
  const location = [job.town, job.city, job.country].filter(Boolean).join(", ");

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      <Link href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 transition-colors">
        <ChevronLeft size={16} /> Aramalara Dön
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Sol: Detay ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">

            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl ${avatarColor} text-white flex items-center justify-center text-2xl font-bold shrink-0`}>
                {job.companyName?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
                <p className="text-blue-600 font-medium mt-0.5">{job.companyName}</p>
              </div>
              <button onClick={() => setSaved(toggleSaved(id))}
                className={`p-2 rounded-xl border transition-colors shrink-0 ${
                  saved ? "border-blue-200 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-400 hover:border-gray-300"
                }`}>
                {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              {location && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin size={14} className="text-gray-400" /> {location}
                </span>
              )}
              {job.workingPreference && (
                <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${prefColor[job.workingPreference]}`}>
                  <Briefcase size={12} /> {prefLabel[job.workingPreference]}
                </span>
              )}
              {job.salaryRange && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                  <Banknote size={14} className="text-gray-400" /> {job.salaryRange}
                </span>
              )}
              {job.postedAt && (
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock size={13} /> {timeAgo(job.postedAt)}
                </span>
              )}
              {countData !== undefined && (
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Users size={13} /> {countData.count} başvuru
                </span>
              )}
            </div>
          </div>

          {job.description && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-3">İş Tanımı</h2>
              <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
            </div>
          )}

          {job.requirements && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-3">Aranan Nitelikler</h2>
              <p className="text-gray-600 whitespace-pre-line text-sm leading-relaxed">{job.requirements}</p>
            </div>
          )}
        </div>

        {/* ── Sağ: Başvur + ilgili ilanlar ────────────── */}
        <div className="space-y-4">
          {/* Başvur kartı */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={15} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">{job.companyName}</span>
            </div>
            {location && (
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-4">
                <MapPin size={11} /> {location}
              </p>
            )}

            {applied ? (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium text-center">
                ✓ Başvurunuz alındı!
                <p className="text-xs font-normal text-green-600 mt-1">Durumu profil bölümünden takip edebilirsiniz.</p>
              </div>
            ) : (
              <button
                onClick={handleApply}
                disabled={applying}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                {applying ? "Başvuruluyor..." : "Hemen Başvur"}
              </button>
            )}

            <button
              onClick={() => setSaved(toggleSaved(id))}
              className={`w-full mt-2 py-2.5 text-sm font-medium rounded-xl border transition-colors flex items-center justify-center gap-2 ${
                saved ? "border-blue-200 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {saved ? <><BookmarkCheck size={15} /> Kaydedildi</> : <><Bookmark size={15} /> İlanı Kaydet</>}
            </button>
          </div>

          {/* İlgili İlanlar */}
          {relatedJobs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">İlgini Çekebilecek İlanlar</h3>
              <div className="space-y-2">
                {relatedJobs.map((rj) => (
                  <Link key={rj.id} href={`/jobs/${rj.id}`}
                    className="block p-3 rounded-xl hover:bg-gray-50 border border-gray-100 transition-colors">
                    <p className="text-sm font-medium text-gray-800 line-clamp-1 hover:text-blue-600">{rj.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{rj.companyName}</p>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} /> {[rj.town, rj.city].filter(Boolean).join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

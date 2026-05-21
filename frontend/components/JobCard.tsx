"use client";

import Link from "next/link";
import { MapPin, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { Job } from "@/types";
import { useState, useEffect } from "react";

const prefLabel: Record<string, string> = {
  FULLTIME: "Tam Zamanlı", PARTTIME: "Yarı Zamanlı", REMOTE: "Uzaktan", HYBRID: "Hibrit",
};
const prefColor: Record<string, string> = {
  FULLTIME: "bg-blue-50 text-blue-700",
  PARTTIME: "bg-orange-50 text-orange-700",
  REMOTE:   "bg-emerald-50 text-emerald-700",
  HYBRID:   "bg-violet-50 text-violet-700",
};
const avatarColors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500",
];

function avatarColor(name?: string) {
  return avatarColors[(name?.charCodeAt(0) ?? 0) % avatarColors.length];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "1 gün önce";
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  return `${months} ay önce`;
}

const SAVED_KEY = "careernet_saved_jobs";

function getSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function toggleSaved(id: string): boolean {
  const list = getSaved();
  const idx = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); } else { list.push(id); }
  localStorage.setItem(SAVED_KEY, JSON.stringify(list));
  return idx < 0; // true = now saved
}

interface Props {
  job: Job;
  compact?: boolean;
}

export default function JobCard({ job, compact = false }: Props) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getSaved().includes(job.id));
  }, [job.id]);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(toggleSaved(job.id));
  };

  const location = [job.town, job.city, job.country].filter(Boolean).join(" • ");

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer relative">

        {/* Bookmark */}
        <button
          onClick={handleBookmark}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            saved ? "text-blue-600" : "text-gray-300 hover:text-gray-500"
          }`}
          title={saved ? "Kaydedildi" : "Kaydet"}
        >
          {saved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>

        <div className="flex items-start gap-4 pr-8">
          {/* Şirket avatarı */}
          <div className={`w-12 h-12 rounded-xl ${avatarColor(job.companyName)} text-white flex items-center justify-center text-lg font-bold shrink-0`}>
            {job.companyName?.[0]?.toUpperCase() ?? "?"}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-[15px] group-hover:text-blue-600 transition-colors leading-snug">
              {job.title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{job.companyName}</p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {location}
                </span>
              )}
              {job.postedAt && (
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {timeAgo(job.postedAt)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {job.workingPreference && (
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${prefColor[job.workingPreference]}`}>
                  {prefLabel[job.workingPreference]}
                </span>
              )}
              {job.salaryRange && (
                <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                  {job.salaryRange}
                </span>
              )}
            </div>

            {!compact && job.requirements && (
              <p className="text-sm text-gray-400 mt-2.5 line-clamp-2 leading-relaxed">
                {job.requirements}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

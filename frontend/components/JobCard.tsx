"use client";

import Link from "next/link";
import { MapPin, Clock } from "lucide-react";
import { Job } from "@/types";

const preferenceLabel: Record<string, string> = {
  FULLTIME: "Tam Zamanlı", PARTTIME: "Yarı Zamanlı", REMOTE: "Uzaktan", HYBRID: "Hibrit",
};
const preferenceColor: Record<string, string> = {
  FULLTIME: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  PARTTIME: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  REMOTE:   "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  HYBRID:   "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
};

function companyInitial(name?: string) {
  return name ? name.trim()[0].toUpperCase() : "?";
}

const avatarColors = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500",
  "bg-orange-500", "bg-rose-500", "bg-cyan-500",
];
function avatarColor(name?: string) {
  const i = (name?.charCodeAt(0) ?? 0) % avatarColors.length;
  return avatarColors[i];
}

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="group bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
        <div className="flex items-start gap-4">

          {/* Şirket avatarı */}
          <div className={`w-11 h-11 rounded-xl ${avatarColor(job.companyName)} text-white flex items-center justify-center text-lg font-bold shrink-0`}>
            {companyInitial(job.companyName)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-base group-hover:text-blue-600 transition-colors">
                  {job.title}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">{job.companyName}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {job.workingPreference && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${preferenceColor[job.workingPreference]}`}>
                    {preferenceLabel[job.workingPreference]}
                  </span>
                )}
                {job.salaryRange && (
                  <span className="text-sm font-semibold text-gray-700">{job.salaryRange}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400">
              {job.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {[job.town, job.city, job.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>

            {job.requirements && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                {job.requirements}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

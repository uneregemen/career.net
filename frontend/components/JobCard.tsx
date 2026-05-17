"use client";

import Link from "next/link";
import { MapPin, Building2, Clock } from "lucide-react";
import { Job } from "@/types";

const preferenceLabel: Record<string, string> = {
  FULLTIME: "Tam Zamanlı",
  PARTTIME: "Yarı Zamanlı",
  REMOTE: "Uzaktan",
  HYBRID: "Hibrit",
};

const preferenceColor: Record<string, string> = {
  FULLTIME: "bg-blue-100 text-blue-700",
  PARTTIME: "bg-orange-100 text-orange-700",
  REMOTE: "bg-green-100 text-green-700",
  HYBRID: "bg-purple-100 text-purple-700",
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{job.title}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Building2 size={14} /> {job.companyName}
              </span>
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {job.city}{job.town ? `, ${job.town}` : ""}
              </span>
            </div>
            {job.requirements && (
              <p className="text-sm text-gray-500 mt-2 line-clamp-2">{job.requirements}</p>
            )}
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {job.workingPreference && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${preferenceColor[job.workingPreference]}`}>
                {preferenceLabel[job.workingPreference]}
              </span>
            )}
            {job.salaryRange && (
              <span className="text-sm font-medium text-gray-700">{job.salaryRange}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

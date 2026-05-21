"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, applicationsApi } from "@/lib/api";
import { Application } from "@/types";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Briefcase, Users } from "lucide-react";

const statusLabel: Record<string, string> = {
  PENDING: "Beklemede",
  ACCEPTED: "Kabul edildi",
  REJECTED: "Reddedildi",
};
const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-600",
};

export default function AdminPage() {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [companyMsg, setCompanyMsg] = useState("");
  const [job, setJob] = useState({ title: "", description: "", country: "", city: "", town: "", workingPreference: "FULLTIME", requirements: "", salaryRange: "" });
  const [jobMsg, setJobMsg] = useState("");
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({});

  // Admin: onay bekleyen şirketleri listele
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["admin-companies"],
    queryFn: () => api.get("/api/v1/admin/companies").then((r) => r.data),
  });

  // İlanlarıma gelen başvurular
  const { data: jobApplications = [] } = useQuery<Application[]>({
    queryKey: ["my-job-applications"],
    queryFn: () => applicationsApi.myJobApplications().then((r) => r.data),
    retry: false,
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.put(`/api/v1/admin/companies/${id}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-companies"] }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ACCEPTED" | "REJECTED" | "PENDING" }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-job-applications"] }),
  });

  const registerCompany = async () => {
    try {
      await api.post("/api/v1/admin/companies/register", { name: companyName });
      setCompanyMsg("✓ Şirket kaydı oluşturuldu, onay bekleniyor.");
      setCompanyName("");
    } catch (e: any) {
      setCompanyMsg("Hata: " + (e.response?.data?.error || e.message));
    }
  };

  const postJob = async () => {
    try {
      await api.post("/api/v1/admin/jobs", job);
      setJobMsg("✓ İlan yayınlandı!");
    } catch (e: any) {
      setJobMsg("Hata: " + (e.response?.data?.error || e.message));
    }
  };

  // Başvuruları ilan bazında grupla
  const grouped = jobApplications.reduce<Record<string, { jobTitle: string; apps: Application[] }>>((acc, app) => {
    if (!acc[app.jobId]) acc[app.jobId] = { jobTitle: app.jobTitle, apps: [] };
    acc[app.jobId].apps.push(app);
    return acc;
  }, {});

  const toggleJob = (jobId: string) =>
    setExpandedJobs((prev) => ({ ...prev, [jobId]: !prev[jobId] }));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800">Şirket Paneli</h1>

      {/* ── Başvuru Yönetimi ───────────────────────────────── */}
      {Object.keys(grouped).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800">Başvuru Yönetimi</h2>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">
              {jobApplications.length} başvuru
            </span>
          </div>

          <div className="divide-y divide-gray-50">
            {Object.entries(grouped).map(([jobId, { jobTitle, apps }]) => {
              const isOpen = expandedJobs[jobId] ?? true;
              const pendingCount = apps.filter((a) => a.status === "PENDING").length;
              return (
                <div key={jobId}>
                  {/* İlan başlığı */}
                  <button
                    onClick={() => toggleJob(jobId)}
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <Briefcase size={15} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{jobTitle}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {apps.length} başvuru
                          {pendingCount > 0 && (
                            <span className="ml-2 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full text-xs font-medium">
                              {pendingCount} bekliyor
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {/* Başvuru listesi */}
                  {isOpen && (
                    <div className="bg-gray-50/50 divide-y divide-gray-100">
                      {apps.map((app) => (
                        <div key={app.id} className="flex items-center justify-between px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {app.applicantName ? app.applicantName[0].toUpperCase() : "?"}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">
                                {app.applicantName ?? "İsimsiz Kullanıcı"}
                              </p>
                              {app.applicantEmail && (
                                <p className="text-xs text-gray-400">{app.applicantEmail}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(app.appliedAt).toLocaleDateString("tr-TR", {
                                  day: "numeric", month: "long", year: "numeric"
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[app.status] ?? "bg-gray-100 text-gray-500"}`}>
                              {statusLabel[app.status] ?? app.status}
                            </span>
                            {app.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => updateStatus.mutate({ id: app.id, status: "ACCEPTED" })}
                                  disabled={updateStatus.isPending}
                                  title="Kabul Et"
                                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() => updateStatus.mutate({ id: app.id, status: "REJECTED" })}
                                  disabled={updateStatus.isPending}
                                  title="Reddet"
                                  className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Admin: Şirket Onayları ─────────────────────────── */}
      {companies.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h2 className="font-semibold text-gray-800">Şirket Onayları</h2>
          {companies.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{c.verified ? "✓ Onaylı" : "Onay bekliyor"}</p>
              </div>
              {!c.verified && (
                <button onClick={() => verify.mutate(c.id)}
                  className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">
                  <CheckCircle size={13} /> Onayla
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Şirket Kaydı ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Şirket Kaydı</h2>
          <p className="text-sm text-gray-500 mt-1">Kayıt sonrası admin onayı gereklidir.</p>
        </div>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Şirket Adı"
          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={registerCompany}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors">
          Kayıt Ol
        </button>
        {companyMsg && <p className="text-sm text-gray-600">{companyMsg}</p>}
      </div>

      {/* ── İlan Yayınla ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">İlan Yayınla</h2>
        {[
          { label: "Başlık *", key: "title", placeholder: "Frontend Developer" },
          { label: "Ülke", key: "country", placeholder: "Türkiye" },
          { label: "Şehir", key: "city", placeholder: "İstanbul" },
          { label: "İlçe", key: "town", placeholder: "Kadıköy" },
          { label: "Ücret Aralığı", key: "salaryRange", placeholder: "30.000 – 45.000 TRY" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">{label}</label>
            <input value={(job as any)[key]}
              onChange={(e) => setJob((j) => ({ ...j, [key]: e.target.value }))}
              placeholder={placeholder}
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Çalışma Şekli</label>
          <select value={job.workingPreference}
            onChange={(e) => setJob((j) => ({ ...j, workingPreference: e.target.value }))}
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="FULLTIME">Tam Zamanlı</option>
            <option value="PARTTIME">Yarı Zamanlı</option>
            <option value="REMOTE">Uzaktan</option>
            <option value="HYBRID">Hibrit</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Açıklama</label>
          <textarea value={job.description}
            onChange={(e) => setJob((j) => ({ ...j, description: e.target.value }))}
            rows={3} placeholder="İş tanımı..."
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase font-semibold tracking-wide">Aranan Nitelikler</label>
          <textarea value={job.requirements}
            onChange={(e) => setJob((j) => ({ ...j, requirements: e.target.value }))}
            rows={3} placeholder="React, TypeScript, 2+ yıl..."
            className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>
        <button onClick={postJob}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors">
          İlanı Yayınla
        </button>
        {jobMsg && <p className="text-sm text-gray-600">{jobMsg}</p>}
      </div>
    </div>
  );
}

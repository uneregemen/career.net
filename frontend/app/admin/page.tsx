"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { CheckCircle } from "lucide-react";

export default function AdminPage() {
  const qc = useQueryClient();
  const [companyName, setCompanyName] = useState("");
  const [companyMsg, setCompanyMsg] = useState("");
  const [job, setJob] = useState({ title: "", description: "", city: "", country: "Turkey", town: "", workingPreference: "FULLTIME", requirements: "", salaryRange: "" });
  const [jobMsg, setJobMsg] = useState("");

  // Admin: onay bekleyen şirketleri listele
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ["admin-companies"],
    queryFn: () => api.get("/api/v1/admin/companies").then((r) => r.data),
  });

  const verify = useMutation({
    mutationFn: (id: string) => api.put(`/api/v1/admin/companies/${id}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-companies"] }),
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

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <h1 className="text-2xl font-bold text-gray-800">Şirket Paneli</h1>

      {/* Admin: Şirket Onay Listesi */}
      {companies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          <h2 className="font-semibold text-gray-700">Şirket Onayları</h2>
          {companies.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                <p className="text-xs text-gray-400">{c.verified ? "✓ Onaylı" : "Onay bekliyor"}</p>
              </div>
              {!c.verified && (
                <button onClick={() => verify.mutate(c.id)}
                  className="flex items-center gap-1 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700">
                  <CheckCircle size={14} /> Onayla
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Şirket Kaydı */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Şirket Kaydı</h2>
        <p className="text-sm text-gray-500">Kayıt sonrası admin onayı gereklidir.</p>
        <input value={companyName} onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Şirket Adı"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={registerCompany}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          Kayıt Ol
        </button>
        {companyMsg && <p className="text-sm text-gray-600">{companyMsg}</p>}
      </div>

      {/* İlan Yayınla */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">İlan Yayınla</h2>
        {[
          { label: "Başlık", key: "title", placeholder: "Frontend Developer" },
          { label: "Şehir", key: "city", placeholder: "İstanbul" },
          { label: "İlçe", key: "town", placeholder: "Kadıköy" },
          { label: "Ücret Aralığı", key: "salaryRange", placeholder: "30000-45000 TRY" },
        ].map(({ label, key, placeholder }) => (
          <div key={key}>
            <label className="text-xs text-gray-500 uppercase font-medium">{label}</label>
            <input value={(job as any)[key]}
              onChange={(e) => setJob((j) => ({ ...j, [key]: e.target.value }))}
              placeholder={placeholder}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">Çalışma Şekli</label>
          <select value={job.workingPreference}
            onChange={(e) => setJob((j) => ({ ...j, workingPreference: e.target.value }))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="FULLTIME">Tam Zamanlı</option>
            <option value="PARTTIME">Yarı Zamanlı</option>
            <option value="REMOTE">Uzaktan</option>
            <option value="HYBRID">Hibrit</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">Açıklama</label>
          <textarea value={job.description}
            onChange={(e) => setJob((j) => ({ ...j, description: e.target.value }))}
            rows={3} placeholder="İş tanımı..."
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">Aranan Nitelikler</label>
          <textarea value={job.requirements}
            onChange={(e) => setJob((j) => ({ ...j, requirements: e.target.value }))}
            rows={3} placeholder="React, TypeScript, 2+ yıl..."
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={postJob}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          İlanı Yayınla
        </button>
        {jobMsg && <p className="text-sm text-gray-600">{jobMsg}</p>}
      </div>
    </div>
  );
}

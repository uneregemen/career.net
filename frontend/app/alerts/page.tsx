"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Trash2, Plus } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { JobAlert } from "@/types";

export default function AlertsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ positionKeywords: "", city: "", workingPreference: "" });

  const { data: alerts = [] } = useQuery<JobAlert[]>({
    queryKey: ["alerts"],
    queryFn: () => notificationsApi.getAlerts().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => notificationsApi.createAlert(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); setForm({ positionKeywords: "", city: "", workingPreference: "" }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <Bell size={24} /> İş Alarmları
      </h1>

      {/* Yeni alarm oluştur */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-700">Yeni Alarm Oluştur</h2>
        <input value={form.positionKeywords}
          onChange={(e) => setForm((f) => ({ ...f, positionKeywords: e.target.value }))}
          placeholder="Pozisyon (ör: Java Developer)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          placeholder="Şehir (ör: İstanbul)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={form.workingPreference}
          onChange={(e) => setForm((f) => ({ ...f, workingPreference: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Tüm Çalışma Şekilleri</option>
          <option value="FULLTIME">Tam Zamanlı</option>
          <option value="PARTTIME">Yarı Zamanlı</option>
          <option value="REMOTE">Uzaktan</option>
          <option value="HYBRID">Hibrit</option>
        </select>
        <button onClick={() => create.mutate()}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
          <Plus size={16} /> Alarm Ekle
        </button>
      </div>

      {/* Mevcut alarmlar */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-sm text-gray-400">Henüz alarm oluşturulmadı</p>
        ) : alerts.map((a) => (
          <div key={a.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">{a.positionKeywords || "Tüm Pozisyonlar"}</p>
              <p className="text-sm text-gray-500">
                {[a.city, a.workingPreference].filter(Boolean).join(" · ") || "Tüm Şehirler"}
              </p>
            </div>
            <button onClick={() => remove.mutate(a.id)}
              className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Save } from "lucide-react";
import { profileApi } from "@/lib/api";
import { UserProfile } from "@/types";

const GENDER_OPTIONS = [
  { value: "", label: "Belirtmek istemiyorum" },
  { value: "MALE", label: "Erkek" },
  { value: "FEMALE", label: "Kadın" },
  { value: "OTHER", label: "Diğer" },
];

export default function ProfilePage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: () => profileApi.get().then((r) => r.data),
  });

  const [form, setForm] = useState<UserProfile>({});

  // Profil yüklenince formu bir kez doldur
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const update = useMutation({
    mutationFn: () => profileApi.update(form as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const field = (key: keyof UserProfile) => ({
    value: (form[key] as string | number) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  if (isLoading) return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
        <User size={24} /> Profilim
      </h1>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Ad</label>
            <input {...field("name")} placeholder="Adınız"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Soyad</label>
            <input {...field("surname")} placeholder="Soyadınız"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">E-posta</label>
          <input {...field("email")} type="email" placeholder="ornek@email.com"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">Telefon</label>
          <input {...field("phone")} placeholder="+90 5XX XXX XX XX"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Cinsiyet</label>
            <select {...field("gender")}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase font-medium">Yaş</label>
            <input {...field("age")} type="number" min={16} max={99} placeholder="25"
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 uppercase font-medium">Meslek</label>
          <input {...field("profession")} placeholder="Frontend Developer"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <button onClick={() => update.mutate()} disabled={update.isPending}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          <Save size={16} />
          {update.isPending ? "Kaydediliyor..." : "Kaydet"}
        </button>

        {saved && (
          <p className="text-sm text-green-600 font-medium">✓ Profil güncellendi</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signIn, signUp, confirmSignUp, resendSignUpCode,
  confirmSignIn
} from "aws-amplify/auth";

type Mode = "login" | "register" | "confirm" | "new-password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(""); setLoading(true);
    try {
      const { nextStep } = await signIn({ username: email, password });

      switch (nextStep.signInStep) {
        case "DONE":
          router.push("/");
          break;
        // Cognito Console'dan onaylanan hesaplar bu adımı gerektirebilir
        case "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED":
          setMode("new-password");
          break;
        case "CONFIRM_SIGN_UP":
          setMode("confirm");
          break;
        default:
          setError(`Beklenmeyen adım: ${nextStep.signInStep}`);
      }
    } catch (e: any) {
      setError(e.message || "Giriş başarısız");
    } finally { setLoading(false); }
  };

  const handleNewPassword = async () => {
    setError(""); setLoading(true);
    try {
      const { nextStep } = await confirmSignIn({ challengeResponse: newPassword });
      if (nextStep.signInStep === "DONE") router.push("/");
    } catch (e: any) {
      setError(e.message || "Şifre değiştirme başarısız");
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    setError(""); setLoading(true);
    try {
      const { nextStep } = await signUp({ username: email, password, options: { userAttributes: { email } } });
      if (nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setMode("confirm");
      } else {
        // Cognito auto-confirm açıksa direkt giriş yap
        await handleLoginAfterConfirm();
      }
    } catch (e: any) {
      setError(e.message || "Kayıt başarısız");
    } finally { setLoading(false); }
  };

  const handleLoginAfterConfirm = async () => {
    const { nextStep } = await signIn({ username: email, password });
    if (nextStep.signInStep === "DONE") router.push("/");
  };

  const handleConfirm = async () => {
    setError(""); setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      const { nextStep } = await signIn({ username: email, password });
      if (nextStep.signInStep === "DONE") router.push("/");
    } catch (e: any) {
      setError(e.message || "Doğrulama başarısız");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {mode === "login" && "Giriş Yap"}
          {mode === "register" && "Kayıt Ol"}
          {mode === "confirm" && "E-posta Doğrula"}
          {mode === "new-password" && "Yeni Şifre Belirle"}
        </h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Email */}
          {(mode === "login" || mode === "register") && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-medium">E-posta</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
                placeholder="ornek@email.com"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Şifre */}
          {(mode === "login" || mode === "register") && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-medium">Şifre</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
                placeholder="••••••••"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Yeni şifre — Cognito zorunlu kılarsa */}
          {mode === "new-password" && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-medium">Yeni Şifre</label>
              <p className="text-xs text-gray-400 mt-1 mb-2">Güvenlik nedeniyle yeni bir şifre belirlemeniz gerekiyor.</p>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNewPassword()}
                placeholder="En az 8 karakter"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Doğrulama kodu */}
          {mode === "confirm" && (
            <div>
              <label className="text-xs text-gray-500 uppercase font-medium">Doğrulama Kodu</label>
              <p className="text-xs text-gray-400 mt-1 mb-2">{email} adresine gönderildi.</p>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                placeholder="123456"
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={() => resendSignUpCode({ username: email })}
                className="text-xs text-blue-600 hover:underline mt-2">
                Kodu tekrar gönder
              </button>
            </div>
          )}

          <button
            onClick={
              mode === "login" ? handleLogin :
              mode === "register" ? handleRegister :
              mode === "confirm" ? handleConfirm :
              handleNewPassword
            }
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 text-sm">
            {loading ? "Lütfen bekleyin..." :
              mode === "login" ? "Giriş Yap" :
              mode === "register" ? "Kayıt Ol" :
              mode === "confirm" ? "Doğrula" :
              "Şifreyi Güncelle"}
          </button>

          {mode === "login" && (
            <p className="text-sm text-center text-gray-500">
              Hesabın yok mu?{" "}
              <button onClick={() => { setMode("register"); setError(""); }}
                className="text-blue-600 hover:underline font-medium">Kayıt Ol</button>
            </p>
          )}
          {mode === "register" && (
            <p className="text-sm text-center text-gray-500">
              Zaten hesabın var mı?{" "}
              <button onClick={() => { setMode("login"); setError(""); }}
                className="text-blue-600 hover:underline font-medium">Giriş Yap</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

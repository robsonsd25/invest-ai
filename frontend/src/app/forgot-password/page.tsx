"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/api";
import Link from "next/link";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, novaSenha);
      toast.success("Senha redefinida com sucesso!");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            INVEST <span className="text-emerald-500">AI</span>
          </h1>
          <p className="text-gray-400 mt-2">Recupere o acesso à sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">E-mail cadastrado</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              placeholder="seu@email.com"
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nova Senha</label>
            <input 
              type="password" 
              value={novaSenha} 
              onChange={e => setNovaSenha(e.target.value)} 
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar Nova Senha</label>
            <input 
              type="password" 
              value={confirmarSenha} 
              onChange={e => setConfirmarSenha(e.target.value)} 
              required
              minLength={6}
              placeholder="Repita a nova senha"
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Lembrou a senha?{" "}
          <Link href="/login" className="text-emerald-500 hover:underline">
            Fazer Login
          </Link>
        </div>
      </div>
    </div>
  );
}
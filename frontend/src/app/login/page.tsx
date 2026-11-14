"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken } from "@/lib/api";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await login(email, senha);
      setToken(data.access_token);
      router.push("/"); // Redireciona para o Dashboard
    } catch (err: any) {
      setError(err.message);
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
          <p className="text-gray-400 mt-2">Acesse sua conta para continuar</p>
        </div>

        {error && <div className="bg-red-900/50 text-red-400 p-3 rounded mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">E-mail</label>
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
            <label className="block text-sm text-gray-400 mb-1">Senha</label>
            <input 
              type="password" 
              value={senha} 
              onChange={e => setSenha(e.target.value)} 
              required
              placeholder="••••••••"
              className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          Não tem uma conta?{" "}
          <Link href="/register" className="text-emerald-500 hover:underline">
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
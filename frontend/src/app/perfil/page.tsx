"use client";

import { useEffect, useState } from "react";
import { getMe, alterarSenha, Usuario, getToken } from "@/lib/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PerfilPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados do Formulário de Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [alterando, setAlterando] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    async function carregar() {
      try {
        const data = await getMe();
        setUsuario(data);
      } catch (err: any) {
        toast.error("Erro ao carregar dados do perfil.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    carregar();
  }, [router]);

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      toast.error("As novas senhas não coincidem.");
      return;
    }

    setAlterando(true);
    try {
      await alterarSenha(senhaAtual, novaSenha);
      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAlterando(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-64 mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 bg-gray-900 rounded-xl"></div>
          <div className="h-64 bg-gray-900 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <Link href="/" className="text-emerald-500 hover:underline text-sm mb-2 inline-block">
          &larr; Voltar ao Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-gray-400 mt-1">Gerencie sua conta e segurança</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        
        {/* CARD DE INFORMAÇÕES DO USUÁRIO */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-xl font-semibold mb-6 text-gray-200">Informações da Conta</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-500 mb-1">Nome</p>
              <p className="font-medium text-lg">{usuario?.nome}</p>
            </div>
            
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-500 mb-1">E-mail</p>
              <p className="font-medium text-lg">{usuario?.email}</p>
            </div>
            
            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-500 mb-1">Membro desde</p>
              <p className="font-medium text-lg">
                {usuario && new Date(usuario.criado_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                })}
              </p>
            </div>

            <div className="bg-gray-950 p-4 rounded-lg border border-gray-800">
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className={`px-2 py-1 rounded text-xs font-bold ${usuario?.ativo ? "bg-emerald-900 text-emerald-400" : "bg-red-900 text-red-400"}`}>
                {usuario?.ativo ? "ATIVO" : "INATIVO"}
              </span>
            </div>
          </div>
        </section>

        {/* CARD DE ALTERAÇÃO DE SENHA */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-xl font-semibold mb-6 text-gray-200">Alterar Senha</h2>
          
          <form onSubmit={handleAlterarSenha} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Senha Atual</label>
              <input 
                type="password" 
                value={senhaAtual} 
                onChange={e => setSenhaAtual(e.target.value)} 
                required
                placeholder="Sua senha atual"
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
              disabled={alterando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50 mt-4"
            >
              {alterando ? "Alterando..." : "Salvar Nova Senha"}
            </button>
          </form>
        </section>

      </div>
    </div>
  );
}
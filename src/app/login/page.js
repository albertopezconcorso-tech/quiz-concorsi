'use client';

import { useState } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrore('Credenziali non corrette o utente inesistente.');
      setCaricamento(false);
    } else if (data?.user) {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-[#23272D] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#2E343D] border border-[#434B57] p-8 rounded-3xl shadow-2xl">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mb-3 shadow-inner">
            🏛️
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider text-[#F8FAFC]">
            Quiz Concorsi
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1 text-center">
            Accedi con le credenziali fornite dal docente
          </p>
        </div>

        {errore && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs rounded-xl font-bold text-center">
            {errore}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#94A3B8] mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={caricamento}
            className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi al Simulatore'}
          </button>
        </form>
      </div>
    </main>
  );
}
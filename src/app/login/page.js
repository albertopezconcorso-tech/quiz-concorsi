'use client';

import { useState } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState('');
  const [caricamento, setCaricamento] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCaricamento(true);
    setErrore('');

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (error) {
      setErrore('Credenziali non valide. Verifica email e password.');
      setCaricamento(false);
    } else {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">
            🏛️
          </div>
          <h1 className="text-xl font-black text-[#F8FAFC] tracking-wide">QUIZ CONCORSI</h1>
          <p className="text-[#94A3B8] text-xs mt-3">Accedi con le credenziali fornite dal docente</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          <div>
            <label className="text-xs font-bold text-[#94A3B8] block mb-1.5">Email Studente</label>
            <input
              type="email"
              placeholder="nome@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-[#F8FAFC] placeholder-[#64748B] text-sm focus:outline-none focus:border-amber-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-[#94A3B8] block mb-1.5">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-[#F8FAFC] placeholder-[#64748B] text-sm focus:outline-none focus:border-amber-500 transition-all"
              required
            />
          </div>

          {errore && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl text-center">
              {errore}
            </div>
          )}

          <button
            type="submit"
            disabled={caricamento}
            className="mt-2 bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi al Simulatore'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#434B57] text-center">
          <Link href="/admin" className="text-xs font-semibold text-[#94A3B8] hover:text-amber-400 transition-colors">
            Sei l&apos;amministratore? Accedi qui →
          </Link>
        </div>
      </div>
    </main>
  );
}
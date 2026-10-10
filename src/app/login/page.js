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
    <main className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#121A2E] border border-[#25304A] p-9 rounded-2xl">
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mb-4">
            🏛️
          </div>
          <h1 className="text-2xl font-extrabold uppercase tracking-[0.14em] text-[#E8ECF8]">
            Quiz Concorsi
          </h1>
          <p className="text-sm text-[#8E9BBA] mt-2 text-center">
            Accedi con le credenziali fornite dal docente
          </p>
        </div>

        {errore && (
          <div className="mb-5 p-3.5 bg-rose-950/40 border border-rose-500/40 text-rose-300 text-sm rounded-xl font-bold text-center">
            {errore}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[#8E9BBA] mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
              className="w-full px-4 py-3.5 bg-[#0D1326] border border-[#1F2A4A] rounded-xl text-sm text-[#E8ECF8] placeholder:text-[#5B6788] focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#8E9BBA] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3.5 bg-[#0D1326] border border-[#1F2A4A] rounded-xl text-sm text-[#E8ECF8] placeholder:text-[#5B6788] focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={caricamento}
            className="w-full bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 mt-2"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi al Simulatore'}
          </button>
        </form>
      </div>
    </main>
  );
}
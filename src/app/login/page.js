'use client';

import { useState } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      email: email.trim(),
      password: password,
    });

    if (error) {
      setErrore('Credenziali non valide o utente inesistente.');
      setCaricamento(false);
    } else if (data?.user) {
      router.push('/');
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 relative font-sans">
      {/* Tasto rapido Admin in alto a destra */}
      <div className="absolute top-6 right-6">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200/80 px-3.5 py-2 rounded-xl hover:bg-slate-50 hover:text-blue-600 shadow-xs transition-all"
        >
          <span>⚙️</span> Accesso Admin
        </Link>
      </div>

      {/* Card Login */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 p-8">
        {/* Logo con nastro tricolore */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">📘</span>
            <div className="text-left">
              <span className="text-xl font-black text-[#1E3A8A] tracking-tight block">QUIZ</span>
              <span className="text-xl font-black text-blue-600 tracking-tight block -mt-2">CONCORSI</span>
            </div>
          </div>
          {/* Sottile linea tricolore */}
          <div className="flex w-20 h-1.5 rounded-full overflow-hidden mt-1 shadow-xs">
            <div className="w-1/3 bg-emerald-600"></div>
            <div className="w-1/3 bg-slate-200"></div>
            <div className="w-1/3 bg-rose-600"></div>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-800 text-center mb-1">Bentornato!</h2>
        <p className="text-xs text-slate-500 text-center mb-6">Inserisci le tue credenziali per riprendere lo studio</p>

        {errore && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-600 text-xs rounded-xl text-center font-medium">
            {errore}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es. studente@test.it"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={caricamento}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {caricamento ? 'Accesso in corso...' : 'Accedi alla Dashboard'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Accesso riservato. Se non possiedi un account contatta l'amministratore.
        </p>
      </div>
    </main>
  );
}
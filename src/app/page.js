'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [sessione, setSessione] = useState(null);
  const [materie, setMaterie] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSessione(session);
        caricaMaterie();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.push('/login');
      } else {
        setSessione(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function caricaMaterie() {
    const { data, error } = await supabase.from('materie').select('*').order('nome', { ascending: true });
    if (!error && data) {
      setMaterie(data);
    }
    setCaricamento(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (caricamento) {
    return (
      <div className="min-h-screen bg-[#23272D] flex items-center justify-center text-amber-500 font-bold">
        Caricamento portale...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col md:flex-row font-sans">
      {/* SIDEBAR SINISTRA */}
      <aside className="w-full md:w-64 bg-[#1C2025] border-b md:border-b-0 md:border-r border-[#434B57] p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
              🏛️
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wider uppercase text-[#F8FAFC]">Quiz Concorsi</h1>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <Link
              href="/"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[#3D2E1E] text-amber-400 border border-amber-500/40 text-sm font-semibold transition-all"
            >
              <span>🏠</span> Home
            </Link>
            <a
              href="#materie-sezione"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#2E343D] text-sm font-semibold transition-all"
            >
              <span>📚</span> Le mie materie
            </a>
            <Link
              href={materie.length > 0 ? `/quiz/${materie[0].id}` : '#'}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#2E343D] text-sm font-semibold transition-all"
            >
              <span>▶️</span> Simulazioni
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#2E343D] text-sm font-semibold transition-all mt-4 border-t border-[#434B57] pt-4"
            >
              <span>⚙️</span> Pannello Admin
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#434B57]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            Esci dall&apos;account
          </button>
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 p-6 lg:p-10 max-w-6xl overflow-y-auto">
        {/* HEADER BENVENUTO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-[#F8FAFC]">
              Ciao, {sessione?.user?.email?.split('@')[0]}! 👋
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">Sei pronto per una nuova sessione di studio?</p>
          </div>

          <div className="flex items-center gap-2.5 bg-[#2E343D] border border-[#434B57] px-3.5 py-2 rounded-2xl w-fit">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-[#1C2025] font-black flex items-center justify-center text-xs">
              {sessione?.user?.email?.[0]?.toUpperCase()}
            </div>
            <span className="text-xs font-semibold text-[#F8FAFC]">{sessione?.user?.email}</span>
          </div>
        </div>

        {/* GRIGLIA DASHBOARD: BANNER + STATISTICHE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* BANNER CENTRALE */}
          <div className="lg:col-span-2 bg-[#3B332B] border border-[#855325] rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-md">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-[#261E17] border border-amber-500/40 text-amber-400 font-bold text-[11px] rounded-full mb-4">
                🎯 Concorsi Pubblici Italia
              </span>
              <h3 className="text-xl lg:text-2xl font-black text-[#FFFBEB] mb-3 leading-snug">
                Il tuo obiettivo, la tua preparazione.
              </h3>
              <p className="text-sm italic text-[#E2E8F0] max-w-lg mb-1 leading-relaxed">
                &ldquo;Ogni fallimento è semplicemente un&apos;opportunità per ricominciare in modo più intelligente.&rdquo;
              </p>
              <p className="text-xs font-semibold text-amber-400 mb-6">
                — Henry Ford
              </p>
            </div>

            <div className="relative z-10">
              {materie.length > 0 && (
                <Link
                  href={`/quiz/${materie[0].id}`}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-extrabold px-6 py-3 rounded-2xl text-xs tracking-wide transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98]"
                >
                  ▶ Inizia un quiz
                </Link>
              )}
            </div>
          </div>

          {/* COLONNA STATISTICHE & AZIONI RAPIDE */}
          <div className="flex flex-col gap-4">
            <div className="bg-[#2E343D] border border-[#434B57] p-5 rounded-3xl">
              <h4 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-4">📊 Le tue statistiche</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#23272D] border border-[#434B57] p-3 rounded-2xl">
                  <span className="text-lg">🎖️</span>
                  <div className="text-xl font-black text-[#F8FAFC] mt-1">0</div>
                  <div className="text-[11px] text-[#94A3B8]">Simulazioni</div>
                </div>
                <div className="bg-[#23272D] border border-[#434B57] p-3 rounded-2xl">
                  <span className="text-lg">🎯</span>
                  <div className="text-xl font-black text-[#F8FAFC] mt-1">0%</div>
                  <div className="text-[11px] text-[#94A3B8]">Punteggio medio</div>
                </div>
                <div className="bg-[#23272D] border border-[#434B57] p-3 rounded-2xl">
                  <span className="text-lg">📝</span>
                  <div className="text-xl font-black text-[#F8FAFC] mt-1">0</div>
                  <div className="text-[11px] text-[#94A3B8]">Quiz svolti</div>
                </div>
                <div className="bg-[#23272D] border border-[#434B57] p-3 rounded-2xl">
                  <span className="text-lg">❌</span>
                  <div className="text-xl font-black text-[#F8FAFC] mt-1">0</div>
                  <div className="text-[11px] text-[#94A3B8]">Errori totali</div>
                </div>
              </div>
            </div>

            <div className="bg-[#2E343D] border border-[#434B57] p-4 rounded-3xl flex flex-col gap-2">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Azioni rapide</span>
              {materie.length > 0 && (
                <Link
                  href={`/quiz/${materie[0].id}`}
                  className="flex items-center justify-between p-3 rounded-2xl bg-[#23272D] border border-[#434B57] hover:border-amber-500/50 text-xs font-bold text-[#F8FAFC] transition-all"
                >
                  <span className="flex items-center gap-2">⚡ Esercitazione rapida</span>
                  <span className="text-amber-400">→</span>
                </Link>
              )}
              <Link
                href="/admin"
                className="flex items-center justify-between p-3 rounded-2xl bg-[#23272D] border border-[#434B57] hover:border-amber-500/50 text-xs font-bold text-[#F8FAFC] transition-all"
              >
                <span className="flex items-center gap-2">📁 Aggiungi nuove domande</span>
                <span className="text-amber-400">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* SEZIONE MATERIE */}
        <div id="materie-sezione" className="pt-2">
          <div className="flex justify-between items-end mb-5">
            <div>
              <h3 className="text-lg font-black text-[#F8FAFC]">📖 Le materie</h3>
              <p className="text-xs text-[#94A3B8]">Scegli la materia su cui vuoi esercitarti</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {materie.map((materia) => (
              <div
                key={materia.id}
                className="bg-[#2E343D] border border-[#434B57] p-5 rounded-3xl flex flex-col justify-between hover:border-amber-500/60 transition-all group"
              >
                <div>
                  <div className="w-9 h-9 rounded-2xl bg-[#23272D] border border-[#434B57] flex items-center justify-center text-sm mb-3">
                    📚
                  </div>
                  <h4 className="text-sm font-bold text-[#F8FAFC] group-hover:text-amber-400 transition-colors">
                    {materia.nome}
                  </h4>
                  <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed line-clamp-2">
                    {materia.descrizione || `Esercitati con i quiz ufficiali dedicati a ${materia.nome}.`}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-[#434B57]/60 flex items-center justify-between text-xs font-bold text-amber-400">
                  <Link href={`/quiz/${materia.id}`} className="hover:underline flex items-center gap-1">
                    Inizia sessione <span>→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
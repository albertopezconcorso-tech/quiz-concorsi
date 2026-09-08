'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [utente, setUtente] = useState(null);
  const [materie, setMaterie] = useState([]);
  const [statistiche, setStatistiche] = useState({
    simulazioni: 0,
    media: 0,
    svolti: 0,
    errori: 0,
  });
  const [attivita, setAttivita] = useState([]);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      // 1. Verifica utente autenticato
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUtente(user);

      // 2. Carica materie
      const { data: materieData } = await supabase
        .from('materie')
        .select('*')
        .order('nome', { ascending: true });
      setMaterie(materieData || []);

      // 3. Carica progressi dell'utente loggato
      const { data: progressiData } = await supabase
        .from('progressi')
        .select('*, materie(nome)')
        .order('created_at', { ascending: false });

      if (progressiData && progressiData.length > 0) {
        const totaliSvolti = progressiData.reduce((acc, curr) => acc + (curr.totale_domande || 0), 0);
        const totaliErrori = progressiData.reduce((acc, curr) => acc + (curr.errori || 0), 0);
        const corrette = progressiData.reduce((acc, curr) => acc + (curr.punteggio || 0), 0);
        const percMedia = totaliSvolti > 0 ? Math.round((corrette / totaliSvolti) * 100) : 0;

        setStatistiche({
          simulazioni: progressiData.length,
          media: percMedia,
          svolti: totaliSvolti,
          errori: totaliErrori,
        });

        setAttivita(progressiData.slice(0, 5));
      }

      setCaricamento(false);
    }

    initDashboard();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (caricamento) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-medium">
        Caricamento dashboard...
      </div>
    );
  }

  // Palette colori per le card delle materie
  const paletteColori = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', icon: '🧠' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', icon: '📖' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: '💻' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', icon: '⚖️' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', icon: '🏛️' },
  ];

  const nomeUtente = utente?.email?.split('@')[0] || 'Studente';
  const inizialeUtente = nomeUtente.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex font-sans">
      {/* 1. SIDEBAR SINISTRA */}
      <aside className="w-64 bg-white border-r border-slate-200/80 p-6 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Brand Logo con finitura tricolore */}
          <div className="flex items-center gap-3 mb-8">
            <span className="text-3xl">📘</span>
            <div>
              <span className="text-lg font-black text-[#1E3A8A] leading-tight block">QUIZ</span>
              <span className="text-lg font-black text-blue-600 leading-tight block -mt-1.5">CONCORSI</span>
              <div className="flex w-14 h-1 rounded-full overflow-hidden mt-1">
                <div className="w-1/3 bg-emerald-600"></div>
                <div className="w-1/3 bg-slate-200"></div>
                <div className="w-1/3 bg-rose-600"></div>
              </div>
            </div>
          </div>

          {/* Voci di navigazione */}
          <nav className="flex flex-col gap-1.5 text-sm font-medium">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 text-blue-600 font-semibold shadow-xs">
              <span>🏠</span> Home
            </Link>
            <a href="#materie" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <span>📚</span> Le mie materie
            </a>
            <button onClick={() => materie.length > 0 && router.push(`/quiz/${materie[0].id}`)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all text-left">
              <span>▶️</span> Simulazioni
            </button>
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
              <span>⚙️</span> Pannello Admin
            </Link>
          </nav>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-rose-600 hover:bg-rose-50 font-medium text-sm transition-all"
        >
          <span>🚪</span> Esci
        </button>
      </aside>

      {/* 2. CONTENUTO CENTRALE */}
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto max-w-5xl">
        {/* Intestazione di benvenuto */}
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
              Ciao, {nomeUtente.charAt(0).toUpperCase() + nomeUtente.slice(1)}! 👋
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Sei pronto per una nuova sessione di studio?</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Profilo utente */}
            <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 rounded-full py-1.5 px-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-inner">
                {inizialeUtente}
              </div>
              <span className="text-xs font-semibold text-slate-700 hidden sm:inline">{utente?.email}</span>
            </div>
          </div>
        </header>

        {/* Banner Obiettivo (Con badge istituzionale) */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-blue-700 to-indigo-800 text-white p-7 lg:p-8 mb-8 shadow-lg shadow-blue-700/15">
          <div className="max-w-md relative z-10">
            {/* Badge tricolore discreto */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-white/20">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              <span>Concorsi Pubblici Italia</span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black leading-snug mb-2">
              Il tuo obiettivo, la tua preparazione.
            </h2>
            <p className="text-blue-100 text-xs lg:text-sm leading-relaxed mb-6">
              Studia, metti alla prova le tue conoscenze e raggiungi i tuoi obiettivi. Ogni quiz ti avvicina al tuo traguardo.
            </p>
            {materie.length > 0 && (
              <Link
                href={`/quiz/${materie[0].id}`}
                className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs lg:text-sm px-5 py-3 rounded-xl shadow-md transition-all active:scale-[0.98]"
              >
                <span>▶</span> Inizia un quiz
              </Link>
            )}
          </div>
          {/* Elemento grafico decorativo */}
          <div className="absolute right-4 -bottom-6 text-8xl lg:text-9xl opacity-20 select-none pointer-events-none">
            📚
          </div>
        </div>

        {/* Sezione Le Materie */}
        <section id="materie" className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>📖</span> Le materie
            </h3>
            <span className="text-xs text-slate-500">Scegli la materia su cui vuoi esercitarti</span>
          </div>

          {materie.length === 0 ? (
            <p className="text-sm text-slate-400">Nessuna materia presente. Aggiungine una dal pannello Admin!</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materie.map((materia, index) => {
                const tema = paletteColori[index % paletteColori.length];
                return (
                  <Link
                    key={materia.id}
                    href={`/quiz/${materia.id}`}
                    className="bg-white border border-slate-200/80 hover:border-blue-400 p-5 rounded-2xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className={`w-11 h-11 rounded-xl ${tema.bg} ${tema.text} flex items-center justify-center text-xl mb-3`}>
                        {tema.icon}
                      </div>
                      <h4 className="font-bold text-slate-800 text-base mb-1 group-hover:text-blue-600 transition-colors">
                        {materia.nome}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                        {materia.descrizione || 'Esercitati con i quiz ufficiali dedicati a questa materia.'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-blue-600 transition-colors pt-3 border-t border-slate-100">
                      <span>Inizia sessione</span>
                      <span>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Ultime Attività */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🕒</span> Ultime attività
          </h3>
          {attivita.length === 0 ? (
            <p className="text-xs text-slate-400">Non hai ancora completato nessun quiz. Inizia subito per registrare i tuoi progressi!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100 pb-2">
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Materia</th>
                    <th className="pb-2">Punteggio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attivita.map((att) => (
                    <tr key={att.id} className="text-slate-700">
                      <td className="py-2.5 text-slate-500">
                        {new Date(att.created_at).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-2.5 font-medium">{att.materie?.nome || 'Materia'}</td>
                      <td className="py-2.5 font-bold text-emerald-600">
                        {att.punteggio}/{att.totale_domande} ({Math.round((att.punteggio / att.totale_domande) * 100)}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* 3. COLONNA DESTRA (STATISTICHE & PROGRESSI) */}
      <aside className="w-80 bg-white border-l border-slate-200/80 p-6 hidden xl:flex flex-col gap-6 shrink-0">
        {/* Le tue statistiche */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>📊</span> Le tue statistiche
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
              <div className="text-emerald-600 text-lg mb-1">🏆</div>
              <div className="text-xl font-black text-slate-900">{statistiche.simulazioni}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Simulazioni</div>
            </div>
            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-2xl">
              <div className="text-blue-600 text-lg mb-1">🎯</div>
              <div className="text-xl font-black text-slate-900">{statistiche.media}%</div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Punteggio medio</div>
            </div>
            <div className="p-3.5 bg-purple-50/60 border border-purple-100 rounded-2xl">
              <div className="text-purple-600 text-lg mb-1">📝</div>
              <div className="text-xl font-black text-slate-900">{statistiche.svolti}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Quiz svolti</div>
            </div>
            <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-2xl">
              <div className="text-rose-600 text-lg mb-1">❌</div>
              <div className="text-xl font-black text-slate-900">{statistiche.errori}</div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Errori totali</div>
            </div>
          </div>
        </div>

        {/* Azioni Rapide */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">Azioni rapide</h3>
          <div className="flex flex-col gap-2.5">
            {materie.length > 0 && (
              <Link
                href={`/quiz/${materie[0].id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">🎯</span>
                  <span>Esercitazione rapida</span>
                </div>
                <span>→</span>
              </Link>
            )}
            <Link
              href="/admin"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-all text-xs font-semibold text-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">⚙️</span>
                <span>Aggiungi nuove domande</span>
              </div>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* Piede colonna con Tricolore */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Quiz Concorsi © 2026</span>
          <div className="flex h-1.5 w-6 rounded-full overflow-hidden">
            <div className="w-1/3 bg-emerald-600"></div>
            <div className="w-1/3 bg-slate-200"></div>
            <div className="w-1/3 bg-rose-600"></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
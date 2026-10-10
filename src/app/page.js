'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [sessione, setSessione] = useState(null);
  const [materie, setMaterie] = useState([]);
  const [totaleErrori, setTotaleErrori] = useState(0);
  const [totaleQuiz, setTotaleQuiz] = useState(0);
  const [mediaPunti, setMediaPunti] = useState(0);
  const [caricamento, setCaricamento] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSessione(session);
        caricaDati(session.user.id);
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

  async function caricaDati(userId) {
    const { data: matData } = await supabase.from('materie').select('*').order('nome', { ascending: true });
    if (matData) setMaterie(matData);

    const { count: errCount } = await supabase
      .from('errori_utente')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    setTotaleErrori(errCount || 0);

    const { data: risData } = await supabase
      .from('risultati_quiz')
      .select('*')
      .eq('user_id', userId);

    if (risData && risData.length > 0) {
      setTotaleQuiz(risData.length);
      const media = Math.round(
        risData.reduce((acc, curr) => acc + (curr.punteggio_percentuale || 0), 0) / risData.length
      );
      setMediaPunti(media);
    }

    setCaricamento(false);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (caricamento) {
    return (
      <div className="min-h-screen bg-[#0B1220] flex items-center justify-center text-amber-500 font-bold">
        Caricamento portale...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col md:flex-row font-sans">
      {/* SIDEBAR SINISTRA */}
      <aside className="w-full md:w-72 bg-[#0E1526] border-b md:border-b-0 md:border-r border-[#1B2440] p-6 flex flex-col justify-between shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-10 px-1">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl">
              🏛️
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-[0.14em] uppercase text-[#E8ECF8]">Quiz Concorsi</h1>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-500 text-sm font-bold transition-all"
            >
              <span>🏠</span> Home
            </Link>
            <a
              href="#materie-sezione"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#8E9BBA] hover:text-[#E8ECF8] hover:bg-[#121A2E] text-sm font-semibold transition-all"
            >
              <span>📚</span> Le mie materie
            </a>
            <Link
              href="/simulazione"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#8E9BBA] hover:text-[#E8ECF8] hover:bg-[#121A2E] text-sm font-semibold transition-all"
            >
              <span>⚙️</span> Simulazione su Misura
            </Link>
            <Link
              href="/ripasso"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#8E9BBA] hover:text-[#E8ECF8] hover:bg-[#121A2E] text-sm font-semibold transition-all"
            >
              <span>🔄</span> Ripassa Errori ({totaleErrori})
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#8E9BBA] hover:text-[#E8ECF8] hover:bg-[#121A2E] text-sm font-semibold transition-all mt-4 border-t border-[#1B2440] pt-5"
            >
              <span>🔒</span> Pannello Admin
            </Link>
          </nav>
        </div>

        <div className="pt-6 border-t border-[#1B2440]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-rose-400 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 transition-all cursor-pointer"
          >
            Esci dall&apos;account
          </button>
        </div>
      </aside>

      {/* CONTENUTO PRINCIPALE */}
      <main className="flex-1 p-6 lg:p-12 max-w-6xl overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#E8ECF8]">
              Ciao, {sessione?.user?.email?.split('@')[0]}! 👋
            </h2>
            <p className="text-sm text-[#8E9BBA] mt-2">Sei pronto per una nuova sessione di studio?</p>
          </div>

          <div className="flex items-center gap-3 bg-[#121A2E] border border-[#25304A] pl-1.5 pr-5 py-1.5 rounded-full w-fit">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-[#1A1203] font-extrabold flex items-center justify-center text-sm">
              {sessione?.user?.email?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm font-semibold text-[#E8ECF8]">{sessione?.user?.email}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* BANNER CENTRALE */}
          <div className="lg:col-span-2 bg-[#121A2E] border border-[#25304A] rounded-2xl p-7 lg:p-10 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-bold text-xs rounded-full mb-6">
                🎯 Concorsi Pubblici Italia
              </span>
              <h3 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#E8ECF8] mb-4 leading-tight">
                Il tuo obiettivo, la tua preparazione.
              </h3>
              <p className="text-base italic text-[#C9D1E8] max-w-lg mb-2 leading-relaxed">
                &ldquo;Ogni fallimento è semplicemente un&apos;opportunità per ricominciare in modo più intelligente.&rdquo;
              </p>
              <p className="text-sm font-bold text-amber-500 mb-10">
                — Henry Ford
              </p>
            </div>

            <div className="relative z-10 flex flex-wrap gap-3">
              <Link
                href="/simulazione"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-bold px-7 py-3.5 rounded-xl text-sm transition-all active:scale-[0.98]"
              >
                ▶ Componi Simulazione (Multimateria)
              </Link>
            </div>
          </div>

          {/* STATISTICHE E AZIONI RAPIDE */}
          <div className="flex flex-col gap-5">
            <div className="bg-[#121A2E] border border-[#25304A] p-6 rounded-2xl">
              <h4 className="text-xs font-extrabold text-[#8E9BBA] uppercase tracking-[0.12em] mb-5">📊 Le tue statistiche</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0D1326] border border-[#1F2A4A] p-4 rounded-xl">
                  <span className="text-lg">🎖️</span>
                  <div className="text-2xl font-extrabold text-[#E8ECF8] mt-2">{totaleQuiz}</div>
                  <div className="text-xs text-[#8E9BBA] mt-0.5">Simulazioni</div>
                </div>
                <div className="bg-[#0D1326] border border-[#1F2A4A] p-4 rounded-xl">
                  <span className="text-lg">🎯</span>
                  <div className="text-2xl font-extrabold text-[#E8ECF8] mt-2">{mediaPunti}%</div>
                  <div className="text-xs text-[#8E9BBA] mt-0.5">Punteggio medio</div>
                </div>
                <div className="bg-[#0D1326] border border-[#1F2A4A] p-4 rounded-xl">
                  <span className="text-lg">📝</span>
                  <div className="text-2xl font-extrabold text-[#E8ECF8] mt-2">{totaleQuiz}</div>
                  <div className="text-xs text-[#8E9BBA] mt-0.5">Test svolti</div>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/30 p-4 rounded-xl">
                  <span className="text-lg">❌</span>
                  <div className="text-2xl font-extrabold text-rose-400 mt-2">{totaleErrori}</div>
                  <div className="text-xs text-[#8E9BBA] mt-0.5">Errori attivi</div>
                </div>
              </div>
            </div>

            <div className="bg-[#121A2E] border border-[#25304A] p-5 rounded-2xl flex flex-col gap-3">
              <span className="text-xs font-extrabold text-[#8E9BBA] uppercase tracking-[0.12em] mb-1">Azioni rapide</span>
              <Link
                href="/ripasso"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#0D1326] border border-[#1F2A4A] hover:border-amber-500/50 text-sm font-bold text-[#E8ECF8] transition-all"
              >
                <span className="flex items-center gap-2">🔄 Ripassa solo gli errori ({totaleErrori})</span>
                <span className="text-amber-500">→</span>
              </Link>
              <Link
                href="/simulazione"
                className="flex items-center justify-between p-3.5 rounded-xl bg-[#0D1326] border border-[#1F2A4A] hover:border-amber-500/50 text-sm font-bold text-[#E8ECF8] transition-all"
              >
                <span className="flex items-center gap-2">⚙️ Test Multimateria Personalizzato</span>
                <span className="text-amber-500">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* SEZIONE MATERIE */}
        <div id="materie-sezione" className="pt-2">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-[#E8ECF8]">📖 Allenamento Singola Materia</h3>
              <p className="text-sm text-[#8E9BBA] mt-1.5">Domande estratte in modo casuale ad ogni avvio</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {materie.map((materia) => (
              <div
                key={materia.id}
                className="bg-[#121A2E] border border-[#25304A] p-6 rounded-2xl flex flex-col justify-between hover:border-amber-500/50 transition-all group"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base mb-4">
                    📚
                  </div>
                  <h4 className="text-lg font-extrabold text-[#E8ECF8] group-hover:text-amber-500 transition-colors">
                    {materia.nome}
                  </h4>
                  <p className="text-sm text-[#8E9BBA] mt-2 leading-relaxed line-clamp-2">
                    {materia.descrizione || `Esercitati con i quiz casuali dedicati a ${materia.nome}.`}
                  </p>
                </div>

                <div className="pt-5 mt-5 border-t border-[#25304A] flex items-center justify-between text-sm font-bold text-amber-500">
                  <Link href={`/quiz/${materia.id}`} className="hover:underline flex items-center gap-1">
                    Avvia Quiz Casuale <span>→</span>
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
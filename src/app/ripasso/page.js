'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RipassoErroriPage() {
  const router = useRouter();
  const [domande, setDomande] = useState([]);
  const [indiceCorrente, setIndiceCorrente] = useState(0);
  const [risposteUtente, setRisposteUtente] = useState({});
  const [mostraSpiegazione, setMostraSpiegazione] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [quizFinito, setQuizFinito] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function caricaErrori() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      // Recupera gli ID delle domande errate per questo studente
      const { data: errData, error: errError } = await supabase
        .from('errori_utente')
        .select('domanda_id')
        .eq('user_id', session.user.id);

      if (!errError && errData && errData.length > 0) {
        const ids = errData.map((e) => e.domanda_id);

        // Recupera i dettagli delle domande dal database
        const { data: qData } = await supabase
          .from('domande')
          .select('*, materie(nome)')
          .in('id', ids);

        if (qData) {
          setDomande(qData);
        }
      }
      setCaricamento(false);
    }
    caricaErrori();
  }, [router]);

  const domandaAttuale = domande[indiceCorrente];

  const selezionaRisposta = async (lettera) => {
    if (risposteUtente[indiceCorrente] !== undefined) return;

    setRisposteUtente((prev) => ({
      ...prev,
      [indiceCorrente]: lettera,
    }));

    if (!userId || !domandaAttuale) return;

    // Se ora la indovina, viene rimossa dal registro degli errori!
    if (lettera === domandaAttuale.risposta_esatta) {
      await supabase
        .from('errori_utente')
        .delete()
        .match({ user_id: userId, domanda_id: domandaAttuale.id });
    }
  };

  const prossimaDomanda = () => {
    setMostraSpiegazione(false);
    if (indiceCorrente < domande.length - 1) {
      setIndiceCorrente((prev) => prev + 1);
    } else {
      setQuizFinito(true);
    }
  };

  const domandaPrecedente = () => {
    setMostraSpiegazione(false);
    if (indiceCorrente > 0) {
      setIndiceCorrente((prev) => prev - 1);
    }
  };

  if (caricamento) {
    return (
      <main className="min-h-screen bg-[#23272D] flex items-center justify-center text-amber-400 font-bold font-sans">
        Caricamento dei tuoi errori...
      </main>
    );
  }

  // Nessun errore memorizzato
  if (domande.length === 0) {
    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] max-w-md text-center shadow-xl">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-bold mb-2 text-[#F8FAFC]">Nessun errore da ripassare!</h2>
          <p className="text-xs text-[#94A3B8] mb-6 leading-relaxed">
            Non hai errori memorizzati o hai già corretto tutti i quesiti che avevi sbagliato in precedenza. Ottimo lavoro!
          </p>
          <Link
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black px-6 py-3 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </main>
    );
  }

  // Schermata finale ripasso
  if (quizFinito) {
    let recuperate = 0;
    let ancoraErrate = 0;
    domande.forEach((d, idx) => {
      if (risposteUtente[idx] === d.risposta_esatta) recuperate++;
      else if (risposteUtente[idx] !== undefined) ancoraErrate++;
    });

    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🎯
          </div>
          <h1 className="text-xl font-black text-[#F8FAFC] mb-1">Sessione Ripasso Conclusa!</h1>
          <p className="text-xs text-[#94A3B8] mb-6">Hai riesaminato le domande su cui avevi avuto difficoltà</p>

          <div className="grid grid-cols-2 gap-3 text-center mb-8">
            <div className="p-4 bg-[#23272D] rounded-2xl border border-emerald-500/30">
              <div className="text-emerald-400 text-2xl font-black">{recuperate}</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Imparate e rimosse dagli errori!</div>
            </div>
            <div className="p-4 bg-[#23272D] rounded-2xl border border-rose-500/30">
              <div className="text-rose-400 text-2xl font-black">{ancoraErrate}</div>
              <div className="text-[11px] text-[#94A3B8] mt-1">Ancora da perfezionare</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 text-center"
            >
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rispostaData = risposteUtente[indiceCorrente];
  const opzioni = [
    { lettera: 'A', testo: domandaAttuale.opzione_a },
    { lettera: 'B', testo: domandaAttuale.opzione_b },
    { lettera: 'C', testo: domandaAttuale.opzione_c },
    { lettera: 'D', testo: domandaAttuale.opzione_d },
  ].filter((o) => o.testo);

  const progressoPercent = Math.round(((indiceCorrente + 1) / domande.length) * 100);

  return (
    <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between bg-[#2E343D] border border-[#434B57] p-4 rounded-2xl shadow-sm">
          <Link
            href="/"
            className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <span>←</span> Torna alla Home
          </Link>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            Ripasso Errori ({domandaAttuale.materie?.nome || 'Materia'})
          </span>
          <span className="text-xs font-bold text-[#94A3B8] bg-[#23272D] px-2.5 py-1 rounded-lg border border-[#434B57]">
            {indiceCorrente + 1} / {domande.length}
          </span>
        </div>

        <div className="w-full bg-[#1C2025] h-2 rounded-full overflow-hidden border border-[#434B57]/50">
          <div
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressoPercent}%` }}
          />
        </div>

        <div className="bg-[#2E343D] p-6 lg:p-8 rounded-3xl border border-[#434B57] shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#23272D] text-rose-400 border border-rose-500/30">
              Quesito da Recuperare #{indiceCorrente + 1}
            </span>
          </div>

          <p className="text-base lg:text-lg font-bold text-[#F8FAFC] leading-relaxed mb-8">
            {domandaAttuale.testo}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            {opzioni.map((opt) => {
              const isSelezionata = rispostaData === opt.lettera;
              const isCorretta = opt.lettera === domandaAttuale.risposta_esatta;
              const giaRisposto = rispostaData !== undefined;

              let stileScatola = 'bg-[#23272D] border-[#434B57] hover:border-amber-500/60 text-[#F8FAFC]';
              let stileBadge = 'bg-[#2E343D] text-[#94A3B8] border-[#434B57]';

              if (giaRisposto) {
                if (isCorretta) {
                  stileScatola = 'bg-emerald-950/40 border-emerald-500 text-emerald-100';
                  stileBadge = 'bg-emerald-500 text-[#1C2025] font-black border-emerald-400';
                } else if (isSelezionata && !isCorretta) {
                  stileScatola = 'bg-rose-950/40 border-rose-500 text-rose-100';
                  stileBadge = 'bg-rose-500 text-white font-black border-rose-400';
                } else {
                  stileScatola = 'bg-[#23272D]/50 border-[#434B57]/40 text-[#64748B] opacity-60';
                }
              }

              return (
                <button
                  key={opt.lettera}
                  onClick={() => selezionaRisposta(opt.lettera)}
                  disabled={giaRisposto}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 text-xs lg:text-sm font-medium cursor-pointer ${stileScatola}`}
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${stileBadge}`}>
                      {opt.lettera}
                    </span>
                    <span className="leading-snug">{opt.testo}</span>
                  </div>

                  {giaRisposto && isCorretta && (
                    <span className="text-emerald-400 font-extrabold text-xs shrink-0">✓ Corretta (Rimosso dagli errori!)</span>
                  )}
                  {giaRisposto && isSelezionata && !isCorretta && (
                    <span className="text-rose-400 font-extrabold text-xs shrink-0">✕ Ancora Errata</span>
                  )}
                </button>
              );
            })}
          </div>

          {domandaAttuale.spiegazione && rispostaData !== undefined && (
            <div className="mb-6 pt-2">
              <button
                onClick={() => setMostraSpiegazione(!mostraSpiegazione)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>💡</span>
                {mostraSpiegazione ? 'Nascondi Spiegazione Normativa' : 'Spiegamelo (Commento Didattico)'}
                <span>{mostraSpiegazione ? '▴' : '▾'}</span>
              </button>

              {mostraSpiegazione && (
                <div className="mt-3 p-4 bg-[#3D2E1E] rounded-2xl border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                  <strong className="block text-amber-400 mb-1 font-bold">Riferimento Didattico / Giuridico:</strong>
                  {domandaAttuale.spiegazione}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#434B57] gap-3">
            <button
              onClick={domandaPrecedente}
              disabled={indiceCorrente === 0}
              className="px-4 py-3 bg-[#23272D] border border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC] disabled:opacity-30 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              ← Precedente
            </button>

            <button
              onClick={prossimaDomanda}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              {indiceCorrente === domande.length - 1 ? 'Concludi Ripasso 🏁' : 'Prossimo Errore →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
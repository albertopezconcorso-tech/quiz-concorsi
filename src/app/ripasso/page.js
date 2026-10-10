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
  const [rimozioneInCorso, setRimozioneInCorso] = useState(false);

  useEffect(() => {
    async function caricaErrori() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      const { data: errData, error: errError } = await supabase
        .from('errori_utente')
        .select('domanda_id')
        .eq('user_id', session.user.id);

      if (!errError && errData && errData.length > 0) {
        const ids = errData.map((e) => e.domanda_id);

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

  // Eliminazione manuale tramite la "X"
  const rimuoviErroreManuale = async () => {
    if (!userId || !domandaAttuale || rimozioneInCorso) return;

    setRimozioneInCorso(true);

    await supabase
      .from('errori_utente')
      .delete()
      .match({ user_id: userId, domanda_id: domandaAttuale.id });

    // Rimuove la domanda dalla memoria locale
    const nuoveDomande = domande.filter((_, idx) => idx !== indiceCorrente);
    setDomande(nuoveDomande);
    setMostraSpiegazione(false);

    if (nuoveDomande.length === 0) {
      setQuizFinito(true);
    } else if (indiceCorrente >= nuoveDomande.length) {
      setIndiceCorrente(nuoveDomande.length - 1);
    }

    setRimozioneInCorso(false);
  };

  const selezionaRisposta = async (lettera) => {
    if (risposteUtente[indiceCorrente] !== undefined) return;

    setRisposteUtente((prev) => ({
      ...prev,
      [indiceCorrente]: lettera,
    }));

    if (!userId || !domandaAttuale) return;

    // Se indovina, viene rimossa in automatico
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
      <main className="min-h-screen bg-[#0B1220] flex items-center justify-center text-amber-500 font-bold font-sans">
        Caricamento dei tuoi errori...
      </main>
    );
  }

  if (domande.length === 0 && !quizFinito) {
    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#121A2E] p-8 rounded-2xl border border-[#25304A] max-w-md text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-lg font-bold mb-2 text-[#E8ECF8]">Nessun errore da ripassare!</h2>
          <p className="text-sm text-[#8E9BBA] mb-6 leading-relaxed">
            Hai una preparazione perfetta: non ci sono errori memorizzati nel tuo profilo.
          </p>
          <Link
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold px-6 py-3 rounded-xl text-sm transition-all"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (quizFinito) {
    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#121A2E] p-8 rounded-2xl border border-[#25304A] text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-4">
            🎯
          </div>
          <h1 className="text-xl font-extrabold text-[#E8ECF8] mb-2">Sessione di Ripasso Conclusa!</h1>
          <p className="text-sm text-[#8E9BBA] mb-6">
            Le domande corrette o rimosse con la ✕ sono state eliminate definitivamente dal tuo archivio errori.
          </p>

          <Link
            href="/"
            className="w-full bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold py-3.5 rounded-xl text-sm transition-all text-center block"
          >
            Torna alla Dashboard
          </Link>
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
    <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-5">
        <div className="flex items-center justify-between bg-[#121A2E] border border-[#25304A] p-4 rounded-2xl">
          <Link
            href="/"
            className="text-sm font-bold text-[#8E9BBA] hover:text-amber-500 transition-colors flex items-center gap-1.5"
          >
            <span>←</span> Torna alla Home
          </Link>
          <span className="text-sm font-extrabold uppercase tracking-wider text-amber-500">
            Ripasso Errori ({domandaAttuale.materie?.nome || 'Materia'})
          </span>
          <span className="text-sm font-bold text-[#8E9BBA] bg-[#0D1326] px-2.5 py-1 rounded-lg border border-[#25304A]">
            {indiceCorrente + 1} / {domande.length}
          </span>
        </div>

        <div className="w-full bg-[#0D1326] h-2 rounded-full overflow-hidden border border-[#25304A]/50">
          <div
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressoPercent}%` }}
          />
        </div>

        <div className="bg-[#121A2E] p-6 lg:p-8 rounded-2xl border border-[#25304A]">
          {/* HEADER DELLA DOMANDA CON PULSANTE RAPIDO X */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#0D1326] text-rose-400 border border-rose-500/30">
              Quesito da Recuperare #{indiceCorrente + 1}
            </span>

            <button
              onClick={rimuoviErroreManuale}
              disabled={rimozioneInCorso}
              title="Elimina definitivamente questo errore"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              <span>✕</span>
              <span>{rimozioneInCorso ? 'Rimozione...' : 'Non la sbaglio più (Elimina)'}</span>
            </button>
          </div>

          <p className="text-lg lg:text-xl font-bold text-[#E8ECF8] leading-relaxed mb-8">
            {domandaAttuale.testo}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            {opzioni.map((opt) => {
              const isSelezionata = rispostaData === opt.lettera;
              const isCorretta = opt.lettera === domandaAttuale.risposta_esatta;
              const giaRisposto = rispostaData !== undefined;

              let stileScatola = 'bg-[#0D1326] border-[#25304A] hover:border-amber-500/60 text-[#E8ECF8]';
              let stileBadge = 'bg-[#121A2E] text-[#8E9BBA] border-[#25304A]';

              if (giaRisposto) {
                if (isCorretta) {
                  stileScatola = 'bg-emerald-950/40 border-emerald-500 text-emerald-100';
                  stileBadge = 'bg-emerald-500 text-[#1A1203] font-extrabold border-emerald-400';
                } else if (isSelezionata && !isCorretta) {
                  stileScatola = 'bg-rose-950/40 border-rose-500 text-rose-100';
                  stileBadge = 'bg-rose-500 text-white font-extrabold border-rose-400';
                } else {
                  stileScatola = 'bg-[#0D1326]/50 border-[#25304A]/40 text-[#64748B] opacity-60';
                }
              }

              return (
                <button
                  key={opt.lettera}
                  onClick={() => selezionaRisposta(opt.lettera)}
                  disabled={giaRisposto}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 text-sm lg:text-base font-medium cursor-pointer ${stileScatola}`}
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <span className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${stileBadge}`}>
                      {opt.lettera}
                    </span>
                    <span className="leading-snug">{opt.testo}</span>
                  </div>

                  {giaRisposto && isCorretta && (
                    <span className="text-emerald-400 font-extrabold text-sm shrink-0">✓ Corretta (Rimosso dagli errori!)</span>
                  )}
                  {giaRisposto && isSelezionata && !isCorretta && (
                    <span className="text-rose-400 font-extrabold text-sm shrink-0">✕ Ancora Errata</span>
                  )}
                </button>
              );
            })}
          </div>

          {domandaAttuale.spiegazione && rispostaData !== undefined && (
            <div className="mb-6 pt-2">
              <button
                onClick={() => setMostraSpiegazione(!mostraSpiegazione)}
                className="text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>💡</span>
                {mostraSpiegazione ? 'Nascondi Spiegazione Normativa' : 'Spiegamelo (Commento Didattico)'}
                <span>{mostraSpiegazione ? '▴' : '▾'}</span>
              </button>

              {mostraSpiegazione && (
                <div className="mt-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-sm text-amber-100 leading-relaxed">
                  <strong className="block text-amber-500 mb-1 font-bold">Riferimento Didattico / Giuridico:</strong>
                  {domandaAttuale.spiegazione}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-[#25304A] gap-3">
            <button
              onClick={domandaPrecedente}
              disabled={indiceCorrente === 0}
              className="px-4 py-3 bg-[#0D1326] border border-[#25304A] text-[#8E9BBA] hover:text-[#E8ECF8] disabled:opacity-30 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              ← Precedente
            </button>

            <button
              onClick={prossimaDomanda}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold py-3 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              {indiceCorrente === domande.length - 1 ? 'Concludi Ripasso 🏁' : 'Prossimo Errore →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
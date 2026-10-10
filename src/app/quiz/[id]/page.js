'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function mescolaArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const OPZIONI_LOGICA = [
  { id: 'tutte', titolo: 'Tutta la Logica (Mista)', desc: 'Esercitazione combinata su tutte le tipologie', icona: '🔀' },
  { id: 'Logica figurale', titolo: 'Logica Figurale', desc: 'Serie visive, matrici, tessere e rotazioni grafiche', icona: '🖼️' },
  { id: 'Logica numerica', titolo: 'Logica Numerica', desc: 'Serie di numeri, matrici aritmetiche e calcolo rapido', icona: '🔢' },
  { id: 'Logica deduttiva e ragionamento', titolo: 'Logica Deduttiva e Ragionamento', desc: 'Sillogismi, relazioni di parentela, negazioni logiche', icona: '🧠' }
];

export default function QuizPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unwrappedParams = use(params);
  const materiaId = unwrappedParams?.id;

  // Lettura della quantità personalizzata se passata via URL (?q=... o ?numero=...)
  const quantitaParam = searchParams.get('q') || searchParams.get('numero') || searchParams.get('quantita');
  const limitePersonalizzato = quantitaParam && !isNaN(parseInt(quantitaParam)) ? parseInt(quantitaParam) : null;

  const [tutteLeDomande, setTutteLeDomande] = useState([]);
  const [domande, setDomande] = useState([]);
  const [materia, setMateria] = useState(null);
  const [selezionataSubtipo, setSelezionataSubtipo] = useState(null);
  const [mostraFiltroLogica, setMostraFiltroLogica] = useState(false);

  const [indiceCorrente, setIndiceCorrente] = useState(0);
  const [risposteUtente, setRisposteUtente] = useState({});
  const [mostraSpiegazione, setMostraSpiegazione] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [quizFinito, setQuizFinito] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function initQuiz() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      const { data: matData } = await supabase
        .from('materie')
        .select('*')
        .eq('id', materiaId)
        .single();
      if (matData) setMateria(matData);

      // SCARICHIAMO TUTTI I QUESITI SUPERANDO IL LIMITE DI 1000 RIGHE DI SUPABASE
      let allQuestions = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: qChunk, error: qErr } = await supabase
          .from('domande')
          .select('*')
          .eq('materia_id', materiaId)
          .range(from, from + step - 1);

        if (qErr || !qChunk || qChunk.length === 0) {
          hasMore = false;
        } else {
          allQuestions = [...allQuestions, ...qChunk];
          if (qChunk.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }

      if (allQuestions.length > 0) {
        setTutteLeDomande(allQuestions);
        // Se è Logica, mostriamo prima la selezione della branca
        if (matData?.nome?.toLowerCase() === 'logica') {
          setMostraFiltroLogica(true);
        } else {
          const rimescolate = mescolaArray(allQuestions);
          setDomande(limitePersonalizzato ? rimescolate.slice(0, limitePersonalizzato) : rimescolate);
        }
      }
      setCaricamento(false);
    }

    if (materiaId) {
      initQuiz();
    }
  }, [materiaId, router, limitePersonalizzato]);

  const avviaQuizLogica = (subtipoId) => {
    let filtrate = [...tutteLeDomande];
    if (subtipoId !== 'tutte') {
      filtrate = filtrate.filter(
        (d) => d.sottotipologia?.trim()?.toLowerCase() === subtipoId.trim().toLowerCase()
      );
    }
    setSelezionataSubtipo(subtipoId);
    
    const rimescolate = mescolaArray(filtrate);
    // Se c'è un limite impostato dall'utente lo rispetta, altrimenti prende tutte le domande disponibili
    setDomande(limitePersonalizzato ? rimescolate.slice(0, limitePersonalizzato) : rimescolate);

    setMostraFiltroLogica(false);
    setIndiceCorrente(0);
    setRisposteUtente({});
  };

  const domandaAttuale = domande[indiceCorrente];

  const selezionaRisposta = async (lettera) => {
    if (risposteUtente[indiceCorrente] !== undefined) return;

    setRisposteUtente((prev) => ({
      ...prev,
      [indiceCorrente]: lettera,
    }));

    if (!userId || !domandaAttuale) return;

    if (lettera !== domandaAttuale.risposta_esatta) {
      await supabase.from('errori_utente').upsert(
        { user_id: userId, domanda_id: domandaAttuale.id },
        { onConflict: 'user_id,domanda_id' }
      );
    } else {
      await supabase
        .from('errori_utente')
        .delete()
        .match({ user_id: userId, domanda_id: domandaAttuale.id });
    }
  };

  const prossimaDomanda = async () => {
    setMostraSpiegazione(false);
    if (indiceCorrente < domande.length - 1) {
      setIndiceCorrente((prev) => prev + 1);
    } else {
      await calcolaEConcludi();
    }
  };

  const domandaPrecedente = () => {
    setMostraSpiegazione(false);
    if (indiceCorrente > 0) {
      setIndiceCorrente((prev) => prev - 1);
    }
  };

  const calcolaEConcludi = async () => {
    setSalvataggioInCorso(true);
    let corrette = 0;
    let errate = 0;

    domande.forEach((d, idx) => {
      const r = risposteUtente[idx];
      if (r === d.risposta_esatta) corrette++;
      else if (r !== undefined) errate++;
    });

    const punteggio = Math.round((corrette / (domande.length || 1)) * 100);

    if (userId) {
      await supabase.from('risultati_quiz').insert([
        {
          user_id: userId,
          materia_id: materiaId,
          totale_domande: domande.length,
          risposte_esatte: corrette,
          risposte_errate: errate,
          punteggio_percentuale: punteggio,
        },
      ]);
    }

    setQuizFinito(true);
    setSalvataggioInCorso(false);
  };

  if (caricamento) {
    return (
      <main className="min-h-screen bg-[#0B1220] flex items-center justify-center text-amber-500 font-bold font-sans">
        Caricamento quesiti...
      </main>
    );
  }

  if (mostraFiltroLogica) {
    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] p-6 font-sans flex flex-col items-center justify-center">
        <div className="w-full max-w-xl bg-[#121A2E] border border-[#25304A] p-8 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-sm font-bold text-[#8E9BBA] hover:text-amber-500 flex items-center gap-1">
              ← Esci
            </Link>
            <span className="text-sm font-extrabold uppercase text-amber-500 tracking-wider">
              Allenamento per Tipologia
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-2xl mx-auto mb-3">
              🧩
            </div>
            <h1 className="text-xl font-extrabold text-[#E8ECF8]">Modulo Logica</h1>
            <p className="text-sm text-[#8E9BBA] mt-1">Scegli la branca di quesiti su cui desideri metterti alla prova</p>
          </div>

          <div className="flex flex-col gap-3">
            {OPZIONI_LOGICA.map((opz) => {
              const conteggio = opz.id === 'tutte' 
                ? tutteLeDomande.length 
                : tutteLeDomande.filter(
                    (d) => d.sottotipologia?.trim()?.toLowerCase() === opz.id.trim().toLowerCase()
                  ).length;

              return (
                <button
                  key={opz.id}
                  onClick={() => avviaQuizLogica(opz.id)}
                  className="p-4 rounded-2xl bg-[#0D1326] border border-[#25304A] hover:border-amber-500/60 text-left transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-2xl">{opz.icona}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[#E8ECF8] group-hover:text-amber-500 transition-colors">
                          {opz.titolo}
                        </h3>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#0D1326] text-amber-500 border border-[#25304A]">
                          {conteggio} quesiti
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8E9BBA]">{opz.desc}</p>
                    </div>
                  </div>
                  <span className="text-amber-500 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    Avvia →
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  if (domande.length === 0) {
    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#121A2E] p-8 rounded-2xl border border-[#25304A] max-w-md text-center">
          <div className="text-3xl mb-3">📭</div>
          <h2 className="text-lg font-bold mb-2 text-[#E8ECF8]">Nessuna domanda presente</h2>
          <p className="text-sm text-[#8E9BBA] mb-6">
            Non sono ancora presenti quesiti per la tipologia o materia selezionata.
          </p>
          <button
            onClick={() => setMostraFiltroLogica(materia?.nome?.toLowerCase() === 'logica')}
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold px-6 py-3 rounded-xl text-sm transition-all cursor-pointer"
          >
            Torna alla Selezione
          </button>
        </div>
      </main>
    );
  }

  if (quizFinito) {
    let corrette = 0;
    let errate = 0;
    domande.forEach((d, idx) => {
      if (risposteUtente[idx] === d.risposta_esatta) corrette++;
      else if (risposteUtente[idx] !== undefined) errate++;
    });
    const nonRisposte = domande.length - (corrette + errate);
    const percentuale = Math.round((corrette / domande.length) * 100);

    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#121A2E] p-8 rounded-2xl border border-[#25304A] text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-4">
            🏆
          </div>
          <h1 className="text-2xl font-extrabold text-[#E8ECF8] mb-1">Simulazione Conclusa!</h1>
          <p className="text-sm text-[#8E9BBA] mb-6">
            {materia?.nome} {selezionataSubtipo && selezionataSubtipo !== 'tutte' ? `• ${selezionataSubtipo}` : ''}
          </p>

          <div className="p-5 bg-[#0D1326] rounded-2xl border border-[#25304A] mb-6">
            <div className="text-4xl font-extrabold text-amber-500 mb-1">{percentuale}%</div>
            <p className="text-[11px] text-[#8E9BBA] uppercase tracking-wider font-bold">Punteggio Complessivo</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-8">
            <div className="p-3 bg-[#0D1326] rounded-xl border border-emerald-500/30">
              <div className="text-emerald-400 text-lg font-extrabold">{corrette}</div>
              <div className="text-[10px] text-[#8E9BBA]">Esatte</div>
            </div>
            <div className="p-3 bg-[#0D1326] rounded-xl border border-rose-500/30">
              <div className="text-rose-400 text-lg font-extrabold">{errate}</div>
              <div className="text-[10px] text-[#8E9BBA]">Errate (Salvate)</div>
            </div>
            <div className="p-3 bg-[#0D1326] rounded-xl border border-[#25304A]">
              <div className="text-[#8E9BBA] text-lg font-extrabold">{nonRisposte}</div>
              <div className="text-[10px] text-[#8E9BBA]">Saltate</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setRisposteUtente({});
                setIndiceCorrente(0);
                setQuizFinito(false);
                setDomande((prev) => mescolaArray(prev));
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold py-3.5 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              Ripeti con Quesiti Mescolati
            </button>
            <Link
              href="/"
              className="w-full bg-[#0D1326] hover:border-amber-500/50 text-[#E8ECF8] font-bold py-3.5 rounded-xl text-sm border border-[#25304A] transition-all text-center"
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
    <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-5">
        <div className="flex items-center justify-between bg-[#121A2E] border border-[#25304A] p-4 rounded-2xl">
          <button
            onClick={() => {
              if (materia?.nome?.toLowerCase() === 'logica') {
                setMostraFiltroLogica(true);
              } else {
                router.push('/');
              }
            }}
            className="text-sm font-bold text-[#8E9BBA] hover:text-amber-500 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span> {materia?.nome?.toLowerCase() === 'logica' ? 'Cambia Tipologia' : 'Esci dal Quiz'}
          </button>
          <span className="text-sm font-extrabold uppercase tracking-wider text-amber-500">
            {materia?.nome} {domandaAttuale.sottotipologia ? `• ${domandaAttuale.sottotipologia}` : ''}
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
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#0D1326] text-amber-500 border border-amber-500/30">
              Quesito #{indiceCorrente + 1} {domandaAttuale.sottotipologia ? `(${domandaAttuale.sottotipologia})` : '(Casuale)'}
            </span>
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
                    <span
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 ${stileBadge}`}
                    >
                      {opt.lettera}
                    </span>
                    <span className="leading-snug">{opt.testo}</span>
                  </div>

                  {giaRisposto && isCorretta && (
                    <span className="text-emerald-400 font-extrabold text-sm shrink-0">✓ Esatta</span>
                  )}
                  {giaRisposto && isSelezionata && !isCorretta && (
                    <span className="text-rose-400 font-extrabold text-sm shrink-0">✕ Errata</span>
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
                {mostraSpiegazione ? 'Nascondi Spiegazione / Metodo' : 'Mostra Spiegazione / Risoluzione Rapida'}
                <span>{mostraSpiegazione ? '▴' : '▾'}</span>
              </button>

              {mostraSpiegazione && (
                <div className="mt-3 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/30 text-sm text-amber-100 leading-relaxed">
                  <strong className="block text-amber-500 mb-1 font-bold">Risoluzione Didattica:</strong>
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
              disabled={salvataggioInCorso}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-extrabold py-3 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {salvataggioInCorso
                ? 'Salvataggio...'
                : indiceCorrente === domande.length - 1
                ? 'Concludi Simulazione 🏁'
                : 'Prossima Domanda →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
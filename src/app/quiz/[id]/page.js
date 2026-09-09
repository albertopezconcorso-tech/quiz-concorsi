'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';
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
  const unwrappedParams = use(params);
  const materiaId = unwrappedParams?.id;

  const [tutteLeDomande, setTutteLeDomande] = useState([]);
  const [domande, setDomande] = useState([]);
  const [materia, setMateria] = useState(null);
  const [selezionataSubtipo, setSelezionataSubtipo] = useState(null); // per logica
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

      const { data: qData, error } = await supabase
        .from('domande')
        .select('*')
        .eq('materia_id', materiaId);

      if (!error && qData) {
        setTutteLeDomande(qData);
        // Se è Logica, mostriamo prima la selezione della branca
        if (matData?.nome?.toLowerCase() === 'logica') {
          setMostraFiltroLogica(true);
        } else {
          setDomande(mescolaArray(qData).slice(0, 30));
        }
      }
      setCaricamento(false);
    }

    if (materiaId) {
      initQuiz();
    }
  }, [materiaId, router]);

  const avviaQuizLogica = (subtipoId) => {
    let filtrate = [...tutteLeDomande];
    if (subtipoId !== 'tutte') {
      filtrate = filtrate.filter((d) => d.sottotipologia === subtipoId);
    }
    setSelezionataSubtipo(subtipoId);
    setDomande(mescolaArray(filtrate).slice(0, 30));
    setMostraFiltroLogica(false);
    setIndiceCorrente(0);
    setRisposteUtente({});
  };

  const domandaAttuale = domande[indiceCorrente];

  // Gestione risposta e memorizzazione su errori_utente
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
      <main className="min-h-screen bg-[#23272D] flex items-center justify-center text-amber-400 font-bold font-sans">
        Caricamento quesiti...
      </main>
    );
  }

  // SCHERMATA DI SCELTA SOTTOTIPOLOGIA LOGICA
  if (mostraFiltroLogica) {
    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-6 font-sans flex flex-col items-center justify-center">
        <div className="w-full max-w-xl bg-[#2E343D] border border-[#434B57] p-8 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <Link href="/" className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 flex items-center gap-1">
              ← Esci
            </Link>
            <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
              Allenamento per Tipologia
            </span>
          </div>

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-3">
              🧩
            </div>
            <h1 className="text-xl font-black text-[#F8FAFC]">Modulo Logica</h1>
            <p className="text-xs text-[#94A3B8] mt-1">Scegli la branca di quesiti su cui desideri metterti alla prova</p>
          </div>

          <div className="flex flex-col gap-3">
            {OPZIONI_LOGICA.map((opz) => (
              <button
                key={opz.id}
                onClick={() => avviaQuizLogica(opz.id)}
                className="p-4 rounded-2xl bg-[#23272D] border border-[#434B57] hover:border-amber-500/60 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <span className="text-2xl">{opz.icona}</span>
                  <div>
                    <h3 className="text-xs font-black text-[#F8FAFC] group-hover:text-amber-400 transition-colors">
                      {opz.titolo}
                    </h3>
                    <p className="text-[11px] text-[#94A3B8]">{opz.desc}</p>
                  </div>
                </div>
                <span className="text-amber-400 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Avvia →
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (domande.length === 0) {
    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] max-w-md text-center shadow-xl">
          <div className="text-3xl mb-3">📭</div>
          <h2 className="text-lg font-bold mb-2 text-[#F8FAFC]">Nessuna domanda presente</h2>
          <p className="text-xs text-[#94A3B8] mb-6">
            Non sono ancora presenti quesiti per la tipologia o materia selezionata.
          </p>
          <button
            onClick={() => setMostraFiltroLogica(materia?.nome?.toLowerCase() === 'logica')}
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black px-6 py-3 rounded-xl text-xs transition-all cursor-pointer"
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
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🏆
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] mb-1">Simulazione Conclusa!</h1>
          <p className="text-xs text-[#94A3B8] mb-6">
            {materia?.nome} {selezionataSubtipo && selezionataSubtipo !== 'tutte' ? `• ${selezionataSubtipo}` : ''}
          </p>

          <div className="p-5 bg-[#23272D] rounded-2xl border border-[#434B57] mb-6">
            <div className="text-4xl font-black text-amber-400 mb-1">{percentuale}%</div>
            <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-bold">Punteggio Complessivo</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-8">
            <div className="p-3 bg-[#23272D] rounded-xl border border-emerald-500/30">
              <div className="text-emerald-400 text-lg font-black">{corrette}</div>
              <div className="text-[10px] text-[#94A3B8]">Esatte</div>
            </div>
            <div className="p-3 bg-[#23272D] rounded-xl border border-rose-500/30">
              <div className="text-rose-400 text-lg font-black">{errate}</div>
              <div className="text-[10px] text-[#94A3B8]">Errate (Salvate)</div>
            </div>
            <div className="p-3 bg-[#23272D] rounded-xl border border-[#434B57]">
              <div className="text-[#94A3B8] text-lg font-black">{nonRisposte}</div>
              <div className="text-[10px] text-[#94A3B8]">Saltate</div>
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
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              Ripeti con Quesiti Mescolati
            </button>
            <Link
              href="/"
              className="w-full bg-[#23272D] hover:border-amber-500/50 text-[#F8FAFC] font-bold py-3.5 rounded-xl text-xs border border-[#434B57] transition-all text-center"
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
          <button
            onClick={() => {
              if (materia?.nome?.toLowerCase() === 'logica') {
                setMostraFiltroLogica(true);
              } else {
                router.push('/');
              }
            }}
            className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>←</span> {materia?.nome?.toLowerCase() === 'logica' ? 'Cambia Tipologia' : 'Esci dal Quiz'}
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            {materia?.nome} {domandaAttuale.sottotipologia ? `• ${domandaAttuale.sottotipologia}` : ''}
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
            <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-[#23272D] text-amber-400 border border-amber-500/30">
              Quesito #{indiceCorrente + 1} {domandaAttuale.sottotipologia ? `(${domandaAttuale.sottotipologia})` : '(Casuale)'}
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
                    <span
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${stileBadge}`}
                    >
                      {opt.lettera}
                    </span>
                    <span className="leading-snug">{opt.testo}</span>
                  </div>

                  {giaRisposto && isCorretta && (
                    <span className="text-emerald-400 font-extrabold text-xs shrink-0">✓ Esatta</span>
                  )}
                  {giaRisposto && isSelezionata && !isCorretta && (
                    <span className="text-rose-400 font-extrabold text-xs shrink-0">✕ Errata</span>
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
                {mostraSpiegazione ? 'Nascondi Spiegazione / Metodo' : 'Mostra Spiegazione / Risoluzione Rapida'}
                <span>{mostraSpiegazione ? '▴' : '▾'}</span>
              </button>

              {mostraSpiegazione && (
                <div className="mt-3 p-4 bg-[#3D2E1E] rounded-2xl border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
                  <strong className="block text-amber-400 mb-1 font-bold">Risoluzione Didattica:</strong>
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
              disabled={salvataggioInCorso}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
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
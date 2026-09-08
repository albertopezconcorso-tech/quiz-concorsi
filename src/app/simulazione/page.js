'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
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

export default function SimulazionePersonalizzataPage() {
  const router = useRouter();
  const [materie, setMaterie] = useState([]);
  const [config, setConfig] = useState({}); // { materiaId: numeroDomande }
  const [stato, setStato] = useState('configurazione'); // 'configurazione' | 'quiz' | 'finito'

  const [domandeQuiz, setDomandeQuiz] = useState([]);
  const [indiceCorrente, setIndiceCorrente] = useState(0);
  const [risposteUtente, setRisposteUtente] = useState({});
  const [mostraSpiegazione, setMostraSpiegazione] = useState(false);
  const [caricamento, setCaricamento] = useState(true);
  const [avvioInCorso, setAvvioInCorso] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: matData } = await supabase.from('materie').select('*').order('nome', { ascending: true });
      if (matData) {
        setMaterie(matData);
        const defaultConfig = {};
        matData.forEach((m) => {
          defaultConfig[m.id] = 10; // 10 domande predefinite per materia
        });
        setConfig(defaultConfig);
      }
      setCaricamento(false);
    }
    init();
  }, [router]);

  const totaleSelezionato = Object.values(config).reduce((a, b) => a + Number(b || 0), 0);

  const avviaSimulazione = async () => {
    if (totaleSelezionato === 0) {
      alert('Seleziona almeno 1 domanda!');
      return;
    }

    setAvvioInCorso(true);
    let poolTotale = [];

    for (const materia of materie) {
      const qta = Number(config[materia.id] || 0);
      if (qta > 0) {
        const { data: dData } = await supabase
          .from('domande')
          .select('*')
          .eq('materia_id', materia.id);

        if (dData && dData.length > 0) {
          const estratte = mescolaArray(dData).slice(0, qta).map((d) => ({
            ...d,
            materia_nome: materia.nome,
          }));
          poolTotale = poolTotale.concat(estratte);
        }
      }
    }

    if (poolTotale.length === 0) {
      alert('Non sono state trovate domande nel database per le materie selezionate.');
      setAvvioInCorso(false);
      return;
    }

    // Mescola l'intero test combinato
    setDomandeQuiz(mescolaArray(poolTotale));
    setIndiceCorrente(0);
    setRisposteUtente({});
    setStato('quiz');
    setAvvioInCorso(false);
  };

  const selezionaRisposta = (lettera) => {
    if (risposteUtente[indiceCorrente] !== undefined) return;
    setRisposteUtente((prev) => ({
      ...prev,
      [indiceCorrente]: lettera,
    }));
  };

  const prossimaDomanda = () => {
    setMostraSpiegazione(false);
    if (indiceCorrente < domandeQuiz.length - 1) {
      setIndiceCorrente((prev) => prev + 1);
    } else {
      setStato('finito');
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
        Caricamento configuratore...
      </main>
    );
  }

  // 1. SCHERMATA DI CONFIGURAZIONE
  if (stato === 'configurazione') {
    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-6 lg:p-10 font-sans flex flex-col items-center">
        <div className="w-full max-w-2xl">
          <div className="flex items-center justify-between bg-[#2E343D] border border-[#434B57] p-4 rounded-2xl mb-6">
            <Link href="/" className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 flex items-center gap-1.5">
              ← Torna alla Home
            </Link>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Simulazione su Misura
            </span>
          </div>

          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl">
                ⚙️
              </div>
              <div>
                <h1 className="text-xl font-black text-[#F8FAFC]">Componi la tua Prova d&apos;Esame</h1>
                <p className="text-xs text-[#94A3B8]">Scegli quante domande casuali estrarre per ciascuna materia</p>
              </div>
            </div>

            <div className="my-6 flex flex-col gap-3">
              {materie.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between p-4 bg-[#23272D] border border-[#434B57] rounded-2xl"
                >
                  <div>
                    <span className="text-sm font-bold text-[#F8FAFC] block">{m.nome}</span>
                    <span className="text-[11px] text-[#94A3B8]">Numero quesiti:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={config[m.id] ?? 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setConfig((prev) => ({ ...prev, [m.id]: val }));
                      }}
                      className="w-20 p-2 bg-[#2E343D] border border-[#434B57] rounded-xl text-center text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-xs text-[#94A3B8]">domande</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-[#3B332B] border border-[#855325] rounded-2xl flex items-center justify-between mb-6">
              <span className="text-xs font-bold text-[#FFFBEB]">Totale Domande Combinate:</span>
              <span className="text-lg font-black text-amber-400">{totaleSelezionato} quesiti</span>
            </div>

            <button
              onClick={avviaSimulazione}
              disabled={avvioInCorso || totaleSelezionato === 0}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-4 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {avvioInCorso ? 'Composizione test casuale in corso...' : 'Inizia Simulazione Personalizzata 🚀'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 2. SCHERMATA DI RIEPILOGO FINALE
  if (stato === 'finito') {
    let corrette = 0;
    let errate = 0;
    domandeQuiz.forEach((d, idx) => {
      if (risposteUtente[idx] === d.risposta_esatta) corrette++;
      else if (risposteUtente[idx] !== undefined) errate++;
    });
    const nonRisposte = domandeQuiz.length - (corrette + errate);
    const percentuale = Math.round((corrette / domandeQuiz.length) * 100);

    return (
      <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#2E343D] p-8 rounded-3xl border border-[#434B57] shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-3xl mx-auto mb-4">
            🎯
          </div>
          <h1 className="text-2xl font-black text-[#F8FAFC] mb-1">Simulazione Personalizzata Terminata!</h1>
          <p className="text-xs text-[#94A3B8] mb-6">Test combinato multiteria</p>

          <div className="p-5 bg-[#23272D] rounded-2xl border border-[#434B57] mb-6">
            <div className="text-4xl font-black text-amber-400 mb-1">{percentuale}%</div>
            <p className="text-[11px] text-[#94A3B8] uppercase tracking-wider font-bold">Esito Finale</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mb-8">
            <div className="p-3 bg-[#23272D] rounded-xl border border-emerald-500/30">
              <div className="text-emerald-400 text-lg font-black">{corrette}</div>
              <div className="text-[10px] text-[#94A3B8]">Esatte</div>
            </div>
            <div className="p-3 bg-[#23272D] rounded-xl border border-rose-500/30">
              <div className="text-rose-400 text-lg font-black">{errate}</div>
              <div className="text-[10px] text-[#94A3B8]">Errate</div>
            </div>
            <div className="p-3 bg-[#23272D] rounded-xl border border-[#434B57]">
              <div className="text-[#94A3B8] text-lg font-black">{nonRisposte}</div>
              <div className="text-[10px] text-[#94A3B8]">Saltate</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStato('configurazione')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 active:scale-[0.99] cursor-pointer"
            >
              Configura Nuova Prova
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

  // 3. SVOLGIMENTO QUIZ MULTIMATERIA
  const domandaAttuale = domandeQuiz[indiceCorrente];
  const rispostaData = risposteUtente[indiceCorrente];
  const opzioni = [
    { lettera: 'A', testo: domandaAttuale.opzione_a },
    { lettera: 'B', testo: domandaAttuale.opzione_b },
    { lettera: 'C', testo: domandaAttuale.opzione_c },
    { lettera: 'D', testo: domandaAttuale.opzione_d },
  ].filter((o) => o.testo);

  const progressoPercent = Math.round(((indiceCorrente + 1) / domandeQuiz.length) * 100);

  return (
    <main className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between bg-[#2E343D] border border-[#434B57] p-4 rounded-2xl shadow-sm">
          <button
            onClick={() => {
              if (window.confirm('Sei sicuro di voler uscire? I progressi andranno persi.')) {
                setStato('configurazione');
              }
            }}
            className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 cursor-pointer"
          >
            ← Annulla
          </button>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400">
            {domandaAttuale.materia_nome || 'Simulazione'}
          </span>
          <span className="text-xs font-bold text-[#94A3B8] bg-[#23272D] px-2.5 py-1 rounded-lg border border-[#434B57]">
            {indiceCorrente + 1} / {domandeQuiz.length}
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
              Quesito #{indiceCorrente + 1} • {domandaAttuale.materia_nome}
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
              {indiceCorrente === domandeQuiz.length - 1 ? 'Concludi Simulazione 🏁' : 'Prossima Domanda →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
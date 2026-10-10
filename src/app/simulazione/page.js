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

const SOTTOTIPI_LOGICA = [
  { id: 'Logica figurale', titolo: 'Logica Figurale', icona: '🖼️' },
  { id: 'Logica numerica', titolo: 'Logica Numerica', icona: '🔢' },
  { id: 'Logica deduttiva e ragionamento', titolo: 'Logica Deduttiva e Ragionamento', icona: '🧠' }
];

export default function SimulazionePersonalizzataPage() {
  const router = useRouter();
  const [materie, setMaterie] = useState([]);
  const [config, setConfig] = useState({}); // { materiaId: numeroDomande }
  const [configLogica, setConfigLogica] = useState({
    'Logica figurale': 5,
    'Logica numerica': 10,
    'Logica deduttiva e ragionamento': 10
  });
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
          defaultConfig[m.id] = 10;
        });
        setConfig(defaultConfig);
      }
      setCaricamento(false);
    }
    init();
  }, [router]);

  // Calcolo totale domande configurate
  const totaleMaterieStandard = materie
    .filter((m) => m.nome.toLowerCase() !== 'logica')
    .reduce((acc, m) => acc + Number(config[m.id] || 0), 0);

  const materiaLogica = materie.find((m) => m.nome.toLowerCase() === 'logica');
  const totaleLogica = materiaLogica
    ? Object.values(configLogica).reduce((a, b) => a + Number(b || 0), 0)
    : 0;

  const totaleSelezionato = totaleMaterieStandard + totaleLogica;

  const avviaSimulazione = async () => {
    if (totaleSelezionato === 0) {
      alert('Seleziona almeno 1 domanda per avviare la simulazione!');
      return;
    }

    setAvvioInCorso(true);
    let poolTotale = [];

    // Helper per estrarre tutti i quesiti superando il limite di 1000 righe di Supabase
    async function fetchTutteLeDomande(materiaId) {
      let result = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('domande')
          .select('*')
          .eq('materia_id', materiaId)
          .range(from, from + step - 1);

        if (error || !data || data.length === 0) {
          hasMore = false;
        } else {
          result = [...result, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
        }
      }
      return result;
    }

    for (const materia of materie) {
      const isLogica = materia.nome.toLowerCase() === 'logica';

      if (isLogica) {
        // Se la materia è Logica, gestiamo le sottocategorie
        const qtaLogicaTot = Object.values(configLogica).reduce((a, b) => a + Number(b || 0), 0);
        if (qtaLogicaTot > 0) {
          const tutteLogica = await fetchTutteLeDomande(materia.id);

          for (const sub of SOTTOTIPI_LOGICA) {
            const qtaSub = Number(configLogica[sub.id] || 0);
            if (qtaSub > 0) {
              const filtrateSub = tutteLogica.filter(
                (d) => d.sottotipologia?.trim()?.toLowerCase() === sub.id.trim().toLowerCase()
              );
              const estratte = mescolaArray(filtrateSub).slice(0, qtaSub).map((d) => ({
                ...d,
                materia_nome: `Logica • ${sub.titolo}`
              }));
              poolTotale = poolTotale.concat(estratte);
            }
          }
        }
      } else {
        // Materie classiche (Diritto, Grammatica, Informatica, Storia, ecc.)
        const qta = Number(config[materia.id] || 0);
        if (qta > 0) {
          const tutteMateria = await fetchTutteLeDomande(materia.id);
          if (tutteMateria.length > 0) {
            const estratte = mescolaArray(tutteMateria).slice(0, qta).map((d) => ({
              ...d,
              materia_nome: materia.nome,
            }));
            poolTotale = poolTotale.concat(estratte);
          }
        }
      }
    }

    if (poolTotale.length === 0) {
      alert('Non sono state trovate domande nel database per la configurazione selezionata.');
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
      <main className="min-h-screen bg-[#0B1220] flex items-center justify-center text-amber-500 font-bold font-sans">
        Caricamento configuratore...
      </main>
    );
  }

  // 1. SCHERMATA DI CONFIGURAZIONE
  if (stato === 'configurazione') {
    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] p-6 lg:p-10 font-sans flex flex-col items-center">
        <div className="w-full max-w-3xl">
          <div className="flex items-center justify-between bg-[#121A2E] border border-[#25304A] px-5 py-4 rounded-2xl mb-6">
            <Link href="/" className="text-sm font-semibold text-[#8E9BBA] hover:text-amber-500 flex items-center gap-1.5 transition-colors">
              ← Torna alla Home
            </Link>
            <span className="text-xs font-extrabold text-amber-500 uppercase tracking-[0.14em]">
              Simulazione su Misura
            </span>
          </div>

          <div className="bg-[#121A2E] border border-[#25304A] p-6 lg:p-9 rounded-2xl">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-2xl">
                ⚙️
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#E8ECF8]">Componi la tua Prova d&apos;Esame</h1>
                <p className="text-sm text-[#8E9BBA] mt-1">Scegli quante domande casuali estrarre per ciascuna materia e tipologia</p>
              </div>
            </div>

            <div className="my-7 flex flex-col gap-3.5">
              {materie.map((m) => {
                const isLogica = m.nome.toLowerCase() === 'logica';

                if (isLogica) {
                  return (
                    <div
                      key={m.id}
                      className="p-5 bg-amber-500/5 border border-amber-500/30 rounded-2xl flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">🧩</span>
                          <span className="text-sm font-extrabold text-amber-500 uppercase tracking-wide">
                            {m.nome} (Per Sottocategoria)
                          </span>
                        </div>
                        <span className="text-sm font-bold text-[#E8ECF8]">
                          {totaleLogica} domande tot.
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 pt-1">
                        {SOTTOTIPI_LOGICA.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between pl-1">
                            <div className="flex items-center gap-2.5">
                              <span>{sub.icona}</span>
                              <span className="text-sm font-bold text-[#E8ECF8]">{sub.titolo}</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={configLogica[sub.id] ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value) || 0);
                                  setConfigLogica((prev) => ({ ...prev, [sub.id]: val }));
                                }}
                                className="w-16 p-2 bg-[#121A2E] border border-[#2A3963] rounded-xl text-center text-sm font-extrabold text-amber-500 focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-xs text-[#8E9BBA]">domande</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-4 bg-[#0D1326] border border-[#1F2A4A] rounded-2xl"
                  >
                    <div>
                      <span className="text-base font-extrabold text-[#E8ECF8] block">{m.nome}</span>
                      <span className="text-xs text-[#8E9BBA]">Numero quesiti:</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={config[m.id] ?? 0}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setConfig((prev) => ({ ...prev, [m.id]: val }));
                        }}
                        className="w-20 p-2.5 bg-[#121A2E] border border-[#2A3963] rounded-xl text-center text-base font-extrabold text-amber-500 focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-sm text-[#8E9BBA]">domande</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-5 py-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between mb-6">
              <span className="text-sm font-bold text-[#E8ECF8]">Totale Domande Combinate:</span>
              <span className="text-xl font-extrabold text-amber-500">{totaleSelezionato} quesiti</span>
            </div>

            <button
              onClick={avviaSimulazione}
              disabled={avvioInCorso || totaleSelezionato === 0}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-bold py-4 rounded-xl text-base transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
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
    const percentuale = Math.round((corrette / (domandeQuiz.length || 1)) * 100);

    return (
      <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#121A2E] p-9 rounded-2xl border border-[#25304A] text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-5">
            🎯
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#E8ECF8] mb-1.5">Simulazione Personalizzata Terminata!</h1>
          <p className="text-sm text-[#8E9BBA] mb-7">Test combinato multimateria</p>

          <div className="p-6 bg-[#0D1326] rounded-2xl border border-[#1F2A4A] mb-6">
            <div className="text-5xl font-extrabold text-amber-500 mb-1.5">{percentuale}%</div>
            <p className="text-xs text-[#8E9BBA] uppercase tracking-[0.12em] font-bold">Esito Finale</p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center mb-8">
            <div className="p-3.5 bg-[#0D1326] rounded-xl border border-emerald-500/30">
              <div className="text-emerald-400 text-xl font-extrabold">{corrette}</div>
              <div className="text-xs text-[#8E9BBA] mt-0.5">Esatte</div>
            </div>
            <div className="p-3.5 bg-[#0D1326] rounded-xl border border-rose-500/30">
              <div className="text-rose-400 text-xl font-extrabold">{errate}</div>
              <div className="text-xs text-[#8E9BBA] mt-0.5">Errate</div>
            </div>
            <div className="p-3.5 bg-[#0D1326] rounded-xl border border-[#1F2A4A]">
              <div className="text-[#8E9BBA] text-xl font-extrabold">{nonRisposte}</div>
              <div className="text-xs text-[#8E9BBA] mt-0.5">Saltate</div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setStato('configurazione')}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-bold py-3.5 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              Configura Nuova Prova
            </button>
            <Link
              href="/"
              className="w-full bg-[#0D1326] hover:border-amber-500/50 text-[#E8ECF8] font-bold py-3.5 rounded-xl text-sm border border-[#1F2A4A] transition-all text-center"
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
    { lettera: 'A', testo: domandaAttuale?.opzione_a },
    { lettera: 'B', testo: domandaAttuale?.opzione_b },
    { lettera: 'C', testo: domandaAttuale?.opzione_c },
    { lettera: 'D', testo: domandaAttuale?.opzione_d },
  ].filter((o) => o.testo);

  const progressoPercent = Math.round(((indiceCorrente + 1) / (domandeQuiz.length || 1)) * 100);

  return (
    <main className="min-h-screen bg-[#0B1220] text-[#E8ECF8] p-4 lg:p-8 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl flex flex-col gap-5">
        <div className="flex items-center justify-between bg-[#121A2E] border border-[#25304A] px-5 py-4 rounded-2xl">
          <button
            onClick={() => {
              if (window.confirm('Sei sicuro di voler uscire? I progressi andranno persi.')) {
                setStato('configurazione');
              }
            }}
            className="text-sm font-semibold text-[#8E9BBA] hover:text-amber-500 cursor-pointer transition-colors"
          >
            ← Annulla
          </button>
          <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-amber-500">
            {domandaAttuale?.materia_nome || 'Simulazione'}
          </span>
          <span className="text-sm font-bold text-[#8E9BBA] bg-[#0D1326] px-3 py-1 rounded-lg border border-[#1F2A4A]">
            {indiceCorrente + 1} / {domandeQuiz.length}
          </span>
        </div>

        <div className="w-full bg-[#0D1326] h-2 rounded-full overflow-hidden border border-[#1F2A4A]">
          <div
            className="bg-amber-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${progressoPercent}%` }}
          />
        </div>

        <div className="bg-[#121A2E] p-6 lg:p-9 rounded-2xl border border-[#25304A]">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-extrabold uppercase tracking-[0.1em] px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30">
              Quesito #{indiceCorrente + 1} • {domandaAttuale?.materia_nome}
            </span>
          </div>

          <p className="text-lg lg:text-xl font-bold text-[#E8ECF8] leading-relaxed mb-8">
            {domandaAttuale?.testo}
          </p>

          <div className="flex flex-col gap-3 mb-6">
            {opzioni.map((opt) => {
              const isSelezionata = rispostaData === opt.lettera;
              const isCorretta = opt.lettera === domandaAttuale?.risposta_esatta;
              const giaRisposto = rispostaData !== undefined;

              let stileScatola = 'bg-[#0D1326] border-[#1F2A4A] hover:border-amber-500/50 text-[#E8ECF8]';
              let stileBadge = 'bg-[#121A2E] text-[#8E9BBA] border-[#25304A]';

              if (giaRisposto) {
                if (isCorretta) {
                  stileScatola = 'bg-emerald-950/40 border-emerald-500 text-emerald-100';
                  stileBadge = 'bg-emerald-500 text-[#1A1203] font-black border-emerald-400';
                } else if (isSelezionata && !isCorretta) {
                  stileScatola = 'bg-rose-950/40 border-rose-500 text-rose-100';
                  stileBadge = 'bg-rose-500 text-white font-black border-rose-400';
                } else {
                  stileScatola = 'bg-[#0D1326]/50 border-[#1F2A4A]/40 text-[#64748B] opacity-60';
                }
              }

              return (
                <button
                  key={opt.lettera}
                  onClick={() => selezionaRisposta(opt.lettera)}
                  disabled={giaRisposto}
                  className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-sm lg:text-base font-medium cursor-pointer ${stileScatola}`}
                >
                  <div className="flex items-center gap-3.5 flex-1">
                    <span className={`w-9 h-9 rounded-lg border flex items-center justify-center font-bold text-sm shrink-0 ${stileBadge}`}>
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

          {domandaAttuale?.spiegazione && rispostaData !== undefined && (
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
                <div className="mt-3 p-5 bg-amber-500/10 rounded-xl border border-amber-500/30 text-sm text-amber-100 leading-relaxed">
                  <strong className="block text-amber-500 mb-1 font-bold">Riferimento Didattico / Giuridico:</strong>
                  {domandaAttuale.spiegazione}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-5 border-t border-[#25304A] gap-3">
            <button
              onClick={domandaPrecedente}
              disabled={indiceCorrente === 0}
              className="px-5 py-3 bg-[#0D1326] border border-[#1F2A4A] text-[#8E9BBA] hover:text-[#E8ECF8] disabled:opacity-30 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              ← Precedente
            </button>

            <button
              onClick={prossimaDomanda}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-[#1A1203] font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              {indiceCorrente === domandeQuiz.length - 1 ? 'Concludi Simulazione 🏁' : 'Prossima Domanda →'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
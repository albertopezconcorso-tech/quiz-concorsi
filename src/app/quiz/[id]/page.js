'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '../../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QuizPage({ params }) {
  const unwrappedParams = use(params);
  const materiaId = unwrappedParams.id;
  const router = useRouter();

  const [utente, setUtente] = useState(null);
  const [nomeMateria, setNomeMateria] = useState('');
  const [domandeOriginali, setDomandeOriginali] = useState([]);
  const [domande, setDomande] = useState([]);
  const [indiceCorrente, setIndiceCorrente] = useState(0);
  const [rispostaSelezionata, setRispostaSelezionata] = useState(null);
  const [mostraSpiegazione, setMostraSpiegazione] = useState(false);
  const [caricamento, setCaricamento] = useState(true);

  // Risultati e tracciamento errori
  const [corrette, setCorrette] = useState(0);
  const [errori, setErrori] = useState(0);
  const [quesitiSbagliati, setQuesitiSbagliati] = useState([]);
  const [modalitaRipasso, setModalitaRipasso] = useState(false);
  const [quizTerminato, setQuizTerminato] = useState(false);
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  useEffect(() => {
    async function caricaDati() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUtente(user);

      const { data: mData } = await supabase
        .from('materie')
        .select('nome')
        .eq('id', materiaId)
        .single();
      if (mData) setNomeMateria(mData.nome);

      const { data, error } = await supabase
        .from('domande')
        .select('*')
        .eq('materia_id', materiaId);

      if (!error && data) {
        setDomandeOriginali(data);
        setDomande(data);
      }
      setCaricamento(false);
    }

    caricaDati();
  }, [materiaId, router]);

  const gestisciScelta = (lettera) => {
    if (rispostaSelezionata !== null) return;
    setRispostaSelezionata(lettera);

    const domandaAttuale = domande[indiceCorrente];
    const isCorretta = lettera === domandaAttuale.risposta_esatta;

    if (isCorretta) {
      setCorrette((prev) => prev + 1);
    } else {
      setErrori((prev) => prev + 1);
      if (!modalitaRipasso) {
        setQuesitiSbagliati((prev) => [...prev, domandaAttuale]);
      }
    }
  };

  const prossimaDomanda = async () => {
    setRispostaSelezionata(null);
    setMostraSpiegazione(false);

    if (indiceCorrente + 1 < domande.length) {
      setIndiceCorrente((prev) => prev + 1);
    } else {
      // Salva nella tabella progressi se sessione normale
      if (!modalitaRipasso && utente) {
        setSalvataggioInCorso(true);
        await supabase.from('progressi').insert([
          {
            user_id: utente.id,
            materia_id: parseInt(materiaId, 10),
            punteggio: corrette,
            totale_domande: domande.length,
            errori: errori,
          },
        ]);
        setSalvataggioInCorso(false);
      }
      setQuizTerminato(true);
    }
  };

  const avviaRipassoErrori = () => {
    setDomande([...quesitiSbagliati]);
    setIndiceCorrente(0);
    setCorrette(0);
    setErrori(0);
    setRispostaSelezionata(null);
    setMostraSpiegazione(false);
    setModalitaRipasso(true);
    setQuizTerminato(false);
  };

  const riavviaQuizCompleto = () => {
    setDomande([...domandeOriginali]);
    setIndiceCorrente(0);
    setCorrette(0);
    setErrori(0);
    setQuesitiSbagliati([]);
    setRispostaSelezionata(null);
    setMostraSpiegazione(false);
    setModalitaRipasso(false);
    setQuizTerminato(false);
  };

  if (caricamento) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans text-slate-500 font-medium">
        Caricamento sessione di studio...
      </main>
    );
  }

  if (domande.length === 0 && !quizTerminato) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center">
          <span className="text-4xl mb-3 block">📭</span>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Nessun quiz presente</h2>
          <p className="text-xs text-slate-400 mb-6">Non ci sono quesiti registrati per questa materia.</p>
          <div className="flex flex-col gap-2">
            <Link href="/" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20">
              Torna alla Dashboard
            </Link>
            <Link href="/admin" className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all">
              Aggiungi domande da Admin
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // SCHERMATA FINALE CON OPZIONE RIPASSO ERRORI
  if (quizTerminato) {
    const percentuale = Math.round((corrette / domande.length) * 100);
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-4">
            {modalitaRipasso ? '🎯' : '🎉'}
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-1">
            {modalitaRipasso ? 'Ripasso Concluso!' : 'Sessione Completata!'}
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            {modalitaRipasso ? 'Hai revisionato le domande critiche.' : 'Il risultato è stato registrato nelle statistiche.'}
          </p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div className="text-lg font-black text-emerald-600">{corrette}</div>
              <div className="text-[11px] font-semibold text-slate-500">Corrette</div>
            </div>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <div className="text-lg font-black text-rose-600">{errori}</div>
              <div className="text-[11px] font-semibold text-slate-500">Errori</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <div className="text-lg font-black text-blue-600">{percentuale}%</div>
              <div className="text-[11px] font-semibold text-slate-500">Punteggio</div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {!modalitaRipasso && quesitiSbagliati.length > 0 && (
              <button
                onClick={avviaRipassoErrori}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-rose-600/20 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🔄</span> Ripassa solo i {quesitiSbagliati.length} errori commessi
              </button>
            )}

            <button
              onClick={riavviaQuizCompleto}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
            >
              Riprova quiz completo
            </button>
            <Link
              href="/"
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-all"
            >
              Torna alla Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const domandaAttuale = domande[indiceCorrente];
  const lettereOpzioni = ['A', 'B', 'C', 'D'];

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 p-4 lg:p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-xl flex flex-col flex-1">
        {/* Barra superiore */}
        <div className="flex justify-between items-center mb-6 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <Link href="/" className="text-xs font-semibold text-slate-500 hover:text-blue-600 flex items-center gap-1">
            ← Esci
          </Link>
          <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            {modalitaRipasso && (
              <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px] uppercase font-black">
                Ripasso Errori
              </span>
            )}
            <span>{nomeMateria || 'Esercitazione'}</span>
          </div>
          <span className="text-xs font-extrabold bg-blue-50 text-blue-600 px-3 py-1 rounded-full border border-blue-100">
            {indiceCorrente + 1} / {domande.length}
          </span>
        </div>

        {/* Card Domanda */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
              Quesito {indiceCorrente + 1}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
            {domandaAttuale.testo}
          </h2>
        </div>

        {/* Opzioni di risposta */}
        <div className="flex flex-col gap-3 mb-6">
          {lettereOpzioni.map((lettera) => {
            const testoOpzione = domandaAttuale[`opzione_${lettera.toLowerCase()}`];
            if (!testoOpzione) return null;

            let stile = "bg-white border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 text-slate-700";
            let badgeStile = "bg-slate-100 text-slate-600";

            if (rispostaSelezionata !== null) {
              const isCorretta = lettera === domandaAttuale.risposta_esatta;
              const isScelta = lettera === rispostaSelezionata;

              if (isCorretta) {
                stile = "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-xs";
                badgeStile = "bg-emerald-600 text-white";
              } else if (isScelta && !isCorretta) {
                stile = "bg-rose-50 border-rose-300 text-rose-900 shadow-xs";
                badgeStile = "bg-rose-600 text-white";
              } else {
                stile = "bg-white border-slate-200 opacity-40 text-slate-400";
                badgeStile = "bg-slate-100 text-slate-400";
              }
            }

            return (
              <button
                key={lettera}
                onClick={() => gestisciScelta(lettera)}
                className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all shadow-xs ${stile} cursor-pointer`}
              >
                <span className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition-colors ${badgeStile}`}>
                  {lettera}
                </span>
                <span className="text-xs sm:text-sm font-medium leading-snug">{testoOpzione}</span>
              </button>
            );
          })}
        </div>

        {/* Spiegamelo & Prossima */}
        {rispostaSelezionata !== null && (
          <div className="flex flex-col gap-3 mt-auto">
            {domandaAttuale.spiegazione && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                <button
                  onClick={() => setMostraSpiegazione(!mostraSpiegazione)}
                  className="w-full flex items-center justify-between text-xs font-bold text-amber-800 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>💡</span> {mostraSpiegazione ? 'Nascondi Spiegazione' : 'Spiegamelo'}
                  </span>
                  <span>{mostraSpiegazione ? '▲' : '▼'}</span>
                </button>

                {mostraSpiegazione && (
                  <p className="mt-2.5 text-xs text-amber-950 leading-relaxed pt-2.5 border-t border-amber-200/60 font-medium">
                    {domandaAttuale.spiegazione}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={prossimaDomanda}
              disabled={salvataggioInCorso}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-sm transition-all shadow-md shadow-blue-500/25 active:scale-[0.99] cursor-pointer"
            >
              {salvataggioInCorso
                ? 'Salvataggio...'
                : indiceCorrente + 1 === domande.length
                ? 'Concludi Quiz 🏆'
                : 'Prossima Domanda →'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
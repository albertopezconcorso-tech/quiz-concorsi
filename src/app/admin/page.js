'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import Link from 'next/link';

export default function AdminPage() {
  const [autenticato, setAutenticato] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [errorePassword, setErrorePassword] = useState(false);

  // Creazione Studente
  const [emailStudente, setEmailStudente] = useState('');
  const [passStudente, setPassStudente] = useState('');
  const [messaggioStudente, setMessaggioStudente] = useState('');
  const [caricamentoStudente, setCaricamentoStudente] = useState(false);

  // Materie
  const [materie, setMaterie] = useState([]);
  const [nuovaMateria, setNuovaMateria] = useState('');
  const [descMateria, setDescMateria] = useState('');
  const [messaggioMateria, setMessaggioMateria] = useState('');

  // Domanda nuova
  const [materiaScelta, setMateriaScelta] = useState('');
  const [testoDomanda, setTestoDomanda] = useState('');
  const [opzioneA, setOpzioneA] = useState('');
  const [opzioneB, setOpzioneB] = useState('');
  const [opzioneC, setOpzioneC] = useState('');
  const [opzioneD, setOpzioneD] = useState('');
  const [rispostaEsatta, setRispostaEsatta] = useState('A');
  const [spiegazione, setSpiegazione] = useState('');
  const [messaggioDomanda, setMessaggioDomanda] = useState('');

  // Gestione elenco domande salvate
  const [materiaFiltro, setMateriaFiltro] = useState('');
  const [elencoDomande, setElencoDomande] = useState([]);
  const [caricamentoDomande, setCaricamentoDomande] = useState(false);

  useEffect(() => {
    const salvato = sessionStorage.getItem('admin_logged');
    if (salvato === 'true') {
      setAutenticato(true);
      caricaMaterie();
    }
  }, []);

  async function caricaMaterie() {
    const { data, error } = await supabase
      .from('materie')
      .select('*')
      .order('nome', { ascending: true });

    if (!error && data) {
      setMaterie(data);
      if (data.length > 0) {
        setMateriaScelta((prev) => prev || data[0].id);
        const primoId = data[0].id;
        setMateriaFiltro((prev) => {
          const id = prev || primoId;
          caricaDomandePerMateria(id);
          return id;
        });
      }
    }
  }

  async function caricaDomandePerMateria(materiaId) {
    if (!materiaId) return;
    setCaricamentoDomande(true);
    const { data, error } = await supabase
      .from('domande')
      .select('*')
      .eq('materia_id', materiaId)
      .order('id', { ascending: true });

    if (!error && data) {
      setElencoDomande(data);
    }
    setCaricamentoDomande(false);
  }

  const handleCambioFiltro = (materiaId) => {
    setMateriaFiltro(materiaId);
    caricaDomandePerMateria(materiaId);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (inputPassword === adminPassword) {
      setAutenticato(true);
      setErrorePassword(false);
      sessionStorage.setItem('admin_logged', 'true');
      caricaMaterie();
    } else {
      setErrorePassword(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_logged');
    setAutenticato(false);
    setInputPassword('');
  };

  const creaStudente = async (e) => {
    e.preventDefault();
    setCaricamentoStudente(true);
    setMessaggioStudente('');

    try {
      const res = await fetch('/api/crea-studente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailStudente, password: passStudente }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessaggioStudente('❌ ' + (data.error || 'Errore nella creazione'));
      } else {
        setMessaggioStudente('✅ Account studente creato con successo!');
        setEmailStudente('');
        setPassStudente('');
      }
    } catch {
      setMessaggioStudente('❌ Errore di connessione');
    }
    setCaricamentoStudente(false);
  };

  const aggiungiMateria = async (e) => {
    e.preventDefault();
    if (!nuovaMateria.trim()) return;

    const { error } = await supabase
      .from('materie')
      .insert([{ nome: nuovaMateria.trim(), descrizione: descMateria.trim() }]);

    if (error) {
      setMessaggioMateria('❌ Errore: ' + error.message);
    } else {
      setMessaggioMateria('✅ Materia salvata con successo!');
      setNuovaMateria('');
      setDescMateria('');
      caricaMaterie();
    }
  };

  const aggiungiDomanda = async (e) => {
    e.preventDefault();
    if (!testoDomanda.trim() || !opzioneA.trim() || !opzioneB.trim()) {
      alert('Compila almeno il testo e le opzioni A e B');
      return;
    }

    const { error } = await supabase.from('domande').insert([
      {
        materia_id: materiaScelta,
        testo: testoDomanda.trim(),
        opzione_a: opzioneA.trim(),
        opzione_b: opzioneB.trim(),
        opzione_c: opzioneC.trim() || null,
        opzione_d: opzioneD.trim() || null,
        risposta_esatta: rispostaEsatta,
        spiegazione: spiegazione.trim() || null,
      },
    ]);

    if (error) {
      setMessaggioDomanda('❌ Errore: ' + error.message);
    } else {
      setMessaggioDomanda('✅ Domanda salvata nel database!');
      setTestoDomanda('');
      setOpzioneA('');
      setOpzioneB('');
      setOpzioneC('');
      setOpzioneD('');
      setSpiegazione('');
      if (materiaFiltro === materiaScelta) {
        caricaDomandePerMateria(materiaScelta);
      }
    }
  };

  const eliminaDomanda = async (domandaId) => {
    const conferma = window.confirm('Sei sicuro di voler eliminare questa domanda definitivamente?');
    if (!conferma) return;

    const { error } = await supabase
      .from('domande')
      .delete()
      .eq('id', domandaId);

    if (error) {
      alert('Errore durante la cancellazione: ' + error.message);
    } else {
      setElencoDomande((prev) => prev.filter((d) => d.id !== domandaId));
    }
  };

  if (!autenticato) {
    return (
      <main className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl mx-auto mb-3">
            ⚙️
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">Accesso Amministratore</h1>
          <p className="text-slate-400 text-xs mb-6">Inserisci la password di sicurezza</p>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="Password..."
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              required
            />
            {errorePassword && (
              <p className="text-rose-500 text-xs font-semibold">Password errata. Riprova.</p>
            )}
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
            >
              Sblocca Pannello
            </button>
          </form>

          <Link href="/login" className="inline-block mt-5 text-xs text-slate-400 hover:text-blue-600 transition-colors">
            ← Torna al Login Studenti
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-800 p-6 lg:p-10 font-sans flex flex-col items-center">
      <div className="w-full max-w-3xl">
        {/* Intestazione */}
        <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Gestione Piattaforma Quiz</h1>
              <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
                Admin Attivo
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Gestisci studenti, materie e banca dati</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/80 px-3.5 py-2 rounded-xl hover:bg-rose-100 transition-all cursor-pointer"
            >
              Esci
            </button>
            <Link
              href="/"
              className="text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              Vai alla Home
            </Link>
          </div>
        </div>

        {/* SEZIONE 1: CREA STUDENTE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">👤</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Crea Nuovo Account Studente</h2>
              <p className="text-xs text-slate-400">Genera le credenziali di accesso per un corsista</p>
            </div>
          </div>
          <form onSubmit={creaStudente} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Email corsista (es. mario@test.it)"
              value={emailStudente}
              onChange={(e) => setEmailStudente(e.target.value)}
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              required
            />
            <input
              type="text"
              placeholder="Password iniziale (min 6 car.)"
              value={passStudente}
              onChange={(e) => setPassStudente(e.target.value)}
              className="w-full sm:w-56 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              required
            />
            <button
              type="submit"
              disabled={caricamentoStudente}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 active:scale-[0.99] cursor-pointer shrink-0 disabled:opacity-50"
            >
              {caricamentoStudente ? 'Creazione...' : 'Crea Account'}
            </button>
          </form>
          {messaggioStudente && <p className="text-xs font-semibold mt-3 text-slate-700">{messaggioStudente}</p>}
        </div>

        {/* SEZIONE 2: AGGIUNGI MATERIA */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">📚</span>
            <h2 className="text-base font-bold text-slate-900">Aggiungi Nuova Materia</h2>
          </div>
          <form onSubmit={aggiungiMateria} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nome Materia (es. Diritto Amministrativo)"
              value={nuovaMateria}
              onChange={(e) => setNuovaMateria(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
            <input
              type="text"
              placeholder="Breve descrizione (facoltativa)"
              value={descMateria}
              onChange={(e) => setDescMateria(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer"
            >
              Salva Materia
            </button>
            {messaggioMateria && <p className="text-xs font-semibold mt-1 text-slate-700">{messaggioMateria}</p>}
          </form>
        </div>

        {/* SEZIONE 3: AGGIUNGI DOMANDA */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">📝</span>
            <h2 className="text-base font-bold text-slate-900">Aggiungi Domanda e Spiegazione</h2>
          </div>
          <form onSubmit={aggiungiDomanda} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Seleziona la materia:</label>
              <select
                value={materiaScelta}
                onChange={(e) => setMateriaScelta(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Testo della domanda:</label>
              <textarea
                rows="3"
                placeholder="Scrivi qui il quesito d'esame..."
                value={testoDomanda}
                onChange={(e) => setTestoDomanda(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Opzione A"
                value={opzioneA}
                onChange={(e) => setOpzioneA(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Opzione B"
                value={opzioneB}
                onChange={(e) => setOpzioneB(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
                required
              />
              <input
                type="text"
                placeholder="Opzione C (facoltativa)"
                value={opzioneC}
                onChange={(e) => setOpzioneC(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
              />
              <input
                type="text"
                placeholder="Opzione D (facoltativa)"
                value={opzioneD}
                onChange={(e) => setOpzioneD(e.target.value)}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Risposta Corretta:</label>
              <select
                value={rispostaEsatta}
                onChange={(e) => setRispostaEsatta(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="A">Opzione A</option>
                <option value="B">Opzione B</option>
                <option value="C">Opzione C</option>
                <option value="D">Opzione D</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Spiegazione didattica (Tasto "Spiegamelo"):</label>
              <textarea
                rows="3"
                placeholder="Spiega chiaramente perché la risposta è corretta..."
                value={spiegazione}
                onChange={(e) => setSpiegazione(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] mt-2 cursor-pointer"
            >
              Salva Domanda nel Database
            </button>
            {messaggioDomanda && <p className="text-xs font-semibold mt-1 text-slate-700">{messaggioDomanda}</p>}
          </form>
        </div>

        {/* SEZIONE 4: GESTIONE ED ELIMINAZIONE DOMANDE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">🗂️</span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Banca Dati Domande</h2>
                <p className="text-xs text-slate-400">Visualizza ed elimina le domande salvate</p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={materiaFiltro}
                onChange={(e) => handleCambioFiltro(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>
                    Materia: {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {caricamentoDomande ? (
            <div className="text-center py-8 text-xs text-slate-400">Caricamento quesiti...</div>
          ) : elencoDomande.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400">Nessuna domanda presente per questa materia.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-xs text-slate-500 font-medium mb-1">
                Trovate <strong>{elencoDomande.length}</strong> domande:
              </div>
              {elencoDomande.map((d, index) => (
                <div
                  key={d.id}
                  className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        #{index + 1}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        Esatta: {d.risposta_esatta}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 leading-snug mb-2">{d.testo}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <span><strong>A:</strong> {d.opzione_a}</span>
                      <span><strong>B:</strong> {d.opzione_b}</span>
                      {d.opzione_c && <span><strong>C:</strong> {d.opzione_c}</span>}
                      {d.opzione_d && <span><strong>D:</strong> {d.opzione_d}</span>}
                    </div>

                    {d.spiegazione && (
                      <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                        <strong>💡 Spiegazione:</strong> {d.spiegazione}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => eliminaDomanda(d.id)}
                    title="Elimina domanda"
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-200 shrink-0 cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
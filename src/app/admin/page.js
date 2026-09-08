'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

  // Domanda singola
  const [materiaScelta, setMateriaScelta] = useState('');
  const [testoDomanda, setTestoDomanda] = useState('');
  const [opzioneA, setOpzioneA] = useState('');
  const [opzioneB, setOpzioneB] = useState('');
  const [opzioneC, setOpzioneC] = useState('');
  const [opzioneD, setOpzioneD] = useState('');
  const [rispostaEsatta, setRispostaEsatta] = useState('A');
  const [spiegazione, setSpiegazione] = useState('');
  const [messaggioDomanda, setMessaggioDomanda] = useState('');

  // Import Massivo Excel
  const [materiaImport, setMateriaImport] = useState('');
  const [anteprimaDomande, setAnteprimaDomande] = useState([]);
  const [nomeFileCaricato, setNomeFileCaricato] = useState('');
  const [caricamentoMassivo, setCaricamentoMassivo] = useState(false);
  const [messaggioImport, setMessaggioImport] = useState('');

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
        setMateriaImport((prev) => prev || data[0].id);
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

  const eliminaMateria = async (idMateria, nomeMateria) => {
    const conferma = window.confirm(
      `Sei sicuro di voler eliminare la materia "${nomeMateria}" e tutte le sue domande?`
    );
    if (!conferma) return;

    await supabase.from('domande').delete().eq('materia_id', idMateria);
    const { error } = await supabase.from('materie').delete().eq('id', idMateria);

    if (error) {
      alert('Errore eliminazione: ' + error.message);
    } else {
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
      setMessaggioDomanda('✅ Domanda salvata!');
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

    const { error } = await supabase.from('domande').delete().eq('id', domandaId);

    if (error) {
      alert('Errore eliminazione: ' + error.message);
    } else {
      setElencoDomande((prev) => prev.filter((d) => d.id !== domandaId));
    }
  };

  const gestisciFileExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setNomeFileCaricato(file.name);
    setMessaggioImport('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        const domandeFormattate = rows
          .map((r) => {
            const getVal = (chiavi) => {
              for (const k of chiavi) {
                const trovata = Object.keys(r).find(
                  (col) => col.trim().toLowerCase() === k.toLowerCase()
                );
                if (trovata && r[trovata] !== undefined) return String(r[trovata]).trim();
              }
              return '';
            };

            const testo = getVal(['Testo Domanda', 'Domanda', 'Testo']);
            const opzA = getVal(['Opzione A', 'Risposta A', 'A']);
            const opzB = getVal(['Opzione B', 'Risposta B', 'B']);
            const opzC = getVal(['Opzione C', 'Risposta C', 'C']);
            const opzD = getVal(['Opzione D', 'Risposta D', 'D']);
            const esatta = getVal(['Risposta Esatta', 'Esatta', 'Corretta']).toUpperCase();
            const spieg = getVal(['Spiegazione Didattica', 'Spiegazione', 'Commento']);
            const materiaNome = getVal(['Materia']);

            return {
              testo,
              opzione_a: opzA,
              opzione_b: opzB,
              opzione_c: opzC || null,
              opzione_d: opzD || null,
              risposta_esatta: ['A', 'B', 'C', 'D'].includes(esatta) ? esatta : 'A',
              spiegazione: spieg || null,
              materia_nome: materiaNome,
            };
          })
          .filter((d) => d.testo && d.opzione_a && d.opzione_b);

        setAnteprimaDomande(domandeFormattate);
        if (domandeFormattate.length === 0) {
          setMessaggioImport('⚠️ Nessuna domanda valida trovata nel file.');
        } else {
          setMessaggioImport(`📊 Lette con successo ${domandeFormattate.length} domande pronte per l\'importazione!`);
        }
      } catch (err) {
        setMessaggioImport('❌ Errore durante la lettura del file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const confermaImportazione = async () => {
    if (anteprimaDomande.length === 0) return;
    setCaricamentoMassivo(true);
    setMessaggioImport('Salvataggio nel database in corso...');

    try {
      const payload = anteprimaDomande.map((d) => {
        let idMateriaDaUsare = materiaImport;
        if (d.materia_nome) {
          const matchMateria = materie.find(
            (m) => m.nome.trim().toLowerCase() === d.materia_nome.trim().toLowerCase()
          );
          if (matchMateria) idMateriaDaUsare = matchMateria.id;
        }

        return {
          materia_id: idMateriaDaUsare,
          testo: d.testo,
          opzione_a: d.opzione_a,
          opzione_b: d.opzione_b,
          opzione_c: d.opzione_c,
          opzione_d: d.opzione_d,
          risposta_esatta: d.risposta_esatta,
          spiegazione: d.spiegazione,
        };
      });

      const chunkSize = 100;
      for (let i = 0; i < payload.length; i += chunkSize) {
        const blocco = payload.slice(i, i + chunkSize);
        const { error } = await supabase.from('domande').insert(blocco);
        if (error) throw error;
      }

      setMessaggioImport(`🎉 Importate con successo ${payload.length} domande!`);
      setAnteprimaDomande([]);
      setNomeFileCaricato('');
      caricaDomandePerMateria(materiaFiltro);
    } catch (err) {
      setMessaggioImport('❌ Errore nel salvataggio: ' + err.message);
    }
    setCaricamentoMassivo(false);
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
            <p className="text-xs text-slate-400 mt-0.5">Gestisci studenti, materie e banca dati quesiti</p>
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
              placeholder="Email corsista"
              value={emailStudente}
              onChange={(e) => setEmailStudente(e.target.value)}
              className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
            <input
              type="text"
              placeholder="Password (min 6 car.)"
              value={passStudente}
              onChange={(e) => setPassStudente(e.target.value)}
              className="w-full sm:w-56 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        {/* SEZIONE 2: IMPORTAZIONE MASSIVA EXCEL */}
        <div className="bg-white p-6 rounded-3xl border-2 border-emerald-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">📊</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Importazione Massiva da Excel o CSV</h2>
              <p className="text-xs text-slate-400">Carica centinaia di domande con un clic tramite il template</p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 my-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Materia di destinazione predefinita:
              </label>
              <select
                value={materiaImport}
                onChange={(e) => setMateriaImport(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 block mt-1">
                * Se nel file Excel hai compilato la colonna Materia, verrà assegnata automaticamente.
              </span>
            </div>

            <div className="w-full sm:w-auto">
              <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer inline-flex items-center gap-2">
                <span>📁</span> Scegli File Excel / CSV
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={gestisciFileExcel}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {nomeFileCaricato && (
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-800 mb-3">
              <span>File selezionato: <strong>{nomeFileCaricato}</strong></span>
              <span className="font-bold">{anteprimaDomande.length} quesiti rilevati</span>
            </div>
          )}

          {messaggioImport && (
            <p className="text-xs font-semibold mb-3 text-slate-700">{messaggioImport}</p>
          )}

          {anteprimaDomande.length > 0 && (
            <button
              onClick={confermaImportazione}
              disabled={caricamentoMassivo}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {caricamentoMassivo
                ? 'Inserimento in corso nel Database...'
                : `Carica tutte le ${anteprimaDomande.length} domande nel Database 🚀`}
            </button>
          )}
        </div>

        {/* SEZIONE 3: GESTIONE ED ELIMINAZIONE MATERIE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">📚</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">Materie d&apos;Esame Attive</h2>
              <p className="text-xs text-slate-400">Aggiungi nuove materie o elimina quelle non necessarie</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {materie.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/70"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800">{m.nome}</span>
                  {m.descrizione && (
                    <span className="block text-[10px] text-slate-400 truncate max-w-[180px]">
                      {m.descrizione}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => eliminaMateria(m.id, m.nome)}
                  title={`Elimina ${m.nome}`}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer text-xs"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={aggiungiMateria} className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nuova Materia (es. Diritto)"
                value={nuovaMateria}
                onChange={(e) => setNuovaMateria(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <input
                type="text"
                placeholder="Breve descrizione (facoltativa)"
                value={descMateria}
                onChange={(e) => setDescMateria(e.target.value)}
                className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-all shadow-md shadow-amber-600/20 active:scale-[0.99] cursor-pointer shrink-0"
              >
                Aggiungi
              </button>
            </div>
            {messaggioMateria && <p className="text-xs font-semibold text-slate-700">{messaggioMateria}</p>}
          </form>
        </div>

        {/* SEZIONE 4: AGGIUNGI SINGOLA DOMANDA */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 mb-8 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">📝</span>
            <h2 className="text-base font-bold text-slate-900">Aggiungi Singola Domanda</h2>
          </div>
          <form onSubmit={aggiungiDomanda} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Seleziona la materia:</label>
              <select
                value={materiaScelta}
                onChange={(e) => setMateriaScelta(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows="3"
              placeholder="Scrivi qui il quesito d'esame..."
              value={testoDomanda}
              onChange={(e) => setTestoDomanda(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />

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

            <textarea
              rows="2"
              placeholder="Spiegazione didattica (Tasto Spiegamelo)..."
              value={spiegazione}
              onChange={(e) => setSpiegazione(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] cursor-pointer"
            >
              Salva Domanda
            </button>
            {messaggioDomanda && <p className="text-xs font-semibold text-slate-700">{messaggioDomanda}</p>}
          </form>
        </div>

        {/* SEZIONE 5: BANCA DATI ED ELIMINAZIONE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">🗂️</span>
              <div>
                <h2 className="text-base font-bold text-slate-900">Banca Dati Domande</h2>
                <p className="text-xs text-slate-400">Visualizza ed elimina i quesiti nel database</p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <select
                value={materiaFiltro}
                onChange={(e) => {
                  setMateriaFiltro(e.target.value);
                  caricaDomandePerMateria(e.target.value);
                }}
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
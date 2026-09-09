'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIPI_LOGICA = [
  'Logica figurale',
  'Logica numerica',
  'Logica deduttiva e ragionamento'
];

export default function AdminPage() {
  const router = useRouter();
  const [tabAttiva, setTabAttiva] = useState('domande'); // 'domande' | 'materie' | 'utenti' | 'archivio'

  const [materie, setMaterie] = useState([]);
  const [materiaSelezionata, setMateriaSelezionata] = useState('');
  const [sottotipologia, setSottotipologia] = useState('');

  // Form domanda singola
  const [testo, setTesto] = useState('');
  const [opzioneA, setOpzioneA] = useState('');
  const [opzioneB, setOpzioneB] = useState('');
  const [opzioneC, setOpzioneC] = useState('');
  const [opzioneD, setOpzioneD] = useState('');
  const [rispostaEsatta, setRispostaEsatta] = useState('A');
  const [spiegazione, setSpiegazione] = useState('');

  // Form nuova materia
  const [nuovaMateriaNome, setNuovaMateriaNome] = useState('');
  const [nuovaMateriaDesc, setNuovaMateriaDesc] = useState('');

  // Form nuovo studente
  const [nuovoUserEmail, setNuovoUserEmail] = useState('');
  const [nuovoUserPassword, setNuovoUserPassword] = useState('');

  // Archivio domande
  const [elencoDomande, setElencoDomande] = useState([]);
  const [filtroMateriaArchivio, setFiltroMateriaArchivio] = useState('tutte');
  const [caricamentoArchivio, setCaricamentoArchivio] = useState(false);

  // Notifiche e stati
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [caricamentoFile, setCaricamentoFile] = useState(false);

  useEffect(() => {
    async function initAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      await caricaMaterie();
    }
    initAdmin();
  }, [router]);

  async function caricaMaterie() {
    const { data, error } = await supabase.from('materie').select('*').order('nome', { ascending: true });
    if (!error && data && data.length > 0) {
      setMaterie(data);
      if (!materiaSelezionata) setMateriaSelezionata(data[0].id.toString());
    }
  }

  async function caricaArchivio(matId = 'tutte') {
    setCaricamentoArchivio(true);
    let query = supabase.from('domande').select('*, materie(nome)').order('id', { ascending: false }).limit(100);
    if (matId !== 'tutte') {
      query = query.eq('materia_id', matId);
    }
    const { data } = await query;
    if (data) setElencoDomande(data);
    setCaricamentoArchivio(false);
  }

  useEffect(() => {
    if (tabAttiva === 'archivio') {
      caricaArchivio(filtroMateriaArchivio);
    }
  }, [tabAttiva, filtroMateriaArchivio]);

  const materiaOggetto = materie.find((m) => m.id.toString() === materiaSelezionata.toString());
  const isLogica = materiaOggetto?.nome?.toLowerCase() === 'logica';

  // 1. INSERIMENTO DOMANDA SINGOLA
  const handleCreaDomanda = async (e) => {
    e.preventDefault();
    setSalvataggioInCorso(true);
    setMessaggio({ testo: '', tipo: '' });

    if (isLogica && !sottotipologia) {
      setMessaggio({ testo: 'Per la materia Logica seleziona una tipologia specifica!', tipo: 'errore' });
      setSalvataggioInCorso(false);
      return;
    }

    const payload = {
      materia_id: materiaSelezionata,
      testo,
      opzione_a: opzioneA,
      opzione_b: opzioneB,
      opzione_c: opzioneC,
      opzione_d: opzioneD,
      risposta_esatta: rispostaEsatta,
      spiegazione: spiegazione || null,
      sottotipologia: isLogica ? sottotipologia : null
    };

    const { error } = await supabase.from('domande').insert([payload]);

    if (error) {
      setMessaggio({ testo: `Errore inserimento: ${error.message}`, tipo: 'errore' });
    } else {
      setMessaggio({ testo: 'Domanda inserita con successo nel database!', tipo: 'successo' });
      setTesto('');
      setOpzioneA('');
      setOpzioneB('');
      setOpzioneC('');
      setOpzioneD('');
      setSpiegazione('');
      setRispostaEsatta('A');
    }
    setSalvataggioInCorso(false);
  };

  // 2. CREA NUOVA MATERIA
  const handleCreaMateria = async (e) => {
    e.preventDefault();
    setSalvataggioInCorso(true);
    setMessaggio({ testo: '', tipo: '' });

    const { error } = await supabase.from('materie').insert([
      { nome: nuovaMateriaNome.trim(), descrizione: nuovaMateriaDesc.trim() || null }
    ]);

    if (error) {
      setMessaggio({ testo: `Errore creazione materia: ${error.message}`, tipo: 'errore' });
    } else {
      setMessaggio({ testo: `Materia "${nuovaMateriaNome}" creata con successo!`, tipo: 'successo' });
      setNuovaMateriaNome('');
      setNuovaMateriaDesc('');
      await caricaMaterie();
    }
    setSalvataggioInCorso(false);
  };

  // 3. REGISTRAZIONE NUOVO STUDENTE
  const handleCreaStudente = async (e) => {
    e.preventDefault();
    setSalvataggioInCorso(true);
    setMessaggio({ testo: '', tipo: '' });

    const { data, error } = await supabase.auth.signUp({
      email: nuovoUserEmail.trim(),
      password: nuovoUserPassword,
    });

    if (error) {
      setMessaggio({ testo: `Errore creazione utente: ${error.message}`, tipo: 'errore' });
    } else {
      setMessaggio({ testo: `Account studente creato con successo per: ${nuovoUserEmail}!`, tipo: 'successo' });
      setNuovoUserEmail('');
      setNuovoUserPassword('');
    }
    setSalvataggioInCorso(false);
  };

  // 4. ELIMINA DOMANDA DALL'ARCHIVIO
  const handleEliminaDomanda = async (domandaId) => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questo quesito?')) return;
    const { error } = await supabase.from('domande').delete().eq('id', domandaId);
    if (!error) {
      setElencoDomande((prev) => prev.filter((d) => d.id !== domandaId));
    }
  };

  // 5. IMPORTAZIONE RAPIDA CSV / EXCEL
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCaricamentoFile(true);
    setMessaggio({ testo: '', tipo: '' });

    const reader = new FileReader();
    reader.onload = async ({ target }) => {
      try {
        const text = target.result;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
        if (lines.length < 2) {
          setMessaggio({ testo: 'File CSV non valido o privo di righe.', tipo: 'errore' });
          setCaricamentoFile(false);
          return;
        }

        const separatore = lines[0].includes(';') ? ';' : ',';
        const headers = lines[0].split(separatore).map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const righe = [];

        for (let i = 1; i < lines.length; i++) {
          const riga = lines[i].split(separatore).map((val) => val.trim().replace(/^"|"$/g, ''));
          if (riga.length < 5) continue;

          const rowData = {};
          headers.forEach((h, idx) => {
            rowData[h] = riga[idx] || '';
          });

          const qTesto = rowData['testo'] || rowData['domanda'] || riga[0];
          const optA = rowData['opzione_a'] || rowData['a'] || riga[1];
          const optB = rowData['opzione_b'] || rowData['b'] || riga[2];
          const optC = rowData['opzione_c'] || rowData['c'] || riga[3];
          const optD = rowData['opzione_d'] || rowData['d'] || riga[4];
          const corr = (rowData['risposta_esatta'] || rowData['esatta'] || riga[5] || 'A').toUpperCase().trim();
          const spieg = rowData['spiegazione'] || rowData['commento'] || (riga[6] || null);
          const subTipo = rowData['sottotipologia'] || rowData['tipologia'] || (riga[7] || null);

          if (qTesto && optA && optB) {
            righe.push({
              materia_id: materiaSelezionata,
              testo: qTesto,
              opzione_a: optA,
              opzione_b: optB,
              opzione_c: optC,
              opzione_d: optD,
              risposta_esatta: corr,
              spiegazione: spieg,
              sottotipologia: isLogica ? (subTipo || sottotipologia || 'Logica deduttiva e ragionamento') : null
            });
          }
        }

        if (righe.length === 0) {
          setMessaggio({ testo: 'Nessun quesito valido estratto dal CSV.', tipo: 'errore' });
          setCaricamentoFile(false);
          return;
        }

        const { error } = await supabase.from('domande').insert(righe);
        if (error) {
          setMessaggio({ testo: `Errore importazione: ${error.message}`, tipo: 'errore' });
        } else {
          setMessaggio({ testo: `Importazione completata: inserite ${righe.length} domande!`, tipo: 'successo' });
          e.target.value = '';
        }
      } catch (err) {
        setMessaggio({ testo: `Errore lettura: ${err.message}`, tipo: 'errore' });
      }
      setCaricamentoFile(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-6 lg:p-10 font-sans flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between bg-[#2E343D] border border-[#434B57] p-4 rounded-2xl mb-6 shadow-sm">
          <Link href="/" className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 flex items-center gap-1.5 transition-colors">
            <span>←</span> Torna alla Dashboard
          </Link>
          <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>🔒</span> Pannello Amministratore
          </span>
        </div>

        {/* NOTIFICA ESITO */}
        {messaggio.testo && (
          <div
            className={`p-4 rounded-2xl mb-6 text-xs font-bold border ${
              messaggio.tipo === 'successo'
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
            }`}
          >
            {messaggio.testo}
          </div>
        )}

        {/* TABS DI NAVIGAZIONE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTabAttiva('domande')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'domande'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>📝</span> Inserisci Domande
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('materie')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'materie'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>📚</span> Materie
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('utenti')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'utenti'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>👥</span> Aggiungi Account
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('archivio')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'archivio'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>🗂️</span> Consulta Archivio
          </button>
        </div>

        {/* CONTENUTO TAB 1: INSERISCI DOMANDE */}
        {tabAttiva === 'domande' && (
          <div className="flex flex-col gap-6">
            <div className="bg-[#2E343D] border border-[#434B57] p-6 rounded-3xl shadow-xl">
              <label className="block text-xs font-black uppercase text-[#94A3B8] tracking-wider mb-2">
                1. Materia di Destinazione
              </label>
              <select
                value={materiaSelezionata}
                onChange={(e) => {
                  setMateriaSelezionata(e.target.value);
                  setSottotipologia('');
                }}
                className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>

              {isLogica && (
                <div className="mt-4 pt-4 border-t border-[#434B57]">
                  <label className="block text-xs font-black uppercase text-amber-400 tracking-wider mb-2">
                    ⚡ Tipologia Specifica di Logica:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {TIPI_LOGICA.map((tipo) => (
                      <button
                        type="button"
                        key={tipo}
                        onClick={() => setSottotipologia(tipo)}
                        className={`p-3 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          sottotipologia === tipo
                            ? 'bg-amber-500 text-[#1C2025] border-amber-400 font-extrabold shadow-md shadow-amber-500/20'
                            : 'bg-[#23272D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
                        }`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CSV UPLOAD */}
            <div className="bg-[#2E343D] border border-[#434B57] p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">📑</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Importazione Rapida (CSV / Excel)</h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    Colonne: <code>testo; opzione_a; opzione_b; opzione_c; opzione_d; risposta_esatta; spiegazione; sottotipologia</code>
                  </p>
                </div>
              </div>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#434B57] hover:border-amber-500/50 rounded-2xl cursor-pointer bg-[#23272D]/50 transition-all">
                <span className="text-xs text-[#94A3B8] font-bold">
                  {caricamentoFile ? 'Caricamento in corso...' : 'Clicca per caricare file .CSV'}
                </span>
                <input type="file" accept=".csv" disabled={caricamentoFile} onChange={handleCSVUpload} className="hidden" />
              </label>
            </div>

            {/* FORM MANUALE */}
            <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">✏️</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Inserimento Singolo Quesito</h2>
                  <p className="text-[11px] text-[#94A3B8]">Compila il modulo per registrare la domanda</p>
                </div>
              </div>

              <form onSubmit={handleCreaDomanda} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] mb-1">Testo della Domanda</label>
                  <textarea
                    required
                    rows={3}
                    value={testo}
                    onChange={(e) => setTesto(e.target.value)}
                    placeholder="Scrivi qui il testo del quesito..."
                    className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Opzione A</label>
                    <input
                      required
                      type="text"
                      value={opzioneA}
                      onChange={(e) => setOpzioneA(e.target.value)}
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Opzione B</label>
                    <input
                      required
                      type="text"
                      value={opzioneB}
                      onChange={(e) => setOpzioneB(e.target.value)}
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Opzione C</label>
                    <input
                      type="text"
                      value={opzioneC}
                      onChange={(e) => setOpzioneC(e.target.value)}
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Opzione D</label>
                    <input
                      type="text"
                      value={opzioneD}
                      onChange={(e) => setOpzioneD(e.target.value)}
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-400 mb-1">Risposta Corretta</label>
                    <select
                      value={rispostaEsatta}
                      onChange={(e) => setRispostaEsatta(e.target.value)}
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="A">Opzione A</option>
                      <option value="B">Opzione B</option>
                      <option value="C">Opzione C</option>
                      <option value="D">Opzione D</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Spiegazione Didattica (Opzionale)</label>
                    <input
                      type="text"
                      value={spiegazione}
                      onChange={(e) => setSpiegazione(e.target.value)}
                      placeholder="Commento, norma o trucco di risoluzione..."
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvataggioInCorso}
                  className="mt-2 w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {salvataggioInCorso ? 'Salvataggio...' : 'Salva Domanda nel Database 💾'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CONTENUTO TAB 2: GESTIONE MATERIE */}
        {tabAttiva === 'materie' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">📚</span>
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC]">Aggiungi una Nuova Materia</h2>
                <p className="text-[11px] text-[#94A3B8]">Crea una nuova categoria di quesiti (es. Informatica, Inglese)</p>
              </div>
            </div>

            <form onSubmit={handleCreaMateria} className="flex flex-col gap-4 mb-8">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">Nome Materia</label>
                <input
                  required
                  type="text"
                  value={nuovaMateriaNome}
                  onChange={(e) => setNuovaMateriaNome(e.target.value)}
                  placeholder="es. Ordinamento Giudiziario"
                  className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">Descrizione Breve (Opzionale)</label>
                <input
                  type="text"
                  value={nuovaMateriaDesc}
                  onChange={(e) => setNuovaMateriaDesc(e.target.value)}
                  placeholder="es. Normativa su magistratura e uffici giudiziari"
                  className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={salvataggioInCorso}
                className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              >
                {salvataggioInCorso ? 'Creazione...' : 'Crea Nuova Materia ✨'}
              </button>
            </form>

            <div className="border-t border-[#434B57] pt-6">
              <h3 className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
                Materie Attualmente Presenti ({materie.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {materie.map((m) => (
                  <div key={m.id} className="p-3.5 bg-[#23272D] border border-[#434B57] rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#F8FAFC]">{m.nome}</div>
                      <div className="text-[10px] text-[#94A3B8]">{m.descrizione || 'Nessuna descrizione'}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#1C2025] rounded-md text-amber-400 border border-[#434B57]">
                      ID #{m.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CONTENUTO TAB 3: AGGIUNGI ACCOUNT STUDENTE */}
        {tabAttiva === 'utenti' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xl">👥</span>
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC]">Registra Account per uno Studente</h2>
                <p className="text-[11px] text-[#94A3B8]">Crea le credenziali d&apos;accesso per consentire al corsista di accedere al simulatore</p>
              </div>
            </div>

            <form onSubmit={handleCreaStudente} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">Email Studente</label>
                <input
                  required
                  type="email"
                  value={nuovoUserEmail}
                  onChange={(e) => setNuovoUserEmail(e.target.value)}
                  placeholder="studente@esempio.it"
                  className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">Password Iniziale</label>
                <input
                  required
                  type="password"
                  value={nuovoUserPassword}
                  onChange={(e) => setNuovoUserPassword(e.target.value)}
                  placeholder="Almeno 6 caratteri"
                  className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={salvataggioInCorso}
                className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50 mt-2"
              >
                {salvataggioInCorso ? 'Registrazione...' : 'Crea Account Studente 🚀'}
              </button>
            </form>
          </div>
        )}

        {/* CONTENUTO TAB 4: CONSULTA ARCHIVIO E BANCA DATI */}
        {tabAttiva === 'archivio' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-bold text-[#F8FAFC]">Archivio Domande Registrate</h2>
                <p className="text-[11px] text-[#94A3B8]">Visualizza i quesiti caricati, verifica le tipologie ed elimina gli errori</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#94A3B8]">Filtra:</span>
                <select
                  value={filtroMateriaArchivio}
                  onChange={(e) => setFiltroMateriaArchivio(e.target.value)}
                  className="p-2 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
                >
                  <option value="tutte">Tutte le materie</option>
                  {materie.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {caricamentoArchivio ? (
              <div className="text-center py-8 text-xs font-bold text-amber-400">Caricamento archivio in corso...</div>
            ) : elencoDomande.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#94A3B8]">Nessun quesito trovato per questo filtro.</div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                {elencoDomande.map((d) => (
                  <div key={d.id} className="p-4 bg-[#23272D] border border-[#434B57] rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {d.materie?.nome || 'Materia'}
                        </span>
                        {d.sottotipologia && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2E343D] text-[#94A3B8] border border-[#434B57]">
                            {d.sottotipologia}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleEliminaDomanda(d.id)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        Elimina ✕
                      </button>
                    </div>

                    <p className="text-xs font-bold text-[#F8FAFC] leading-relaxed">{d.testo}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#94A3B8] pt-2 border-t border-[#434B57]/40">
                      <span className={d.risposta_esatta === 'A' ? 'text-emerald-400 font-bold' : ''}>A: {d.opzione_a}</span>
                      <span className={d.risposta_esatta === 'B' ? 'text-emerald-400 font-bold' : ''}>B: {d.opzione_b}</span>
                      {d.opzione_c && <span className={d.risposta_esatta === 'C' ? 'text-emerald-400 font-bold' : ''}>C: {d.opzione_c}</span>}
                      {d.opzione_d && <span className={d.risposta_esatta === 'D' ? 'text-emerald-400 font-bold' : ''}>D: {d.opzione_d}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
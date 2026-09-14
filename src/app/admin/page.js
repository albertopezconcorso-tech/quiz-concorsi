'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIPI_LOGICA = [
  'Logica figurale',
  'Logica numerica',
  'Logica deduttiva e ragionamento'
];

export default function AdminPage() {
  const EMAIL_ADMIN_AUTORIZZATO = 'albertoadmin@live.it';

  const router = useRouter();
  const [autorizzato, setAutorizzato] = useState(false);
  const [tabAttiva, setTabAttiva] = useState('smart-paste');

  // Dati di base
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

  // Smart Paste (Incolla Testo)
  const [testoGrezzo, setTestoGrezzo] = useState('');
  const [anteprimaDomande, setAnteprimaDomande] = useState([]);

  // Form nuova materia
  const [nuovaMateriaNome, setNuovaMateriaNome] = useState('');
  const [nuovaMateriaDesc, setNuovaMateriaDesc] = useState('');

  // Gestione Studenti
  const [nuovoUserEmail, setNuovoUserEmail] = useState('');
  const [nuovoUserPassword, setNuovoUserPassword] = useState('');
  const [studenti, setStudenti] = useState([]);
  const [caricamentoStudenti, setCaricamentoStudenti] = useState(false);

  // Archivio e Ricerca
  const [elencoDomande, setElencoDomande] = useState([]);
  const [materiaArchivioAttiva, setMateriaArchivioAttiva] = useState(null);
  const [sottotipoArchivioFiltro, setSottotipoArchivioFiltro] = useState('tutti');
  const [testoRicerca, setTestoRicerca] = useState('');
  const [ordineRecenti, setOrdineRecenti] = useState(true);
  const [caricamentoArchivio, setCaricamentoArchivio] = useState(false);
  const [conteggiMaterie, setConteggiMaterie] = useState({});

  // Notifiche
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);

  useEffect(() => {
    async function verificaAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || session.user?.email?.toLowerCase() !== EMAIL_ADMIN_AUTORIZZATO.toLowerCase()) {
        await supabase.auth.signOut();
        router.replace('/login');
        return;
      }
      setAutorizzato(true);
      await caricaMaterie();
      await aggiornaConteggi();
    }
    verificaAdmin();
  }, [router]);

  async function caricaMaterie() {
    const { data, error } = await supabase.from('materie').select('*').order('nome', { ascending: true });
    if (!error && data && data.length > 0) {
      setMaterie(data);
      if (!materiaSelezionata) setMateriaSelezionata(data[0].id.toString());
      if (!materiaArchivioAttiva) setMateriaArchivioAttiva(data[0].id.toString());
    }
  }

  async function aggiornaConteggi() {
    const { data, error } = await supabase.from('domande').select('materia_id');
    if (!error && data) {
      const mappa = {};
      data.forEach((d) => {
        const id = d.materia_id ? d.materia_id.toString() : 'senza_materia';
        mappa[id] = (mappa[id] || 0) + 1;
      });
      setConteggiMaterie(mappa);
    }
  }

  useEffect(() => {
    if (tabAttiva === 'archivio' && materiaArchivioAttiva) {
      caricaDomandeMateria(materiaArchivioAttiva);
    }
  }, [tabAttiva, materiaArchivioAttiva]);

  useEffect(() => {
    if (tabAttiva === 'utenti') {
      caricaStudenti();
    }
  }, [tabAttiva]);

  async function caricaDomandeMateria(matId) {
    setCaricamentoArchivio(true);
    const { data, error } = await supabase
      .from('domande')
      .select('*, materie(nome)')
      .eq('materia_id', matId)
      .order('id', { ascending: false });

    if (!error && data) setElencoDomande(data);
    setCaricamentoArchivio(false);
  }

  async function caricaStudenti() {
    setCaricamentoStudenti(true);
    const { data, error } = await supabase.from('profili').select('*').order('created_at', { ascending: false });
    if (!error && data) setStudenti(data);
    setCaricamentoStudenti(false);
  }

  const handleLogoutAdmin = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const materiaOggetto = materie.find((m) => m.id.toString() === materiaSelezionata.toString());
  const isLogica = materiaOggetto?.nome?.toLowerCase() === 'logica';
  const materiaArchivioOggetto = materie.find((m) => m.id.toString() === materiaArchivioAttiva?.toString());
  const isArchivioLogica = materiaArchivioOggetto?.nome?.toLowerCase() === 'logica';

  // === PARSER DEL TESTO CON RICONOSCIMENTO DI MATERIA E TIPOLOGIA ===
  const analizzaTestoIncollato = (testoDaAnalizzare) => {
    if (!testoDaAnalizzare.trim()) {
      setAnteprimaDomande([]);
      return;
    }

    const blocchi = testoDaAnalizzare.split(/\n\s*\n+/);
    const domandeEstratte = [];

    for (const blocco of blocchi) {
      const linee = blocco.split('\n').map((l) => l.trim()).filter(Boolean);
      if (linee.length < 3) continue;

      let qMateriaNome = '';
      let qTipologia = '';
      let qTesto = '';
      let qA = '';
      let qB = '';
      let qC = '';
      let qD = '';
      let qEsatta = 'A';
      let qSpiegazione = '';

      for (const linea of linee) {
        const lower = linea.toLowerCase();

        if (lower.startsWith('materia:')) {
          qMateriaNome = linea.replace(/^materia:/i, '').trim();
        } else if (lower.startsWith('tipologia:') || lower.startsWith('sottotipologia:')) {
          qTipologia = linea.replace(/^(tipologia:|sottotipologia:)/i, '').trim();
        } else if (lower.startsWith('domanda:') || lower.startsWith('testo:')) {
          qTesto = linea.replace(/^(domanda:|testo:)/i, '').trim();
        } else if (/^[aA][\):\.-]\s*/.test(linea)) {
          qA = linea.replace(/^[aA][\):\.-]\s*/, '').trim();
        } else if (/^[bB][\):\.-]\s*/.test(linea)) {
          qB = linea.replace(/^[bB][\):\.-]\s*/, '').trim();
        } else if (/^[cC][\):\.-]\s*/.test(linea)) {
          qC = linea.replace(/^[cC][\):\.-]\s*/, '').trim();
        } else if (/^[dD][\):\.-]\s*/.test(linea)) {
          qD = linea.replace(/^[dD][\):\.-]\s*/, '').trim();
        } else if (lower.startsWith('esatta:') || lower.startsWith('risposta:')) {
          const char = linea.replace(/^(esatta:|risposta:)/i, '').trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(char)) qEsatta = char;
        } else if (lower.startsWith('spiegazione:') || lower.startsWith('commento:')) {
          qSpiegazione = linea.replace(/^(spiegazione:|commento:)/i, '').trim();
        } else if (!qTesto && !qA && !lower.startsWith('materia') && !lower.startsWith('tipologia')) {
          qTesto = linea;
        }
      }

      if (qTesto && qA && qB) {
        // Se è specificata una materia nel testo, cerchiamo l'id corrispondente
        let finalMateriaId = materiaSelezionata;
        let finalMateriaNome = materiaOggetto?.nome || 'Materia';

        if (qMateriaNome) {
          const matTrovata = materie.find((m) => m.nome.toLowerCase() === qMateriaNome.toLowerCase());
          if (matTrovata) {
            finalMateriaId = matTrovata.id;
            finalMateriaNome = matTrovata.nome;
          }
        }

        const isMatLogica = finalMateriaNome.toLowerCase() === 'logica';

        domandeEstratte.push({
          materia_id: finalMateriaId,
          materia_nome: finalMateriaNome,
          testo: qTesto,
          opzione_a: qA,
          opzione_b: qB,
          opzione_c: qC || null,
          opzione_d: qD || null,
          risposta_esatta: qEsatta,
          spiegazione: qSpiegazione || null,
          sottotipologia: isMatLogica ? (qTipologia || sottotipologia || 'Logica numerica') : null
        });
      }
    }

    setAnteprimaDomande(domandeEstratte);
  };

  const handleSalvaTestoIncollato = async () => {
    if (anteprimaDomande.length === 0) return;
    setSalvataggioInCorso(true);
    setMessaggio({ testo: '', tipo: '' });

    // Puliamo il campo materia_nome prima dell'insert su Supabase
    const payload = anteprimaDomande.map(({ materia_nome, ...d }) => d);

    const { error } = await supabase.from('domande').insert(payload);

    if (error) {
      setMessaggio({ testo: `Errore durante il salvataggio: ${error.message}`, tipo: 'errore' });
    } else {
      setMessaggio({ testo: `Inseriti con successo ${payload.length} quesiti nel database! 🚀`, tipo: 'successo' });
      setTestoGrezzo('');
      setAnteprimaDomande([]);
      await aggiornaConteggi();
      if (materiaArchivioAttiva) {
        await caricaDomandeMateria(materiaArchivioAttiva);
      }
    }
    setSalvataggioInCorso(false);
  };

  const handleCreaDomanda = async (e) => {
    e.preventDefault();
    setSalvataggioInCorso(true);
    setMessaggio({ testo: '', tipo: '' });

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
    if (!error) {
      setMessaggio({ testo: 'Domanda inserita con successo!', tipo: 'successo' });
      setTesto('');
      setOpzioneA('');
      setOpzioneB('');
      setOpzioneC('');
      setOpzioneD('');
      setSpiegazione('');
      await aggiornaConteggi();
    }
    setSalvataggioInCorso(false);
  };

  const handleEliminaDomanda = async (id) => {
    if (!confirm('Vuoi eliminare questo quesito?')) return;
    const { error } = await supabase.from('domande').delete().eq('id', id);
    if (!error) {
      setElencoDomande((prev) => prev.filter((d) => d.id !== id));
      await aggiornaConteggi();
    }
  };

  const domandeFiltrate = useMemo(() => {
    const filtrate = elencoDomande.filter((d) => {
      if (isArchivioLogica && sottotipoArchivioFiltro !== 'tutti') {
        if (d.sottotipologia !== sottotipoArchivioFiltro) return false;
      }
      if (!testoRicerca.trim()) return true;
      const q = testoRicerca.toLowerCase();
      return (
        d.testo?.toLowerCase().includes(q) ||
        d.opzione_a?.toLowerCase().includes(q) ||
        d.opzione_b?.toLowerCase().includes(q) ||
        d.spiegazione?.toLowerCase().includes(q)
      );
    });
    return filtrate.sort((a, b) => (ordineRecenti ? b.id - a.id : a.id - b.id));
  }, [elencoDomande, isArchivioLogica, sottotipoArchivioFiltro, testoRicerca, ordineRecenti]);

  const totaleComplessivo = Object.values(conteggiMaterie).reduce((acc, curr) => acc + curr, 0);

  if (!autorizzato) {
    return (
      <div className="min-h-screen bg-[#23272D] flex items-center justify-center text-amber-400 font-bold text-sm">
        Verifica credenziali Amministratore in corso... 🔒
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#23272D] text-[#F8FAFC] p-6 lg:p-10 font-sans flex flex-col items-center">
      <div className="w-full max-w-5xl">
        {/* Header con Logout */}
        <div className="flex items-center justify-between bg-[#2E343D] border border-[#434B57] p-4 rounded-2xl mb-6 shadow-sm">
          <Link href="/" className="text-xs font-bold text-[#94A3B8] hover:text-amber-400 flex items-center gap-1.5 transition-colors">
            <span>←</span> Torna alla Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#94A3B8] hidden sm:inline">
              Quesiti DB: <strong className="text-amber-400">{totaleComplessivo}</strong>
            </span>
            <button
              type="button"
              onClick={handleLogoutAdmin}
              className="text-xs font-black text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-xl border border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🚪</span> Esci dall&apos;Admin
            </button>
          </div>
        </div>

        {/* Notifiche */}
        {messaggio.testo && (
          <div className={`p-4 rounded-2xl mb-6 text-xs font-bold border ${messaggio.tipo === 'successo' ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/50 border-rose-500/50 text-rose-300'}`}>
            {messaggio.testo}
          </div>
        )}

        {/* TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTabAttiva('smart-paste')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'smart-paste'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
            }`}
          >
            <span>📋</span> Incolla Testo Rapido
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('domande')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'domande'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
            }`}
          >
            <span>✏️</span> Inserimento Singolo
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('archivio')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'archivio'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
            }`}
          >
            <span>🗂️</span> Archivio Domande
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('utenti')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'utenti'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
            }`}
          >
            <span>👥</span> Gestione Corsisti
          </button>
        </div>

        {/* TAB SMART PASTE (INCOLLA RAPIDO) */}
        {tabAttiva === 'smart-paste' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📋</span>
                <h2 className="text-base font-bold text-[#F8FAFC]">Incolla Testo Intelligente con Riconoscimento Automatico</h2>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Incolla le domande specificando <strong className="text-amber-400">MATERIA:</strong> e <strong className="text-amber-400">TIPOLOGIA:</strong>. Il sistema le catalogherà e le smisterà automaticamente.
              </p>
            </div>

            <textarea
              rows={13}
              value={testoGrezzo}
              onChange={(e) => {
                setTestoGrezzo(e.target.value);
                analizzaTestoIncollato(e.target.value);
              }}
              placeholder={`Esempio formato completo:\n\nMATERIA: Logica\nTIPOLOGIA: Logica numerica\nDOMANDA: Completare la serie: 10 - 20 - ? - 80\nA: 40\nB: 60\nC: 30\nD: 50\nESATTA: A\nSPIEGAZIONE: Moltiplicazione per 2\n\nMATERIA: Diritto Amministrativo\nDOMANDA: Il Consiglio di Stato è organo giurisdizionale di grado:\nA: Primo grado\nB: Secondo grado\nC: Unico grado\nD: Straordinario\nESATTA: B\nSPIEGAZIONE: Art. 100 Costituzione`}
              className="w-full p-4 bg-[#23272D] border border-[#434B57] rounded-2xl text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
            />

            {/* Anteprima del riconoscimento */}
            {anteprimaDomande.length > 0 && (
              <div className="p-4 bg-[#1C2025] border border-amber-500/30 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-amber-400">
                    ✓ Quesiti riconosciuti: <strong>{anteprimaDomande.length}</strong>
                  </span>
                  <span className="text-[11px] text-[#94A3B8]">
                    Controllo completato • Pronti per il salvataggio
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto flex flex-col gap-2.5 pr-1">
                  {anteprimaDomande.map((d, idx) => (
                    <div key={idx} className="p-3.5 bg-[#23272D] rounded-xl border border-[#434B57] text-[11px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-amber-400">#{idx + 1}</span>
                        <span className="px-2 py-0.5 rounded bg-[#2E343D] text-[#F8FAFC] font-bold border border-[#434B57]">
                          📚 {d.materia_nome}
                        </span>
                        {d.sottotipologia && (
                          <span className="px-2 py-0.5 rounded bg-[#1C2025] text-amber-300 font-semibold border border-amber-500/20">
                            🏷️ {d.sottotipologia}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-[#F8FAFC] mb-1">{d.testo}</div>
                      <div className="text-[#94A3B8]">
                        A: {d.opzione_a} | B: {d.opzione_b} | C: {d.opzione_c || '-'} | D: {d.opzione_d || '-'} | <strong className="text-emerald-400">Esatta: {d.risposta_esatta}</strong>
                      </div>
                      {d.spiegazione && <div className="text-amber-200/80 text-[10px] mt-1">💡 {d.spiegazione}</div>}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleSalvaTestoIncollato}
                  disabled={salvataggioInCorso}
                  className="mt-4 w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {salvataggioInCorso ? 'Salvataggio in corso...' : `Salva Tutti i ${anteprimaDomande.length} Quesiti nel Database 🚀`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB INSERIMENTO MANUALE */}
        {tabAttiva === 'domande' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
            <h2 className="text-sm font-bold text-[#F8FAFC] mb-4">Inserimento Singolo Quesito Manuale</h2>
            
            <div className="mb-4">
              <label className="block text-xs font-bold text-[#94A3B8] mb-1">Materia</label>
              <select
                value={materiaSelezionata}
                onChange={(e) => {
                  setMateriaSelezionata(e.target.value);
                  setSottotipologia('');
                }}
                className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400"
              >
                {materie.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreaDomanda} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-[#94A3B8] mb-1">Testo della Domanda</label>
                <textarea
                  required
                  rows={3}
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="text" placeholder="Opzione A" value={opzioneA} onChange={(e) => setOpzioneA(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]" />
                <input required type="text" placeholder="Opzione B" value={opzioneB} onChange={(e) => setOpzioneB(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]" />
                <input type="text" placeholder="Opzione C" value={opzioneC} onChange={(e) => setOpzioneC(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]" />
                <input type="text" placeholder="Opzione D" value={opzioneD} onChange={(e) => setOpzioneD(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={rispostaEsatta} onChange={(e) => setRispostaEsatta(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400">
                  <option value="A">Opzione A</option>
                  <option value="B">Opzione B</option>
                  <option value="C">Opzione C</option>
                  <option value="D">Opzione D</option>
                </select>
                <input type="text" placeholder="Spiegazione didattica (Opzionale)" value={spiegazione} onChange={(e) => setSpiegazione(e.target.value)} className="p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]" />
              </div>

              <button type="submit" disabled={salvataggioInCorso} className="bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3 rounded-xl text-xs cursor-pointer">
                {salvataggioInCorso ? 'Salvataggio...' : 'Salva Singola Domanda 💾'}
              </button>
            </form>
          </div>
        )}

        {/* TAB ARCHIVIO DOMANDE */}
        {tabAttiva === 'archivio' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 rounded-3xl shadow-xl flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              {materie.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMateriaArchivioAttiva(m.id.toString())}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${materiaArchivioAttiva === m.id.toString() ? 'bg-amber-500 text-[#1C2025] border-amber-400 font-black' : 'bg-[#23272D] border-[#434B57] text-[#94A3B8]'}`}
                >
                  {m.nome} ({conteggiMaterie[m.id] || 0})
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={testoRicerca}
                onChange={(e) => setTestoRicerca(e.target.value)}
                placeholder="🔍 Cerca quesito..."
                className="flex-1 p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC]"
              />
              <button
                type="button"
                onClick={() => setOrdineRecenti((prev) => !prev)}
                className="px-4 py-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400"
              >
                ⇅ {ordineRecenti ? 'Più recenti' : 'Più vecchie'}
              </button>
            </div>

            <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto">
              {domandeFiltrate.map((d, i) => (
                <div key={d.id} className="p-3.5 bg-[#23272D] rounded-xl border border-[#434B57]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-amber-400 font-bold">#{i + 1} (ID {d.id})</span>
                    <button type="button" onClick={() => handleEliminaDomanda(d.id)} className="text-xs text-rose-400 hover:text-rose-300">Elimina ✕</button>
                  </div>
                  <p className="text-xs font-bold text-[#F8FAFC] mb-2">{d.testo}</p>
                  <div className="text-[11px] text-[#94A3B8]">
                    A: {d.opzione_a} | B: {d.opzione_b} | C: {d.opzione_c || '-'} | D: {d.opzione_d || '-'} | <strong className="text-emerald-400">Esatta: {d.risposta_esatta}</strong>
                  </div>
                  {d.spiegazione && <div className="text-[10px] text-amber-300 mt-1">Spiegazione: {d.spiegazione}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB GESTIONE UTENTI */}
        {tabAttiva === 'utenti' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 rounded-3xl shadow-xl">
            <h2 className="text-sm font-bold text-[#F8FAFC] mb-4">Gestione Account Corsisti</h2>
            <div className="flex flex-col gap-2">
              {studenti.map((s) => (
                <div key={s.id} className="p-3 bg-[#23272D] rounded-xl border border-[#434B57] flex justify-between items-center text-xs">
                  <span>🎓 {s.email}</span>
                  <span className="text-[#94A3B8] text-[10px]">Iscritto: {new Date(s.created_at).toLocaleDateString('it-IT')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
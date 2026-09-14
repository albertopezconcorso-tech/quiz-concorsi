'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

  // Smart Paste (Incolla Testo Multiplo)
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

  // Selezione Multipla Archivio
  const [selezionati, setSelezionati] = useState([]);

  // Notifiche e stati di salvataggio
  const [messaggio, setMessaggio] = useState({ testo: '', tipo: '' });
  const [salvataggioInCorso, setSalvataggioInCorso] = useState(false);
  const [caricamentoFile, setCaricamentoFile] = useState(false);

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

  // Conteggio nativo esatto senza scaricare l'intero payload
  async function aggiornaConteggi() {
    const { data: materieDb } = await supabase.from('materie').select('id');
    if (!materieDb) return;

    const mappa = {};
    for (const m of materieDb) {
      const { count } = await supabase
        .from('domande')
        .select('*', { count: 'exact', head: true })
        .eq('materia_id', m.id);
      mappa[m.id] = count || 0;
    }
    setConteggiMaterie(mappa);
  }

  useEffect(() => {
    if (tabAttiva === 'archivio' && materiaArchivioAttiva) {
      setSelezionati([]);
      caricaDomandeMateria(materiaArchivioAttiva);
    }
  }, [tabAttiva, materiaArchivioAttiva]);

  useEffect(() => {
    if (tabAttiva === 'utenti') {
      caricaStudenti();
    }
  }, [tabAttiva]);

  // Paginazione a ciclo per superare il tetto delle 1000 righe di PostgREST
  async function caricaDomandeMateria(matId) {
    setCaricamentoArchivio(true);
    let tutteLeDomande = [];
    let da = 0;
    const passo = 1000;
    let continua = true;

    while (continua) {
      const { data, error } = await supabase
        .from('domande')
        .select('*, materie(nome)')
        .eq('materia_id', matId)
        .order('id', { ascending: false })
        .range(da, da + passo - 1);

      if (error || !data || data.length === 0) {
        continua = false;
      } else {
        tutteLeDomande = [...tutteLeDomande, ...data];
        if (data.length < passo) {
          continua = false;
        } else {
          da += passo;
        }
      }
    }

    setElencoDomande(tutteLeDomande);
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

  // 1. INSERIMENTO SINGOLA DOMANDA
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
      opzione_c: opzioneC || '-',
      opzione_d: opzioneD || '-',
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
      await aggiornaConteggi();
      if (materiaArchivioAttiva === materiaSelezionata) {
        await caricaDomandeMateria(materiaArchivioAttiva);
      }
    }
    setSalvataggioInCorso(false);
  };

  // 2. CREA MATERIA
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

  // 3. ELIMINA MATERIA
  const handleEliminaMateria = async (matId, matNome) => {
    if (!confirm(`Vuoi eliminare la materia "${matNome}" e tutte le sue domande associate?`)) return;
    setSalvataggioInCorso(true);
    await supabase.from('domande').delete().eq('materia_id', matId);
    const { error } = await supabase.from('materie').delete().eq('id', matId);
    if (!error) {
      setMessaggio({ testo: `Materia "${matNome}" eliminata con successo.`, tipo: 'successo' });
      await caricaMaterie();
      await aggiornaConteggi();
    } else {
      setMessaggio({ testo: `Errore eliminazione materia: ${error.message}`, tipo: 'errore' });
    }
    setSalvataggioInCorso(false);
  };

  // 4. REGISTRA ACCOUNT STUDENTE
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
      if (data?.user) {
        await supabase.from('profili').upsert({
          id: data.user.id,
          email: data.user.email,
          created_at: new Date().toISOString()
        });
      }
      setMessaggio({ testo: `Account studente creato per: ${nuovoUserEmail}!`, tipo: 'successo' });
      setNuovoUserEmail('');
      setNuovoUserPassword('');
      await caricaStudenti();
    }
    setSalvataggioInCorso(false);
  };

  // 5. REVOCA ACCOUNT STUDENTE
  const handleEliminaStudente = async (studenteId, email) => {
    if (!confirm(`Sei sicuro di voler revocare l'account di ${email}?`)) return;
    await supabase.from('profili').delete().eq('id', studenteId);
    setStudenti((prev) => prev.filter((s) => s.id !== studenteId));
    setMessaggio({ testo: `Account ${email} rimosso con successo.`, tipo: 'successo' });
  };

  // 6. ELIMINA DOMANDA SINGOLA
  const handleEliminaDomanda = async (domandaId) => {
    if (!confirm('Vuoi eliminare definitivamente questo quesito?')) return;
    const { error } = await supabase.from('domande').delete().eq('id', domandaId);
    if (!error) {
      setElencoDomande((prev) => prev.filter((d) => d.id !== domandaId));
      setSelezionati((prev) => prev.filter((id) => id !== domandaId));
      await aggiornaConteggi();
    }
  };

  // 7. ELIMINAZIONE MULTIPLA
  const handleEliminaMultipli = async () => {
    if (selezionati.length === 0) return;
    if (!confirm(`Vuoi eliminare definitivamente i ${selezionati.length} quesiti selezionati?`)) return;

    setSalvataggioInCorso(true);
    const { error } = await supabase.from('domande').delete().in('id', selezionati);

    if (error) {
      setMessaggio({ testo: `Errore eliminazione multipla: ${error.message}`, tipo: 'errore' });
    } else {
      setElencoDomande((prev) => prev.filter((d) => !selezionati.includes(d.id)));
      setMessaggio({ testo: `Eliminati con successo ${selezionati.length} quesiti.`, tipo: 'successo' });
      setSelezionati([]);
      await aggiornaConteggi();
    }
    setSalvataggioInCorso(false);
  };

  // Gestione selezioni
  const toggleSelezioneSingola = (id) => {
    setSelezionati((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 8. IMPORTAZIONE FILE EXCEL (.XLSX) O CSV
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCaricamentoFile(true);
    setMessaggio({ testo: '', tipo: '' });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonRows.length < 2) {
        setMessaggio({ testo: 'Il file selezionato è vuoto o privo di dati.', tipo: 'errore' });
        setCaricamentoFile(false);
        return;
      }

      const headers = jsonRows[0].map((h) => String(h || '').trim().toLowerCase());
      const colMateria = headers.findIndex((h) => h.includes('materia'));
      const colTesto = headers.findIndex((h) => h.includes('testo') || h.includes('domanda'));
      const colA = headers.findIndex((h) => h.includes('opzione a') || h === 'a' || h === 'opzione_a');
      const colB = headers.findIndex((h) => h.includes('opzione b') || h === 'b' || h === 'opzione_b');
      const colC = headers.findIndex((h) => h.includes('opzione c') || h === 'c' || h === 'opzione_c');
      const colD = headers.findIndex((h) => h.includes('opzione d') || h === 'd' || h === 'opzione_d');
      const colEsatta = headers.findIndex((h) => h.includes('esatta') || h.includes('risposta'));
      const colSpieg = headers.findIndex((h) => h.includes('spiegazione') || h.includes('commento'));
      const colSub = headers.findIndex((h) => h.includes('sottotipologia') || h.includes('tipologia'));

      const righeDaInserire = [];

      for (let i = 1; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        if (!row || row.length === 0) continue;

        const qTesto = colTesto !== -1 ? String(row[colTesto] || '').trim() : '';
        const optA = colA !== -1 ? String(row[colA] || '').trim() : '';
        const optB = colB !== -1 ? String(row[colB] || '').trim() : '';
        const optC = colC !== -1 ? String(row[colC] || '').trim() : '';
        const optD = colD !== -1 ? String(row[colD] || '').trim() : '';
        const esatta = colEsatta !== -1 ? String(row[colEsatta] || 'A').trim().toUpperCase() : 'A';
        const spieg = colSpieg !== -1 ? String(row[colSpieg] || '').trim() : null;
        const nomeMat = colMateria !== -1 ? String(row[colMateria] || '').trim() : '';
        let subTipo = colSub !== -1 ? String(row[colSub] || '').trim() : null;

        if (!qTesto || !optA || !optB) continue;

        let targetMateriaId = materiaSelezionata;
        if (nomeMat) {
          const matTrovata = materie.find((m) => m.nome.toLowerCase() === nomeMat.toLowerCase());
          if (matTrovata) targetMateriaId = matTrovata.id;
        }

        const matObj = materie.find((m) => m.id.toString() === targetMateriaId.toString());
        const isMateriaLogica = matObj?.nome?.toLowerCase() === 'logica';

        if (isMateriaLogica && !subTipo) {
          subTipo = sottotipologia || 'Logica numerica';
        }

        righeDaInserire.push({
          materia_id: targetMateriaId,
          testo: qTesto,
          opzione_a: optA,
          opzione_b: optB,
          opzione_c: optC || '-',
          opzione_d: optD || '-',
          risposta_esatta: esatta,
          spiegazione: spieg || null,
          sottotipologia: isMateriaLogica ? subTipo : null
        });
      }

      if (righeDaInserire.length === 0) {
        setMessaggio({ testo: 'Nessun quesito valido trovato nel file Excel.', tipo: 'errore' });
        setCaricamentoFile(false);
        return;
      }

      const { error } = await supabase.from('domande').insert(righeDaInserire);
      if (error) {
        setMessaggio({ testo: `Errore caricamento: ${error.message}`, tipo: 'errore' });
      } else {
        setMessaggio({ testo: `Importazione completata: inserite ${righeDaInserire.length} domande!`, tipo: 'successo' });
        e.target.value = '';
        await aggiornaConteggi();
        if (materiaArchivioAttiva) await caricaDomandeMateria(materiaArchivioAttiva);
      }
    } catch (err) {
      setMessaggio({ testo: `Errore lettura Excel: ${err.message}`, tipo: 'errore' });
    }
    setCaricamentoFile(false);
  };

  // 9. PARSER TESTO INTELLIGENTE (SMART PASTE)
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
          opzione_c: qC || '-',
          opzione_d: qD || '-',
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

  // Filtro Archivio
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
        d.opzione_c?.toLowerCase().includes(q) ||
        d.opzione_d?.toLowerCase().includes(q) ||
        d.spiegazione?.toLowerCase().includes(q)
      );
    });
    return filtrate.sort((a, b) => (ordineRecenti ? b.id - a.id : a.id - b.id));
  }, [elencoDomande, isArchivioLogica, sottotipoArchivioFiltro, testoRicerca, ordineRecenti]);

  const toggleSelezionaTuttiVisibili = () => {
    const idsVisibili = domandeFiltrate.map((d) => d.id);
    const tuttiSelezionati = idsVisibili.every((id) => selezionati.includes(id));
    if (tuttiSelezionati) {
      setSelezionati((prev) => prev.filter((id) => !idsVisibili.includes(id)));
    } else {
      setSelezionati((prev) => Array.from(new Set([...prev, ...idsVisibili])));
    }
  };

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
        {/* HEADER CON TASTO LOGOUT */}
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

        {/* NOTIFICHE */}
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

        {/* 5 TABS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          <button
            type="button"
            onClick={() => setTabAttiva('smart-paste')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'smart-paste'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>📋</span> Incolla Testo
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('domande')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'domande'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>✏️</span> Inserisci / Excel
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
            onClick={() => setTabAttiva('archivio')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              tabAttiva === 'archivio'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>🗂️</span> Archivio
          </button>
          <button
            type="button"
            onClick={() => setTabAttiva('utenti')}
            className={`p-3 rounded-2xl border text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 col-span-2 sm:col-span-1 ${
              tabAttiva === 'utenti'
                ? 'bg-amber-500 text-[#1C2025] border-amber-400 shadow-lg shadow-amber-500/20'
                : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            <span>👥</span> Corsisti
          </button>
        </div>

        {/* TAB 1: SMART PASTE */}
        {tabAttiva === 'smart-paste' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📋</span>
                <h2 className="text-base font-bold text-[#F8FAFC]">Incolla Testo Multiplo con Smistamento Automatico</h2>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Incolla il testo specificando <strong className="text-amber-400">MATERIA:</strong> e <strong className="text-amber-400">TIPOLOGIA:</strong>. Il sistema catalogherà ciascuna domanda nella materia corrispondente.
              </p>
            </div>

            <textarea
              rows={12}
              value={testoGrezzo}
              onChange={(e) => {
                setTestoGrezzo(e.target.value);
                analizzaTestoIncollato(e.target.value);
              }}
              placeholder={`Esempio formato riconosciuto:\n\nMATERIA: Logica\nTIPOLOGIA: Logica numerica\nDOMANDA: Completare la serie: 10 - 20 - ? - 80\nA: 40\nB: 60\nC: 30\nD: 50\nESATTA: A\nSPIEGAZIONE: Moltiplicazione per 2\n\nMATERIA: Diritto Amministrativo\nDOMANDA: Il Consiglio di Stato è organo giurisdizionale di grado:\nA: Primo grado\nB: Secondo grado\nC: Unico grado\nD: Straordinario\nESATTA: B\nSPIEGAZIONE: Art. 100 Costituzione`}
              className="w-full p-4 bg-[#23272D] border border-[#434B57] rounded-2xl text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-amber-500 transition-all leading-relaxed"
            />

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
                        A: {d.opzione_a} | B: {d.opzione_b} | C: {d.opzione_c} | D: {d.opzione_d} | <strong className="text-emerald-400">Esatta: {d.risposta_esatta}</strong>
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

        {/* TAB 2: INSERIMENTO SINGOLO & IMPORT EXCEL */}
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
                    {m.nome} ({conteggiMaterie[m.id] || 0} quesiti presenti)
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

            {/* IMPORT EXCEL */}
            <div className="bg-[#2E343D] border border-[#434B57] p-6 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">📊</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Importazione Diretta Excel (.xlsx) o CSV</h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    Carica il file Excel originale (.xlsx). Le colonne rimarranno perfettamente al料loro posto.
                  </p>
                </div>
              </div>
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#434B57] hover:border-amber-500/50 rounded-2xl cursor-pointer bg-[#23272D]/50 transition-all">
                <span className="text-xs text-[#94A3B8] font-bold">
                  {caricamentoFile ? 'Caricamento in corso...' : 'Clicca per caricare file .XLSX o .CSV'}
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  disabled={caricamentoFile}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* FORM MANUALE */}
            <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">✏️</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Inserimento Singolo Quesito</h2>
                  <p className="text-[11px] text-[#94A3B8]">Compila il modulo per registrare manualmente una domanda</p>
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
                      className="w-full p-3 bg-[#23272D] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400 focus:outline-none cursor-pointer"
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
                      placeholder="Commento didattico..."
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

        {/* TAB 3: MATERIE & STATISTICHE */}
        {tabAttiva === 'materie' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">📊</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Resoconto Totale Domande per Materia</h2>
                  <p className="text-[11px] text-[#94A3B8]">Panoramica esatta dei quesiti caricati sul simulatore</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {materie.map((m) => (
                  <div key={m.id} className="p-4 bg-[#23272D] border border-[#434B57] rounded-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-[#94A3B8] uppercase">Materia</span>
                        <h3 className="text-sm font-extrabold text-[#F8FAFC]">{m.nome}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleEliminaMateria(m.id, m.nome)}
                        className="text-[10px] text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                      >
                        Elimina ✕
                      </button>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#434B57]/50 flex items-center justify-between">
                      <span className="text-xs text-[#94A3B8]">Domande nel DB:</span>
                      <span className="text-base font-black text-amber-400">
                        {conteggiMaterie[m.id] || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CREA NUOVA MATERIA */}
            <div className="border-t border-[#434B57] pt-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xl">➕</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Aggiungi una Nuova Materia</h2>
                  <p className="text-[11px] text-[#94A3B8]">Crea una nuova sezione di studio</p>
                </div>
              </div>

              <form onSubmit={handleCreaMateria} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Nome Materia</label>
                    <input
                      required
                      type="text"
                      value={nuovaMateriaNome}
                      onChange={(e) => setNuovaMateriaNome(e.target.value)}
                      placeholder="es. Diritto Amministrativo"
                      className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#94A3B8] mb-1">Descrizione (Opzionale)</label>
                    <input
                      type="text"
                      value={nuovaMateriaDesc}
                      onChange={(e) => setNuovaMateriaDesc(e.target.value)}
                      placeholder="Descrizione sintetica..."
                      className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvataggioInCorso}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {salvataggioInCorso ? 'Creazione in corso...' : 'Crea Materia ✨'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: ARCHIVIO DOMANDE CON SELEZIONE ED ELIMINAZIONE MULTIPLA */}
        {tabAttiva === 'archivio' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col gap-6">
            <div>
              <h2 className="text-sm font-bold text-[#F8FAFC]">Archivio Domande per Argomento</h2>
              <p className="text-[11px] text-[#94A3B8] mb-4">
                Seleziona una materia per consultare solo i suoi quesiti
              </p>

              <div className="flex flex-wrap gap-2">
                {materie.map((m) => {
                  const isActive = materiaArchivioAttiva === m.id.toString();
                  const count = conteggiMaterie[m.id] || 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMateriaArchivioAttiva(m.id.toString());
                        setSottotipoArchivioFiltro('tutti');
                        setSelezionati([]);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                        isActive
                          ? 'bg-amber-500 text-[#1C2025] border-amber-400 font-black shadow-md shadow-amber-500/20'
                          : 'bg-[#23272D] border-[#434B57] text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      <span>{m.nome}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-[#1C2025] text-amber-400' : 'bg-[#2E343D] text-[#94A3B8]'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isArchivioLogica && (
              <div className="p-3 bg-[#23272D] border border-[#434B57] rounded-2xl flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-400 mr-2">Sottotipologia:</span>
                <button
                  type="button"
                  onClick={() => {
                    setSottotipoArchivioFiltro('tutti');
                    setSelezionati([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                    sottotipoArchivioFiltro === 'tutti'
                      ? 'bg-amber-500 text-[#1C2025] border-amber-400 font-black'
                      : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
                  }`}
                >
                  Tutte
                </button>
                {TIPI_LOGICA.map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      setSottotipoArchivioFiltro(tipo);
                      setSelezionati([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                      sottotipoArchivioFiltro === tipo
                        ? 'bg-amber-500 text-[#1C2025] border-amber-400 font-black'
                        : 'bg-[#2E343D] border-[#434B57] text-[#94A3B8]'
                    }`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-base text-[#94A3B8]">
                  🔍
                </span>
                <input
                  type="text"
                  value={testoRicerca}
                  onChange={(e) => setTestoRicerca(e.target.value)}
                  placeholder="Cerca testo, parola chiave o spiegazione..."
                  className="w-full pl-10 pr-16 py-3 bg-[#23272D] border border-[#434B57] rounded-2xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500 transition-colors"
                />
                {testoRicerca && (
                  <button
                    type="button"
                    onClick={() => setTestoRicerca('')}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-[#94A3B8] hover:text-[#F8FAFC]"
                  >
                    ✕ Svuota
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOrdineRecenti((prev) => !prev)}
                className="px-4 py-3 bg-[#23272D] border border-[#434B57] hover:border-amber-500/50 rounded-2xl text-xs font-bold text-[#F8FAFC] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <span className="text-amber-400 font-black text-sm">⇅</span>
                <span className="text-[#94A3B8]">Ordine:</span>
                <span className="text-amber-400 font-bold">
                  {ordineRecenti ? 'Più recenti' : 'Più vecchie'}
                </span>
              </button>
            </div>

            {/* BARRA AZIONI MULTIPLE */}
            {domandeFiltrate.length > 0 && (
              <div className="p-3.5 bg-[#1C2025] border border-[#434B57] rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleSelezionaTuttiVisibili}
                    className="px-3 py-1.5 bg-[#2E343D] hover:bg-[#38404c] border border-[#434B57] rounded-xl text-xs font-bold text-amber-400 cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <span>☑️</span>
                    {domandeFiltrate.every((d) => selezionati.includes(d.id))
                      ? 'Deseleziona tutti i visibili'
                      : 'Seleziona tutti i visibili'}
                  </button>

                  <span className="text-xs font-bold text-[#94A3B8]">
                    Selezionati: <strong className="text-amber-400">{selezionati.length}</strong> su {domandeFiltrate.length}
                  </span>
                </div>

                {selezionati.length > 0 && (
                  <button
                    type="button"
                    onClick={handleEliminaMultipli}
                    disabled={salvataggioInCorso}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg shadow-rose-900/30 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🗑️</span> Elimina i {selezionati.length} quesiti selezionati
                  </button>
                )}
              </div>
            )}

            {caricamentoArchivio ? (
              <div className="text-center py-10 text-xs font-bold text-amber-400">
                Caricamento quesiti...
              </div>
            ) : domandeFiltrate.length === 0 ? (
              <div className="p-8 bg-[#23272D] border border-[#434B57] rounded-2xl text-center text-xs text-[#94A3B8]">
                {testoRicerca
                  ? `Nessun quesito corrisponde alla ricerca "${testoRicerca}".`
                  : 'Nessuna domanda presente per questa materia.'}
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                <div className="text-[11px] font-bold text-[#94A3B8] px-1 flex items-center justify-between">
                  <span>
                    Visualizzati <span className="text-amber-400 font-extrabold">{domandeFiltrate.length}</span> quesiti
                  </span>
                  <span className="text-[10px] text-[#94A3B8]">
                    Ordinamento: <strong className="text-amber-400/90">{ordineRecenti ? 'Dalle ultime inserite' : 'Dalle prime inserite'}</strong>
                  </span>
                </div>

                {domandeFiltrate.map((d, index) => {
                  const isChecked = selezionati.includes(d.id);
                  return (
                    <div
                      key={d.id}
                      onClick={() => toggleSelezioneSingola(d.id)}
                      className={`p-4 rounded-2xl flex flex-col gap-2.5 transition-all cursor-pointer border ${
                        isChecked
                          ? 'bg-[#2E343D] border-amber-500/80 shadow-md shadow-amber-500/10'
                          : 'bg-[#23272D] border-[#434B57] hover:border-[#5a6575]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-4 h-4 rounded text-amber-500 accent-amber-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            #{index + 1} (ID #{d.id})
                          </span>
                          {d.sottotipologia && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#2E343D] text-[#94A3B8] border border-[#434B57]">
                              {d.sottotipologia}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEliminaDomanda(d.id);
                          }}
                          className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 cursor-pointer"
                        >
                          Elimina ✕
                        </button>
                      </div>

                      <p className="text-xs font-bold text-[#F8FAFC] leading-relaxed">{d.testo}</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#94A3B8] pt-2 border-t border-[#434B57]/40">
                        <span className={d.risposta_esatta === 'A' ? 'text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-md' : 'p-1.5'}>
                          A: {d.opzione_a}
                        </span>
                        <span className={d.risposta_esatta === 'B' ? 'text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-md' : 'p-1.5'}>
                          B: {d.opzione_b}
                        </span>
                        <span className={d.risposta_esatta === 'C' ? 'text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-md' : 'p-1.5'}>
                          C: {d.opzione_c || '-'}
                        </span>
                        <span className={d.risposta_esatta === 'D' ? 'text-emerald-400 font-bold bg-emerald-500/10 p-1.5 rounded-md' : 'p-1.5'}>
                          D: {d.opzione_d || '-'}
                        </span>
                      </div>

                      {d.spiegazione && (
                        <div className="text-[11px] text-slate-400 bg-[#1C2025]/50 p-2.5 rounded-xl border border-[#434B57]/40">
                          <strong className="text-amber-400/80">Spiegazione: </strong>
                          {d.spiegazione}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: GESTIONE ACCOUNT CORSISTI */}
        {tabAttiva === 'utenti' && (
          <div className="bg-[#2E343D] border border-[#434B57] p-6 lg:p-8 rounded-3xl shadow-xl flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-xl">👤</span>
                <div>
                  <h2 className="text-sm font-bold text-[#F8FAFC]">Registra Nuovo Studente</h2>
                  <p className="text-[11px] text-[#94A3B8]">Crea le credenziali d&apos;accesso per un corsista</p>
                </div>
              </div>

              <form onSubmit={handleCreaStudente} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      placeholder="Minimo 6 caratteri"
                      className="w-full p-3.5 bg-[#23272D] border border-[#434B57] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={salvataggioInCorso}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-[#1C2025] font-black py-3.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {salvataggioInCorso ? 'Registrazione...' : 'Crea Account Studente 🚀'}
                </button>
              </form>
            </div>

            <div className="border-t border-[#434B57] pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-[#F8FAFC]">Account Studenti Attivi</h3>
                  <p className="text-[11px] text-[#94A3B8]">Gestisci gli utenti abilitati ad accedere al simulatore</p>
                </div>
                <button
                  type="button"
                  onClick={caricaStudenti}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  Aggiorna 🔄
                </button>
              </div>

              {caricamentoStudenti ? (
                <div className="text-center py-6 text-xs text-amber-400">Caricamento account...</div>
              ) : studenti.length === 0 ? (
                <div className="p-6 bg-[#23272D] border border-[#434B57] rounded-2xl text-center text-xs text-[#94A3B8]">
                  Nessun profilo registrato al momento.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto">
                  {studenti.map((s) => (
                    <div
                      key={s.id}
                      className="p-3.5 bg-[#23272D] border border-[#434B57] rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base">🎓</span>
                        <div>
                          <div className="text-xs font-bold text-[#F8FAFC]">{s.email}</div>
                          <div className="text-[10px] text-[#94A3B8]">
                            Iscritto il: {s.created_at ? new Date(s.created_at).toLocaleDateString('it-IT') : 'N/D'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEliminaStudente(s.id, s.email)}
                        className="text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20 cursor-pointer"
                      >
                        Revoca Account ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
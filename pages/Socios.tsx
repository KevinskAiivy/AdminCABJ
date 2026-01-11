
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { 
  Search, UserPlus, Edit2, Trash2, MapPin, 
  ChevronLeft, ChevronRight, X, Save, CheckCircle2, 
  AlertTriangle, User, History, Trophy, ArrowRightLeft, Phone, Mail, BadgeCheck,
  ArrowRight, Check, Building2, Filter, Download, Users, Star, Lock, Unlock, Instagram, Facebook, RotateCcw, Loader2, UserX, FileText, Printer, XCircle
} from 'lucide-react';
import { Socio, TransferRequest } from '../types';
import { dataService } from '../services/dataService';
import { SOCIO_CATEGORIES, COUNTRIES } from '../constants';
import { CustomSelect } from '../components/CustomSelect';
import { getGenderRoleLabel, getGenderLabel as getGenderLabelUtil } from '../utils/genderLabels';
import { formatDateDisplay, formatDateToDB, formatDateFromDB } from '../utils/dateFormat';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const Socios = ({ user }: { user?: any }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [socios, setSocios] = useState<Socio[]>(dataService.getSocios());
  const [consulados, setConsulados] = useState(dataService.getConsulados());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Récupérer le consulado depuis l'URL au chargement
  const consuladoFromUrl = searchParams.get('consulado');
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterConsulado, setFilterConsulado] = useState<string>(consuladoFromUrl || 'ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterCuotaStatus, setFilterCuotaStatus] = useState<string>('ALL');
  
  // Initialiser le filtre consulado depuis l'URL si présent
  useEffect(() => {
    if (consuladoFromUrl && filterConsulado !== consuladoFromUrl) {
      setFilterConsulado(consuladoFromUrl);
      // Réinitialiser la page à 1 quand le filtre change
      setCurrentPage(1);
    }
  }, [consuladoFromUrl]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Modals & Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set(['ALL']));

  const [activeTab, setActiveTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewSocio, setViewSocio] = useState<Socio | null>(null);
  const [formData, setFormData] = useState<Partial<Socio>>({});
  const [socioTransfers, setSocioTransfers] = useState<TransferRequest[]>([]);
  
  // --- SPECIAL LOGIC STATES ---
  const [pendingConsulado, setPendingConsulado] = useState<string | null>(null);
  const [consuladoSelection, setConsuladoSelection] = useState<string>(''); // Intermediate selection
  const [isConsuladoLocked, setIsConsuladoLocked] = useState(true); // Verrouiller le changement de consulado
  
  // ID Management
  const [isIdLocked, setIsIdLocked] = useState(true);
  const [tempId, setTempId] = useState('');
  const [idStatus, setIdStatus] = useState<'IDLE' | 'ERROR' | 'VALID' | 'CONFIRMED'>('IDLE');
  const [pendingIdChange, setPendingIdChange] = useState<{old: string, new: string} | null>(null);

  // SUBSCRIBE TO DATA SERVICE
  useEffect(() => {
      const loadData = () => {
          setSocios(dataService.getSocios());
          setConsulados(dataService.getConsulados());
      };
      loadData();
      const unsubscribe = dataService.subscribe(loadData);
      return () => unsubscribe();
  }, []);

  // --- HELPERS ---
  const calculateSocioStatus = (paymentStr: string) => {
      if (!paymentStr) return { label: 'EN DEUDA', color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
      
      let paymentDate: Date | null = null;
      
      if (paymentStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = paymentStr.split('-').map(Number);
          paymentDate = new Date(y, m - 1, d);
      } 
      else if (paymentStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          const [d, m, y] = paymentStr.split('/').map(Number);
          paymentDate = new Date(y, m - 1, d);
      }
      else if (paymentStr.length === 7 && paymentStr.includes('/')) {
          const [m, y] = paymentStr.split('/').map(Number);
          paymentDate = new Date(y, m - 1, 1);
      }

      if (!paymentDate || isNaN(paymentDate.getTime())) {
          return { label: 'EN DEUDA', color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
      }

      const now = new Date();
      const currentAbsMonth = now.getFullYear() * 12 + now.getMonth();
      const paymentAbsMonth = paymentDate.getFullYear() * 12 + paymentDate.getMonth();
      const diffMonths = currentAbsMonth - paymentAbsMonth;
      
      if (diffMonths <= 0) return { label: 'AL DÍA', color: 'text-emerald-600 bg-emerald-50', dot: 'bg-emerald-500' };
      if (diffMonths <= 6) return { label: 'EN DEUDA', color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };
      return { label: 'DE BAJA', color: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
  };

  const getGenderLabel = (label: string, gender: string = 'M') => {
      return getGenderLabelUtil(label, gender as 'M' | 'F' | 'X');
  };

  const calculateAge = (dateStr?: string) => {
      if (!dateStr) return 0;
      const [d, m, y] = dateStr.split('/').map(Number);
      if (!y) return 0;
      const birth = new Date(y, m - 1, d);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
      }
      return age;
  };

  const stats = useMemo(() => {
    let alDiaCount = 0, deudaCount = 0, bajaCount = 0;
    socios.forEach(s => {
        const computed = calculateSocioStatus(s.last_month_paid || '');
        if (computed.label === 'AL DÍA') alDiaCount++;
        else if (computed.label === 'EN DEUDA') deudaCount++;
        else if (computed.label === 'DE BAJA') bajaCount++;
    });
    return { total: socios.length, alDia: alDiaCount, morosos: deudaCount, deBaja: bajaCount };
  }, [socios]);

  const filteredSocios = useMemo(() => {
    return socios.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(q) || s.dni.includes(q) || s.id.includes(q) || (s.consulado && s.consulado.toLowerCase().includes(q));
      
      const dynamicStatus = calculateSocioStatus(s.last_month_paid || '').label;
      const matchesCategory = filterCategory === 'ALL' || s.category === filterCategory;
      const matchesConsulado = filterConsulado === 'ALL' || 
        (filterConsulado === 'SEDE CENTRAL' || filterConsulado?.toUpperCase() === 'SEDE CENTRAL' 
          ? (!s.consulado || s.consulado?.toUpperCase() === 'SEDE CENTRAL' || s.consulado?.toUpperCase() === 'SEDE CENTRAL')
          : s.consulado === filterConsulado || s.consulado?.toUpperCase() === filterConsulado?.toUpperCase());
      const matchesRole = filterRole === 'ALL' 
        ? true 
        : filterRole === '' 
          ? !s.role || s.role === '' || s.role === null || s.role === undefined
          : (s.role && s.role.toUpperCase().trim() === filterRole.toUpperCase().trim());
      const matchesCuotaStatus = filterCuotaStatus === 'ALL' || dynamicStatus === filterCuotaStatus;

      return matchesSearch && matchesCategory && matchesConsulado && matchesRole && matchesCuotaStatus;
    });
  }, [socios, searchQuery, filterCategory, filterConsulado, filterRole, filterCuotaStatus]);

  const totalPages = Math.ceil(filteredSocios.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSocios.slice(start, start + itemsPerPage);
  }, [filteredSocios, currentPage]);

  const formatLastPaymentDate = (dateStr?: string) => {
      if (!dateStr) return '-';
      return formatDateDisplay(dateStr);
  };

  const handleExportPDF = () => {
      const doc = new jsPDF();
      const settings = dataService.getAppSettings();
      const logoUrl = settings.loginLogoUrl;

      if (logoUrl && logoUrl.length > 50) {
          try { doc.addImage(logoUrl, 'PNG', 14, 10, 20, 20); } catch (e) {}
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 59, 148);
      doc.text("PADRÓN OFICIAL DE SOCIOS", 40, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 40, 26);
      doc.text(settings.appName || "Administración Consulados", 40, 31);

      const isAll = exportSelection.has('ALL');
      const dataToExport = socios.filter(s => {
          const cName = s.consulado || 'Sede Central';
          if (isAll) return true;
          return exportSelection.has(cName);
      }).sort((a,b) => a.last_name.localeCompare(b.last_name));

      const tableData = dataToExport.map(s => {
          const status = calculateSocioStatus(s.last_month_paid);
          return [
              `${s.last_name.toUpperCase()}, ${s.first_name}`,
              s.dni,
              s.id,
              s.category,
              s.consulado || 'Sede Central',
              formatLastPaymentDate(s.last_month_paid),
              status.label
          ];
      });

      autoTable(doc, {
          startY: 40,
          head: [['Apellido y Nombre', 'DNI', 'N° Socio', 'Categoría', 'Consulado', 'Último Pago', 'Estado']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [0, 59, 148], textColor: [252, 177, 49], fontStyle: 'bold', halign: 'center' },
          columnStyles: { 0: { fontStyle: 'bold' }, 6: { halign: 'center', fontStyle: 'bold' } },
          styles: { fontSize: 8, cellPadding: 3 },
          alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      const pageCount = doc.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
      }
      doc.save(`Padron_Socios_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExportModalOpen(false);
  };

  // --- ACTIONS ---
  const resetFilters = () => {
    setFilterCategory('ALL');
    setFilterConsulado('ALL');
    setFilterRole('ALL');
    setFilterCuotaStatus('ALL');
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setSelectedSocio(null);
    const today = new Date();
    const formattedToday = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    const newTempId = Date.now().toString().slice(-10);
    setFormData({
        first_name: '', last_name: '', dni: '', category: 'ACTIVO', status: 'AL DÍA',
        email: '', phone: '+54 ', gender: 'M', birth_date: '', join_date: '',
        last_month_paid: formattedToday, consulado: '', role: 'SOCIO', avatar_color: 'bg-blue-500', expiration_date: '',
        numero_socio: newTempId // Initialiser numero_socio avec le nouveau tempId
    });
    setPendingConsulado(null); setConsuladoSelection(''); setPendingIdChange(null);
    setIsIdLocked(true); setTempId(newTempId); setIdStatus('IDLE');
    setSocioTransfers([]); setActiveTab('INFO'); setIsEditModalOpen(true); setShowSaveConfirm(false);
  };

  // Utilise la fonction utilitaire formatDateFromDB importée

  const handleEdit = (socio: Socio) => {
    setSelectedSocio(socio);
    // Convertir toutes les dates du format DB (YYYY-MM-DD) vers format affichage (DD/MM/YYYY)
    const paidDate = formatDateFromDB(socio.last_month_paid || '');
    const birthDateFormatted = formatDateFromDB(socio.birth_date || '');
    const joinDateFormatted = formatDateFromDB(socio.join_date || '');
    const expirationDateFormatted = formatDateFromDB(socio.expiration_date || '');
    
    setFormData({ 
        ...socio, 
        last_month_paid: paidDate, 
        birth_date: birthDateFormatted,
        join_date: joinDateFormatted,
        expiration_date: expirationDateFormatted
    });
    setPendingConsulado(null); setConsuladoSelection(socio.consulado || '');
    setPendingIdChange(null); setIsIdLocked(true); setTempId(socio.numero_socio || socio.id);
    setIdStatus('IDLE'); setSocioTransfers(dataService.getSocioTransfers(socio.id));
    setIsConsuladoLocked(true);
    setActiveTab('INFO'); setIsEditModalOpen(true); setShowSaveConfirm(false);
  };

  // Fonction helper pour formater automatiquement une date lors de la saisie (jj-mm-aaaa)
  const formatDateInput = (value: string): string => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 8)}`;
  };

  const executeSave = async () => {
    setIsSaving(true);
    const finalStatus = calculateSocioStatus(formData.last_month_paid || '');
    
    // Convertir toutes les dates du format affichage (DD/MM/YYYY) vers format DB (YYYY-MM-DD)
    const dbPaymentDate = formatDateToDB(formData.last_month_paid || '');
    const dbBirthDate = formatDateToDB(formData.birth_date || '');
    const dbJoinDate = formatDateToDB(formData.join_date || '');
    const dbExpirationDate = formatDateToDB(formData.expiration_date || '');
    
    let finalRole = formData.role;
    if (pendingConsulado) finalRole = 'SOCIO';
    let finalId = selectedSocio ? selectedSocio.id : tempId;
    let finalNumeroSocio = tempId || formData.numero_socio || (selectedSocio ? selectedSocio.numero_socio : '') || finalId || '';
    
    // Si un changement de numéro de socio est en attente, utiliser le nouveau numéro
    if (pendingIdChange) {
        finalId = pendingIdChange.new;
        finalNumeroSocio = pendingIdChange.new;
    }

    const finalData: Socio = {
        id: finalId || tempId || crypto.randomUUID().slice(-10),
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim(),
        // numero_socio : utiliser finalNumeroSocio qui prend en compte pendingIdChange
        numero_socio: finalNumeroSocio,
        dni: formData.dni || '',
        category: formData.category || 'ADHERENTE',
        status: finalStatus.label as any || 'AL DÍA',
        email: formData.email || '',
        phone: formData.phone || '', // Format international avec indicatif
        gender: (formData.gender === 'M' || formData.gender === 'F' || formData.gender === 'X') ? formData.gender : 'M',
        nationality: formData.nationality || undefined,
        birth_date: dbBirthDate || null,
        join_date: dbJoinDate || null,
        last_month_paid: dbPaymentDate || null,
        consulado: pendingConsulado !== null ? pendingConsulado : (formData.consulado || undefined),
        role: finalRole || 'SOCIO',
        avatar_color: formData.avatar_color || 'bg-blue-500',
        expiration_date: dbExpirationDate || null,
        twitter: formData.twitter || undefined,
        youtube: formData.youtube || undefined
    };

    try {
        if (selectedSocio) {
            if (pendingIdChange) {
                await dataService.deleteSocio(selectedSocio.id);
                await dataService.addSocio(finalData);
            } else {
                await dataService.updateSocio(finalData);
            }
        } else {
            await dataService.addSocio(finalData);
        }
        setSocios(dataService.getSocios());
        setIsEditModalOpen(false); setShowSaveConfirm(false);
    } catch (e: any) { 
        alert(`Error al guardar: ${e.message || 'Error desconocido'}`); 
    } finally { 
        setIsSaving(false); 
    }
  };

  // MOCK HELPERS FOR UI
  const getPhoneParts = (p='') => {
      if(p.startsWith('+')) { const parts = p.split(' '); return {code: parts[0], number: parts.slice(1).join(' ')}; }
      return {code: '+54', number: p};
  };
  const updatePhone = (part: 'code'|'number', val: string) => {
      const cur = getPhoneParts(formData.phone);
      if(part === 'code') setFormData({...formData, phone: `${val} ${cur.number}`});
      else setFormData({...formData, phone: `${cur.code} ${val.replace(/[^0-9]/g,'')}`});
  };
  const checkId = (val: string) => {
      const clean = val.replace(/\D/g,'').slice(0,10);
      setTempId(clean);
      // Mettre à jour aussi formData.numero_socio
      setFormData({...formData, numero_socio: clean});
      
      // Si le numéro est identique à l'original, pas de changement
      if(clean === selectedSocio?.numero_socio || clean === selectedSocio?.id) { 
          setIdStatus('IDLE'); 
          return; 
      }
      
      // Vérifier si le numéro est déjà utilisé (dans id OU numero_socio)
      const isUsed = socios.some(s => 
          (s.id === clean || s.numero_socio === clean) && 
          s.id !== selectedSocio?.id // Exclure le socio actuel
      );
      
      setIdStatus(isUsed ? 'ERROR' : 'VALID');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-4 bg-[#003B94] p-6 rounded-xl border border-white/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><User size={300} className="text-white" /></div>
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-3 rounded-xl border border-white/20"><User size={24} className="text-[#FCB131]" /></div>
                <div><h1 className="oswald text-2xl font-black text-white uppercase tracking-tighter">Padrón de Socios</h1><p className="text-[#FCB131] font-black uppercase text-[9px] tracking-[0.4em] mt-1">Gestión Centralizada</p></div>
            </div>
            <div className="flex gap-3 relative z-10">
                <button onClick={() => setIsExportModalOpen(true)} className="bg-white/10 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/10"><Download size={14} /> Exportar</button>
                <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all"><UserPlus size={14} /> Nuevo Socio</button>
            </div>
        </div>
        
        <GlassCard className="p-3 flex items-center gap-3 bg-white border-[#003B94]/10 h-20">
            <div className="p-2 rounded-lg bg-blue-50 text-[#003B94]"><Users size={16}/></div>
            <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.total}</span><span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Total Socios</span></div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3 bg-white border-[#003B94]/10 h-20">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={16}/></div>
            <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.alDia}</span><span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">Al Día</span></div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3 bg-white border-[#003B94]/10 h-20">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertTriangle size={16}/></div>
            <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.morosos}</span><span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">En Deuda</span></div>
        </GlassCard>
        <GlassCard className="p-3 flex items-center gap-3 bg-white border-[#003B94]/10 h-20">
            <div className="p-2 rounded-lg bg-red-50 text-red-600"><UserX size={16}/></div>
            <div><span className="block text-xl font-black text-[#001d4a] oswald leading-none">{stats.deBaja}</span><span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">De Baja</span></div>
        </GlassCard>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col xl:flex-row gap-4 items-center justify-between">
        <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-[#001d4a] transition-all font-black text-[8px] uppercase tracking-widest border border-transparent hover:border-gray-300 h-fit"><RotateCcw size={10} /> Limpiar Filtros</button>
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto overflow-x-auto">
            <div className="relative min-w-[130px]">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide"><option value="ALL">Categorías</option>{SOCIO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
            <div className="relative min-w-[150px]">
                <select value={filterConsulado} onChange={(e) => setFilterConsulado(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide"><option value="ALL">Consulados</option><option value="SEDE CENTRAL">Sede Central</option>{consulados.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
            {/* Filtre Estado de la cuota - visible uniquement pour PRESIDENTE et REFERENTE */}
            {(user?.role === 'PRESIDENTE' || user?.role === 'REFERENTE') && (
                <div className="relative min-w-[150px]">
                    <select value={filterCuotaStatus} onChange={(e) => setFilterCuotaStatus(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide">
                        <option value="ALL">Estado Cuota</option>
                        <option value="AL DÍA">Al Día</option>
                        <option value="EN DEUDA">En Deuda</option>
                        <option value="DE BAJA">De Baja</option>
                    </select>
                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
                </div>
            )}
            <div className="relative min-w-[130px]">
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide">
                    <option value="ALL">Roles</option>
                    <option value="SOCIO">Socio</option>
                    <option value="PRESIDENTE">Presidente</option>
                    <option value="REFERENTE">Referente</option>
                    <option value="">Sin Rol</option>
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
        </div>
        <div className="relative group w-full xl:w-80">
            <input type="text" placeholder="Buscar..." className="w-full bg-[#003B94]/5 border-transparent rounded-lg py-2.5 pl-10 pr-4 outline-none text-xs font-bold text-[#001d4a] transition-all focus:bg-white focus:ring-2 focus:ring-[#003B94]/10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#003B94]/30" size={16} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {currentItems.map((socio) => {
            const isPresident = socio.role === 'PRESIDENTE';
            const isReferente = socio.role === 'REFERENTE';
            const computedStatus = calculateSocioStatus(socio.last_month_paid || '');
            let containerClass = "";
            let variant: 'light' | 'gold' | 'dark' = 'light';
            
            if (isPresident) {
                variant = 'gold';
                containerClass = "border-2 border-[#001d4a] shadow-[0_8px_32px_rgba(252,177,49,0.4),0_0_40px_rgba(255,215,0,0.3),inset_0_0_20px_rgba(255,255,255,0.4)] bg-gradient-to-br from-[#FFD700] via-[#FFC125] to-[#FFA500] backdrop-blur-xl";
            } else if (isReferente) {
                variant = 'dark';
                containerClass = "border-2 border-[#FCB131] shadow-[0_0_20px_rgba(252,177,49,0.6),0_8px_32px_rgba(0,29,74,0.5)]";
            } else if (computedStatus.label === 'EN DEUDA') {
                variant = 'light';
                containerClass = "border-amber-300/40 shadow-[0_4px_16px_rgba(245,158,11,0.1)]";
            } else if (computedStatus.label === 'DE BAJA') {
                variant = 'light';
                containerClass = "border-red-300/40 shadow-[0_4px_16px_rgba(239,68,68,0.1)]";
            } else {
                variant = 'light';
                containerClass = "";
            }

            return (
            <GlassCard 
                key={socio.id} 
                onClick={() => setViewSocio(socio)} 
                className={`flex flex-col group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-5px_rgba(0,29,74,0.2)] ${containerClass} p-0`}
                variant={variant}
            >
                {/* Action buttons - visibles uniquement au survol */}
                <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleEdit(socio); 
                        }} 
                        className={`p-2 backdrop-blur-sm rounded-lg hover:text-white transition-all shadow-lg border hover:scale-110 ${
                            isPresident || isReferente
                                ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                                : 'bg-white/80 text-[#003B94] border-white/20 hover:bg-[#003B94]'
                        }`}
                        title="Editar socio"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedSocio(socio); 
                            setIsDeleteModalOpen(true); 
                        }} 
                        className={`p-2 backdrop-blur-sm text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg border hover:scale-110 ${
                            isPresident || isReferente
                                ? 'bg-white/20 border-white/30'
                                : 'bg-white/80 border-white/20'
                        }`}
                        title="Eliminar socio"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>

                <div className="p-5 pb-3 flex items-start gap-4 relative">
                    <div className={`flex-1 min-w-0 ${isPresident ? 'pr-16' : 'pr-16'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className={`oswald text-lg tracking-tight leading-none truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-[#001d4a]'}`}>
                                <span className="font-black uppercase">{socio.last_name.toUpperCase()}</span> <span className="font-normal capitalize">{socio.first_name.toLowerCase()}</span>
                            </h4>
                            {/* Pastille pour les présidents - à droite du nom */}
                            {isPresident && (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#001d4a] to-[#003B94] flex items-center justify-center shadow-[0_4px_12px_rgba(252,177,49,0.4),0_0_20px_rgba(252,177,49,0.3)] border-2 border-[#FCB131] z-10 animate-pulse flex-shrink-0">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 2px rgba(252, 177, 49, 0.8))' }}>
                                        <path d="M12 0.5L14.5 8.5L22.5 8.5L16 13.5L18.5 21.5L12 16L5.5 21.5L8 13.5L1.5 8.5L9.5 8.5L12 0.5Z" fill="#FCB131" stroke="#FCB131" strokeWidth="0.3" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-500'}`}>N° Socio:</span>
                            <span className={`text-[10px] font-black ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-[#001d4a]'}`}>{socio.numero_socio || socio.dni || 'N/A'}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center mt-2">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest backdrop-blur-sm border shadow-sm ${
                                isPresident 
                                    ? 'bg-[#001d4a]/10 border-[#001d4a]/30 text-[#001d4a]'
                                    : isReferente 
                                    ? 'bg-white/20 border-white/30 text-white' 
                                    : 'bg-white/60 border-white/30 text-gray-700'
                            }`}>{getGenderRoleLabel(socio.role || 'SOCIO', socio.gender)}</span>
                        </div>
                        {/* Email et téléphone */}
                        <div className="flex flex-col gap-1.5 mt-3">
                            {socio.email && (
                                <div className={`flex items-center gap-1.5 ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                    <Mail size={11} className={isPresident ? "text-[#001d4a]/60" : isReferente ? "text-white/60" : "text-gray-400"} />
                                    <span className={`text-[9px] font-bold truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.email}</span>
                                </div>
                            )}
                            {socio.phone && (
                                <div className={`flex items-center gap-1.5 ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                    <Phone size={11} className={isPresident ? "text-[#001d4a]/60" : isReferente ? "text-white/60" : "text-gray-400"} />
                                    <span className={`text-[9px] font-bold truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 space-y-3">
                    <div className={`flex items-center gap-2 ${isPresident ? 'text-[#001d4a] bg-[#001d4a]/5' : isReferente ? 'text-white/90 bg-white/10' : 'text-[#001d4a]/80 bg-white/30'} backdrop-blur-sm rounded-lg px-3 py-2 border ${isPresident ? 'border-[#001d4a]/20' : 'border-white/20'}`}>
                        <MapPin size={14} className={isPresident ? "text-[#001d4a]" : isReferente ? "text-[#FCB131]" : "text-[#FCB131]"} />
                        <span className={`text-[10px] font-black uppercase tracking-widest truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : ''}`}>{socio.consulado || 'SEDE CENTRAL'}</span>
                    </div>
                    {/* Pastille de statut - déplacée ici */}
                    <div className={`text-[9px] font-bold flex items-center justify-between border-t ${isPresident ? 'border-[#001d4a]/20' : 'border-white/20'} pt-2 ${isPresident ? 'text-[#001d4a] bg-[#001d4a]/5' : isReferente ? 'text-white bg-white/10' : 'text-[#001d4a] bg-white/20'} backdrop-blur-sm rounded-lg px-3 py-2`}>
                        <span className={`uppercase opacity-70 ${isPresident ? 'text-[#001d4a]/70' : isReferente ? 'text-white/70' : ''}`}>Estado:</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${computedStatus.color} ${isPresident ? 'bg-opacity-20 border border-[#001d4a]/30' : isReferente ? 'bg-opacity-20 border border-white/30' : ''}`}>
                            {computedStatus.label}
                        </span>
                    </div>
                </div>
            </GlassCard>
            );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8 pb-10">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /> Anterior</button>
          <div className="h-12 px-6 rounded-xl bg-[#003B94] flex items-center justify-center text-white oswald font-black text-lg shadow-lg">{currentPage} <span className="mx-2 text-white/50 text-sm">/</span> {totalPages}</div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed">Siguiente <ChevronRight size={16} /></button>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
             <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="relative bg-gradient-to-r from-[#003B94] to-[#001d4a] p-3 text-white shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 shadow-inner flex items-center justify-center text-lg font-black text-[#FCB131]">
                            {formData.first_name ? `${formData.first_name[0]}${formData.last_name ? formData.last_name[0] : ''}` : <User size={20}/>}
                        </div>
                        <div>
                            <h2 className="oswald text-xl font-black uppercase tracking-tight leading-none mb-0.5">{selectedSocio ? `Editar ${getGenderLabel('Socio', formData.gender)}` : `Nuevo ${getGenderLabel('Socio', formData.gender)}`}</h2>
                            <div className="flex items-center gap-2"><p className="text-[#FCB131] text-[8px] font-bold uppercase tracking-widest">{selectedSocio ? `N° Socio: ${selectedSocio.numero_socio || selectedSocio.id}` : 'Alta en Proceso'}</p></div>
                        </div>
                    </div>
                    <X onClick={() => setIsEditModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-colors absolute top-3 right-3 z-20" size={20} />
                </div>

                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-white/50">
                    <div className="space-y-2">
                        <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-1 flex items-center gap-1.5"><User size={11}/> {getGenderLabel('Datos del Socio', formData.gender)}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Apellido</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 uppercase text-[#001d4a]" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value.toUpperCase()})}/></div>
                            <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Nombre</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 capitalize text-[#001d4a]" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})}/></div>
                            <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Género</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">X (No binario)</option></select></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">DNI / Pasaporte</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})}/></div>
                            <div className="space-y-0.5">
                                <CustomSelect
                                    label="Nationalidad"
                                    value={formData.nationality || ''}
                                    onChange={(val) => setFormData({...formData, nationality: val})}
                                    options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                    placeholder="Seleccionar nacionalidad..."
                                    searchable={true}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Fecha de Nacimiento</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a] tracking-widest" 
                                    placeholder="jj-mm-aaaa" 
                                    value={formatDateFromDB(formData.birth_date || '')}
                                    onChange={e => {
                                        const formatted = formatDateInput(e.target.value);
                                        setFormData({...formData, birth_date: formatted});
                                    }}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-1 flex items-center gap-1.5"><Mail size={11}/> Contacto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={8}/> Email</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                    value={formData.email || ''} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="ejemplo@email.com"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={8}/> Teléfono</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="w-20 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                        value={getPhoneParts(formData.phone || '').code} 
                                        onChange={e => updatePhone('code', e.target.value)}
                                        placeholder="+54"
                                    />
                                    <input 
                                        type="tel" 
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                        value={getPhoneParts(formData.phone || '').number} 
                                        onChange={e => updatePhone('number', e.target.value)}
                                        placeholder="9 11 1234-5678"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-1 flex items-center gap-1.5"><Trophy size={11}/> Membresía</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Categoría</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                    {SOCIO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Desde el</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a] tracking-widest" 
                                    placeholder="jj-mm-aaaa" 
                                    value={formatDateFromDB(formData.join_date || '')}
                                    onChange={e => {
                                        const formatted = formatDateInput(e.target.value);
                                        setFormData({...formData, join_date: formatted});
                                    }}
                                    maxLength={10}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    Último Pago
                                    {(() => {
                                        const status = calculateSocioStatus(formData.last_month_paid || '');
                                        return (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[6px] font-black uppercase tracking-widest ${status.color}`}>
                                                {status.label}
                                            </span>
                                        );
                                    })()}
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none text-[#001d4a] tracking-widest" 
                                    placeholder="jj-mm-aaaa" 
                                    value={formatDateFromDB(formData.last_month_paid || '')}
                                    onChange={e => {
                                        const formatted = formatDateInput(e.target.value);
                                        setFormData({...formData, last_month_paid: formatted});
                                    }}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#001d4a] p-3 rounded-lg border border-[#FCB131]/30 shadow-lg relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                            <label className="text-[8px] font-black text-[#FCB131] uppercase tracking-widest flex items-center gap-1"><BadgeCheck size={9} /> Numéro de Socio</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        disabled={isIdLocked} 
                                        maxLength={10} 
                                        className={`w-full rounded-lg py-2 px-3 font-black text-xs outline-none transition-all border ${isIdLocked ? 'bg-white/10 text-white border-white/20' : idStatus === 'ERROR' ? 'bg-red-50 text-red-600 border-red-300' : 'bg-white text-[#001d4a] border-[#FCB131]'}`} 
                                        value={tempId} 
                                        onChange={e => checkId(e.target.value)} 
                                    />
                                    <button onClick={() => { setIsIdLocked(false); setIdStatus('IDLE'); setPendingIdChange(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FCB131] transition-colors">{isIdLocked ? <Lock size={12} /> : <Unlock size={12} />}</button>
                                </div>
                                {idStatus === 'VALID' && !isIdLocked && (
                                    <button 
                                        onClick={() => { 
                                            setPendingIdChange({ 
                                                old: selectedSocio?.numero_socio || selectedSocio?.id || '', 
                                                new: tempId 
                                            }); 
                                            setIdStatus('CONFIRMED'); 
                                            setIsIdLocked(true); 
                                        }} 
                                        className="bg-[#FCB131] text-[#001d4a] px-2.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                                    >
                                        Validar
                                    </button>
                                )}
                                {idStatus === 'ERROR' && !isIdLocked && (
                                    <button 
                                        disabled
                                        className="bg-gray-400 text-white px-2.5 rounded-lg font-black text-[8px] uppercase tracking-widest cursor-not-allowed opacity-50"
                                    >
                                        Ocupado
                                    </button>
                                )}
                            </div>
                            {/* Alerte si le numéro est en cours de modification */}
                            {!isIdLocked && tempId !== (selectedSocio?.numero_socio || selectedSocio?.id) && tempId.length > 0 && (
                                <div className={`mt-1.5 p-2 rounded-lg text-[7px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${idStatus === 'ERROR' ? 'bg-red-100 text-red-700 border border-red-200' : idStatus === 'VALID' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                                    {idStatus === 'ERROR' && <AlertTriangle size={10} />}
                                    {idStatus === 'VALID' && <CheckCircle2 size={10} />}
                                    {idStatus === 'ERROR' ? 'Número ya utilizado' : idStatus === 'VALID' ? 'Número disponible' : 'Verificando...'}
                                </div>
                            )}
                            {/* Message de confirmation intermédiaire */}
                            {pendingIdChange && idStatus === 'CONFIRMED' && (
                                <div className="mt-1.5 bg-[#FFFCE4] border border-[#FCB131] rounded-lg p-2 flex items-center justify-between text-[8px] font-bold text-[#001d4a]">
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 size={10} className="text-[#FCB131]" />
                                        Cambio: <span className="font-black">{pendingIdChange.old}</span> → <span className="font-black text-[#003B94]">{pendingIdChange.new}</span>
                                    </span>
                                    <button 
                                        onClick={() => { 
                                            setPendingIdChange(null); 
                                            setIdStatus('IDLE'); 
                                            setTempId(selectedSocio?.numero_socio || selectedSocio?.id || ''); 
                                            setIsIdLocked(true);
                                        }} 
                                        className="text-red-500 hover:text-red-700 font-black uppercase text-[7px] tracking-widest"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="space-y-1 relative z-10">
                            <label className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1"><Building2 size={9} /> Consulado</label>
                            {pendingConsulado === null ? (
                                <div className="space-y-1.5">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <select 
                                                disabled={isConsuladoLocked}
                                                className={`w-full rounded-lg py-2 px-3 font-bold text-xs outline-none transition-all appearance-none cursor-pointer border ${isConsuladoLocked ? 'bg-white/10 text-white border-white/20' : 'bg-white/10 text-white border-white/20 focus:border-[#FCB131]'}`} 
                                                value={consuladoSelection} 
                                                onChange={e => setConsuladoSelection(e.target.value)}
                                            >
                                                <option value="" className="text-black">Sede Central</option>
                                                {consulados.map(c => <option key={c.id} value={c.name} className="text-black">{c.name}</option>)}
                                            </select>
                                        </div>
                                        <button 
                                            onClick={() => { 
                                                setIsConsuladoLocked(false); 
                                                setPendingConsulado(null);
                                            }} 
                                            className="text-white/50 hover:text-[#FCB131] transition-colors"
                                        >
                                            {isConsuladoLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                        </button>
                                        {!isConsuladoLocked && consuladoSelection !== (formData.consulado || '') && consuladoSelection !== '' && (
                                            <button 
                                                onClick={() => { 
                                                    setPendingConsulado(consuladoSelection); 
                                                    setIsConsuladoLocked(true);
                                                }} 
                                                className="bg-[#FCB131] text-[#001d4a] px-2.5 rounded-lg font-black text-[8px] uppercase tracking-widest hover:bg-white transition-all shadow-lg"
                                            >
                                                Validar
                                            </button>
                                        )}
                                    </div>
                                    {/* Alerte si le consulado est en cours de modification */}
                                    {!isConsuladoLocked && consuladoSelection !== (formData.consulado || '') && consuladoSelection !== '' && (
                                        <div className="p-2 rounded-lg text-[7px] font-bold uppercase tracking-widest flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200">
                                            <AlertTriangle size={10} />
                                            Cambio de consulado pendiente
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <div className="bg-[#FFFCE4] border border-[#FCB131] rounded-lg p-2 flex items-center justify-between text-[8px] font-bold text-[#001d4a]">
                                        <span className="flex items-center gap-1.5">
                                            <CheckCircle2 size={10} className="text-[#FCB131]" />
                                            Traslado: <span className="font-black">{(formData.consulado || 'Sede Central')}</span> → <span className="font-black text-[#003B94]">{pendingConsulado || 'Sede Central'}</span>
                                        </span>
                                        <button 
                                            onClick={() => { 
                                                setConsuladoSelection(formData.consulado || ''); 
                                                setPendingConsulado(null);
                                                setIsConsuladoLocked(true);
                                            }} 
                                            className="text-red-500 hover:text-red-700 font-black uppercase text-[7px] tracking-widest"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-3 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-2 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-1.5 rounded-lg font-black uppercase text-[8px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={() => setShowSaveConfirm(true)} className="bg-[#003B94] text-white px-5 py-1.5 rounded-lg font-black uppercase text-[8px] tracking-widest shadow-xl flex items-center gap-1.5 hover:bg-[#001d4a] transition-all"><Save size={12} /> Guardar</button>
                </div>
             </div>
        </div>
      )}

      {/* ... Other modals (Save, Delete, Export) remain the same */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" >
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm text-center animate-in zoom-in-95">
                <h3 className="oswald text-xl font-bold text-[#001d4a] mb-2">¿Confirmar cambios?</h3>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-2 rounded-lg bg-gray-100 font-bold text-xs text-gray-600">Volver</button>
                    <button onClick={executeSave} disabled={isSaving} className="flex-1 py-2 rounded-lg bg-[#003B94] text-white font-bold text-xs flex items-center justify-center">{isSaving ? <Loader2 className="animate-spin" size={16}/> : 'Confirmar'}</button>
                </div>
            </div>
        </div>
      )}

      {isDeleteModalOpen && selectedSocio && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" >
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                <h3 className="oswald text-xl font-bold text-red-600 mb-2">Eliminar Socio</h3>
                <p className="text-sm text-gray-500">¿Estás seguro de eliminar a <strong>{selectedSocio.name}</strong>?</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2 rounded-lg bg-gray-100 font-bold text-xs text-gray-600">Cancelar</button>
                    <button onClick={() => { dataService.deleteSocio(selectedSocio.id); setIsDeleteModalOpen(false); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold text-xs">Eliminar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Socios;

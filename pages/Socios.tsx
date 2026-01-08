
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { 
  Search, UserPlus, Edit2, Trash2, MapPin, 
  ChevronLeft, ChevronRight, X, Save, CheckCircle2, 
  AlertTriangle, User, History, Trophy, ArrowRightLeft, Phone, Mail, BadgeCheck,
  ArrowRight, Check, Building2, Filter, Download, Users, Star, Lock, Unlock, Instagram, Facebook, RotateCcw, Loader2, UserX, FileText, Printer
} from 'lucide-react';
import { Socio, TransferRequest } from '../types';
import { dataService } from '../services/dataService';
import { SOCIO_CATEGORIES, SOCIO_STATUS, COUNTRIES } from '../constants';
import { CustomSelect } from '../components/CustomSelect';
import { getGenderRoleLabel, getGenderLabel as getGenderLabelUtil } from '../utils/genderLabels';
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
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
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
        const computed = calculateSocioStatus(s.lastMonthPaid || '');
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
      
      const dynamicStatus = calculateSocioStatus(s.lastMonthPaid || '').label;
      const matchesStatus = filterStatus === 'ALL' || dynamicStatus === filterStatus;
      const matchesCategory = filterCategory === 'ALL' || s.category === filterCategory;
      const matchesConsulado = filterConsulado === 'ALL' || 
        (filterConsulado === 'SEDE CENTRAL' || filterConsulado?.toUpperCase() === 'SEDE CENTRAL' 
          ? (!s.consulado || s.consulado?.toUpperCase() === 'SEDE CENTRAL' || s.consulado?.toUpperCase() === 'SEDE CENTRAL')
          : s.consulado === filterConsulado || s.consulado?.toUpperCase() === filterConsulado?.toUpperCase());
      const matchesRole = filterRole === 'ALL' || (filterRole === '' ? !s.role || s.role === '' : s.role === filterRole);
      const matchesCuotaStatus = filterCuotaStatus === 'ALL' || dynamicStatus === filterCuotaStatus;

      return matchesSearch && matchesStatus && matchesCategory && matchesConsulado && matchesRole && matchesCuotaStatus;
    });
  }, [socios, searchQuery, filterStatus, filterCategory, filterConsulado, filterRole, filterCuotaStatus]);

  const totalPages = Math.ceil(filteredSocios.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSocios.slice(start, start + itemsPerPage);
  }, [filteredSocios, currentPage]);

  const formatLastPaymentDate = (dateStr?: string) => {
      if (!dateStr) return '-';
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [y, m, d] = dateStr.split('-');
          return `${d}/${m}/${y}`;
      }
      if (dateStr.length === 7 && dateStr.includes('/')) return `01/${dateStr}`;
      return dateStr;
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
      }).sort((a,b) => a.lastName.localeCompare(b.lastName));

      const tableData = dataToExport.map(s => {
          const status = calculateSocioStatus(s.lastMonthPaid);
          return [
              `${s.lastName.toUpperCase()}, ${s.firstName}`,
              s.dni,
              s.id,
              s.category,
              s.consulado || 'Sede Central',
              formatLastPaymentDate(s.lastMonthPaid),
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
    setFilterStatus('ALL');
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
    setFormData({
        firstName: '', lastName: '', dni: '', category: 'ACTIVO', status: 'AL DÍA',
        email: '', phone: '+54 ', gender: 'M', birthDate: '', joinDate: '',
        lastMonthPaid: formattedToday, consulado: '', role: 'SOCIO'
    });
    setPendingConsulado(null); setConsuladoSelection(''); setPendingIdChange(null);
    setIsIdLocked(true); setTempId(Date.now().toString().slice(-10)); setIdStatus('IDLE');
    setSocioTransfers([]); setActiveTab('INFO'); setIsEditModalOpen(true); setShowSaveConfirm(false);
  };

  const handleEdit = (socio: Socio) => {
    setSelectedSocio(socio);
    let paidDate = socio.lastMonthPaid || '';
    if (paidDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = paidDate.split('-');
        paidDate = `${d}/${m}/${y}`; 
    } else if (paidDate.length === 7) {
        paidDate = `01/${paidDate}`;
    }
    let birthDateFormatted = socio.birthDate || '';
    if (birthDateFormatted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = birthDateFormatted.split('-');
        birthDateFormatted = `${d}/${m}/${y}`;
    }
    setFormData({ ...socio, lastMonthPaid: paidDate, birthDate: birthDateFormatted });
    setPendingConsulado(null); setConsuladoSelection(socio.consulado || '');
    setPendingIdChange(null); setIsIdLocked(true); setTempId(socio.id);
    setIdStatus('IDLE'); setSocioTransfers(dataService.getSocioTransfers(socio.id));
    setActiveTab('INFO'); setIsEditModalOpen(true); setShowSaveConfirm(false);
  };

  const executeSave = async () => {
    setIsSaving(true);
    const finalStatus = calculateSocioStatus(formData.lastMonthPaid || '');
    let dbPaymentDate = formData.lastMonthPaid || '';
    if (dbPaymentDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dbPaymentDate.split('/');
        dbPaymentDate = `${y}-${m}-${d}`;
    }
    let finalRole = formData.role;
    if (pendingConsulado) finalRole = 'SOCIO';
    let finalId = selectedSocio ? selectedSocio.id : tempId;
    if (pendingIdChange) finalId = pendingIdChange.new;

    let dbBirthDate = formData.birthDate || '';
    if (dbBirthDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = dbBirthDate.split('/');
        dbBirthDate = `${y}-${m}-${d}`;
    } else if (!dbBirthDate.match(/^\d{4}-\d{2}-\d{2}$/) && dbBirthDate) {
        // Si c'est déjà au format DD/MM/AAAA mais pas encore converti
        if (dbBirthDate.includes('/')) {
            const parts = dbBirthDate.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts;
                dbBirthDate = `${y}-${m}-${d}`;
            }
        }
    }

    const finalData: Socio = {
        id: finalId || tempId || crypto.randomUUID().slice(-10),
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        name: `${formData.firstName || ''} ${formData.lastName || ''}`.trim(),
        numeroSocio: formData.numeroSocio || finalId || tempId || '',
        dni: formData.dni || '',
        category: formData.category || 'ADHERENTE',
        status: finalStatus.label as any || 'AL DÍA',
        email: formData.email || '',
        phone: formData.phone || '',
        phoneSecondary: formData.phoneSecondary || undefined,
        gender: (formData.gender === 'M' || formData.gender === 'F' || formData.gender === 'X') ? formData.gender : 'M',
        nationality: formData.nationality || undefined,
        birthDate: dbBirthDate || '',
        joinDate: formData.joinDate || '',
        lastMonthPaid: dbPaymentDate || '',
        emergencyContact: formData.emergencyContact || undefined,
        consulado: pendingConsulado !== null ? pendingConsulado : (formData.consulado || undefined),
        role: finalRole || 'SOCIO',
        avatarColor: formData.avatarColor || 'bg-blue-500',
        expirationDate: formData.expirationDate || '',
        instagram: formData.instagram || undefined,
        facebook: formData.facebook || undefined,
        twitter: formData.twitter || undefined,
        youtube: formData.youtube || undefined,
        avatar: formData.avatar || undefined
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
      if(clean === selectedSocio?.id) { setIdStatus('IDLE'); return; }
      setIdStatus(socios.some(s => s.id === clean) ? 'ERROR' : 'VALID');
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
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide"><option value="ALL">Estados</option>{SOCIO_STATUS.map(st => <option key={st} value={st}>{st}</option>)}</select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
            <div className="relative min-w-[130px]">
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide"><option value="ALL">Categorías</option>{SOCIO_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
            <div className="relative min-w-[150px]">
                <select value={filterConsulado} onChange={(e) => setFilterConsulado(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide"><option value="ALL">Consulados</option><option value="SEDE CENTRAL">Sede Central</option>{consulados.sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
            <div className="relative min-w-[150px]">
                <select value={filterCuotaStatus} onChange={(e) => setFilterCuotaStatus(e.target.value)} className="w-full bg-white border border-[#003B94]/10 rounded-lg py-2.5 pl-3 pr-8 text-xs font-bold text-[#001d4a] outline-none focus:border-[#003B94]/30 appearance-none cursor-pointer uppercase tracking-wide">
                    <option value="ALL">Estado Cuota</option>
                    <option value="AL DÍA">Al Día</option>
                    <option value="EN DEUDA">En Deuda</option>
                    <option value="DE BAJA">De Baja</option>
                </select>
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94]/30 rotate-90 pointer-events-none" size={12} />
            </div>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-h-[500px]">
        {currentItems.map((socio) => {
            const isPresident = socio.role === 'PRESIDENTE';
            const computedStatus = calculateSocioStatus(socio.lastMonthPaid || '');
            let containerClass = "bg-white border-[#003B94]/10";
            if (isPresident) containerClass = "bg-gradient-to-br from-[#FCB131] to-[#FFD23F] border-[#001d4a]/20 shadow-[0_0_25px_rgba(252,177,49,0.3)]";
            else if (computedStatus.label === 'EN DEUDA') containerClass = "bg-gradient-to-br from-white to-amber-50 border-amber-200 border-2";
            else if (computedStatus.label === 'DE BAJA') containerClass = "bg-gradient-to-br from-white to-red-50 border-red-200 border-2";

            return (
            <GlassCard key={socio.id} onClick={() => setViewSocio(socio)} className={`flex flex-col group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${containerClass} p-0`}>
                <div className="p-5 pb-3 flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-full ${socio.avatarColor || 'bg-gray-300'} flex items-center justify-center text-white text-lg font-black shadow-md shrink-0 relative border-2 border-white`}>
                        {socio.firstName.charAt(0)}{socio.lastName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="oswald text-lg tracking-tight leading-none mb-1 truncate text-[#001d4a]">
                            <span className="font-black">{socio.lastName.toUpperCase()}</span> <span className="font-medium">{socio.firstName}</span>
                        </h4>
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border bg-gray-100 text-gray-500 border-gray-200">{getGenderRoleLabel(socio.role || 'SOCIO', socio.gender)}</span>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${computedStatus.color}`}>{computedStatus.label}</span>
                        </div>
                    </div>
                </div>
                <div className="px-5 py-3 space-y-3">
                    <div className="flex items-center gap-2 text-[#001d4a]/80">
                        <MapPin size={14} className="text-[#FCB131]" />
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{socio.consulado || 'SEDE CENTRAL'}</span>
                    </div>
                    <div className="text-[9px] font-bold flex items-center justify-between border-t border-[#003B94]/5 pt-2 text-[#001d4a]">
                        <span className="uppercase opacity-70">Ultimo Pago:</span>
                        <span className="text-[#003B94]">{formatLastPaymentDate(socio.lastMonthPaid)}</span>
                    </div>
                </div>
                <div className="mt-auto px-5 py-3 border-t border-black/5 bg-white/50 flex justify-between items-center">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">N° Socio: {socio.numeroSocio || socio.id}</span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); handleEdit(socio); }} className="p-1.5 bg-[#003B94]/10 text-[#003B94] rounded hover:bg-[#003B94] hover:text-white"><Edit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSocio(socio); setIsDeleteModalOpen(true); }} className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-500 hover:text-white"><Trash2 size={12} /></button>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
             <div className="relative w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[calc(100vh-7rem-2rem)] animate-in zoom-in-95 duration-300">
                <div className="relative bg-gradient-to-r from-[#003B94] to-[#001d4a] p-4 text-white shrink-0 overflow-hidden">
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 shadow-inner flex items-center justify-center text-xl font-black text-[#FCB131]">
                            {formData.firstName ? `${formData.firstName[0]}${formData.lastName ? formData.lastName[0] : ''}` : <User size={24}/>}
                        </div>
                        <div>
                            <h2 className="oswald text-2xl font-black uppercase tracking-tight leading-none mb-0.5">{selectedSocio ? `Editar ${getGenderLabel('Socio', formData.gender)}` : `Nuevo ${getGenderLabel('Socio', formData.gender)}`}</h2>
                            <div className="flex items-center gap-2"><p className="text-[#FCB131] text-[9px] font-bold uppercase tracking-widest">{selectedSocio ? `N° Socio: ${selectedSocio.numeroSocio || selectedSocio.id}` : 'Alta en Proceso'}</p></div>
                        </div>
                    </div>
                    <X onClick={() => setIsEditModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-1.5 hover:bg-white/10 rounded-full transition-colors absolute top-4 right-4 z-20" size={24} />
                </div>

                <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1 bg-white/50">
                    <div className="space-y-3">
                        <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/10 pb-1.5 flex items-center gap-1.5"><User size={12}/> {getGenderLabel('Datos del Socio', formData.gender)}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Apellido</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 uppercase text-[#001d4a]" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value.toUpperCase()})}/></div>
                            <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nombre</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 capitalize text-[#001d4a]" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})}/></div>
                            <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Género</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">X (No binario)</option></select></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">DNI / Pasaporte</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.dni} onChange={e => setFormData({...formData, dni: e.target.value})}/></div>
                            <div className="space-y-1">
                                <CustomSelect
                                    label="Nationalidad"
                                    value={formData.nationality || ''}
                                    onChange={(val) => setFormData({...formData, nationality: val})}
                                    options={COUNTRIES.map(c => ({ value: c, label: c }))}
                                    placeholder="Seleccionar nacionalidad..."
                                    searchable={true}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Fecha de Nacimiento</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a] tracking-widest" 
                                    placeholder="DD/MM/AAAA" 
                                    value={(() => {
                                        if (!formData.birthDate) return '';
                                        if (formData.birthDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                            const [y, m, d] = formData.birthDate.split('-');
                                            return `${d}/${m}/${y}`;
                                        }
                                        return formData.birthDate;
                                    })()}
                                    onChange={e => {
                                        let value = e.target.value.replace(/\D/g, '');
                                        let formatted = '';
                                        if (value.length > 0) {
                                            if (value.length <= 2) {
                                                formatted = value;
                                            } else if (value.length <= 4) {
                                                formatted = value.slice(0, 2) + '/' + value.slice(2);
                                            } else {
                                                formatted = value.slice(0, 2) + '/' + value.slice(2, 4) + '/' + value.slice(4, 8);
                                            }
                                        }
                                        if (formatted.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                                            const [d, m, y] = formatted.split('/');
                                            setFormData({...formData, birthDate: `${y}-${m}-${d}`});
                                        } else {
                                            setFormData({...formData, birthDate: formatted});
                                        }
                                    }}
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/10 pb-1.5 flex items-center gap-1.5"><Mail size={12}/> Contacto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Mail size={9}/> Email</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                    value={formData.email || ''} 
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    placeholder="ejemplo@email.com"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Phone size={9}/> Teléfono</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="w-20 bg-gray-50 border border-gray-200 rounded-lg py-2 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                        value={getPhoneParts(formData.phone || '').code} 
                                        onChange={e => updatePhone('code', e.target.value)}
                                        placeholder="+54"
                                    />
                                    <input 
                                        type="tel" 
                                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                        value={getPhoneParts(formData.phone || '').number} 
                                        onChange={e => updatePhone('number', e.target.value)}
                                        placeholder="9 11 1234-5678"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-[#003B94] font-black uppercase text-[10px] tracking-widest border-b border-[#003B94]/10 pb-1.5 flex items-center gap-1.5"><Trophy size={12}/> Membresía</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Categoría</label>
                                <select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                                    {SOCIO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Desde el</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a] tracking-widest" 
                                    placeholder="DD/MM/AAAA" 
                                    value={formData.joinDate || ''} 
                                    onChange={e => setFormData({...formData, joinDate: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    Último Pago
                                    {(() => {
                                        const status = calculateSocioStatus(formData.lastMonthPaid || '');
                                        return (
                                            <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest ${status.color}`}>
                                                {status.label}
                                            </span>
                                        );
                                    })()}
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none text-[#001d4a] tracking-widest" 
                                    placeholder="DD/MM/AAAA" 
                                    value={formData.lastMonthPaid || ''} 
                                    onChange={e => setFormData({...formData, lastMonthPaid: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#001d4a] p-4 rounded-xl border border-[#FCB131]/30 shadow-lg relative overflow-hidden">
                        <div className="space-y-1 relative z-10">
                            <label className="text-[9px] font-black text-[#FCB131] uppercase tracking-widest flex items-center gap-1"><BadgeCheck size={10} /> Numéro de Socio</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input type="text" disabled={isIdLocked} maxLength={10} className={`w-full rounded-xl py-3 px-4 font-black text-xs outline-none transition-all ${isIdLocked ? 'bg-white/10 text-white border-white/20' : 'bg-white text-[#001d4a] border-[#FCB131]'}`} value={tempId} onChange={e => checkId(e.target.value)} />
                                    <button onClick={() => { setIsIdLocked(false); setIdStatus('IDLE'); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-[#FCB131] transition-colors">{isIdLocked ? <Lock size={14} /> : <Unlock size={14} />}</button>
                                </div>
                                {idStatus === 'VALID' && <button onClick={() => { setPendingIdChange({ old: selectedSocio?.id || '', new: tempId }); setIdStatus('CONFIRMED'); setIsIdLocked(true); }} className="bg-[#FCB131] text-[#001d4a] px-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">Validar</button>}
                            </div>
                        </div>
                        <div className="space-y-1 relative z-10">
                            <label className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1"><Building2 size={10} /> Consulado</label>
                            {pendingConsulado === null ? (
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <select className="w-full bg-white/10 border border-white/20 text-white rounded-xl py-3 px-4 font-bold text-xs outline-none focus:border-[#FCB131] transition-all appearance-none cursor-pointer" value={consuladoSelection} onChange={e => setConsuladoSelection(e.target.value)}>
                                            <option value="" className="text-black">Sede Central</option>
                                            {consulados.map(c => <option key={c.id} value={c.name} className="text-black">{c.name}</option>)}
                                        </select>
                                    </div>
                                    {consuladoSelection !== (formData.consulado || '') && <button onClick={() => setPendingConsulado(consuladoSelection)} className="bg-[#FCB131] text-[#001d4a] px-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">Validar</button>}
                                </div>
                            ) : (
                                <div className="bg-[#FFFCE4] border border-[#FCB131] rounded-xl p-2 flex items-center justify-between text-[9px] font-bold text-[#001d4a]">
                                    <span>Traslado: {pendingConsulado}</span>
                                    <button onClick={() => { setConsuladoSelection(formData.consulado || ''); setPendingConsulado(null); }} className="text-gray-500 hover:text-red-500">Cancelar</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-3 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors shadow-sm">Cancelar</button>
                    <button onClick={() => setShowSaveConfirm(true)} className="bg-[#003B94] text-white px-6 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-1.5 hover:bg-[#001d4a] transition-all"><Save size={14} /> Guardar</button>
                </div>
             </div>
        </div>
      )}

      {/* ... Other modals (Save, Delete, Export) remain the same */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" style={{ paddingTop: 'calc(7rem + 1rem)', paddingBottom: '1rem' }}>
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

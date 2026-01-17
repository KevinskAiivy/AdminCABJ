
import React, { useState, useMemo, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { CustomSelect } from '../../components/CustomSelect';
import { Users, Search, CheckCircle2, AlertTriangle, UserX, Edit2, Trash2, Star, X, ChevronLeft, ChevronRight, User, Save, Phone, Mail, Loader2, Building2, Lock, Unlock, ArrowRightLeft, CheckCircle, XCircle, Clock, Inbox, Send, BadgeCheck } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Socio, TransferRequest } from '../../types';
import { getGenderRoleLabel, getGenderLabel as getGenderLabelUtil } from '../../utils/genderLabels';
import { formatDateFromDB, formatDateToDB } from '../../utils/dateFormat';
import { SOCIO_CATEGORIES } from '../../constants';

export const SociosPresident = ({ consulado_id }: { consulado_id: string }) => {
  const [socios, setSocios] = useState<Socio[]>(dataService.getSocios(consulado_id));
  const [consulados, setConsulados] = useState(dataService.getConsulados());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCuotaStatus, setFilterCuotaStatus] = useState<string>('ALL');
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Socio>>({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  // Transfer states
  const [pendingConsulado, setPendingConsulado] = useState<string | null>(null);
  const [consuladoSelection, setConsuladoSelection] = useState<string>('');
  const [isConsuladoLocked, setIsConsuladoLocked] = useState(true);
  const [socioTransfers, setSocioTransfers] = useState<TransferRequest[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<TransferRequest[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<TransferRequest[]>([]);
  
  // ID Management states (pour modification du numéro de socio)
  const [isIdLocked, setIsIdLocked] = useState(true);
  const [tempId, setTempId] = useState('');
  const [idStatus, setIdStatus] = useState<'IDLE' | 'ERROR' | 'VALID' | 'CONFIRMED'>('IDLE');
  const [pendingIdChange, setPendingIdChange] = useState<{old: string, new: string} | null>(null);
  
  // Get current consulado name
  const currentConsulado = useMemo(() => {
    if (!consulado_id) return null;
    const found = consulados.find(c => c.id === consulado_id);
    return found ? found.name : null;
  }, [consulado_id, consulados]);

  // SUBSCRIBE TO DATA SERVICE
  useEffect(() => {
      const loadData = () => {
          setSocios(dataService.getSocios(consulado_id));
          setConsulados(dataService.getConsulados());
      };
      loadData();
      const unsubscribe = dataService.subscribe(loadData);
      return () => unsubscribe();
  }, [consulado_id]);
  
  // Charger les transferts quand currentConsulado est défini
  useEffect(() => {
      if (currentConsulado) {
          console.log(`🔄 Chargement des transferts pour: "${currentConsulado}"`);
          
          // Debug: Afficher tous les transferts disponibles
          const allTransfers = dataService.getAllTransfers();
          console.log(`📦 Total transferts dans le système: ${allTransfers.length}`);
          allTransfers.forEach(t => {
              console.log(`   - ID: ${t.id}`);
              console.log(`     From: "${t.from_consulado_name}" (ID: ${t.from_consulado_id})`);
              console.log(`     To: "${t.to_consulado_name}" (ID: ${t.to_consulado_id})`);
              console.log(`     Status: ${t.status}`);
              console.log(`     Match currentConsulado (to): ${t.to_consulado_name?.trim().toLowerCase() === currentConsulado.trim().toLowerCase()}`);
              console.log(`     Match currentConsulado (from): ${t.from_consulado_name?.trim().toLowerCase() === currentConsulado.trim().toLowerCase()}`);
          });
          
          const transfers = dataService.getTransfers(currentConsulado);
          console.log(`📥 Résultat filtré - Entrants: ${transfers.incoming.length}, Sortants: ${transfers.outgoing.length}`);
          setOutgoingTransfers(transfers.outgoing);
          setIncomingTransfers(transfers.incoming);
      }
  }, [currentConsulado]);

  const calculateAge = (dateStr?: string) => {
      if (!dateStr) return null;
      let d: number, m: number, y: number;
      
      // Support multiple formats: jj-mm-aaaa, DD/MM/YYYY, YYYY-MM-DD
      if (dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts[0].length === 4) {
              // Format YYYY-MM-DD (from DB)
              [y, m, d] = parts.map(Number);
          } else {
              // Format jj-mm-aaaa
              [d, m, y] = parts.map(Number);
          }
      } else if (dateStr.includes('/')) {
          // Format DD/MM/YYYY
          [d, m, y] = dateStr.split('/').map(Number);
      } else {
          return null;
      }
      
      if (!y || !m || !d) return null;
      const birth = new Date(y, m - 1, d);
      if (isNaN(birth.getTime())) return null;
      
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
          age--;
      }
      return age >= 0 ? age : null;
  };

  const calculateSocioStatus = (paymentStr: string) => {
    if (!paymentStr) return { label: 'EN DEUDA', color: 'text-amber-600 bg-amber-50', dot: 'bg-amber-500' };

    let paymentDate: Date | null = null;

    // Format YYYY-MM-DD (format DB)
    if (paymentStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = paymentStr.split('-').map(Number);
        paymentDate = new Date(y, m - 1, d);
    }
    // Format DD/MM/YYYY
    else if (paymentStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = paymentStr.split('/').map(Number);
        paymentDate = new Date(y, m - 1, d);
    }
    // Format DD-MM-YYYY (format saisie)
    else if (paymentStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
        const [d, m, y] = paymentStr.split('-').map(Number);
        paymentDate = new Date(y, m - 1, d);
    }
    // Format MM/YYYY
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

  const filteredSocios = useMemo(() => {
    return socios.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = s.name.toLowerCase().includes(q) || 
             (s.numero_socio && s.numero_socio.includes(q)) ||
             s.dni.includes(q) || 
             s.id.includes(q);
      
      const dynamicStatus = calculateSocioStatus(s.last_month_paid || '').label;
      const matchesCuotaStatus = filterCuotaStatus === 'ALL' || dynamicStatus === filterCuotaStatus;
      
      return matchesSearch && matchesCuotaStatus;
    });
  }, [socios, searchQuery, filterCuotaStatus]);

  const totalPages = Math.ceil(filteredSocios.length / itemsPerPage);
  
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSocios.slice(start, start + itemsPerPage);
  }, [filteredSocios, currentPage]);

  // Réinitialiser la page à 1 quand la recherche ou le filtre change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterCuotaStatus]);

  const stats = useMemo(() => {
    let alDia = 0, deuda = 0, deBaja = 0;
    socios.forEach(s => {
        const computed = calculateSocioStatus(s.last_month_paid || '');
        if (computed.label === 'AL DÍA') alDia++;
        else if (computed.label === 'EN DEUDA') deuda++;
        else if (computed.label === 'DE BAJA') deBaja++;
    });
    return { total: socios.length, alDia, deuda, deBaja };
  }, [socios]);

  // Fonction helper pour formater automatiquement une date lors de la saisie (jj-mm-aaaa)
  const formatDateInput = (value: string): string => {
    let cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) cleaned = cleaned.slice(0, 2) + '-' + cleaned.slice(2);
    if (cleaned.length >= 5) cleaned = cleaned.slice(0, 5) + '-' + cleaned.slice(5, 9);
    return cleaned;
  };

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
    setPendingConsulado(null);
    setConsuladoSelection(socio.consulado || '');
    setIsConsuladoLocked(true);
    setSocioTransfers(dataService.getSocioTransfers ? dataService.getSocioTransfers(socio.id) : []);
    // Initialiser les états pour la modification du numéro de socio
    setTempId(socio.numero_socio || socio.id);
    setIsIdLocked(true);
    setIdStatus('IDLE');
    setPendingIdChange(null);
    setIsEditModalOpen(true);
    setShowSaveConfirm(false);
  };

  const requestSave = () => {
    setShowSaveConfirm(true);
  };

  // Fonction pour vérifier si un numéro de socio est disponible
  const checkId = (val: string) => {
      const clean = val.replace(/\D/g,'').slice(0,10);
      setTempId(clean);
      setFormData({...formData, numero_socio: clean});

      // Si le numéro est identique à l'original, pas de changement
      if(clean === selectedSocio?.numero_socio || clean === selectedSocio?.id) {
          setIdStatus('IDLE');
          return;
      }

      // Vérifier si le numéro est déjà utilisé (dans id OU numero_socio)
      const allSocios = dataService.getSocios();
      const isUsed = allSocios.some(s =>
          (s.id === clean || s.numero_socio === clean) &&
          s.id !== selectedSocio?.id // Exclure le socio actuel
      );

      setIdStatus(isUsed ? 'ERROR' : 'VALID');
  };

  const executeSave = async () => {
    if (!selectedSocio || !currentConsulado) return;
    setIsSaving(true);
    try {
        // Si un transfert est en attente, créer un TransferRequest
        if (pendingConsulado !== null && pendingConsulado !== selectedSocio.consulado) {
            // Trouver les IDs des consulados
            const fromConsulado = consulados.find(c => c.name === currentConsulado);
            const toConsulado = consulados.find(c => c.name === pendingConsulado);
            
            if (!toConsulado) {
                alert('Consulado de destino no encontrado');
                setIsSaving(false);
                return;
            }
            
            // Créer le TransferRequest
            await dataService.createTransferRequest({
                socio_id: selectedSocio.id,
                socio_name: `${selectedSocio.first_name} ${selectedSocio.last_name}`,
                from_consulado_id: fromConsulado?.id || '',
                from_consulado_name: currentConsulado,
                to_consulado_id: toConsulado.id,
                to_consulado_name: pendingConsulado,
                comments: (formData as any).transferComments || undefined,
                status: 'PENDING'
            });
            
            alert('Solicitud de transferencia creada. El consulado de destino debe aprobarla.');
        } else {
            // Gérer le changement de numéro de socio si en attente
            let finalId = selectedSocio.id;
            let finalNumeroSocio = selectedSocio.numero_socio || selectedSocio.id;
            
            if (pendingIdChange) {
                // Vérifier que le nouvel ID n'existe pas
                const allSocios = dataService.getSocios();
                const existingWithNewId = allSocios.find(s => s.id === pendingIdChange.new || s.numero_socio === pendingIdChange.new);
                if (existingWithNewId && existingWithNewId.id !== selectedSocio.id) {
                    alert(`Error: Ya existe un socio con el número ${pendingIdChange.new}`);
                    setIsSaving(false);
                    return;
                }
                finalId = pendingIdChange.new;
                finalNumeroSocio = pendingIdChange.new;
                
                // Supprimer l'ancien puis ajouter le nouveau
                const oldSocio = { ...selectedSocio };
                try {
                    await dataService.deleteSocio(selectedSocio.id);
                    const newSocio: Socio = {
                        ...selectedSocio,
                        ...formData,
                        id: finalId,
                        numero_socio: finalNumeroSocio,
                        last_month_paid: formData.last_month_paid ? formatDateToDB(formData.last_month_paid) : selectedSocio.last_month_paid || null,
                        birth_date: formData.birth_date ? formatDateToDB(formData.birth_date) : selectedSocio.birth_date || null,
                        join_date: formData.join_date ? formatDateToDB(formData.join_date) : selectedSocio.join_date || null,
                        expiration_date: formData.expiration_date ? formatDateToDB(formData.expiration_date) : selectedSocio.expiration_date || null,
                    } as Socio;
                    await dataService.addSocio(newSocio);
                } catch (e) {
                    // Restaurer l'ancien socio si l'ajout échoue
                    try {
                        await dataService.addSocio(oldSocio);
                    } catch {}
                    throw e;
                }
            } else {
                // Sinon, mettre à jour normalement le socio (sans changer le consulado)
                const updatedSocio: Socio = {
                    ...selectedSocio,
                    ...formData,
                    numero_socio: tempId || selectedSocio.numero_socio,
                    last_month_paid: formData.last_month_paid ? formatDateToDB(formData.last_month_paid) : selectedSocio.last_month_paid || null,
                    birth_date: formData.birth_date ? formatDateToDB(formData.birth_date) : selectedSocio.birth_date || null,
                    join_date: formData.join_date ? formatDateToDB(formData.join_date) : selectedSocio.join_date || null,
                    expiration_date: formData.expiration_date ? formatDateToDB(formData.expiration_date) : selectedSocio.expiration_date || null,
                } as Socio;
                await dataService.updateSocio(updatedSocio);
            }
        }
        
        setIsEditModalOpen(false);
        setShowSaveConfirm(false);
        setFormData({});
        setSelectedSocio(null);
        setPendingConsulado(null);
        setConsuladoSelection('');
        setIsConsuladoLocked(true);
        setPendingIdChange(null);
        setIsIdLocked(true);
        setIdStatus('IDLE');
        setFormData((prev: any) => {
            const newData = {...prev};
            delete newData.transferComments;
            return newData;
        });
    } catch (e: any) { 
        alert(`Error al guardar: ${e.message || 'Error desconocido'}`); 
    } finally { 
        setIsSaving(false); 
    }
  };
  
  const handleAcceptTransfer = async (transferId: string) => {
      try {
          await dataService.updateTransferStatus(transferId, 'APPROVED');
          if (currentConsulado) {
              const transfers = dataService.getTransfers(currentConsulado);
              setOutgoingTransfers(transfers.outgoing);
              setIncomingTransfers(transfers.incoming);
          }
          alert('Transferencia aprobada. El socio ha sido transferido.');
      } catch (e: any) {
          alert(`Error al aprobar transferencia: ${e.message || 'Error desconocido'}`);
      }
  };
  
  const handleRejectTransfer = async (transferId: string) => {
      if (!confirm('¿Estás seguro de que deseas rechazar esta solicitud de transferencia?')) return;
      try {
          await dataService.updateTransferStatus(transferId, 'REJECTED');
          if (currentConsulado) {
              const transfers = dataService.getTransfers(currentConsulado);
              setOutgoingTransfers(transfers.outgoing);
              setIncomingTransfers(transfers.incoming);
          }
          alert('Transferencia rechazada.');
      } catch (e: any) {
          alert(`Error al rechazar transferencia: ${e.message || 'Error desconocido'}`);
      }
  };
  
  const handleCancelTransfer = async (transferId: string) => {
      if (!confirm('¿Estás seguro de que deseas cancelar esta solicitud de transferencia?')) return;
      try {
          await dataService.updateTransferStatus(transferId, 'CANCELLED');
          if (currentConsulado) {
              const transfers = dataService.getTransfers(currentConsulado);
              setOutgoingTransfers(transfers.outgoing);
              setIncomingTransfers(transfers.incoming);
          }
          alert('Transferencia cancelada.');
      } catch (e: any) {
          alert(`Error al cancelar transferencia: ${e.message || 'Error desconocido'}`);
      }
  };

  const getGenderLabel = (label: string, gender: string = 'M') => {
    return getGenderLabelUtil(label, gender as 'M' | 'F' | 'X');
  };

  const formatLastPaymentDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) return dateStr;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = dateStr.split('-');
      return `${d}/${m}/${y}`;
    }
    if (dateStr.length === 7 && dateStr.includes('/')) return dateStr;
    return dateStr;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        {/* BANDEAU UNIFIÉ - Style Consulados */}
        <div className="bg-[#003B94] p-8 rounded-xl border border-white/20 shadow-xl flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><Users size={300} className="text-white" /></div>
            
            {/* Ligne 1: Titre + Stats */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="bg-white/10 p-4 rounded-xl border border-white/20"><Users size={28} className="text-[#FCB131]" /></div>
                    <div>
                        <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Mis Socios</h1>
                        <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Padrón Local</p>
                    </div>
                </div>
                
                {/* Stats compactes */}
                <div className="flex items-center gap-4 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#FCB131]" />
                        <span className="text-white font-black text-sm oswald">{socios.length}</span>
                        <span className="text-white/60 text-[8px] font-bold uppercase">Total</span>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <span className="text-white font-black text-sm oswald">{stats.alDia}</span>
                        <span className="text-white/60 text-[8px] font-bold uppercase">Al Día</span>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-400" />
                        <span className="text-white font-black text-sm oswald">{stats.deuda}</span>
                        <span className="text-white/60 text-[8px] font-bold uppercase">Deuda</span>
                    </div>
                    <div className="w-px h-6 bg-white/20" />
                    <div className="flex items-center gap-2">
                        <UserX size={14} className="text-red-400" />
                        <span className="text-white font-black text-sm oswald">{stats.deBaja}</span>
                        <span className="text-white/60 text-[8px] font-bold uppercase">Baja</span>
                    </div>
                </div>
            </div>
            
            {/* Ligne 2: Filtres intégrés */}
            <div className="flex flex-col md:flex-row gap-3 items-center relative z-10 pt-4 border-t border-white/20">
                <div className="flex flex-wrap gap-3 flex-1">
                    <div className="relative min-w-[160px]">
                        <select value={filterCuotaStatus} onChange={(e) => setFilterCuotaStatus(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                            <option value="ALL" className="text-[#001d4a]">Estado Cuota</option>
                            <option value="AL DÍA" className="text-[#001d4a]">Al Día</option>
                            <option value="EN DEUDA" className="text-[#001d4a]">En Deuda</option>
                            <option value="DE BAJA" className="text-[#001d4a]">De Baja</option>
                        </select>
                        <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
                    </div>
                </div>
                
                {/* Recherche */}
                <div className="relative w-64">
                    <input type="text" placeholder="Buscar socio..." className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 outline-none text-xs font-bold text-white placeholder:text-white/40 transition-all focus:bg-white focus:text-[#001d4a]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                </div>
            </div>
        </div>

        {/* Transferts entrants (PENDING) */}
        {incomingTransfers.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-500 p-3 rounded-xl"><Inbox size={24} className="text-white" /></div>
                    <div>
                        <h2 className="oswald text-xl font-black text-[#001d4a] uppercase">Transferencias Entrantes Pendientes</h2>
                        <p className="text-xs text-amber-700 font-bold uppercase tracking-widest">{incomingTransfers.length} solicitud(es) de transferencia</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {incomingTransfers.map(transfer => {
                        const allSocios = dataService.getSocios(); // Obtenir tous les socios, pas seulement ceux du consulado actuel
                        const socio = allSocios.find(s => s.id === transfer.socio_id);
                        const numeroSocio = socio?.numero_socio || socio?.dni || transfer.socio_id;
                        return (
                            <GlassCard key={transfer.id} className="p-4 bg-white/80 border border-amber-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Clock size={16} className="text-amber-600" />
                                            <span className="text-xs font-black text-[#001d4a] uppercase">{transfer.socio_name}</span>
                                            <span className="text-[9px] font-bold text-gray-500">(N° {numeroSocio})</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1">
                                            <span className="font-bold">Desde:</span> {transfer.from_consulado_name}
                                        </p>
                                        <p className="text-[9px] text-gray-500">
                                            Solicitado el: {new Date(transfer.request_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleAcceptTransfer(transfer.id)}
                                            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <CheckCircle size={14} /> Aprobar
                                        </button>
                                        <button
                                            onClick={() => handleRejectTransfer(transfer.id)}
                                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <XCircle size={14} /> Rechazar
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Transferts sortants (PENDING uniquement) */}
        {outgoingTransfers.filter(t => t.status === 'PENDING').length > 0 && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-500 p-3 rounded-xl"><Send size={24} className="text-white" /></div>
                    <div>
                        <h2 className="oswald text-xl font-black text-[#001d4a] uppercase">Transferencias Salientes En Curso</h2>
                        <p className="text-xs text-blue-700 font-bold uppercase tracking-widest">{outgoingTransfers.filter(t => t.status === 'PENDING').length} solicitud(es) en espera</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {outgoingTransfers.filter(t => t.status === 'PENDING').map(transfer => {
                        const allSocios = dataService.getSocios(); // Obtenir tous les socios, pas seulement ceux du consulado actuel
                        const socio = allSocios.find(s => s.id === transfer.socio_id);
                        const numeroSocio = socio?.numero_socio || socio?.dni || transfer.socio_id;
                        return (
                            <GlassCard key={transfer.id} className={`p-4 bg-white/80 border ${
                                transfer.status === 'PENDING' ? 'border-blue-200' :
                                transfer.status === 'APPROVED' ? 'border-emerald-200' :
                                'border-gray-200'
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {transfer.status === 'PENDING' && <Clock size={16} className="text-blue-600" />}
                                            {transfer.status === 'APPROVED' && <CheckCircle size={16} className="text-emerald-600" />}
                                            {transfer.status === 'REJECTED' && <XCircle size={16} className="text-red-600" />}
                                            {transfer.status === 'CANCELLED' && <X size={16} className="text-gray-600" />}
                                            <span className="text-xs font-black text-[#001d4a] uppercase">{transfer.socio_name}</span>
                                            <span className="text-[9px] font-bold text-gray-500">(N° {numeroSocio})</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                transfer.status === 'PENDING' ? 'bg-blue-100 text-blue-700' :
                                                transfer.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                                transfer.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {transfer.status === 'PENDING' ? 'Pendiente' :
                                                 transfer.status === 'APPROVED' ? 'Aprobado' :
                                                 transfer.status === 'REJECTED' ? 'Rechazado' :
                                                 'Cancelado'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-1">
                                            <span className="font-bold">Hacia:</span> {transfer.to_consulado_name}
                                        </p>
                                        <p className="text-[9px] text-gray-500">
                                            Solicitado el: {new Date(transfer.request_date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                        </p>
                                    </div>
                                    {transfer.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleCancelTransfer(transfer.id)}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all font-black text-[9px] uppercase tracking-widest flex items-center gap-2"
                                        >
                                            <X size={14} /> Cancelar
                                        </button>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 min-h-[500px]">
            {currentItems.map(socio => {
                const isPresident = socio.role === 'PRESIDENTE';
                const isReferente = socio.role === 'REFERENTE';
                const computedStatus = calculateSocioStatus(socio.last_month_paid || '');
                let containerClass = "";
                let variant: 'light' | 'gold' | 'dark' = 'light';

                if (isPresident) {
                    variant = 'gold';
                    containerClass = "border-[#FCB131]/40 shadow-[0_8px_32px_rgba(252,177,49,0.4)] bg-gradient-to-br from-[#FFD700]/95 via-[#FFC125]/90 to-[#FFA500]/95 backdrop-blur-xl";
                } else if (isReferente) {
                    variant = 'dark';
                    containerClass = "border-[#FCB131]/30 shadow-[0_8px_32px_rgba(0,29,74,0.5)] bg-gradient-to-br from-[#001d4a]/95 via-[#003B94]/90 to-[#001d4a]/95 backdrop-blur-xl";
                } else {
                    // Bordure selon le genre pour les socios normaux (bleu par défaut si non défini)
                    let genderBorderClass = "";
                    if (socio.gender === 'M') {
                        genderBorderClass = "border-l-4 border-r-4 border-[#003B94]";
                    } else if (socio.gender === 'F') {
                        genderBorderClass = "border-l-4 border-r-4 border-[#FCB131]";
                    } else if (socio.gender === 'X') {
                        genderBorderClass = "border-l-4 border-r-4 border-white";
                    } else {
                        // Genre non défini : bordure bleue par défaut
                        genderBorderClass = "border-l-4 border-r-4 border-[#003B94]";
                    }
                    
                    variant = 'light';
                    if (computedStatus.label === 'EN DEUDA') {
                        containerClass = `${genderBorderClass} shadow-[0_4px_16px_rgba(245,158,11,0.1)]`;
                    } else if (computedStatus.label === 'DE BAJA') {
                        containerClass = `${genderBorderClass} shadow-[0_4px_16px_rgba(239,68,68,0.1)]`;
                    } else {
                        containerClass = genderBorderClass;
                    }
                }

                return (
                <GlassCard 
                    key={socio.id} 
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
                        {/* Pastille pour les présidents uniquement */}
                        {isPresident && (
                            <div className="absolute top-3 left-3 w-14 h-14 rounded-full bg-gradient-to-br from-[#001d4a] to-[#003B94] flex items-center justify-center shadow-[0_4px_12px_rgba(252,177,49,0.4)] border-2 border-[#FCB131] z-10 animate-pulse">
                                <Star size={24} className="text-[#FCB131] fill-[#FCB131]" strokeWidth={2.5} />
                            </div>
                        )}
                        <div className={`flex-1 min-w-0 ${isPresident ? 'pl-20' : 'pr-16'}`}>
                            {/* Nom du socio en premier */}
                            <h4 className={`oswald text-lg tracking-tight leading-none truncate mb-2 ${isPresident || isReferente ? 'text-white' : 'text-[#001d4a]'}`}>
                                <span className="font-black uppercase">{socio.last_name.toUpperCase()}</span> <span className="font-normal capitalize">{socio.first_name.toLowerCase()}</span>
                            </h4>
                            {/* Pastilles : Numéro de socio, Catégorie, Rôle */}
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                {/* Numéro de socio */}
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                    isPresident || isReferente 
                                        ? 'bg-blue-100/20 text-white border border-white/30' 
                                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                                }`}>
                                    N° {socio.numero_socio || socio.dni || 'N/A'}
                                </span>
                                {/* Catégorie */}
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                    isPresident || isReferente 
                                        ? 'bg-purple-100/20 text-white border border-white/30' 
                                        : 'bg-purple-100 text-purple-700 border border-purple-300'
                                }`}>
                                    {socio.category || 'N/A'}
                                </span>
                                {/* Rôle */}
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${
                                    isPresident || isReferente 
                                        ? 'bg-indigo-100/20 text-white border border-white/30' 
                                        : 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                }`}>
                                    {getGenderRoleLabel(socio.role || 'SOCIO', socio.gender)}
                                </span>
                            </div>
                            {/* Email et téléphone */}
                            <div className="flex flex-col gap-1.5 mt-3">
                                {socio.email && (
                                    <div className={`flex items-center gap-1.5 ${isPresident || isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                        <Mail size={11} className={isPresident || isReferente ? "text-white/60" : "text-gray-400"} />
                                        <span className={`text-[9px] font-bold truncate ${isPresident || isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.email}</span>
                                    </div>
                                )}
                                {socio.phone && (
                                    <div className={`flex items-center gap-1.5 ${isPresident || isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                        <Phone size={11} className={isPresident || isReferente ? "text-white/60" : "text-gray-400"} />
                                        <span className={`text-[9px] font-bold truncate ${isPresident || isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="px-5 py-3 space-y-3">
                        {/* Estado de cuota - déplacée ici */}
                        <div className={`text-[9px] font-bold flex items-center justify-between border-t ${isPresident || isReferente ? 'border-white/20' : 'border-gray-200'} pt-2 ${isPresident || isReferente ? 'text-white bg-white/10' : 'text-[#001d4a] bg-white/20'} backdrop-blur-sm rounded-lg px-3 py-2`}>
                            <span className={`uppercase opacity-70 ${isPresident || isReferente ? 'text-white/70' : ''}`}>Estado:</span>
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${computedStatus.color} ${isPresident || isReferente ? 'bg-opacity-20 border border-white/30' : ''}`}>
                                {computedStatus.label}
                            </span>
                        </div>
                    </div>
                </GlassCard>
                );
            })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 pb-10">
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                    disabled={currentPage === 1} 
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94]/5 transition-all"
                >
                    <ChevronLeft size={16} /> Anterior
                </button>
                <div className="h-12 px-6 rounded-xl bg-[#003B94] flex items-center justify-center text-white oswald font-black text-lg shadow-lg">
                    {currentPage} <span className="mx-2 text-white/50 text-sm">/</span> {totalPages}
                </div>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                    disabled={currentPage === totalPages} 
                    className="flex items-center gap-2 px-6 py-2 rounded-lg bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94]/5 transition-all"
                >
                    Siguiente <ChevronRight size={16} />
                </button>
            </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && selectedSocio && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-4xl bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[90vh] animate-in zoom-in-95 duration-300">
                    <div className="relative bg-gradient-to-r from-[#003B94] to-[#001d4a] p-3 text-white shrink-0 overflow-hidden">
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 shadow-inner flex items-center justify-center text-lg font-black text-[#FCB131]">
                                {formData.first_name ? `${formData.first_name[0]}${formData.last_name ? formData.last_name[0] : ''}` : <User size={20}/>}
                            </div>
                            <div>
                                <h2 className="oswald text-xl font-black uppercase tracking-tight leading-none mb-0.5">Editar {getGenderLabel('Socio', formData.gender || 'M')}</h2>
                                <p className="text-[#FCB131] text-[8px] font-bold uppercase tracking-widest">{getGenderLabel('N° Socio:', formData.gender || 'M')} {selectedSocio.numero_socio || selectedSocio.id}</p>
                            </div>
                        </div>
                        <X onClick={() => { 
                            setIsEditModalOpen(false); 
                            setFormData({}); 
                            setSelectedSocio(null); 
                            setPendingConsulado(null);
                            setConsuladoSelection('');
                            setIsConsuladoLocked(true);
                            setShowSaveConfirm(false);
                        }} className="cursor-pointer opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-colors absolute top-3 right-3 z-20" size={20} />
                    </div>

                    <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-white/50">
                        <div className="space-y-2">
                            <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-1 flex items-center gap-1.5"><User size={11}/> {getGenderLabel('Datos del Socio', formData.gender || 'M')}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Apellido</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 uppercase text-[#001d4a]" value={formData.last_name || ''} onChange={e => setFormData({...formData, last_name: e.target.value.toUpperCase()})}/></div>
                                <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Nombre</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 capitalize text-[#001d4a]" value={formData.first_name || ''} onChange={e => setFormData({...formData, first_name: e.target.value})}/></div>
                                <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Género</label><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})}><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">X (No binario)</option></select></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="space-y-0.5"><label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">DNI / Pasaporte</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" value={formData.dni || ''} onChange={e => setFormData({...formData, dni: e.target.value})}/></div>
                                <div className="space-y-0.5">
                                    <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Fecha de Nacimiento</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 pr-16 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a] tracking-widest" 
                                            placeholder="jj-mm-aaaa" 
                                            value={formatDateFromDB(formData.birth_date || '')}
                                            onChange={e => {
                                                const formatted = formatDateInput(e.target.value);
                                                setFormData({...formData, birth_date: formatted});
                                            }}
                                            maxLength={10}
                                        />
                                        {(() => {
                                            const age = calculateAge(formData.birth_date || '');
                                            if (age !== null && age !== undefined) {
                                                return (
                                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest bg-blue-500/20 backdrop-blur-sm border border-blue-400/30 shadow-sm text-blue-700">
                                                        {age} años
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
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
                                    <input 
                                        type="tel" 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2.5 font-bold text-xs outline-none focus:bg-white focus:border-[#003B94]/30 text-[#001d4a]" 
                                        value={formData.phone || ''} 
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        placeholder="+54 9 11 1234-5678"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-1 flex items-center gap-1.5">Membresía</h3>
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
                                    <label className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Último Pago</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2.5 pr-20 font-bold text-xs outline-none text-[#001d4a] tracking-widest"
                                            placeholder="jj-mm-aaaa"
                                            value={formatDateFromDB(formData.last_month_paid || '')}
                                            onChange={e => {
                                                const formatted = formatDateInput(e.target.value);
                                                setFormData({...formData, last_month_paid: formatted});
                                            }}
                                            maxLength={10}
                                        />
                                        {(() => {
                                            const status = calculateSocioStatus(formData.last_month_paid || '');
                                            // Convertir les couleurs en style glass
                                            const glassColors: Record<string, string> = {
                                                'text-emerald-600 bg-emerald-50': 'text-emerald-700 bg-emerald-500/20 backdrop-blur-sm border border-emerald-400/30 shadow-sm',
                                                'text-amber-600 bg-amber-50': 'text-amber-700 bg-amber-500/20 backdrop-blur-sm border border-amber-400/30 shadow-sm',
                                                'text-red-600 bg-red-50': 'text-red-700 bg-red-500/20 backdrop-blur-sm border border-red-400/30 shadow-sm'
                                            };
                                            const glassColor = glassColors[status.color] || status.color;
                                            return (
                                                <span className={`absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[6px] font-black uppercase tracking-widest backdrop-blur-sm border shadow-sm ${glassColor}`}>
                                                    {status.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Numéro de Socio + Transferir a Otro Consulado sur la même ligne (50/50) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#001d4a] p-3 rounded-lg border border-[#FCB131]/30 shadow-lg relative overflow-hidden">
                            {/* Numéro de Socio */}
                            <div className="space-y-1 relative z-10">
                                <label className="text-[8px] font-black text-[#FCB131] uppercase tracking-widest flex items-center gap-1"><BadgeCheck size={9} /> {getGenderLabel('Numéro de Socio', formData.gender)}</label>
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

                            {/* Transferir a Otro Consulado */}
                            <div className="space-y-1 relative z-10">
                                <label className="text-[8px] font-black text-white uppercase tracking-widest flex items-center gap-1">
                                    <ArrowRightLeft size={9} className="text-[#FCB131]" /> Transferir a Otro Consulado
                                </label>
                                {pendingConsulado === null ? (
                                    <div className="space-y-1.5">
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <CustomSelect
                                                    value={consuladoSelection}
                                                    onChange={(val) => setConsuladoSelection(val)}
                                                    options={[
                                                        {value: '', label: currentConsulado || 'SEDE CENTRAL'},
                                                        ...consulados.filter(c => c.name !== currentConsulado).map(c => ({
                                                            value: c.name,
                                                            label: c.name
                                                        }))
                                                    ]}
                                                    searchable
                                                    disabled={isConsuladoLocked}
                                                    placeholder={currentConsulado || 'SEDE CENTRAL'}
                                                    className="text-white text-xs"
                                                />
                                            </div>
                                            <button 
                                                onClick={() => { 
                                                    setIsConsuladoLocked(!isConsuladoLocked); 
                                                    if (isConsuladoLocked) {
                                                        setPendingConsulado(null);
                                                    }
                                                }} 
                                                className="text-white/50 hover:text-[#FCB131] transition-colors"
                                            >
                                                {isConsuladoLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                            </button>
                                            {!isConsuladoLocked && consuladoSelection !== '' && consuladoSelection !== (formData.consulado || '') && (
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
                                                Transferencia pendiente
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="bg-[#FFFCE4] border border-[#FCB131] rounded-lg p-2 flex items-center justify-between text-[8px] font-bold text-[#001d4a]">
                                            <span className="flex items-center gap-1.5">
                                                <CheckCircle2 size={10} className="text-[#FCB131]" />
                                                <span className="font-black">{formData.consulado || 'SEDE CENTRAL'}</span> → <span className="font-black text-[#003B94]">{pendingConsulado}</span>
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
                                        <p className="text-white/50 text-[7px]">La transferencia se procesará al guardar.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white/80 flex justify-end gap-3 shrink-0">
                        <button onClick={() => { 
                            setIsEditModalOpen(false); 
                            setFormData({}); 
                            setSelectedSocio(null); 
                            setPendingConsulado(null);
                            setConsuladoSelection('');
                            setIsConsuladoLocked(true);
                            setFormData((prev: any) => {
                                const newData = {...prev};
                                delete newData.transferComments;
                                return newData;
                            });
                        }} className="px-6 py-2 rounded-lg bg-gray-100 text-gray-500 font-black uppercase text-[9px] tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={requestSave} disabled={isSaving} className="px-6 py-2 rounded-lg bg-[#003B94] text-white font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-[#001d4a] transition-all disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Save Confirmation Modal */}
        {showSaveConfirm && (
            <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4 bg-[#001d4a]/70 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-[#003B94] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-white shadow-lg"><Save size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-3">Confirmar Cambios</h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <p className="text-gray-700 text-[10px] font-bold uppercase tracking-widest mb-3 leading-relaxed">
                            Se actualizarán los datos del socio <strong className="text-[#001d4a]">{selectedSocio?.last_name.toUpperCase()} {selectedSocio?.first_name}</strong>.
                        </p>
                        <p className="text-amber-700 text-[9px] font-black uppercase tracking-wider leading-relaxed border-t border-amber-200 pt-3 mt-3">
                            ⚠️ IMPORTANTE:<br/>
                            Los cambios serán guardados de forma permanente.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Revisar</button>
                        <button onClick={executeSave} disabled={isSaving} className="flex-1 py-3 rounded-xl bg-[#001d4a] text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-[#003B94] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && selectedSocio && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200" >
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-2">Eliminar Socio</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">
                        ¿Está seguro que desea eliminar a <strong>{selectedSocio.last_name.toUpperCase()} {selectedSocio.first_name}</strong>?<br/>
                        Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => { setIsDeleteModalOpen(false); setSelectedSocio(null); }} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={() => { 
                            dataService.deleteSocio(selectedSocio.id); 
                            setIsDeleteModalOpen(false); 
                            setSelectedSocio(null); 
                        }} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SociosPresident;

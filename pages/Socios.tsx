
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GlassCard } from '../components/GlassCard';
import { 
  Search, UserPlus, Edit2, Trash2, MapPin, 
  ChevronLeft, ChevronRight, X, Save, CheckCircle2, 
  AlertTriangle, User, History, Trophy, ArrowRightLeft, Phone, Mail, BadgeCheck,
  ArrowRight, Check, Building2, Filter, Download, Users, Star, Lock, Unlock, Instagram, Facebook, RotateCcw, Loader2, UserX, FileText, Printer, XCircle, Upload, Image as ImageIcon, Tag,
  Calendar, Clock, Ticket, Award, TrendingUp, Eye, UserCheck, UserMinus, Bell, XOctagon, CreditCard, Globe, Cake
} from 'lucide-react';
import { Socio, TransferRequest, MatchAttendance, SocioMatchStats } from '../types';
import { dataService } from '../services/dataService';
import { SOCIO_CATEGORIES, COUNTRIES } from '../constants';
import { CustomSelect } from '../components/CustomSelect';
import { getGenderRoleLabel, getGenderLabel as getGenderLabelUtil } from '../utils/genderLabels';
import { formatDateDisplay, formatDateToDB, formatDateFromDB } from '../utils/dateFormat';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from '../lib/supabase';
import { uploadFileWithTracking } from '../lib/uploadHelper';

export const Socios = ({ user }: { user?: any }) => {
  console.log('🔵 Socios component starting to render', { user: user?.name || 'no user' });
  
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Protection: initialiser avec des tableaux vides si les données ne sont pas disponibles
  const [socios, setSocios] = useState<Socio[]>(() => {
    try {
      return dataService.getSocios() || [];
    } catch (error) {
      console.error('Erreur lors du chargement des socios:', error);
      return [];
    }
  });
  const [consulados, setConsulados] = useState(() => {
    try {
      return dataService.getConsulados() || [];
    } catch (error) {
      console.error('Erreur lors du chargement des consulados:', error);
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Récupérer le consulado depuis l'URL au chargement
  const consuladoFromUrl = searchParams?.get('consulado') || null;
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterConsulado, setFilterConsulado] = useState<string>(consuladoFromUrl || 'ALL');
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [filterCuotaStatus, setFilterCuotaStatus] = useState<string>('ALL');
  
  // Pagination - doit être déclaré avant le useEffect qui l'utilise
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  // Initialiser le filtre consulado depuis l'URL si présent (une seule fois au chargement)
  const hasInitializedFromUrl = useRef(false);
  useEffect(() => {
    if (consuladoFromUrl && !hasInitializedFromUrl.current) {
      try {
        const decodedConsulado = decodeURIComponent(consuladoFromUrl);
        setFilterConsulado(decodedConsulado);
        setCurrentPage(1);
        hasInitializedFromUrl.current = true;
      } catch (error) {
        console.error('Erreur lors du décodage du consulado depuis l\'URL:', error);
        setFilterConsulado(consuladoFromUrl);
        setCurrentPage(1);
        hasInitializedFromUrl.current = true;
      }
    }
  }, [consuladoFromUrl]);

  // Modals & Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Export Modal - Options complètes (filtres combinables)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportSelection, setExportSelection] = useState<Set<string>>(new Set(['ALL']));
  // Alcance: 'ALL' = toda la lista, 'CONSULADO' = por consulado(s) seleccionado(s)
  const [exportAlcance, setExportAlcance] = useState<'ALL' | 'CONSULADO'>('ALL');
  // Estado de cuota: 'ALL' = todos, 'AL_DIA', 'EN_DEUDA', 'DE_BAJA'
  const [exportEstado, setExportEstado] = useState<'ALL' | 'AL_DIA' | 'EN_DEUDA' | 'DE_BAJA'>('ALL');
  const [exportConsulados, setExportConsulados] = useState<Set<string>>(new Set());
  const [exportCategories, setExportCategories] = useState<Set<string>>(new Set());

  const [activeTab, setActiveTab] = useState<'INFO' | 'HISTORY'>('INFO');
  const [selectedSocio, setSelectedSocio] = useState<Socio | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [viewSocio, setViewSocio] = useState<Socio | null>(null);
  const [carnetTab, setCarnetTab] = useState<'INFO' | 'HISTORIAL'>('INFO');
  const [socioHistory, setSocioHistory] = useState<MatchAttendance[]>([]);
  const [socioStats, setSocioStats] = useState<SocioMatchStats | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [formData, setFormData] = useState<Partial<Socio>>({});
  const [socioTransfers, setSocioTransfers] = useState<TransferRequest[]>([]);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  
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
          try {
              const loadedSocios = dataService.getSocios();
              const loadedConsulados = dataService.getConsulados();
              setSocios(loadedSocios || []);
              setConsulados(loadedConsulados || []);
          } catch (error) {
              console.error('Erreur lors du chargement des données:', error);
              setSocios([]);
              setConsulados([]);
          }
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
          // Format DB: YYYY-MM-DD
          const [y, m, d] = paymentStr.split('-').map(Number);
          paymentDate = new Date(y, m - 1, d);
      } 
      else if (paymentStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
          // Format jj-mm-aaaa: DD-MM-YYYY
          const [d, m, y] = paymentStr.split('-').map(Number);
          paymentDate = new Date(y, m - 1, d);
      }
      else if (paymentStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
          // Format DD/MM/YYYY
          const [d, m, y] = paymentStr.split('/').map(Number);
          paymentDate = new Date(y, m - 1, d);
      }
      else if (paymentStr.length === 7 && paymentStr.includes('/')) {
          // Format MM/YYYY
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

  const stats = useMemo(() => {
    try {
      let alDiaCount = 0, deudaCount = 0, bajaCount = 0;
      const safeSocios = socios || [];
      safeSocios.forEach(s => {
          try {
              const computed = calculateSocioStatus(s?.last_month_paid || '');
              if (computed?.label === 'AL DÍA') alDiaCount++;
              else if (computed?.label === 'EN DEUDA') deudaCount++;
              else if (computed?.label === 'DE BAJA') bajaCount++;
          } catch (error) {
              console.error('Erreur lors du calcul du statut d\'un socio:', error);
          }
      });
      return { total: safeSocios.length, alDia: alDiaCount, morosos: deudaCount, deBaja: bajaCount };
    } catch (error) {
      console.error('Erreur lors du calcul des stats:', error);
      return { total: 0, alDia: 0, morosos: 0, deBaja: 0 };
    }
  }, [socios]);

  const filteredSocios = useMemo(() => {
    try {
      const safeSocios = socios || [];
      return safeSocios.filter(s => {
        try {
          const q = searchQuery.toLowerCase();
          const matchesSearch = (s?.name || '').toLowerCase().includes(q) || (s?.dni || '').includes(q) || (s?.id || '').includes(q) || (s?.consulado && s.consulado.toLowerCase().includes(q));
          
          const dynamicStatus = calculateSocioStatus(s?.last_month_paid || '')?.label || '';
          const matchesCategory = filterCategory === 'ALL' || s?.category === filterCategory;
          const matchesConsulado = filterConsulado === 'ALL' ||
            (filterConsulado === 'CONSULADO CENTRAL' || filterConsulado?.toUpperCase() === 'CONSULADO CENTRAL'
              ? (!s?.consulado || s.consulado?.toUpperCase() === 'CONSULADO CENTRAL' || s.consulado?.toUpperCase() === 'CONSULADO CENTRAL')
              : s?.consulado === filterConsulado || s?.consulado?.toUpperCase() === filterConsulado?.toUpperCase());
          const matchesRole = filterRole === 'ALL' 
            ? true 
            : filterRole === '' 
              ? !s?.role || s.role === '' || s.role === null || s.role === undefined
              : (s?.role && s.role.toUpperCase().trim() === filterRole.toUpperCase().trim());
          const matchesCuotaStatus = filterCuotaStatus === 'ALL' || dynamicStatus === filterCuotaStatus;

          return matchesSearch && matchesCategory && matchesConsulado && matchesRole && matchesCuotaStatus;
        } catch (error) {
          console.error('Erreur lors du filtrage d\'un socio:', error);
          return false;
        }
      });
    } catch (error) {
      console.error('Erreur lors du filtrage des socios:', error);
      return [];
    }
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

      // Titre dynamique selon les filtres combinés
      let titulo = "PADRÓN OFICIAL DE SOCIOS";
      let subtitulos: string[] = [];
      
      // Alcance (portée)
      if (exportAlcance === 'CONSULADO' && exportConsulados.size > 0) {
          titulo = "PADRÓN POR CONSULADO";
          subtitulos.push(Array.from(exportConsulados).slice(0, 3).join(', ') + (exportConsulados.size > 3 ? '...' : ''));
      }
      
      // État de cuota (indépendant de l'alcance)
      if (exportEstado === 'AL_DIA') {
          subtitulos.push("Estado: Al Día");
      } else if (exportEstado === 'EN_DEUDA') {
          subtitulos.push("Estado: En Deuda");
      } else if (exportEstado === 'DE_BAJA') {
          subtitulos.push("Estado: De Baja");
      }
      
      // Catégories
      if (exportCategories.size > 0) {
          subtitulos.push(`Categorías: ${Array.from(exportCategories).join(', ')}`);
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 59, 148);
      doc.text(titulo, 40, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 40, 26);
      
      let yPos = 31;
      subtitulos.forEach(sub => {
          doc.text(sub, 40, yPos);
          yPos += 5;
      });
      doc.text(settings.appName || "Administración Consulados", 40, yPos);

      // Filtrer les données selon les options sélectionnées (filtres combinables)
      let dataToExport = socios.filter(s => {
          // 1. Filtre par consulado (si sélectionné) - ALCANCE
          if (exportAlcance === 'CONSULADO' && exportConsulados.size > 0) {
              const cName = s.consulado || 'Consulado Central';
              if (!exportConsulados.has(cName)) return false;
          }
          
          // 2. Filtre par état de cuota - ESTADO (indépendant de l'alcance)
          if (exportEstado === 'AL_DIA') {
              const status = calculateSocioStatus(s.last_month_paid);
              if (status.label !== 'AL DÍA') return false;
          } else if (exportEstado === 'EN_DEUDA') {
              const status = calculateSocioStatus(s.last_month_paid);
              if (status.label !== 'EN DEUDA') return false;
          } else if (exportEstado === 'DE_BAJA') {
              if (s.category !== 'BAJA') return false;
          }
          
          // 3. Filtre par catégorie si sélectionné
          if (exportCategories.size > 0 && !exportCategories.has(s.category || '')) {
              return false;
          }
          
          return true;
      }).sort((a,b) => a.last_name.localeCompare(b.last_name));

      const tableData = dataToExport.map(s => {
          const status = calculateSocioStatus(s.last_month_paid);
          return [
              `${s.last_name.toUpperCase()}, ${s.first_name}`,
              s.dni,
              s.id,
              s.category,
              s.consulado || 'Consulado Central',
              formatLastPaymentDate(s.last_month_paid),
              status.label
          ];
      });

      autoTable(doc, {
          startY: yPos + 10,
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
          doc.text(`Página ${i} de ${pageCount} • Total: ${dataToExport.length} socios`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
      }
      
      // Nom du fichier dynamique (combinaison des filtres)
      let fileNameParts = ['Socios'];
      if (exportAlcance === 'CONSULADO' && exportConsulados.size > 0) {
          fileNameParts.push('Consulado');
      }
      if (exportEstado === 'AL_DIA') fileNameParts.push('AlDia');
      else if (exportEstado === 'EN_DEUDA') fileNameParts.push('EnDeuda');
      else if (exportEstado === 'DE_BAJA') fileNameParts.push('DeBaja');
      
      const fileName = fileNameParts.length > 1 ? fileNameParts.join('_') : 'Padron_Socios';
      
      doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
      setIsExportModalOpen(false);
      // Reset les filtres d'export
      setExportAlcance('ALL');
      setExportEstado('ALL');
      setExportConsulados(new Set());
      setExportCategories(new Set());
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
    setSelectedPhotoFile(null); // Réinitialiser le fichier photo lors de la création
    if (photoInputRef.current) {
        photoInputRef.current.value = '';
    }
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
    setSelectedPhotoFile(null); // Réinitialiser le fichier photo lors de l'édition
    if (photoInputRef.current) {
        photoInputRef.current.value = '';
    }
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
    
    try {
        // Si un fichier photo a été sélectionné, l'uploader d'abord
        // Si formData.foto est une chaîne vide, cela signifie qu'on veut supprimer la photo
        let photoUrl: string | undefined;
        
        if (formData.foto === '') {
            // Photo supprimée explicitement
            photoUrl = undefined;
        } else if (selectedPhotoFile) {
            // Upload avec tracking automatique
            const socioId = editingSocio?.id || crypto.randomUUID();
            
            const result = await uploadFileWithTracking({
                bucket: 'Logo',
                folder: 'socios',
                entityType: 'socio',
                entityId: socioId,
                fieldName: 'avatar',
                file: selectedPhotoFile
            });
            
            if (!result.success) {
                throw new Error(`Error al subir la foto: ${result.error}`);
            }
            
            photoUrl = result.filePath || undefined;
        } else {
            // Pas de nouveau fichier : garder l'URL existante si elle existe
            photoUrl = formData.foto && formData.foto !== '' ? formData.foto : undefined;
        }
        
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
            youtube: formData.youtube || undefined,
            foto: photoUrl
        };

        if (selectedSocio) {
            if (pendingIdChange) {
                // Pour changement d'ID, on doit d'abord vérifier que le nouvel ID n'existe pas
                const socios = dataService.getSocios();
                const existingWithNewId = socios.find(s => s.id === pendingIdChange.new || s.numero_socio === pendingIdChange.new);
                if (existingWithNewId && existingWithNewId.id !== selectedSocio.id) {
                    alert(`Error: Ya existe un socio con el número ${pendingIdChange.new}`);
                    setIsSaving(false);
                    return;
                }
                
                // Supprimer l'ancien puis ajouter le nouveau
                // Si l'ajout échoue, on essaie de restaurer l'ancien
                const oldSocio = { ...selectedSocio };
                try {
                    await dataService.deleteSocio(selectedSocio.id);
                    await dataService.addSocio(finalData);
                } catch (deleteError: any) {
                    // Si la suppression a réussi mais l'ajout échoue, essayer de restaurer
                    try {
                        await dataService.addSocio(oldSocio);
                    } catch (restoreError) {
                        console.error('Error al restaurar socio después de fallo:', restoreError);
                    }
                    throw deleteError;
                }
            } else {
                await dataService.updateSocio(finalData);
            }
        } else {
            await dataService.addSocio(finalData);
        }
        
        // Réinitialiser le fichier sélectionné après sauvegarde réussie
        setSelectedPhotoFile(null);
        if (photoInputRef.current) {
            photoInputRef.current.value = '';
        }
        
        setSocios(dataService.getSocios());
        setIsEditModalOpen(false); 
        setShowSaveConfirm(false);
    } catch (e: any) { 
        alert(`Error al guardar: ${e.message || 'Error desconocido'}`); 
    } finally { 
        setIsSaving(false); 
    }
  };

  // Charger l'historique d'un socio quand on ouvre le carnet
  const loadSocioHistory = async (socioId: string) => {
    setIsLoadingHistory(true);
    try {
      // Charger depuis Supabase si disponible
      const { data, error } = await supabase
        .from('match_attendance')
        .select('*')
        .eq('socio_id', socioId)
        .order('match_date', { ascending: false })
        .limit(50);
      
      if (error) {
        console.warn('Table match_attendance non disponible:', error.message);
        // Données de démonstration si la table n'existe pas
        setSocioHistory([]);
        setSocioStats({
          total_requests: 0,
          total_accepted: 0,
          total_rejected: 0,
          total_attended: 0,
          total_no_show: 0,
          total_excused: 0,
          attendance_rate: null
        });
      } else {
        setSocioHistory(data || []);
        // Calculer les stats
        const stats: SocioMatchStats = {
          total_requests: data?.length || 0,
          total_accepted: data?.filter(d => d.request_status === 'ACEPTADO').length || 0,
          total_rejected: data?.filter(d => d.request_status === 'RECHAZADO').length || 0,
          total_attended: data?.filter(d => d.attendance_status === 'PRESENTE').length || 0,
          total_no_show: data?.filter(d => d.attendance_status === 'AUSENTE_SIN_AVISO').length || 0,
          total_excused: data?.filter(d => d.attendance_status === 'AUSENTE_CON_AVISO').length || 0,
          attendance_rate: null
        };
        if (stats.total_accepted > 0) {
          stats.attendance_rate = Math.round((stats.total_attended / stats.total_accepted) * 100);
        }
        setSocioStats(stats);
      }
    } catch (err) {
      console.error('Erreur chargement historique:', err);
      setSocioHistory([]);
      setSocioStats(null);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Ouvrir le carnet digital
  const openCarnetDigital = (socio: Socio) => {
    setViewSocio(socio);
    setCarnetTab('INFO');
    loadSocioHistory(socio.id);
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

  // Log pour debug
  useEffect(() => {
    console.log('🟢 Socios component fully rendered', { 
      sociosCount: socios?.length || 0, 
      consuladosCount: consulados?.length || 0,
      filterConsulado,
      consuladoFromUrl
    });
  }, [socios, consulados, filterConsulado, consuladoFromUrl]);

  console.log('🟡 Socios about to return JSX');

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
      {/* BANDEAU UNIFIÉ - Style Consulados */}
      <div className="bg-[#003B94] p-8 rounded-xl border border-white/20 shadow-xl flex flex-col gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><User size={300} className="text-white" /></div>
        
        {/* Ligne 1: Titre + Stats + Boutons */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="bg-white/10 p-4 rounded-xl border border-white/20"><User size={28} className="text-[#FCB131]" /></div>
            <div>
              <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Padrón de Socios</h1>
              <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Gestión Centralizada</p>
            </div>
          </div>
          
          {/* Stats compactes */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 bg-white/10 px-4 py-2 rounded-xl border border-white/20">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#FCB131]" />
                <span className="text-white font-black text-sm oswald">{stats?.total || 0}</span>
                <span className="text-white/60 text-[8px] font-bold uppercase">Total</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-green-400" />
                <span className="text-white font-black text-sm oswald">{stats?.alDia || 0}</span>
                <span className="text-white/60 text-[8px] font-bold uppercase">Al Día</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-white font-black text-sm oswald">{stats?.morosos || 0}</span>
                <span className="text-white/60 text-[8px] font-bold uppercase">Deuda</span>
              </div>
              <div className="w-px h-6 bg-white/20" />
              <div className="flex items-center gap-2">
                <UserX size={14} className="text-red-400" />
                <span className="text-white font-black text-sm oswald">{stats?.deBaja || 0}</span>
                <span className="text-white/60 text-[8px] font-bold uppercase">Baja</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setIsExportModalOpen(true)} className="bg-white/10 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20"><Download size={14} /> Exportar</button>
              <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all"><UserPlus size={14} /> Nuevo</button>
            </div>
          </div>
        </div>
        
        {/* Ligne 2: Filtres intégrés */}
        <div className="flex flex-col md:flex-row gap-3 items-center relative z-10 pt-4 border-t border-white/20">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative min-w-[160px]">
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                <option value="ALL" className="text-[#001d4a]">Todas las Categorías</option>
                {SOCIO_CATEGORIES.map(cat => <option key={cat} value={cat} className="text-[#001d4a]">{cat}</option>)}
              </select>
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={12} />
            </div>
            <div className="relative min-w-[180px]">
              <select value={filterConsulado} onChange={(e) => setFilterConsulado(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                <option value="ALL" className="text-[#001d4a]">Todos los Consulados</option>
                <option value="CONSULADO CENTRAL" className="text-[#001d4a]">Consulado Central</option>
                {(consulados || []).sort((a,b) => a.name.localeCompare(b.name)).map(c => <option key={c.id} value={c.name} className="text-[#001d4a]">{c.name}</option>)}
              </select>
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={12} />
            </div>
            {(user?.role === 'PRESIDENTE' || user?.role === 'REFERENTE') && (
              <div className="relative min-w-[160px]">
                <select value={filterCuotaStatus} onChange={(e) => setFilterCuotaStatus(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                  <option value="ALL" className="text-[#001d4a]">Estado Cuota</option>
                  <option value="AL DÍA" className="text-[#001d4a]">Al Día</option>
                  <option value="EN DEUDA" className="text-[#001d4a]">En Deuda</option>
                  <option value="DE BAJA" className="text-[#001d4a]">De Baja</option>
                </select>
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={12} />
              </div>
            )}
            <div className="relative min-w-[140px]">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all">
                <option value="ALL" className="text-[#001d4a]">Todos los Roles</option>
                <option value="SOCIO" className="text-[#001d4a]">Socio</option>
                <option value="PRESIDENTE" className="text-[#001d4a]">Presidente</option>
                <option value="REFERENTE" className="text-[#001d4a]">Referente</option>
                <option value="" className="text-[#001d4a]">Sin Rol</option>
              </select>
              <Award className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} />
              <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={12} />
            </div>
          </div>
          
          {/* Recherche + Reset */}
          <div className="flex gap-3 items-center">
            <button onClick={resetFilters} className="bg-white/10 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 border border-white/20">
              <RotateCcw size={12} /> Reset
            </button>
            <div className="relative w-64">
              <input type="text" placeholder="Buscar socio..." className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 outline-none text-xs font-bold text-white placeholder:text-white/40 transition-all focus:bg-white focus:text-[#001d4a]" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(currentItems || []).map((socio) => {
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
                onClick={() => openCarnetDigital(socio)}
                className={`flex flex-col group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-5px_rgba(0,29,74,0.2)] ${containerClass} p-0`}
                variant={variant}
            >
                {/* Action buttons - visibles uniquement au survol */}
                <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            handleEdit(socio); 
                        }} 
                        className={`p-1.5 backdrop-blur-sm rounded-lg hover:text-white transition-all shadow-lg border hover:scale-110 ${
                            isPresident || isReferente
                                ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                                : 'bg-white/80 text-[#003B94] border-white/20 hover:bg-[#003B94]'
                        }`}
                        title="Editar socio"
                    >
                        <Edit2 size={12} />
                    </button>
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedSocio(socio); 
                            setIsDeleteModalOpen(true); 
                        }} 
                        className={`p-1.5 backdrop-blur-sm text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-lg border hover:scale-110 ${
                            isPresident || isReferente
                                ? 'bg-white/20 border-white/30'
                                : 'bg-white/80 border-white/20'
                        }`}
                        title="Eliminar socio"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>

                <div className="p-4 pb-2 flex items-start gap-3 relative">
                    <div className={`flex-1 min-w-0 ${isPresident ? 'pr-14' : 'pr-14'}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className={`oswald text-base tracking-tight leading-none truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-[#001d4a]'}`}>
                                <span className="font-black uppercase">{socio.last_name.toUpperCase()}</span> <span className="font-normal capitalize">{socio.first_name.toLowerCase()}</span>
                            </h4>
                            {/* Pastille pour les présidents - à droite du nom */}
                            {isPresident && (
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#001d4a] to-[#003B94] flex items-center justify-center shadow-[0_4px_12px_rgba(252,177,49,0.4),0_0_20px_rgba(252,177,49,0.3)] border-2 border-[#FCB131] z-10 animate-pulse flex-shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 2px rgba(252, 177, 49, 0.8))' }}>
                                        <path d="M12 0.5L14.5 8.5L22.5 8.5L16 13.5L18.5 21.5L12 16L5.5 21.5L8 13.5L1.5 8.5L9.5 8.5L12 0.5Z" fill="#FCB131" stroke="#FCB131" strokeWidth="0.3" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-1.5 mt-1.5">
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-500'}`}>{getGenderLabel('N° Socio:', socio.gender)}</span>
                            <span className={`text-[9px] font-black ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-[#001d4a]'}`}>{socio.numero_socio || socio.dni || 'N/A'}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center mt-2">
                            <span className={`px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest backdrop-blur-sm border shadow-sm ${
                                isPresident 
                                    ? 'bg-[#001d4a]/10 border-[#001d4a]/30 text-[#001d4a]'
                                    : isReferente 
                                    ? 'bg-white/20 border-white/30 text-white' 
                                    : 'bg-white/60 border-white/30 text-gray-700'
                            }`}>{getGenderRoleLabel(socio.role || 'SOCIO', socio.gender)}</span>
                        </div>
                        {/* Email et téléphone */}
                        <div className="flex flex-col gap-1 mt-2">
                            {socio.email && (
                                <div className={`flex items-center gap-1 ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                    <Mail size={10} className={isPresident ? "text-[#001d4a]/60" : isReferente ? "text-white/60" : "text-gray-400"} />
                                    <span className={`text-[8px] font-bold truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.email}</span>
                                </div>
                            )}
                            {socio.phone && (
                                <div className={`flex items-center gap-1 ${isPresident ? 'text-[#001d4a]/80' : isReferente ? 'text-white/80' : 'text-gray-600'}`}>
                                    <Phone size={10} className={isPresident ? "text-[#001d4a]/60" : isReferente ? "text-white/60" : "text-gray-400"} />
                                    <span className={`text-[8px] font-bold truncate ${isPresident ? 'text-[#001d4a]' : isReferente ? 'text-white' : 'text-gray-700'}`}>{socio.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="px-4 py-2 space-y-2">
                    <div className={`flex items-center gap-1.5 ${isPresident ? 'text-[#001d4a] bg-[#001d4a]/5' : isReferente ? 'text-white/90 bg-white/10' : 'text-[#001d4a]/80 bg-white/30'} backdrop-blur-sm rounded-lg px-2.5 py-1.5 border ${isPresident ? 'border-[#001d4a]/20' : 'border-white/20'}`}>
                        <MapPin size={12} className={isPresident ? "text-[#001d4a]" : isReferente ? "text-[#FCB131]" : "text-[#FCB131]"} />
                        <span className="text-[9px] font-black uppercase tracking-widest truncate">{socio.consulado || 'CONSULADO CENTRAL'}</span>
                    </div>
                    {/* Pastille de statut */}
                    <div className={`text-[8px] font-bold flex items-center justify-between border-t ${isPresident ? 'border-[#001d4a]/20' : 'border-white/20'} pt-1.5 ${isPresident ? 'text-[#001d4a] bg-[#001d4a]/5' : isReferente ? 'text-white bg-white/10' : 'text-[#001d4a] bg-white/20'} backdrop-blur-sm rounded-lg px-2.5 py-1.5`}>
                        <span className={`uppercase opacity-70 ${isPresident ? 'text-[#001d4a]/70' : isReferente ? 'text-white/70' : ''}`}>Estado:</span>
                        <span className={`px-1.5 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest ${computedStatus.color} ${isPresident ? 'bg-opacity-20 border border-[#001d4a]/30' : isReferente ? 'bg-opacity-20 border border-white/30' : ''}`}>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300 mt-[10px]" style={{ height: '650px', paddingTop: '10px', paddingBottom: '10px' }}>
             <div className="relative w-full max-w-[700px] bg-white/95 backdrop-blur-xl rounded-xl shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[620px] animate-in zoom-in-95 duration-300">
                <div className="relative bg-gradient-to-r from-[#003B94] to-[#001d4a] p-3 text-white shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 shadow-inner flex items-center justify-center text-lg font-black text-[#FCB131]">
                            {formData.first_name ? `${formData.first_name[0]}${formData.last_name ? formData.last_name[0] : ''}` : <User size={20}/>}
                        </div>
                        <div>
                            <h2 className="oswald text-xl font-black uppercase tracking-tight leading-none mb-0.5">{selectedSocio ? `Editar ${getGenderLabel('Socio', formData.gender)}` : `Nuevo ${getGenderLabel('Socio', formData.gender)}`}</h2>
                            <div className="flex items-center gap-2"><p className="text-[#FCB131] text-[8px] font-bold uppercase tracking-widest">{selectedSocio ? `${getGenderLabel('N° Socio:', formData.gender)} ${selectedSocio.numero_socio || selectedSocio.id}` : 'Alta en Proceso'}</p></div>
                        </div>
                    </div>
                    <X onClick={() => setIsEditModalOpen(false)} className="cursor-pointer opacity-60 hover:opacity-100 p-1 hover:bg-white/10 rounded-full transition-colors absolute top-3 right-3 z-20" size={20} />
                </div>

                {/* Onglets */}
                <div className="flex justify-center backdrop-blur-md border-b border-[#003B94]/30 px-6 pt-3 gap-2 overflow-x-auto shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
                    {[
                        { id: 'INFO', label: 'Info General', icon: User },
                        { id: 'HISTORY', label: 'Historial', icon: History }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-t-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 relative whitespace-nowrap ${
                                activeTab === tab.id 
                                    ? 'bg-[#003B94] backdrop-blur-sm text-[#FCB131] shadow-[0_-4px_15px_rgba(252,177,49,0.2)] border-t-2 border-x-2 border-[#FCB131]/40 border-b-0 z-10 translate-y-[1px] before:absolute before:inset-0 before:bg-gradient-to-b before:from-[#FCB131]/20 before:to-transparent before:rounded-t-xl' 
                                    : 'bg-white/5 text-[#001d4a] hover:text-[#FCB131] hover:bg-[#003B94]/60 backdrop-blur-sm border-t-2 border-x-2 border-transparent hover:border-[#FCB131]/30'
                            }`}
                        >
                            <tab.icon size={12} className={`transition-colors ${activeTab === tab.id ? 'text-[#FCB131]' : 'text-[#001d4a]'}`} /> 
                            <span className={activeTab === tab.id ? 'text-[#FCB131]' : 'text-[#001d4a]'}>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="p-4 space-y-3 overflow-y-auto custom-scrollbar flex-1 bg-white/50">
                    {activeTab === 'INFO' && (
                        <>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#001d4a] p-3 rounded-lg border border-[#FCB131]/30 shadow-lg relative overflow-hidden">
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
                                                <option value="" className="text-black">Consulado Central</option>
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
                                            Traslado: <span className="font-black">{(formData.consulado || 'Consulado Central')}</span> → <span className="font-black text-[#003B94]">{pendingConsulado || 'Consulado Central'}</span>
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
                        </>
                    )}

                    {activeTab === 'HISTORY' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-white/50 p-4 rounded-xl border border-gray-200">
                                <h3 className="text-[#003B94] font-black uppercase text-[9px] tracking-widest border-b border-[#003B94]/10 pb-2 mb-3 flex items-center gap-1.5">
                                    <History size={11} /> Historial de Transferencias
                                </h3>
                                {socioTransfers.length > 0 ? (
                                    <div className="space-y-2">
                                        {socioTransfers.map((transfer, idx) => (
                                            <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <ArrowRightLeft size={14} className="text-[#003B94]" />
                                                    <div>
                                                        <div className="text-[9px] font-black text-[#001d4a] uppercase">
                                                            {transfer.from_consulado || 'Consulado Central'} → {transfer.to_consulado || 'Consulado Central'}
                                                        </div>
                                                        <div className="text-[8px] text-gray-500 font-bold">
                                                            {formatDateDisplay(transfer.request_date)} - {transfer.status}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-400">
                                        <History size={32} className="mx-auto mb-2 opacity-50" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest">Sin transferencias registradas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" style={{ height: '400px' }}>
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/40 backdrop-blur-sm animate-in fade-in" style={{ height: '400px' }}>
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm text-center animate-in zoom-in-95">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle size={32}/></div>
                <h3 className="oswald text-xl font-bold text-red-600 mb-2">Eliminar {getGenderLabel('Socio', selectedSocio.gender)}</h3>
                <p className="text-sm text-gray-500">¿Estás seguro de eliminar a <strong>{selectedSocio.name}</strong>?</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-2 rounded-lg bg-gray-100 font-bold text-xs text-gray-600">Cancelar</button>
                    <button onClick={() => { dataService.deleteSocio(selectedSocio.id); setIsDeleteModalOpen(false); }} className="flex-1 py-2 rounded-lg bg-red-500 text-white font-bold text-xs">Eliminar</button>
                </div>
            </div>
        </div>
      )}
      
      {/* Modal d'Export Complet - Design Compact */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#001d4a]/70 backdrop-blur-md animate-in fade-in" style={{ height: '500px' }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 border border-gray-200">
                {/* Header Compact */}
                <div className="bg-gradient-to-r from-[#003B94] to-[#001d4a] px-4 py-3 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#FCB131]/20 flex items-center justify-center">
                            <Download size={16} className="text-[#FCB131]" />
                        </div>
                        <h2 className="oswald text-base font-black uppercase tracking-tight">Exportar Padrón</h2>
                    </div>
                    <button onClick={() => { setIsExportModalOpen(false); setExportAlcance('ALL'); setExportEstado('ALL'); setExportConsulados(new Set()); setExportCategories(new Set()); }} className="w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-lg transition-all">
                        <X size={16} />
                    </button>
                </div>
                
                {/* Content Compact */}
                <div className="p-4 space-y-4 overflow-y-auto max-h-[55vh]">
                    {/* Section 1: Alcance */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#003B94] text-white text-[10px] font-black flex items-center justify-center">1</span>
                            <h3 className="text-xs font-black text-[#001d4a] uppercase tracking-wider">Alcance</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setExportAlcance('ALL'); setExportConsulados(new Set()); }}
                                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                    exportAlcance === 'ALL' 
                                        ? 'border-[#003B94] bg-[#003B94] text-white shadow-md' 
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <Users size={14} className={exportAlcance === 'ALL' ? 'text-white' : 'text-gray-400'} />
                                <span className="text-[10px] font-bold uppercase">Toda la Lista</span>
                            </button>
                            <button
                                onClick={() => setExportAlcance('CONSULADO')}
                                className={`px-3 py-2 rounded-lg border-2 transition-all flex items-center gap-2 ${
                                    exportAlcance === 'CONSULADO' 
                                        ? 'border-indigo-500 bg-indigo-500 text-white shadow-md' 
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <Building2 size={14} className={exportAlcance === 'CONSULADO' ? 'text-white' : 'text-gray-400'} />
                                <span className="text-[10px] font-bold uppercase">Por Consulado</span>
                            </button>
                        </div>
                        
                        {/* Sélection de consulados */}
                        {exportAlcance === 'CONSULADO' && (
                            <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100">
                                <div className="grid grid-cols-2 gap-1.5 max-h-[100px] overflow-y-auto">
                                    {[{ id: 'Consulado Central', name: 'Consulado Central' }, ...consulados].map(c => (
                                        <label key={c.id} className="flex items-center gap-1.5 px-2 py-1.5 bg-white rounded border border-indigo-100 cursor-pointer hover:bg-indigo-50 transition-all">
                                            <input
                                                type="checkbox"
                                                checked={exportConsulados.has(c.name)}
                                                onChange={(e) => {
                                                    const newSet = new Set(exportConsulados);
                                                    if (e.target.checked) newSet.add(c.name);
                                                    else newSet.delete(c.name);
                                                    setExportConsulados(newSet);
                                                }}
                                                className="w-3 h-3 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-[9px] font-semibold text-gray-700 truncate">{c.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Section 2: Estado de Cuota - INDÉPENDANT de l'alcance */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#003B94] text-white text-[10px] font-black flex items-center justify-center">2</span>
                            <h3 className="text-xs font-black text-[#001d4a] uppercase tracking-wider">Estado de Cuota</h3>
                            <span className="text-[8px] text-gray-400 italic">(combinable con alcance)</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[
                                { id: 'ALL', label: 'Todos', icon: Users, color: 'bg-[#003B94]', border: 'border-[#003B94]' },
                                { id: 'AL_DIA', label: 'Al Día', icon: CheckCircle2, color: 'bg-emerald-500', border: 'border-emerald-500' },
                                { id: 'EN_DEUDA', label: 'Deuda', icon: AlertTriangle, color: 'bg-amber-500', border: 'border-amber-500' },
                                { id: 'DE_BAJA', label: 'Baja', icon: UserX, color: 'bg-red-500', border: 'border-red-500' },
                            ].map(opt => {
                                const isActive = exportEstado === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        onClick={() => setExportEstado(opt.id as 'ALL' | 'AL_DIA' | 'EN_DEUDA' | 'DE_BAJA')}
                                        className={`py-2 px-1 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                                            isActive ? `${opt.border} ${opt.color} text-white shadow-md` : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                    >
                                        <opt.icon size={14} className={isActive ? 'text-white' : 'text-gray-400'} />
                                        <span className={`text-[8px] font-bold uppercase ${isActive ? 'text-white' : 'text-gray-500'}`}>
                                            {opt.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    {/* Section 3: Categoría */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#003B94] text-white text-[10px] font-black flex items-center justify-center">3</span>
                            <h3 className="text-xs font-black text-[#001d4a] uppercase tracking-wider">Categoría</h3>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setExportCategories(new Set())}
                                className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                    exportCategories.size === 0
                                        ? 'bg-[#003B94] text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                            >
                                Todas
                            </button>
                            {SOCIO_CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => {
                                        const newSet = new Set(exportCategories);
                                        if (newSet.has(cat)) newSet.delete(cat);
                                        else newSet.add(cat);
                                        setExportCategories(newSet);
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${
                                        exportCategories.has(cat)
                                            ? 'bg-[#FCB131] text-[#001d4a] shadow-sm'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Footer avec Résumé intégré */}
                <div className="border-t border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50 p-3">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 text-[10px]">
                            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border">
                                <span className="text-gray-400 uppercase">Alcance:</span>
                                <span className="font-bold text-[#001d4a]">
                                    {exportAlcance === 'CONSULADO' 
                                        ? (exportConsulados.size > 0 ? `${exportConsulados.size} cons.` : '...') 
                                        : 'Todo'}
                                </span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-1 bg-white rounded border">
                                <span className="text-gray-400 uppercase">Estado:</span>
                                <span className="font-bold text-[#001d4a]">
                                    {exportEstado === 'AL_DIA' ? 'Al Día' :
                                     exportEstado === 'EN_DEUDA' ? 'Deuda' :
                                     exportEstado === 'DE_BAJA' ? 'Baja' : 'Todos'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#003B94] text-white px-3 py-1.5 rounded-lg">
                            <span className="text-[10px] font-medium">Total:</span>
                            <span className="font-black text-base oswald">
                                {(() => {
                                    let count = socios.filter(s => {
                                        // Filtre Alcance (consulados)
                                        if (exportAlcance === 'CONSULADO' && exportConsulados.size > 0) {
                                            const cName = s.consulado || 'Consulado Central';
                                            if (!exportConsulados.has(cName)) return false;
                                        }
                                        // Filtre Estado (indépendant)
                                        if (exportEstado === 'AL_DIA') {
                                            const status = calculateSocioStatus(s.last_month_paid);
                                            if (status.label !== 'AL DÍA') return false;
                                        } else if (exportEstado === 'EN_DEUDA') {
                                            const status = calculateSocioStatus(s.last_month_paid);
                                            if (status.label !== 'EN DEUDA') return false;
                                        } else if (exportEstado === 'DE_BAJA') {
                                            if (s.category !== 'BAJA') return false;
                                        }
                                        if (exportCategories.size > 0 && !exportCategories.has(s.category || '')) return false;
                                        return true;
                                    }).length;
                                    return count;
                                })()}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => { setIsExportModalOpen(false); setExportAlcance('ALL'); setExportEstado('ALL'); setExportConsulados(new Set()); setExportCategories(new Set()); }}
                            className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-600 font-bold text-[10px] uppercase tracking-wider hover:bg-gray-300 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleExportPDF}
                            disabled={exportAlcance === 'CONSULADO' && exportConsulados.size === 0}
                            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#003B94] to-[#001d4a] text-white font-bold text-[10px] uppercase tracking-wider hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={12} />
                            Exportar PDF
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* CARNET DIGITAL DE SOCIO */}
      {viewSocio && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center px-2 bg-[#001d4a]/70 backdrop-blur-md animate-in fade-in duration-300 h-[700px]">
          <div className="relative w-full max-w-md bg-gradient-to-br from-[#001d4a] via-[#003B94] to-[#001d4a] rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] overflow-hidden border-2 border-[#FCB131]/30 max-h-[85vh] flex flex-col">
            {/* Header du carnet - Style carte d'identité */}
            <div className="relative p-4 pb-3 border-b border-[#FCB131]/30 bg-gradient-to-r from-[#001d4a] to-[#003B94]">
              {/* Bouton fermer */}
              <button 
                onClick={(e) => { e.stopPropagation(); setViewSocio(null); setCarnetTab('INFO'); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-50 cursor-pointer"
                type="button"
              >
                <X size={16} />
              </button>
              
              {/* Badge CABJ */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#FCB131] flex items-center justify-center shadow-lg">
                  <span className="text-[#001d4a] font-black text-[10px]">CABJ</span>
                </div>
                <span className="text-[#FCB131] text-[8px] font-black uppercase tracking-widest">Carnet Digital</span>
              </div>
              
              {/* Photo et infos principales */}
              <div className="flex items-center gap-4 mt-3">
                {/* Photo - seulement si disponible */}
                {viewSocio.foto ? (
                  <div className="w-20 h-24 rounded-lg bg-gradient-to-br from-[#001d4a] to-[#003B94] border-2 border-[#FCB131]/50 overflow-hidden shadow-xl flex-shrink-0">
                    <img src={viewSocio.foto} alt={viewSocio.last_name} className="w-full h-full object-cover" />
                  </div>
                ) : null}
                
                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <h2 className="oswald text-lg font-black text-white uppercase tracking-tight truncate">
                    {viewSocio.last_name}
                  </h2>
                  <p className="text-[#FCB131] text-sm font-bold capitalize">{viewSocio.first_name.toLowerCase()}</p>
                  
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="px-2 py-0.5 rounded bg-[#FCB131] text-[#001d4a] text-[8px] font-black uppercase tracking-widest">
                      N° {viewSocio.numero_socio || viewSocio.dni || viewSocio.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/20 text-white text-[8px] font-black uppercase tracking-widest">
                      {viewSocio.category}
                    </span>
                    {viewSocio.role && viewSocio.role !== 'SOCIO' && (
                      <span className="px-2 py-0.5 rounded bg-green-500/80 text-white text-[8px] font-black uppercase tracking-widest flex items-center gap-0.5">
                        {viewSocio.role === 'PRESIDENTE' && <Crown size={8} />}
                        {viewSocio.role}
                      </span>
                    )}
                  </div>
                  
                  {/* Estado de cuota */}
                  {(() => {
                    const status = calculateSocioStatus(viewSocio.last_month_paid);
                    return (
                      <div className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                        status.label === 'AL DÍA' ? 'bg-green-500/20 text-green-400' :
                        status.label === 'EN DEUDA' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {status.label === 'AL DÍA' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        <span className="text-[8px] font-black uppercase tracking-widest">{status.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-[#FCB131]/20 bg-[#001d4a]/50">
              <button
                onClick={() => setCarnetTab('INFO')}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                  carnetTab === 'INFO' 
                    ? 'text-[#FCB131] border-b-2 border-[#FCB131] bg-white/5' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <CreditCard size={12} /> Información
              </button>
              <button
                onClick={() => setCarnetTab('HISTORIAL')}
                className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${
                  carnetTab === 'HISTORIAL' 
                    ? 'text-[#FCB131] border-b-2 border-[#FCB131] bg-white/5' 
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <History size={12} /> Historial
              </button>
            </div>
            
            {/* Contenu */}
            <div className="flex-1 overflow-y-auto p-3">
              {carnetTab === 'INFO' && (
                <div className="space-y-3">
                  {/* Datos Personales */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <User size={12} /> Datos Personales
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">DNI</span>
                        <span className="text-white font-bold text-xs">{viewSocio.dni || '-'}</span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Género</span>
                        <span className="text-white font-bold text-xs">
                          {viewSocio.gender === 'M' ? 'Masculino' : viewSocio.gender === 'F' ? 'Femenino' : 'No binario'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block flex items-center gap-0.5">
                          <Cake size={8} /> Nacimiento
                        </span>
                        <span className="text-white font-bold text-xs">{formatDateDisplay(viewSocio.birth_date) || '-'}</span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Nacionalidad</span>
                        <span className="text-white font-bold text-xs">{viewSocio.nationality || 'Argentina'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Contacto */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Phone size={12} /> Contacto
                    </h3>
                    <div className="space-y-1.5">
                      {viewSocio.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={12} className="text-[#FCB131]" />
                          <span className="text-white font-bold text-xs truncate">{viewSocio.email}</span>
                        </div>
                      )}
                      {viewSocio.phone && (
                        <div className="flex items-center gap-2">
                          <Phone size={12} className="text-[#FCB131]" />
                          <span className="text-white font-bold text-xs">{viewSocio.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Membresía */}
                  <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                    <h3 className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Award size={12} /> Membresía
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Consulado</span>
                        <span className="text-white font-bold text-xs flex items-center gap-0.5">
                          <MapPin size={10} className="text-[#FCB131]" />
                          {viewSocio.consulado || 'Central'}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Fecha Alta</span>
                        <span className="text-white font-bold text-xs">{formatDateDisplay(viewSocio.join_date) || '-'}</span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Último Pago</span>
                        <span className="text-white font-bold text-xs">{formatDateDisplay(viewSocio.last_month_paid) || '-'}</span>
                      </div>
                      <div>
                        <span className="text-white/50 text-[8px] uppercase tracking-widest block">Vencimiento</span>
                        <span className="text-white font-bold text-xs">{formatDateDisplay(viewSocio.expiration_date) || '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {carnetTab === 'HISTORIAL' && (
                <div className="space-y-3">
                  {/* Estadísticas */}
                  {socioStats && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-green-500/20 rounded-lg p-2 text-center border border-green-500/30">
                        <div className="text-xl font-black text-green-400 oswald">{socioStats.total_attended}</div>
                        <div className="text-[7px] text-green-300 font-bold uppercase tracking-widest">Presencias</div>
                      </div>
                      <div className="bg-amber-500/20 rounded-lg p-2 text-center border border-amber-500/30">
                        <div className="text-xl font-black text-amber-400 oswald">{socioStats.total_no_show}</div>
                        <div className="text-[7px] text-amber-300 font-bold uppercase tracking-widest">Ausencias</div>
                      </div>
                      <div className="bg-blue-500/20 rounded-lg p-2 text-center border border-blue-500/30">
                        <div className="text-xl font-black text-blue-400 oswald">
                          {socioStats.attendance_rate !== null ? `${socioStats.attendance_rate}%` : '-'}
                        </div>
                        <div className="text-[7px] text-blue-300 font-bold uppercase tracking-widest">Asistencia</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Liste de l'historique */}
                  <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
                    <div className="p-2 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-[#FCB131] text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Ticket size={10} /> Historial
                      </h3>
                      <span className="text-white/50 text-[8px]">{socioHistory.length} registros</span>
                    </div>
                    
                    {isLoadingHistory ? (
                      <div className="p-4 flex items-center justify-center">
                        <Loader2 size={18} className="text-[#FCB131] animate-spin" />
                      </div>
                    ) : socioHistory.length === 0 ? (
                      <div className="p-4 text-center">
                        <Ticket size={32} className="text-white/20 mx-auto mb-2" />
                        <p className="text-white/50 text-xs font-bold">Sin historial</p>
                        <p className="text-white/30 text-[10px] mt-0.5">Las solicitudes aparecerán aquí</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/10 max-h-[200px] overflow-y-auto">
                        {socioHistory.map((record) => (
                          <div key={record.id} className="p-2 hover:bg-white/5 transition-all">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                  <span className="text-white font-bold text-xs truncate">
                                    vs {record.match_opponent || 'Rival'}
                                  </span>
                                  <span className="text-white/50 text-[8px] uppercase">
                                    {record.match_type === 'LOCAL' ? '(L)' : '(V)'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[8px] text-white/60">
                                  <span className="flex items-center gap-0.5">
                                    <Calendar size={8} />
                                    {record.match_date ? new Date(record.match_date).toLocaleDateString('es-AR') : '-'}
                                  </span>
                                  <span className="truncate">{record.match_competition || '-'}</span>
                                </div>
                              </div>
                              
                              {/* Status badges */}
                              <div className="flex flex-col items-end gap-0.5">
                                {/* Request status */}
                                <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase ${
                                  record.request_status === 'ACEPTADO' ? 'bg-green-500/20 text-green-400' :
                                  record.request_status === 'RECHAZADO' ? 'bg-red-500/20 text-red-400' :
                                  record.request_status === 'CANCELADO' ? 'bg-gray-500/20 text-gray-400' :
                                  'bg-amber-500/20 text-amber-400'
                                }`}>
                                  {record.request_status}
                                </span>
                                
                                {/* Attendance status */}
                                {record.attendance_status && (
                                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase flex items-center gap-0.5 ${
                                    record.attendance_status === 'PRESENTE' ? 'bg-green-500/30 text-green-300' :
                                    record.attendance_status === 'AUSENTE_SIN_AVISO' ? 'bg-red-500/30 text-red-300' :
                                    record.attendance_status === 'AUSENTE_CON_AVISO' ? 'bg-amber-500/30 text-amber-300' :
                                    'bg-gray-500/30 text-gray-300'
                                  }`}>
                                    {record.attendance_status === 'PRESENTE' && <CheckCircle2 size={7} />}
                                    {record.attendance_status === 'AUSENTE_SIN_AVISO' && <XOctagon size={7} />}
                                    {record.attendance_status === 'AUSENTE_CON_AVISO' && <Bell size={7} />}
                                    {record.attendance_status === 'PRESENTE' ? 'OK' :
                                     record.attendance_status === 'AUSENTE_SIN_AVISO' ? 'No' :
                                     record.attendance_status === 'AUSENTE_CON_AVISO' ? 'Avisó' : '-'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-[#FCB131]/20 bg-[#001d4a]/80 flex justify-between items-center">
              <div className="text-white/40 text-[9px]">
                ID: {viewSocio.id}
              </div>
              <button
                onClick={() => { handleEdit(viewSocio); setViewSocio(null); }}
                className="px-4 py-2 rounded-lg bg-[#FCB131] text-[#001d4a] text-[10px] font-black uppercase tracking-widest hover:bg-[#FFD23F] transition-all flex items-center gap-2"
              >
                <Edit2 size={12} /> Editar Socio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Socios;

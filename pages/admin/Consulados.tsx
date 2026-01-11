
// ... existing imports
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Search, MapPin, Globe, Users, Building2, ChevronRight, ChevronLeft, X, Mail, Phone, Instagram, Facebook, Twitter, Link as LinkIcon, Filter, Plus, Edit2, Trash2, Save, Star, Upload, Image as ImageIcon, Check, AlertTriangle, Youtube, Clock, ShieldCheck, Video, ChevronUp, ChevronDown, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Consulado, Socio } from '../../types';
import { COUNTRIES, TIMEZONES, WORLD_CITIES } from '../../constants';

// ... CustomSelect component remains unchanged ...
// ... existing CustomSelect code ...
interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    icon?: React.ElementType;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, onChange, options, placeholder = "Seleccionar...", icon: Icon, searchable = false, disabled = false, className = "" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchable || !search) return options;
        return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search, searchable]);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className={`space-y-1 relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    {Icon && <Icon size={10} />} {label}
                </label>
            )}
            <div 
                className={`w-full bg-gray-50 border rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none transition-all flex items-center justify-between
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#003B94]/50'}
                ${isOpen && !disabled ? 'border-[#003B94] ring-1 ring-[#003B94]/20 bg-white' : 'border-gray-200'}`}
                onClick={() => { if (!disabled) { setIsOpen(!isOpen); if (searchable) setSearch(''); } }}
            >
                <span className={`truncate ${!value ? 'text-gray-400 font-normal' : ''}`}>
                    {value ? selectedLabel : placeholder}
                </span>
                {!disabled && (
                    isOpen ? <ChevronUp size={12} className="text-[#003B94] shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-w-full">
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-7 pr-3 text-[10px] font-bold text-[#001d4a] outline-none focus:border-[#003B94] transition-all"
                                    placeholder="Buscar socio..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt.value} 
                                    className={`px-3 py-2 hover:bg-[#003B94]/5 cursor-pointer text-[10px] font-bold flex items-center justify-between group transition-colors ${value === opt.value ? 'bg-[#003B94]/10 text-[#003B94]' : 'text-[#001d4a]'}`}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={10} className="text-[#003B94] shrink-0 ml-2" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-[10px] text-gray-400 font-bold text-center italic">No se encontraron resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const Consulados = () => {
  // ... existing state ...
  const [consulados, setConsulados] = useState<Consulado[]>(dataService.getConsulados());
  const [allSocios, setAllSocios] = useState<Socio[]>(dataService.getSocios()); 
  const [searchQuery, setSearchQuery] = useState('');
  const [countryFilter, setCountryFilter] = useState('ALL');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingConsulado, setEditingConsulado] = useState<Partial<Consulado>>({});
  const [activeTab, setActiveTab] = useState<'INFO' | 'SOCIAL' | 'LOCATION' | 'BOARD'>('INFO');
  const [mapUrl, setMapUrl] = useState<string>('');
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingConsulado, setDeletingConsulado] = useState<Consulado | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState<{ success: number; errors: number; duplicates: number }>({ success: 0, errors: 0, duplicates: 0 });
  const [showImportModal, setShowImportModal] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const [position2, setPosition2] = useState({ x: 0, y: 0 });
  const [isDragging2, setIsDragging2] = useState(false);
  const dragStart2 = useRef({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ... (useEffects for loading data and drag logic remain the same) ...
  useEffect(() => {
      setConsulados(dataService.getConsulados());
      setAllSocios(dataService.getSocios());
  }, [isEditModalOpen]);

  useEffect(() => {
      if (isEditModalOpen) setPosition({ x: 0, y: 0 });
  }, [isEditModalOpen]);

  useEffect(() => {
      if (isDeleteModalOpen) setPosition2({ x: 0, y: 0 });
  }, [isDeleteModalOpen]);

  // Mettre à jour l'URL de la carte Google Maps en temps réel
  useEffect(() => {
      const addressParts = [
          editingConsulado.address || '',
          editingConsulado.city || '',
          editingConsulado.country || ''
      ].filter(part => part.trim() !== '');
      
      const fullAddress = addressParts.join(', ');
      if (fullAddress.trim()) {
          const encodedAddress = encodeURIComponent(fullAddress);
          // Utiliser l'embed standard de Google Maps qui ne nécessite pas de clé API
          setMapUrl(`https://maps.google.com/maps?q=${encodedAddress}&output=embed&zoom=15`);
      } else {
          setMapUrl('');
      }
  }, [editingConsulado.address, editingConsulado.city, editingConsulado.country]);

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging) return;
          setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      };
      const handleMouseUp = () => setIsDragging(false);
      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!isDragging2) return;
          setPosition2({ x: e.clientX - dragStart2.current.x, y: e.clientY - dragStart2.current.y });
      };
      const handleMouseUp = () => setIsDragging2(false);
      if (isDragging2) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging2]);

  const handleDragStart2 = (e: React.MouseEvent) => {
      setIsDragging2(true);
      dragStart2.current = { x: e.clientX - position2.x, y: e.clientY - position2.y };
  };

  // ... (Helpers, filtering, handlers same) ...
  const estimateTimezone = (city: string, country: string) => {
      const foundCity = WORLD_CITIES.find(c => c.city.toLowerCase() === city.toLowerCase());
      if (foundCity) return foundCity.tz;
      const foundCountry = WORLD_CITIES.find(c => c.country === country);
      if (foundCountry) return foundCountry.tz;
      return 'UTC-03:00 (Buenos Aires)'; 
  };

  const handleLocationChange = (field: 'city' | 'country', value: string) => {
      const newConsulado = { ...editingConsulado, [field]: value };
      if (value) {
          const estimatedTz = estimateTimezone(newConsulado.city || '', newConsulado.country || '');
          newConsulado.timezone = estimatedTz;
      }
      setEditingConsulado(newConsulado);
  };

  const countries = useMemo(() => {
      const list = Array.from(new Set(consulados.map(c => c.country).filter(Boolean)));
      return list.sort();
  }, [consulados]);

  const filteredConsulados = useMemo(() => {
    return consulados.filter(c => {
      const matchesSearch = (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (c.city || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCountry = countryFilter === 'ALL' || c.country === countryFilter;
      return matchesSearch && matchesCountry;
    });
  }, [consulados, searchQuery, countryFilter]);

  const totalPages = Math.ceil(filteredConsulados.length / itemsPerPage);
  const currentItems = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      return filteredConsulados.slice(start, start + itemsPerPage);
  }, [filteredConsulados, currentPage]);

  const boardCandidates = useMemo(() => {
      const targetName = editingConsulado.name || '';
      const isSede = targetName.toLowerCase() === 'sede central' || targetName === '';
      return allSocios.filter(s => {
          const sConsulado = s.consulado || '';
          if (isSede) return sConsulado === '' || sConsulado.toLowerCase() === 'sede central';
          return sConsulado === targetName;
      }).map(s => ({
          value: s.name,
          label: `${s.last_name.toUpperCase()}, ${s.first_name} (${s.numero_socio || s.dni || s.id})`
      })).sort((a, b) => a.label.localeCompare(b.label));
  }, [allSocios, editingConsulado.name]);

  const handleCreate = () => {
      setEditingConsulado({
          id: crypto.randomUUID(),
          name: '', city: '', country: 'Argentina', is_official: false,
          social_instagram: '', social_facebook: '', social_x: '', social_youtube: '', social_tiktok: '', website: '',
          address: '', logo: '', banner: '',
          president: '', vice_president: '', secretary: '', treasurer: '', referente: '', vocal: ''
      });
      setActiveTab('INFO');
      setIsEditModalOpen(true);
      setShowSaveConfirm(false);
  };

  const handleEdit = (consulado: Consulado) => {
      setEditingConsulado({ ...consulado });
      setActiveTab('INFO');
      setIsEditModalOpen(true);
      setShowSaveConfirm(false);
  };

  const handleSave = () => {
      if (!editingConsulado.name) return;
      setShowSaveConfirm(true);
  };

  const executeSave = async () => {
      const isUpdate = consulados.some(c => c.id === editingConsulado.id);
      const oldConsulado = isUpdate ? consulados.find(c => c.id === editingConsulado.id) : null;
      
      // Sauvegarder le consulado
      if (isUpdate) {
          dataService.updateConsulado(editingConsulado as Consulado);
      } else {
          dataService.addConsulado(editingConsulado as Consulado);
      }
      
      // Mettre à jour les rôles des socios
      try {
          // Recharger les consulados après la sauvegarde pour avoir la liste à jour
          const updatedConsulados = dataService.getConsulados();
          
          // Si c'est une mise à jour, retirer les rôles des anciens président/referente
          if (oldConsulado) {
              // Retirer le rôle PRESIDENTE de l'ancien président s'il est différent du nouveau
              if (oldConsulado.president && oldConsulado.president !== editingConsulado.president) {
                  const oldPresidentSocio = allSocios.find(s => 
                      s.name === oldConsulado.president || 
                      `${s.first_name} ${s.last_name}` === oldConsulado.president
                  );
                  if (oldPresidentSocio && oldPresidentSocio.role === 'PRESIDENTE') {
                      // Vérifier si ce socio n'est pas président d'un autre consulado
                      const isPresidentElsewhere = updatedConsulados.some(c => 
                          c.id !== editingConsulado.id && 
                          (c.president === oldConsulado.president || 
                           c.president === oldPresidentSocio.name ||
                           c.president === `${oldPresidentSocio.first_name} ${oldPresidentSocio.last_name}`)
                      );
                      if (!isPresidentElsewhere) {
                          const updatedSocio = { ...oldPresidentSocio, role: 'SOCIO' as const };
                          await dataService.updateSocio(updatedSocio);
                      }
                  }
              }
              
              // Retirer le rôle REFERENTE de l'ancien referente s'il est différent du nouveau
              if (oldConsulado.referente && oldConsulado.referente !== editingConsulado.referente) {
                  const oldReferenteSocio = allSocios.find(s => 
                      s.name === oldConsulado.referente || 
                      `${s.first_name} ${s.last_name}` === oldConsulado.referente
                  );
                  if (oldReferenteSocio && oldReferenteSocio.role === 'REFERENTE') {
                      // Vérifier si ce socio n'est pas referente d'un autre consulado
                      const isReferenteElsewhere = updatedConsulados.some(c => 
                          c.id !== editingConsulado.id && 
                          (c.referente === oldConsulado.referente || 
                           c.referente === oldReferenteSocio.name ||
                           c.referente === `${oldReferenteSocio.first_name} ${oldReferenteSocio.last_name}`)
                      );
                      if (!isReferenteElsewhere) {
                          const updatedSocio = { ...oldReferenteSocio, role: 'SOCIO' as const };
                          await dataService.updateSocio(updatedSocio);
                      }
                  }
              }
          }
          
          // Recharger les socios avant d'assigner les nouveaux rôles
          const updatedSocios = dataService.getSocios();
          
          // Assigner le rôle PRESIDENTE au nouveau président
          if (editingConsulado.president) {
              const newPresidentSocio = updatedSocios.find(s => 
                  s.name === editingConsulado.president || 
                  `${s.first_name} ${s.last_name}` === editingConsulado.president
              );
              if (newPresidentSocio && newPresidentSocio.role !== 'PRESIDENTE') {
                  // Si le socio était referente, on le retire de son ancien consulado
                  if (newPresidentSocio.role === 'REFERENTE') {
                      const oldReferenteConsulado = updatedConsulados.find(c => 
                          c.id !== editingConsulado.id &&
                          (c.referente === newPresidentSocio.name || 
                           c.referente === `${newPresidentSocio.first_name} ${newPresidentSocio.last_name}`)
                      );
                      if (oldReferenteConsulado) {
                          const updatedConsuladoData = { ...oldReferenteConsulado, referente: '' };
                          await dataService.updateConsulado(updatedConsuladoData);
                      }
                  }
                  const updatedSocio = { ...newPresidentSocio, role: 'PRESIDENTE' as const };
                  await dataService.updateSocio(updatedSocio);
              }
          }
          
          // Assigner le rôle REFERENTE au nouveau referente
          if (editingConsulado.referente) {
              const newReferenteSocio = updatedSocios.find(s => 
                  s.name === editingConsulado.referente || 
                  `${s.first_name} ${s.last_name}` === editingConsulado.referente
              );
              if (newReferenteSocio && newReferenteSocio.role !== 'REFERENTE') {
                  // Si le socio était président, on ne peut pas le rétrograder automatiquement
                  // On met seulement à jour s'il n'est pas président
                  if (newReferenteSocio.role !== 'PRESIDENTE') {
                      const updatedSocio = { ...newReferenteSocio, role: 'REFERENTE' as const };
                      await dataService.updateSocio(updatedSocio);
                  }
              }
          }
          
          // Recharger les données
          setAllSocios(dataService.getSocios());
          setConsulados(dataService.getConsulados());
      } catch (error) {
          console.error('Erreur lors de la mise à jour des rôles des socios:', error);
          // Continuer quand même car le consulado a été sauvegardé
      }
      
      setShowSaveConfirm(false);
      setIsEditModalOpen(false);
  };

  const requestDelete = (consulado: Consulado) => {
      setDeletingConsulado(consulado);
      setDeleteConfirmationText('');
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
      if (deletingConsulado && deleteConfirmationText === deletingConsulado.name) {
          dataService.deleteConsulado(deletingConsulado.id);
          setConsulados(dataService.getConsulados());
          setIsDeleteModalOpen(false);
          setDeletingConsulado(null);
      }
  };

  // UPDATED FILE UPLOAD LOGIC
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
      const file = e.target.files?.[0];
      if (file) {
          // Dynamic limit from settings
          const limitMB = dataService.getAppSettings().maxUploadSize || 5; 
          const limitBytes = limitMB * 1024 * 1024;

          if (file.size > limitBytes) {
              alert(`La imagen es demasiado pesada (Máx ${limitMB}MB). Por favor, comprímala antes de subir.`);
              e.target.value = '';
              return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
              if (event.target?.result) {
                  setEditingConsulado(prev => ({ ...prev, [field]: event.target!.result as string }));
              }
          };
          reader.readAsDataURL(file);
      }
      e.target.value = '';
  };

  const handleRemoveImage = (field: 'logo' | 'banner') => {
      setEditingConsulado(prev => ({ ...prev, [field]: '' }));
  };

  // CSV Import Functions
  const parseCSV = (csvText: string): Array<Record<string, string>> => {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length === 0) return [];
      
      const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
      const rows: Array<Record<string, string>> = [];
      
      for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(';');
          if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows
          
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
              row[header] = (values[index] || '').trim();
          });
          rows.push(row);
      }
      
      return rows;
  };

  const mapCSVRowToConsulado = (row: Record<string, string>): Partial<Consulado> | null => {
      const name = row.name?.trim();
      if (!name) return null;

      // Check if consulado already exists (case-insensitive)
      const existing = consulados.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (existing) {
          return null; // Will be handled as duplicate
      }

      // Map country code from country name
      const getCountryCode = (country: string): string => {
          const countryMap: Record<string, string> = {
              'Estados Unidos': 'US',
              'Brasil': 'BR',
              'Canadá': 'CA',
              'Hungría': 'HU',
              'Suiza': 'CH',
              'Irlanda': 'IE',
              'Bolivia': 'BO',
              'Reino Unido': 'GB',
              'España': 'ES',
              'Chile': 'CL',
              'Uruguay': 'UY',
              'Polonia': 'PL',
              'México': 'MX',
              'Suecia': 'SE',
              'Italia': 'IT',
              'Ecuador': 'EC',
              'Australia': 'AU',
              'Colombia': 'CO',
              'Panamá': 'PA',
              'Paraguay': 'PY',
              'Perú': 'PE',
              'Austria': 'AT',
              'Bélgica': 'BE',
              'Dinamarca': 'DK',
              'Portugal': 'PT',
              'República Checa': 'CZ',
              'Francia': 'FR',
              'Israel': 'IL',
              'EAU': 'AE',
              'Costa Rica': 'CR',
              'Japón': 'JP',
              'China': 'CN',
              'Alemania': 'DE',
              'Países Bajos': 'NL',
              'Venezuela': 'VE'
          };
          return countryMap[country] || '';
      };

      const country = row.country?.trim() || '';
      const foundationYearRaw = row.foundation_year?.trim() || '';
      // Extract year from date format (YYYY-MM-DD) or use as-is if just a year
      let foundationYear = '';
      if (foundationYearRaw) {
          const dateMatch = foundationYearRaw.match(/^(\d{4})/);
          foundationYear = dateMatch ? dateMatch[1] : foundationYearRaw;
      }
      
      const timezone = row.timezone?.trim() || '';
      
      // Estimate timezone from city/country if not provided
      const estimatedTimezone = timezone || estimateTimezone(row.city?.trim() || '', country);

      const consulado: Partial<Consulado> = {
          id: crypto.randomUUID(),
          name: name,
          city: row.city?.trim() || '',
          country: country,
          countryCode: row.country_code?.trim() || getCountryCode(country),
          president: row.president?.trim() || '',
          referente: row.referente?.trim() || '',
          address: row.address?.trim() || '',
          logo: row.logo?.trim() || '',
          banner: row.banner?.trim() || '',
          timezone: estimatedTimezone,
          foundationYear: foundationYear,
          isOfficial: row.is_official?.toLowerCase() === 'true' || row.is_official === '1' || row.is_official === 'TRUE' || false,
          email: '',
          phone: '',
          socialInstagram: '',
          socialFacebook: '',
          socialX: '',
          socialYouTube: '',
          socialTikTok: '',
          website: '',
          vicePresident: '',
          secretary: '',
          treasurer: '',
          vocal: '',
          vocales: []
      };

      return consulado;
  };

  const handleCSVImport = async (file: File) => {
      setIsImporting(true);
      setImportProgress({ current: 0, total: 0 });
      setImportResults({ success: 0, errors: 0, duplicates: 0 });

      try {
          const text = await file.text();
          const rows = parseCSV(text);
          
          if (rows.length === 0) {
              alert('Le fichier CSV est vide ou invalide.');
              setIsImporting(false);
              return;
          }

          setImportProgress({ current: 0, total: rows.length });
          
          let successCount = 0;
          let errorCount = 0;
          let duplicateCount = 0;

          // Import sequentially to avoid overwhelming the database
          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const consuladoData = mapCSVRowToConsulado(row);
              
              setImportProgress({ current: i + 1, total: rows.length });

              if (!consuladoData) {
                  // Check if it's a duplicate
                  const name = row.name?.trim();
                  if (name && consulados.find(c => c.name.toLowerCase() === name.toLowerCase())) {
                      duplicateCount++;
                  } else {
                      errorCount++;
                  }
                  continue;
              }

              try {
                  await dataService.addConsulado(consuladoData as Consulado);
                  successCount++;
              } catch (error) {
                  console.error(`Erreur lors de l'import du consulado ${consuladoData.name}:`, error);
                  errorCount++;
              }
          }

          setImportResults({ success: successCount, errors: errorCount, duplicates: duplicateCount });
          setConsulados(dataService.getConsulados());
          
          // Show results
          alert(
              `Import terminé!\n\n` +
              `✅ Succès: ${successCount}\n` +
              `🔄 Doublons ignorés: ${duplicateCount}\n` +
              `❌ Erreurs: ${errorCount}`
          );
          
      } catch (error) {
          console.error('Erreur lors de l\'import CSV:', error);
          alert('Une erreur est survenue lors de l\'import du fichier CSV.');
      } finally {
          setIsImporting(false);
          if (csvInputRef.current) csvInputRef.current.value = '';
      }
  };

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (!file.name.endsWith('.csv')) {
              alert('Veuillez sélectionner un fichier CSV (.csv)');
              e.target.value = '';
              return;
          }
          handleCSVImport(file);
      }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
      
      {/* ... Header and Grid (unchanged except logic) ... */}
      <div className="bg-[#003B94] p-8 rounded-xl border border-white/20 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none"><Globe size={300} className="text-white" /></div>
        <div className="flex items-center gap-5 relative z-10">
          <div className="bg-white/10 p-4 rounded-xl border border-white/20"><Building2 size={28} className="text-[#FCB131]" /></div>
          <div><h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">Consulados</h1><p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">Gestión de la Red Oficial</p></div>
        </div>
        <div className="relative z-10 flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
             <div className="flex gap-2 w-full md:w-auto">
                <div className="relative min-w-[180px]">
                    <select value={countryFilter} onChange={(e) => { setCountryFilter(e.target.value); setCurrentPage(1); }} className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-8 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:bg-white/20 transition-all"><option value="ALL" className="text-[#001d4a]">Todos los Países</option>{countries.map(c => <option key={c} value={c} className="text-[#001d4a]">{c}</option>)}</select>
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={14} /><Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none" size={12} />
                </div>
             </div>
            <div className="relative group w-full md:w-64">
                <input type="text" placeholder="Buscar consulado..." className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-10 pr-4 outline-none text-xs font-bold text-white placeholder:text-white/40 transition-all focus:bg-white focus:text-[#001d4a]" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#001d4a]" size={16} />
            </div>
            <label className="bg-[#001d4a] text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#003B94] transition-all whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" title="Importer un fichier CSV">
                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
                {isImporting ? `Import ${importProgress.current}/${importProgress.total}` : 'Import CSV'}
                <input type="file" ref={csvInputRef} accept=".csv" onChange={handleCSVFileSelect} className="hidden" disabled={isImporting} />
            </label>
            <button onClick={handleCreate} className="bg-[#FCB131] text-[#001d4a] px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg flex items-center gap-2 hover:bg-[#FFD23F] transition-all whitespace-nowrap ml-2"><Plus size={16} /> Nuevo</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {currentItems.map(consulado => {
            const memberCount = allSocios.filter(s => s.consulado === consulado.name).length;
            return (
            <div key={consulado.id} className="relative group">
                <GlassCard className={`p-0 overflow-hidden h-full flex flex-col rounded-[2.5rem] border transition-all duration-500 hover:-translate-y-2 backdrop-blur-xl ${consulado.is_official ? 'bg-gradient-to-br from-[#FCB131] via-[#FFD23F] to-[#E6A800] border-[#001d4a]/20 shadow-[0_20px_50px_-10px_rgba(252,177,49,0.3)]' : 'bg-gradient-to-br from-white/90 via-white/70 to-white/40 border-white/60 shadow-[0_15px_40px_-5px_rgba(0,59,148,0.15)]'}`}>
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10"></div>
                    <div className="h-36 relative shrink-0 overflow-hidden">
                        {consulado.banner ? (<img src={consulado.banner} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />) : (<div className="w-full h-full bg-gradient-to-br from-[#003B94] via-[#001d4a] to-black"></div>)}
                        <div className="absolute inset-0 bg-[#001d4a]/20 group-hover:bg-transparent transition-colors duration-500"></div>
                        {consulado.is_official && (<div className="absolute top-3 right-3 bg-[#001d4a] w-10 h-10 rounded-full shadow-lg z-20 flex items-center justify-center border-2 border-[#FCB131] animate-in zoom-in duration-500"><Star size={18} className="text-[#FCB131] fill-[#FCB131] animate-pulse" /></div>)}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-[-10px] group-hover:translate-y-0 z-20">
                            <div className={`flex gap-2 ${consulado.is_official ? 'mr-12' : ''}`}>
                                <button onClick={(e) => { e.stopPropagation(); handleEdit(consulado); }} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white text-white hover:text-[#003B94] rounded-full backdrop-blur-md shadow-lg border border-white/30 transition-all transform hover:scale-110"><Edit2 size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); requestDelete(consulado); }} className="w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-red-500 text-white hover:text-white rounded-full backdrop-blur-md shadow-lg border border-white/30 transition-all transform hover:scale-110"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    </div>
                    <div className="relative pt-10 pb-5 px-5 flex-1 flex flex-col bg-gradient-to-b from-transparent to-white/30">
                        <div className="absolute -top-10 left-6 w-20 h-20 rounded-full border-[4px] border-white/70 bg-white shadow-2xl overflow-hidden flex items-center justify-center z-20 group-hover:scale-105 transition-transform duration-500">
                            {consulado.logo ? (<img src={consulado.logo} className="w-full h-full object-cover" />) : (<Building2 className="text-[#003B94]/20" size={32} />)}
                        </div>
                        <div className="mb-4 space-y-1">
                            <h3 className={`oswald text-xl font-black uppercase leading-tight line-clamp-2 drop-shadow-sm transition-colors ${consulado.is_official ? 'text-[#001d4a]' : 'text-[#001d4a] group-hover:text-[#003B94]'}`}>{consulado.name}</h3>
                            <div className="space-y-1">
                                <div className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest w-fit px-2 py-1 rounded-lg ${consulado.is_official ? 'bg-[#001d4a]/10 text-[#001d4a]' : 'bg-[#003B94]/5 text-[#003B94]'}`}><MapPin size={10} /> {consulado.city}, {consulado.country}</div>
                                {consulado.address && (<div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500/80 uppercase tracking-wide truncate pl-1"><div className="w-1 h-1 rounded-full bg-current"></div><span className="truncate">{consulado.address}</span></div>)}
                            </div>
                        </div>
                        <div className={`mt-auto pt-4 border-t ${consulado.is_official ? 'border-[#001d4a]/10' : 'border-[#003B94]/5'}`}>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col items-center justify-center p-2 bg-white/40 rounded-xl border border-white/50 shadow-sm"><Users size={14} className="text-[#003B94] mb-1 opacity-70"/><span className="text-xl font-black text-[#001d4a] oswald leading-none">{memberCount}</span><span className="text-[6px] font-bold text-gray-500 uppercase tracking-widest">Socios</span></div>
                                <div className="col-span-2 flex flex-col justify-center p-2 bg-white/40 rounded-xl border border-white/50 px-3 shadow-sm">
                                    <span className="text-[6px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Presidente</span>
                                    <span className="text-[9px] font-black text-[#001d4a] uppercase truncate" title={consulado.president}>{consulado.president || 'Vacante'}</span>
                                    {consulado.foundation_year && (<span className="text-[7px] font-bold text-gray-400 mt-1 uppercase tracking-wide">Fundado: {new Date(consulado.foundation_year).getFullYear()}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
            );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94] hover:text-white transition-all shadow-sm"><ChevronLeft size={16} /> Anterior</button>
          <div className="px-4 py-2 rounded-xl bg-[#003B94] text-white font-black text-xs shadow-lg shadow-[#003B94]/20">Página {currentPage} de {totalPages}</div>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#003B94]/10 text-[#003B94] font-black uppercase text-[10px] tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#003B94] hover:text-white transition-all shadow-sm">Siguiente <ChevronRight size={16} /></button>
        </div>
      )}

      {/* --- EDIT MODAL (CENTERED & FIXED) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none" >
            <div 
                style={{ transform: `translate(${position.x}px, ${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s' }}
                className="pointer-events-auto relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60 max-h-[90vh] animate-in fade-in zoom-in-95 duration-300"
            >
                <div 
                    onMouseDown={handleDragStart}
                    className="bg-gradient-to-r from-[#003B94] to-[#001d4a] p-4 text-white flex items-center justify-between shrink-0 cursor-move select-none active:cursor-grabbing"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-white/10 p-2 rounded-xl border border-white/10"><Edit2 size={18} className="text-[#FCB131]" /></div>
                        <div><h2 className="oswald text-lg font-black uppercase tracking-tight">{editingConsulado.id ? 'Editar Consulado' : 'Nuevo Consulado'}</h2><p className="text-white/50 text-[8px] font-bold uppercase tracking-widest">Gestión Integral</p></div>
                    </div>
                    <X onClick={(e) => { e.stopPropagation(); setIsEditModalOpen(false); }} className="cursor-pointer opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-colors" size={20} />
                </div>

                <div className="flex justify-center bg-gray-50 border-b border-gray-200 px-6 pt-3 gap-2 overflow-x-auto shrink-0">
                    {[
                        { id: 'INFO', label: 'Info General', icon: Building2 },
                        { id: 'SOCIAL', label: 'Redes Sociales', icon: Globe },
                        { id: 'LOCATION', label: 'Ubicación', icon: MapPin },
                        { id: 'BOARD', label: 'Directiva', icon: Users }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[9px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-[#003B94] shadow-[0_-2px_5px_rgba(0,0,0,0.05)] border-t border-x border-gray-200 z-10 translate-y-[1px]' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}><tab.icon size={12} className={activeTab === tab.id ? 'text-[#FCB131]' : ''} /> {tab.label}</button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white">
                    {/* ... (Content for Tabs - same as before) ... */}
                    {/* INFO TAB */}
                    {activeTab === 'INFO' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Official Status Toggle - Full Line */}
                            <div onClick={() => setEditingConsulado({...editingConsulado, is_official: !editingConsulado.is_official})} className={`w-full p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between group ${editingConsulado.is_official ? 'bg-[#001d4a] border-[#FCB131] shadow-md' : 'bg-gray-50 border-gray-200 hover:border-blue-200'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg transition-colors ${editingConsulado.is_official ? 'bg-[#FCB131] text-[#001d4a]' : 'bg-white text-gray-400 shadow-sm'}`}><ShieldCheck size={16} /></div>
                                    <div><span className={`block text-[9px] font-black uppercase tracking-widest ${editingConsulado.is_official ? 'text-white' : 'text-gray-500'}`}>Estatus de Oficialidad</span><span className={`block text-[8px] font-bold ${editingConsulado.is_official ? 'text-[#FCB131]' : 'text-gray-400'}`}>{editingConsulado.is_official ? 'Reconocido Oficialmente' : 'En formación / No Oficial'}</span></div>
                                </div>
                                <div className="relative"><Star size={20} className={`transition-all duration-500 ${editingConsulado.is_official ? 'text-[#FCB131] fill-[#FCB131] scale-110 rotate-[360deg] drop-shadow-md' : 'text-gray-300'}`} /></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nombre del Consulado</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={editingConsulado.name} onChange={e => setEditingConsulado({...editingConsulado, name: e.target.value})} placeholder="Ej: Consulado Madrid" /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">País</label><div className="relative"><select className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94] appearance-none" value={editingConsulado.country} onChange={e => handleLocationChange('country', e.target.value)}><option value="">Seleccionar País...</option>{COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}</select><Globe size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" /></div></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Ciudad</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={editingConsulado.city} onChange={e => handleLocationChange('city', e.target.value)} /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">Zona Horaria <span className="text-[#003B94] opacity-50">(Auto)</span></label><div className="relative"><select className="w-full bg-blue-50/50 border border-blue-100 rounded-lg py-2 px-3 font-bold text-xs text-[#003B94] outline-none focus:border-[#003B94] appearance-none" value={editingConsulado.timezone} onChange={e => setEditingConsulado({...editingConsulado, timezone: e.target.value})}><option value="">Seleccionar Zona...</option>{TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}</select><Clock size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#003B94] pointer-events-none" /></div></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Email Contacto</label><input type="email" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={editingConsulado.email || ''} onChange={e => setEditingConsulado({...editingConsulado, email: e.target.value})} /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Teléfono</label><input type="tel" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={editingConsulado.phone || ''} onChange={e => setEditingConsulado({...editingConsulado, phone: e.target.value})} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Logo (Redondo)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">{editingConsulado.logo ? <img src={editingConsulado.logo} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-400" />}</div>
                                        <div className="flex gap-2">
                                            <label className="bg-white border border-gray-200 text-[#001d4a] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-50 flex items-center gap-1">
                                                <Upload size={10} /> Subir
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
                                            </label>
                                            {editingConsulado.logo && (
                                                <button onClick={() => handleRemoveImage('logo')} className="bg-red-50 border border-red-100 text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar Logo"><Trash2 size={12} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Banner (Horizontal)</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-16 h-10 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center shrink-0">{editingConsulado.banner ? <img src={editingConsulado.banner} className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-gray-400" />}</div>
                                        <div className="flex gap-2">
                                            <label className="bg-white border border-gray-200 text-[#001d4a] px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-50 flex items-center gap-1">
                                                <Upload size={10} /> Subir
                                                <input type="file" className="hidden" onChange={e => handleFileUpload(e, 'banner')} />
                                            </label>
                                            {editingConsulado.banner && (
                                                <button onClick={() => handleRemoveImage('banner')} className="bg-red-50 border border-red-100 text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar Banner"><Trash2 size={12} /></button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'SOCIAL' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Instagram size={10}/> Instagram</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.social_instagram || ''} onChange={e => setEditingConsulado({...editingConsulado, social_instagram: e.target.value})} placeholder="@usuario" /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Facebook size={10}/> Facebook</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.social_facebook || ''} onChange={e => setEditingConsulado({...editingConsulado, social_facebook: e.target.value})} placeholder="facebook.com/..." /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Twitter size={10}/> Twitter / X</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.social_x || ''} onChange={e => setEditingConsulado({...editingConsulado, social_x: e.target.value})} placeholder="@usuario" /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Youtube size={10}/> YouTube</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.social_youtube || ''} onChange={e => setEditingConsulado({...editingConsulado, social_youtube: e.target.value})} placeholder="youtube.com/..." /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Video size={10}/> TikTok</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.social_tiktok || ''} onChange={e => setEditingConsulado({...editingConsulado, social_tiktok: e.target.value})} placeholder="@usuario" /></div>
                                <div className="space-y-1"><label className="text-[8px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><LinkIcon size={10}/> Sitio Web</label><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 font-bold text-xs outline-none focus:border-[#003B94]" value={editingConsulado.website || ''} onChange={e => setEditingConsulado({...editingConsulado, website: e.target.value})} placeholder="www.consulado.com" /></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'LOCATION' && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Dirección Completa</label>
                                <div className="relative"><input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 pl-8 pr-3 font-bold text-xs text-[#001d4a] outline-none focus:border-[#003B94]" value={editingConsulado.address || ''} onChange={e => setEditingConsulado({...editingConsulado, address: e.target.value})} placeholder="Calle, Número, Barrio..." /><MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /></div>
                            </div>
                            <div className="h-64 w-full rounded-xl overflow-hidden border border-[#003B94]/10 bg-gray-100 relative shadow-lg">
                                <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-gray-200 z-10 shadow-md">
                                    <span className="text-[8px] font-black uppercase text-[#001d4a] flex items-center gap-1.5">
                                        <Globe size={10} className="text-[#003B94]" /> 
                                        <span className="text-[#003B94]">Live Preview</span>
                                    </span>
                                </div>
                                {mapUrl ? (
                                    <iframe 
                                        key={`${editingConsulado.address}-${editingConsulado.city}-${editingConsulado.country}`}
                                        width="100%" 
                                        height="100%" 
                                        style={{ border: 0 }} 
                                        loading="lazy" 
                                        allowFullScreen 
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={mapUrl}
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                                        <div className="text-center">
                                            <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ingrese una dirección para ver el mapa</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'BOARD' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="bg-[#001d4a] p-4 rounded-xl shadow-lg border border-[#003B94]">
                                <h3 className="text-[#FCB131] text-[9px] font-black uppercase tracking-widest mb-3 border-b border-white/10 pb-1 flex items-center gap-2"><Star size={10} fill="currentColor"/> Alta Dirección</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomSelect label="Presidente" value={editingConsulado.president || ''} onChange={(val) => setEditingConsulado({...editingConsulado, president: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable placeholder="Asignar..." className="text-white" />
                                    <CustomSelect label="Referente" value={editingConsulado.referente || ''} onChange={(val) => setEditingConsulado({...editingConsulado, referente: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable placeholder="Asignar..." className="text-white" />
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h3 className="text-[#001d4a] text-[9px] font-black uppercase tracking-widest mb-3 border-b border-gray-200 pb-1">Comisión Directiva</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <CustomSelect label="Vicepresidente" value={editingConsulado.vice_president || ''} onChange={(val) => setEditingConsulado({...editingConsulado, vice_president: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable />
                                    <CustomSelect label="Secretario" value={editingConsulado.secretary || ''} onChange={(val) => setEditingConsulado({...editingConsulado, secretary: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable />
                                    <CustomSelect label="Tesorero" value={editingConsulado.treasurer || ''} onChange={(val) => setEditingConsulado({...editingConsulado, treasurer: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable />
                                    <CustomSelect label="Vocal" value={editingConsulado.vocal || ''} onChange={(val) => setEditingConsulado({...editingConsulado, vocal: val})} options={[{value: '', label: 'Vacante'}, ...boardCandidates]} searchable />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-[#FCB131] border-t border-[#e5a02d] flex justify-end gap-3 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 relative">
                    <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest text-[#001d4a] bg-white border border-white/50 hover:bg-white/90 transition-colors">Cancelar</button>
                    <button onClick={handleSave} className="bg-[#003B94] text-white px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest shadow-xl flex items-center gap-2 hover:bg-[#001d4a] transition-all"><Save size={14} /> Guardar</button>
                </div>
            </div>
        </div>
      )}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-[#001d4a]/60 backdrop-blur-sm animate-in fade-in duration-300" >
            <div className="relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95">
                <div className="w-20 h-20 bg-[#FCB131]/10 text-[#FCB131] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner"><CheckCircle2 size={40} /></div>
                <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter">¿Guardar Cambios?</h2>
                <p className="text-[#003B94]/70 font-bold mb-10 text-[10px] leading-relaxed uppercase tracking-widest">Se actualizará la información del consulado en el sistema.</p>
                <div className="flex gap-4">
                    <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button onClick={executeSave} className="flex-1 py-4 rounded-xl bg-[#003B94] text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:opacity-90 transition-all">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Modal - CENTERED & FIXED */}
      {deletingConsulado && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 pointer-events-none" >
              <div 
                style={{ transform: `translate(${position2.x}px, ${position2.y}px)`, transition: isDragging2 ? 'none' : 'transform 0.2s' }}
                className="pointer-events-auto relative w-full max-w-md bg-white rounded-[2rem] p-10 shadow-[0_50px_150px_rgba(0,29,74,0.3)] text-center border border-white animate-in zoom-in-95 overflow-hidden"
              >
                  <div onMouseDown={handleDragStart2} className="absolute inset-0 h-12 cursor-move z-10"></div>
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100 relative z-0"><AlertTriangle size={40} /></div>
                  <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-4 tracking-tighter relative z-0">Eliminar Consulado</h2>
                  <p className="text-[#003B94]/70 font-bold mb-6 text-[10px] leading-relaxed uppercase tracking-widest relative z-0">Esta acción es irreversible. Para confirmar, escriba el nombre exacto: <br/><span className="text-red-500 font-black select-all">{deletingConsulado.name}</span></p>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 mb-6 font-bold text-xs text-[#001d4a] text-center outline-none focus:border-red-500 transition-all placeholder:text-gray-300 uppercase relative z-0" placeholder="ESCRIBA EL NOMBRE AQUÍ" value={deleteConfirmationText} onChange={(e) => setDeleteConfirmationText(e.target.value)} />
                  <div className="flex gap-4 relative z-0">
                      <button onClick={() => setDeletingConsulado(null)} className="flex-1 py-4 rounded-xl bg-slate-100 text-slate-500 uppercase text-[9px] font-black tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                      <button onClick={confirmDelete} disabled={deleteConfirmationText !== deletingConsulado.name} className="flex-1 py-4 rounded-xl bg-red-500 text-white uppercase text-[9px] font-black tracking-widest shadow-2xl hover:bg-red-600 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed">Eliminar</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};


import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Ticket, Clock, CheckCircle2, XCircle, Calendar, MapPin, X, UserCheck, UserX, Filter, Timer, Archive, Home, Plane, FileText } from 'lucide-react';
import { Match, Solicitud, Socio, Team } from '../types';
import { dataService } from '../services/dataService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProcessedMatch extends Match {
  status: 'OPEN' | 'SCHEDULED' | 'CLOSED';
  activeRequests: number;
}

const parseDate = (d: string, h: string) => {
  if (!d) return new Date(0);
  let day, month, year;
  
  if (d.includes('/')) {
      [day, month, year] = d.split('/').map(Number);
  } else if (d.includes('-')) {
      [year, month, day] = d.split('-').map(Number);
  } else {
      return new Date(0);
  }

  const [hours, minutes] = (h || '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours || 0, minutes || 0);
};

const formatDateDisplay = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return '--/--/----';
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        // Format jj-mm-aaaa
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        // Format jj-mm-aaaa
        return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    }
    return dateStr;
};

const formatHourDisplay = (hourStr: string) => {
    if (!hourStr) return '--:-- hs';
    // Si l'heure contient déjà "hs", on la nettoie
    const cleaned = hourStr.replace(/\s*hs\s*/i, '').trim();
    
    // Si l'heure est au format HH:mm:ss, on supprime les secondes
    if (cleaned.match(/^\d{1,2}:\d{2}:\d{2}$/)) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    // Si l'heure est au format HH:mm, on l'utilise directement
    if (cleaned.match(/^\d{1,2}:\d{2}$/)) {
        const [h, m] = cleaned.split(':');
        return `${h.padStart(2, '0')}:${m.padStart(2, '0')} hs`;
    }
    
    // Sinon, on retourne tel quel avec "hs"
    return `${cleaned} hs`;
};

export const Habilitaciones = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [allSocios, setAllSocios] = useState<Socio[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [now, setNow] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [requests, setRequests] = useState<Solicitud[]>([]);

  useEffect(() => {
    const load = () => {
        setMatches(dataService.getMatches());
        setAllSocios(dataService.getSocios());
        setTeams(dataService.getTeams());
    };
    load();
    const unsub = dataService.subscribe(load);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { unsub(); clearInterval(clock); };
  }, []);

  const processedMatches = useMemo<ProcessedMatch[]>(() => {
    return matches
      .filter(m => !m.is_suspended && m.apertura_date && m.cierre_date)
      .filter(m => m.is_home || m.is_neutral)
      .map(m => {
          const ap = parseDate(m.apertura_date, m.apertura_hour);
          const ci = parseDate(m.cierre_date, m.cierre_hour);
          
          let status: 'OPEN' | 'SCHEDULED' | 'CLOSED' = 'CLOSED';
          if (now >= ap && now <= ci) status = 'OPEN';
          else if (now < ap) status = 'SCHEDULED';
          
          // Convertir l'ID en number si c'est une chaîne
          const matchId = typeof m.id === 'string' ? parseInt(m.id, 10) : m.id;
          return { ...m, status, activeRequests: dataService.getSolicitudes(matchId).length };
      })
      .sort((a, b) => {
          // Tri systématique par date (plus ancien en premier)
          const dateA = parseDate(a.date, a.hour).getTime();
          const dateB = parseDate(b.date, b.hour).getTime();
          if (dateA !== dateB) return dateA - dateB;
          // Si même date, trier par statut (OPEN > SCHEDULED > CLOSED)
          const priority = { 'OPEN': 0, 'SCHEDULED': 1, 'CLOSED': 2 };
          return priority[a.status] - priority[b.status];
      });
  }, [matches, now]);

  const handleOpenMatch = (match: ProcessedMatch) => {
    // Convertir l'ID en number si c'est une chaîne
    const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
    setRequests(dataService.getSolicitudes(matchId));
    setSelectedMatch(match);
  };

  const handleStatusChange = async (reqId: string, status: any) => {
    await dataService.updateSolicitudStatus(reqId, status);
    // Recharger les requests pour avoir les données à jour
    if (selectedMatch) {
      const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
      setRequests(dataService.getSolicitudes(matchId));
    } else {
      setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status } : r));
    }
  };
  
  // Vérifier si toutes les sollicitations ont été traitées (pas de PENDING)
  const allRequestsProcessed = useMemo(() => {
    if (!selectedMatch || requests.length === 0) return false;
    return requests.every(req => req.status === 'APPROVED' || req.status === 'REJECTED');
  }, [selectedMatch, requests]);
  
  // Fonction helper pour générer le PDF avec des données spécifiques (utilisée depuis la carte)
  const generatePDFForMatch = async (match: ProcessedMatch, approvedRequests: Solicitud[]) => {
    if (approvedRequests.length === 0) {
      alert('No hay solicitudes aprobadas para generar el PDF');
      return;
    }
    await generatePDFWithData(match, approvedRequests);
  };
  
  // Générer le PDF de la liste définitive (utilisée depuis le modal)
  const generatePDF = async () => {
    if (!selectedMatch) return;
    
    const approvedRequests = requests.filter(req => req.status === 'APPROVED');
    if (approvedRequests.length === 0) {
      alert('No hay solicitudes aprobadas para generar el PDF');
      return;
    }
    await generatePDFWithData(selectedMatch, approvedRequests);
  };
  
  // Fonction principale de génération de PDF
  const generatePDFWithData = async (match: ProcessedMatch | Match, approvedRequests: Solicitud[]) => {
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;
      let hasLogo = false;
      
      // Récupérer le logo depuis les settings
      const settings = dataService.getAppSettings();
      const logoUrl = settings.logoUrl || settings.loginLogoUrl;
      
      // Ajouter le logo si disponible (image base64)
      if (logoUrl && logoUrl.length > 50 && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http'))) {
        try {
          const logo = await loadImage(logoUrl);
          const logoWidth = 40;
          const logoHeight = (logo.height * logoWidth) / logo.width;
          doc.addImage(logo, 'PNG', pageWidth / 2 - logoWidth / 2, yPos, logoWidth, logoHeight);
          yPos += logoHeight + 10;
          hasLogo = true;
        } catch (error) {
          console.warn('Error loading logo:', error);
          // Continuer sans logo
        }
      }
      
      if (!hasLogo) {
        yPos += 10;
      }
      
      // Titre
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LISTA DEFINITIVA DE HABILITACIONES', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;
      
      // Informations du match
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Partido: vs ${match.rival || 'N/A'}`, margin, yPos);
      yPos += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Competencia: ${match.competition || 'N/A'}`, margin, yPos);
      yPos += 6;
      doc.text(`Fecha: ${formatDateDisplay(match.date || '')} - ${formatHourDisplay(match.hour || '')}`, margin, yPos);
      yPos += 6;
      if (match.venue) {
        doc.text(`Sede: ${match.venue}`, margin, yPos);
        yPos += 6;
      }
      if (match.stadium) {
        doc.text(`Estadio: ${match.stadium}`, margin, yPos);
        yPos += 6;
      }
      yPos += 5;
      
      // Ligne de séparation
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;
      
      // Table des socios acceptés
      const tableData = approvedRequests.map(req => {
        // Trouver le socio pour obtenir le numéro de socio et les noms séparés
        const socio = allSocios.find(s => s.id === req.socio_id);
        const numeroSocio = socio?.numero_socio || socio?.dni || req.socio_dni || 'N/A';
        
        // Utiliser last_name et first_name si disponibles, sinon parser socio_name
        let apellido = '';
        let nombre = '';
        if (socio && socio.last_name && socio.first_name) {
          apellido = socio.last_name.toUpperCase();
          nombre = socio.first_name.charAt(0).toUpperCase() + socio.first_name.slice(1).toLowerCase();
        } else {
          // Parser depuis socio_name (format peut être "LAST_NAME FIRST_NAME" ou "FIRST_NAME LAST_NAME")
          // On essaie d'identifier le format en vérifiant si le premier mot est en majuscules
          const nameParts = req.socio_name.trim().split(/\s+/);
          if (nameParts.length >= 2) {
            // Si le premier mot est tout en majuscules ou plus long, c'est probablement le nom de famille
            if (nameParts[0] === nameParts[0].toUpperCase() || nameParts[0].length > nameParts[1].length) {
              apellido = nameParts[0].toUpperCase();
              nombre = nameParts.slice(1).join(' ').charAt(0).toUpperCase() + nameParts.slice(1).join(' ').slice(1).toLowerCase();
            } else {
              // Sinon, le dernier mot est probablement le nom de famille
              apellido = nameParts[nameParts.length - 1].toUpperCase();
              nombre = nameParts.slice(0, -1).join(' ').charAt(0).toUpperCase() + nameParts.slice(0, -1).join(' ').slice(1).toLowerCase();
            }
          } else {
            apellido = req.socio_name.toUpperCase();
            nombre = '';
          }
        }
        
        return [
          apellido,
          nombre,
          numeroSocio,
          req.consulado || 'N/A'
        ];
      });
      
      // Trier par consulado puis par nom
      tableData.sort((a, b) => {
        const consuladoCompare = (a[3] as string).localeCompare(b[3] as string);
        if (consuladoCompare !== 0) return consuladoCompare;
        return (a[0] as string).localeCompare(b[0] as string);
      });
      
      autoTable(doc, {
        startY: yPos,
        head: [['Apellido', 'Nombre', 'N° Socio', 'Consulado']],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [0, 59, 148], // #003B94
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        margin: { left: margin, right: margin },
      });
      
      // Footer avec date de génération
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(128, 128, 128);
      const pdfDateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      doc.text(
        `Documento generado el ${pdfDateStr} a las ${timeStr}`,
        pageWidth / 2,
        Math.min(finalY + 15, pageHeight - 15),
        { align: 'center' }
      );
      
      // Sauvegarder le PDF
      const rivalName = (match.rival || 'Match').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const matchDateStr = formatDateDisplay(match.date || '');
      // Convertir le format jj-mm-aaaa en jj_mm_aaaa pour le nom de fichier
      const dateFileName = matchDateStr.replace(/-/g, '_');
      const fileName = `Lista_Definitiva_${rivalName}_${dateFileName}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };
  
  // Fonction helper pour charger une image depuis une URL ou base64
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      img.onload = () => resolve(img);
      img.onerror = (err) => {
        console.error('Error loading image:', err);
        reject(err);
      };
      img.src = url;
    });
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case 'OPEN': return (
              <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1 rounded text-[9px] font-black uppercase animate-pulse flex items-center gap-1 shadow-lg">
                  <Ticket size={12} strokeWidth={3} /> ABIERTO
              </span>
          );
          case 'SCHEDULED': return (
              <span className="bg-blue-100 text-[#003B94] px-3 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-blue-200">
                  <Timer size={12} strokeWidth={3} /> PROGRAMADO
              </span>
          );
          case 'CLOSED': return (
              <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-gray-200">
                  <Archive size={12} strokeWidth={3} /> CERRADO
              </span>
          );
          default: return null;
      }
  };

  const getContainerStyle = (status: string, isHome: boolean) => {
      // SCHEDULED : toujours blanc avec texte bleu, indépendamment de isHome
      if (status === 'SCHEDULED') return 'bg-white border-blue-100 opacity-90 shadow-sm text-[#003B94]';
      
      // Matchs locaux (sauf SCHEDULED) : fond bleu foncé avec style glassmorphing
      if (isHome) {
          return 'liquid-glass-dark text-white border-white/10 shadow-[0_10px_30px_rgba(0,59,148,0.3)]';
      }
      
      // Matchs visiteurs/neutres : style basé sur le statut
      // OPEN : bleu foncé
      if (status === 'OPEN') return 'bg-gradient-to-br from-[#001d4a] to-[#003B94] text-white border-[#FCB131]/30 shadow-[0_10px_30px_rgba(0,59,148,0.3)]';
      // CLOSED : jaune
      return 'bg-[#FCB131] border-[#FFD23F] text-[#001d4a] shadow-lg';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 animate-boca-entrance pb-20">
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5 relative z-10">
            <div className="bg-white/10 p-4 rounded-lg shadow-lg">
              <Ticket size={28} className="text-[#FCB131]" />
            </div>
            <div>
              <h1 className="oswald text-3xl font-black text-white uppercase tracking-tight">Gestión de Habilitaciones</h1>
              <p className="text-[#FCB131] text-[10px] font-black uppercase tracking-[0.4em] mt-1">Control de Acceso al Estadio</p>
            </div>
          </div>
          <div className="bg-white/10 px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center gap-2">
            <Clock size={14} className="text-[#FCB131]" />
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedMatches.map(match => {
                const isDark = match.status === 'OPEN' || (match.is_home && match.status !== 'SCHEDULED');
                const isYellow = match.status === 'CLOSED' && !match.is_home;
                const isScheduled = match.status === 'SCHEDULED';
                const isOpen = match.status === 'OPEN';
                
                // Trouver les équipes pour les logos
                const localTeam = teams.find(t => 
                    t.name?.toLowerCase().includes('boca') || 
                    t.name?.toLowerCase().includes('junior')
                );
                const rivalTeam = teams.find(t => 
                    t.name?.toLowerCase() === match.rival?.toLowerCase() ||
                    t.short_name?.toLowerCase() === match.rival?.toLowerCase() ||
                    t.name?.toLowerCase().includes(match.rival?.toLowerCase() || '')
                );
                
                return (
                <GlassCard key={match.id} className={`p-3 border flex flex-col relative overflow-hidden ${getContainerStyle(match.status, match.is_home)}`}>
                    
                    <div className={`absolute top-0 right-0 p-1.5 rounded-bl-xl ${isDark ? 'bg-white/10' : isYellow ? 'bg-[#001d4a]/10' : isScheduled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {match.is_home ? <Home size={10} className={isDark ? 'text-[#FCB131]' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'} /> : <Plane size={10} className={isDark ? 'text-[#FCB131]' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'} />}
                    </div>

                    <div className="flex justify-between items-start mb-2 pr-7">
                        {getStatusBadge(match.status)}
                    </div>
                    
                    {/* Logos des équipes */}
                    <div className="flex items-center justify-center gap-2.5 mb-2">
                        {localTeam?.logo ? (
                            <img 
                                src={localTeam.logo} 
                                alt={localTeam.name || 'Local'} 
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                <Home size={16} className={isDark ? 'text-white/50' : 'text-[#003B94]/50'} />
                            </div>
                        )}
                        <span className={`text-[10px] font-black ${isDark ? 'text-white/60' : isYellow ? 'text-[#001d4a]/60' : isScheduled ? 'text-[#003B94]/60' : 'text-gray-400'}`}>VS</span>
                        {rivalTeam?.logo ? (
                            <img 
                                src={rivalTeam.logo} 
                                alt={rivalTeam.name || match.rival || 'Rival'} 
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                <Plane size={16} className={isDark ? 'text-white/50' : 'text-[#003B94]/50'} />
                            </div>
                        )}
                    </div>
                    
                    <div className="mb-2">
                        <p className={`text-[8px] font-bold uppercase mb-0.5 ${isDark ? 'text-white/60' : isYellow ? 'text-[#001d4a]/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>{match.competition}</p>
                        <h3 className={`oswald text-lg font-black uppercase leading-tight ${isDark ? 'text-white' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#001d4a]'}`}>vs {match.rival}</h3>
                        <div className={`flex items-center gap-2 mt-0.5 text-[9px] font-bold ${isDark ? 'text-white/80' : isYellow ? 'text-[#001d4a]/80' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'}`}>
                            <Calendar size={9} /> {formatDateDisplay(match.date)} {formatHourDisplay(match.hour)}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5 mb-2">
                        <div className={`text-center p-1 rounded-lg border flex flex-col items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : isYellow ? 'bg-[#FFD23F]/30 border-[#001d4a]/20' : isScheduled ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`text-[6px] font-black uppercase block mb-0.5 ${isDark ? 'text-white/60' : isYellow ? 'text-[#001d4a]/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>Apertura</span>
                            <div className="flex flex-col items-center leading-tight">
                                <span className={`text-[9px] font-black ${isDark ? 'text-[#FCB131]' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'}`}>{formatDateDisplay(match.apertura_date)}</span>
                                <span className={`text-[7px] font-bold ${isDark ? 'text-white/80' : isYellow ? 'text-[#001d4a]/80' : isScheduled ? 'text-[#003B94]/80' : 'text-[#001d4a]/70'}`}>{formatHourDisplay(match.apertura_hour)}</span>
                            </div>
                        </div>
                        <div className={`text-center p-1 rounded-lg border flex flex-col items-center justify-center ${isDark ? 'bg-black/20 border-white/10' : isYellow ? 'bg-[#FFD23F]/30 border-[#001d4a]/20' : isScheduled ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                            <span className={`text-[6px] font-black uppercase block mb-0.5 ${isDark ? 'text-white/60' : isYellow ? 'text-[#001d4a]/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>Cierre</span>
                            <div className="flex flex-col items-center leading-tight">
                                <span className={`text-[9px] font-black ${isDark ? 'text-white' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#001d4a]'}`}>{formatDateDisplay(match.cierre_date)}</span>
                                <span className={`text-[7px] font-bold ${isDark ? 'text-white/60' : isYellow ? 'text-[#001d4a]/70' : isScheduled ? 'text-[#003B94]/80' : 'text-[#001d4a]/60'}`}>{formatHourDisplay(match.cierre_hour)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="flex items-center justify-between mb-1.5 px-1">
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${isDark ? 'text-white/50' : isYellow ? 'text-[#001d4a]/70' : isScheduled ? 'text-[#003B94]/70' : 'text-gray-400'}`}>Solicitudes</span>
                            <span className={`text-sm font-black oswald ${isDark ? 'text-white' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#001d4a]'}`}>{match.activeRequests}</span>
                        </div>
                        <div className="flex gap-1.5">
                            {match.status === 'OPEN' && (
                                <button 
                                    onClick={() => handleOpenMatch(match)} 
                                    className="flex-1 py-1.5 rounded-xl font-black uppercase text-[9px] shadow-lg transition-all flex items-center justify-center gap-1.5 bg-[#FCB131] text-[#001d4a] hover:bg-white"
                                >
                                    Gestionar en Vivo
                                </button>
                            )}
                            {(() => {
                                const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
                                const allRequests = dataService.getSolicitudes(matchId);
                                const allProcessed = allRequests.length > 0 && allRequests.every(req => req.status === 'APPROVED' || req.status === 'REJECTED');
                                const hasApproved = allRequests.some(req => req.status === 'APPROVED');
                                
                                if (!allProcessed || !hasApproved) return null;
                                
                                const approvedRequests = allRequests.filter(req => req.status === 'APPROVED');
                                
                                return (
                                    <button
                                        onClick={() => generatePDFForMatch(match, approvedRequests)}
                                        className={`${match.status === 'OPEN' ? 'px-2.5' : 'flex-1'} py-1.5 rounded-xl font-black uppercase text-[9px] shadow-lg transition-all flex items-center justify-center gap-1.5 bg-emerald-500 text-white hover:bg-emerald-600`}
                                        title="Descargar lista definitiva en PDF"
                                    >
                                        <FileText size={10} /> {match.status === 'OPEN' ? 'Imprimir' : 'Imprimir Lista'}
                                    </button>
                                );
                            })()}
                        </div>
                    </div>
                </GlassCard>
            )})}
            
            {processedMatches.length === 0 && (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                    <Ticket size={48} className="mx-auto mb-4 text-gray-200" />
                    <p className="oswald text-xl font-black text-gray-300 uppercase tracking-widest">No hay habilitaciones activas</p>
                    <p className="text-gray-400 text-xs mt-2">Los partidos de visitante no requieren habilitación.</p>
                </div>
            )}
        </div>

        {selectedMatch && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" >
                <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/60 max-h-[80vh] animate-in zoom-in-95 duration-200">
                    <div className="liquid-glass-dark p-5 text-white flex justify-between items-center shrink-0">
                        <div>
                            <h2 className="oswald text-xl font-black uppercase">Solicitudes: vs {selectedMatch.rival}</h2>
                            <p className="text-[10px] font-bold text-[#FCB131] uppercase tracking-widest">
                                {selectedMatch.status === 'OPEN' ? 'Ventana Abierta' : 'Ventana Cerrada/Programada'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {allRequestsProcessed && (
                                <button
                                    onClick={generatePDF}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
                                    title="Descargar lista definitiva en PDF"
                                >
                                    <FileText size={14} /> Imprimir Lista Definitiva
                                </button>
                            )}
                            <X onClick={() => setSelectedMatch(null)} className="cursor-pointer opacity-60 hover:opacity-100 p-2 hover:bg-white/10 rounded-full transition-all" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 custom-scrollbar">
                        {requests.length > 0 ? (
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b">
                                        <tr>
                                            <th className="p-4">Socio</th>
                                            <th className="p-4">Consulado</th>
                                            <th className="p-4">Estado</th>
                                            <th className="p-4 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {requests.map(req => (
                                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4">
                                                    <p className="font-black text-[#001d4a] uppercase text-xs">{req.socio_name}</p>
                                                    <p className="text-[9px] text-gray-400 font-mono">DNI: {req.socio_dni}</p>
                                                </td>
                                                <td className="p-4 text-[10px] font-bold text-[#003B94] uppercase">{req.consulado}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest ${
                                                        req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                                                        req.status === 'REJECTED' ? 'bg-red-100 text-red-600' :
                                                        'bg-amber-100 text-amber-600'
                                                    }`}>
                                                        {req.status === 'APPROVED' ? 'Aprobada' : req.status === 'REJECTED' ? 'Rechazada' : 'Pendiente'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => handleStatusChange(req.id, 'APPROVED')} className={`p-2 rounded-lg transition-all ${req.status === 'APPROVED' ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'}`} title="Aprobar"><UserCheck size={14}/></button>
                                                        <button onClick={() => handleStatusChange(req.id, 'REJECTED')} className={`p-2 rounded-lg transition-all ${req.status === 'REJECTED' ? 'bg-red-500 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'}`} title="Rechazar"><UserX size={14}/></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <UserCheck size={48} className="mb-3 opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest">No hay solicitudes registradas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Habilitaciones;


import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../components/GlassCard';
import { Ticket, CheckCircle2, XCircle, Calendar, MapPin, X, UserCheck, UserX, Filter, Timer, Archive, Home, Plane, FileText } from 'lucide-react';
import { Match, Solicitud, Socio, Team } from '../types';
import { dataService } from '../services/dataService';
import { BocaLogoSVG } from '../constants';
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
  const [settings, setSettings] = useState(dataService.getAppSettings());
  const [now, setNow] = useState(new Date());
  const [selectedMatch, setSelectedMatch] = useState<ProcessedMatch | null>(null);
  const [requests, setRequests] = useState<Solicitud[]>([]);

  useEffect(() => {
    const load = () => {
        setMatches(dataService.getMatches());
        setAllSocios(dataService.getSocios());
        setTeams(dataService.getTeams());
        setSettings(dataService.getAppSettings());
    };
    load();
    const unsub = dataService.subscribe(load);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => { unsub(); clearInterval(clock); };
  }, []);

  const processedMatches = useMemo<ProcessedMatch[]>(() => {
    // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans SolicitudesDeHabilitaciones)
    const hashUUID = (uuid: string): number => {
      let hash = 0;
      for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir en 32-bit integer
      }
      return Math.abs(hash) % 2147483647; // Max safe integer
    };
    
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
          
          // Pour les matches avec UUID, utiliser le hash pour trouver les solicitudes
          const matchAny = m as any;
          const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
          const isMatchUUID = typeof matchId === 'number' && matchId === 0 && hasOriginalId;
          
          let solicitudesMatchId: number;
          if (isMatchUUID && typeof matchAny._originalId === 'string') {
            // Utiliser le même hash que lors de la création des solicitudes
            solicitudesMatchId = hashUUID(matchAny._originalId);
            // Pour compatibilité, aussi chercher avec 0 (anciennes solicitudes)
            const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId);
            const reqsWithZero = dataService.getSolicitudes(0);
            const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
            const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
            // Filtrer pour ce match spécifique (hash OU 0) et exclure CANCELLATION_REQUESTED
            const activeReqs = uniqueReqs.filter(r => 
              (r.match_id === solicitudesMatchId || (isMatchUUID && r.match_id === 0)) &&
              r.status !== 'CANCELLATION_REQUESTED'
            );
            return { ...m, status, activeRequests: activeReqs.length };
          } else {
            // Pour les matches normaux, chercher normalement
            const allReqs = dataService.getSolicitudes(matchId);
            const activeReqs = Array.isArray(allReqs) ? allReqs.filter(r => r.status !== 'CANCELLATION_REQUESTED') : [];
            return { ...m, status, activeRequests: activeReqs.length };
          }
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
    // Fonction helper pour créer un hash unique d'un UUID string en nombre (même fonction que dans processedMatches)
    const hashUUID = (uuid: string): number => {
      let hash = 0;
      for (let i = 0; i < uuid.length; i++) {
        const char = uuid.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convertir en 32-bit integer
      }
      return Math.abs(hash) % 2147483647; // Max safe integer
    };
    
    // Convertir l'ID en number si c'est une chaîne
    const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
    
    // Pour les matches avec UUID, utiliser le hash pour trouver les solicitudes
    const matchAny = match as any;
    const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
    const isMatchUUID = typeof matchId === 'number' && matchId === 0 && hasOriginalId;
    
    let allRequests: Solicitud[] = [];
    if (isMatchUUID && typeof matchAny._originalId === 'string') {
      // Utiliser le même hash que lors de la création des solicitudes
      const solicitudesMatchId = hashUUID(matchAny._originalId);
      console.log('🔑 Admin - Match avec UUID détecté, hash utilisé:', solicitudesMatchId, 'depuis UUID:', matchAny._originalId);
      
      // Chercher avec le hash (nouvelles solicitudes créées avec le hash)
      const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId);
      console.log('📋 Solicitudes trouvées avec hash:', Array.isArray(reqsWithHash) ? reqsWithHash.length : 0);
      
      // Pour compatibilité, aussi chercher avec 0 (anciennes solicitudes créées avant le hash)
      // ATTENTION: Cela inclura TOUTES les solicitudes avec match_id=0 de TOUS les matches avec UUID
      // C'est un problème temporaire qui sera résolu quand toutes les solicitudes utiliseront le hash
      const reqsWithZero = dataService.getSolicitudes(0);
      console.log('📋 Solicitudes trouvées avec match_id=0 (anciennes):', Array.isArray(reqsWithZero) ? reqsWithZero.length : 0);
      
      // Combiner et dédupliquer
      const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
      const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
      
      // Filtrer pour ce match spécifique
      // Pour les nouvelles solicitudes, utiliser le hash
      // Pour les anciennes avec match_id=0, on ne peut pas les distinguer, donc on les inclut toutes
      // (C'est un problème temporaire - les nouvelles solicitudes utiliseront le hash)
      allRequests = uniqueReqs.filter(r => {
        // Accepter les solicitudes avec le hash de CE match
        if (r.match_id === solicitudesMatchId) return true;
        // Accepter aussi les anciennes avec match_id=0 (limitation temporaire)
        // TODO: Migrer les anciennes solicitudes pour utiliser le hash
        if (isMatchUUID && r.match_id === 0) return true;
        return false;
      });
      console.log('✅ Solicitudes filtrées pour ce match:', allRequests.length);
    } else {
      // Pour les matches normaux (sans UUID), chercher normalement
      // INCLURE toutes les solicitudes de tous les consulados pour ce match
      const reqs = dataService.getSolicitudes(matchId);
      allRequests = Array.isArray(reqs) ? reqs : [];
      console.log('📋 Match normal - Solicitudes trouvées:', allRequests.length, 'pour matchId:', matchId);
    }
    
    // Pour les admins, afficher TOUTES les solicitudes du match (tous consulados confondus)
    // Exclure seulement CANCELLATION_REQUESTED car les admins doivent voir les solicitudes actives
    const activeRequests = allRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED');
    console.log('✅ Solicitudes actives (hors CANCELLATION_REQUESTED) pour les admins:', activeRequests.length);
    setRequests(activeRequests);
    setSelectedMatch(match);
  };

  const handleStatusChange = async (reqId: string, status: any) => {
    await dataService.updateSolicitudStatus(reqId, status);
    // Recharger les requests pour avoir les données à jour
    if (selectedMatch) {
      // Fonction helper pour créer un hash unique d'un UUID string en nombre
      const hashUUID = (uuid: string): number => {
        let hash = 0;
        for (let i = 0; i < uuid.length; i++) {
          const char = uuid.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convertir en 32-bit integer
        }
        return Math.abs(hash) % 2147483647; // Max safe integer
      };
      
      const matchId = typeof selectedMatch.id === 'string' ? parseInt(selectedMatch.id, 10) : selectedMatch.id;
      
      // Pour les matches avec UUID, utiliser le hash pour trouver les solicitudes
      const matchAny = selectedMatch as any;
      const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
      const isMatchUUID = typeof matchId === 'number' && matchId === 0 && hasOriginalId;
      
      let allRequests: Solicitud[] = [];
      if (isMatchUUID && typeof matchAny._originalId === 'string') {
        // Utiliser le même hash que lors de la création des solicitudes
        const solicitudesMatchId = hashUUID(matchAny._originalId);
        // Pour compatibilité, aussi chercher avec 0 (anciennes solicitudes)
        const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId);
        const reqsWithZero = dataService.getSolicitudes(0);
        const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
        const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
        // Filtrer pour ce match spécifique (hash OU 0 pour compatibilité)
        allRequests = uniqueReqs.filter(r => {
          return r.match_id === solicitudesMatchId || (isMatchUUID && r.match_id === 0);
        });
      } else {
        // Pour les matches normaux, chercher normalement
        const reqs = dataService.getSolicitudes(matchId);
        allRequests = Array.isArray(reqs) ? reqs : [];
      }
      
      // Exclure CANCELLATION_REQUESTED pour que les admins voient seulement les solicitudes actives
      const activeRequests = allRequests.filter(r => r.status !== 'CANCELLATION_REQUESTED');
      setRequests(activeRequests);
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
    console.log('📄 Début de la génération du PDF pour le match:', match);
    console.log('📋 Nombre de solicitudes approuvées:', approvedRequests.length);
    
    // Vérifications préalables
    if (!match) {
      console.error('❌ Erreur: match est null ou undefined');
      alert('Error: No hay match seleccionado para generar el PDF');
      return;
    }
    
    if (!approvedRequests || approvedRequests.length === 0) {
      console.warn('⚠️ Aucune solicitude approuvée pour ce match');
      alert('No hay solicitudes aprobadas para generar el PDF');
      return;
    }
    
    try {
      // Créer un document PDF au format A4
      console.log('📑 Création du document PDF...');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      console.log('✅ Document PDF créé');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPos = margin;
      
      // === HEADER COMPLET : TOUT DANS LE HEADER ===
      // Récupérer le logo officiel depuis les settings
      const settings = dataService.getAppSettings();
      const logoUrl = settings.logoUrl || settings.loginLogoUrl;
      
      // Trouver les équipes pour les logos
      const localTeam = teams.find(t => 
        t.name?.toLowerCase().includes('boca') || 
        t.name?.toLowerCase().includes('junior')
      );
      const rivalTeam = teams.find(t => 
        (match.rival_id && t.id === match.rival_id) ||
        t.name?.toLowerCase() === match.rival?.toLowerCase() ||
        t.short_name?.toLowerCase() === match.rival?.toLowerCase() ||
        (match.rival && t.name?.toLowerCase().includes(match.rival?.toLowerCase() || ''))
      );
      
      const bocaLogo = settings.matchLogoUrl || null;
      const rivalLogo = rivalTeam?.logo;
      
      // Header compact mais avec texte plus grand (hauteur ajustée pour éviter les superpositions)
      // Calcul: logo(5-12mm) + titre(6mm) + compétition(4.5mm) + date(5mm) + logos(16mm) + noms(3mm) + marge(4mm) = ~54mm minimum
      // On prend 66mm pour être sûr d'avoir assez d'espace sans superposition
      const headerHeight = 66; // Ajusté à 66mm pour éviter les superpositions tout en restant compact
      
      // Fond bleu foncé pour l'en-tête complet
      doc.setFillColor(0, 29, 74); // #001d4a
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      
      let currentY = 5; // Position verticale initiale
      
      // Logo officiel à gauche (en haut du header) - plus petit pour économiser l'espace
      let logoWidth = 0;
      let logoHeight = 0;
      if (logoUrl && logoUrl.length > 50 && (logoUrl.startsWith('data:image') || logoUrl.startsWith('http'))) {
        try {
          console.log('🖼️ Chargement du logo officiel...');
          const logo = await Promise.race([
            loadImage(logoUrl),
            new Promise<HTMLImageElement>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout logo officiel après 5s')), 5000)
            )
          ]).catch(() => null);
          if (logo && logo.width && logo.height && logo.width > 0 && logo.height > 0) {
            logoWidth = 16; // Réduit à 16mm pour économiser l'espace
            logoHeight = (logo.height * logoWidth) / logo.width;
            // Limiter la hauteur du logo pour éviter qu'il prenne trop d'espace
            if (logoHeight > 12) {
              logoHeight = 12;
              logoWidth = (logo.width * logoHeight) / logo.height;
            }
            doc.addImage(logo, 'PNG', margin + 2, currentY, logoWidth, logoHeight);
            console.log('✅ Logo officiel chargé avec succès');
          } else {
            console.warn('⚠️ Logo officiel invalide (dimensions manquantes ou nulles)');
          }
        } catch (error) {
          console.warn('⚠️ Erreur lors du chargement du logo officiel (non bloquant):', error);
          // Continuer sans le logo - ce n'est pas critique pour la génération du PDF
        }
      } else {
        console.log('ℹ️ Pas de logo officiel disponible');
      }
      
      // Titre "LISTA DEFINITIVA DE HABILITACIONES" au centre (première ligne) - TEXTE PLUS GRAND
      doc.setTextColor(255, 255, 255); // Blanc
      doc.setFontSize(14); // Augmenté de 11 à 14
      doc.setFont('helvetica', 'bold');
      // Position Y ajustée : tenir compte du logo si présent, sinon utiliser la position de base
      // Pour un texte de taille 14, il faut environ 5mm d'espace vertical
      const titleY = Math.max(currentY + Math.max(logoHeight, 8), currentY + 6);
      doc.text('LISTA DEFINITIVA DE HABILITACIONES', pageWidth / 2, titleY, { align: 'center' });
      // Après le titre, ajouter l'espace nécessaire pour la taille de police 14 (environ 5mm)
      currentY = titleY + 5.5;
      
      // Competition et Fecha en dessous du titre (centré, jaune) - TEXTE PLUS GRAND
      doc.setFontSize(10); // Augmenté de 8 à 10
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(252, 177, 49); // Jaune #FCB131
      let compText = match.competition || 'N/A';
      if (match.fecha_jornada) {
        compText += ` - ${match.fecha_jornada}`;
      }
      // Pour un texte de taille 10, il faut environ 4mm d'espace vertical
      doc.text(compText.toUpperCase(), pageWidth / 2, currentY, { align: 'center', maxWidth: pageWidth - 2 * margin });
      currentY += 4.5; // Espacement après la compétition (taille 10 = ~4mm)
      
      // Date, Heure et Stade en dessous de la compétition (blanc, TEXTE PLUS GRAND)
      doc.setFontSize(11); // Augmenté de 9 à 11
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255); // Blanc
      let dateLine = `Fecha: ${formatDateDisplay(match.date || '')} - Hora: ${formatHourDisplay(match.hour || '')}`;
      if (match.stadium) {
        dateLine += ` - Estadio: ${match.stadium}`;
      } else if (match.venue) {
        dateLine += ` - Sede: ${match.venue}`;
      }
      // Pour un texte de taille 11, il faut environ 4.5mm d'espace vertical
      doc.text(dateLine, pageWidth / 2, currentY, { align: 'center' });
      currentY += 5; // Espacement après la date/heure/stade
      
      // Logos des équipes dans le header (sous les infos de date/stade) - taille réduite mais proportionnelle
      const logoSize = 16; // Réduit à 16mm pour s'adapter au header compact et éviter les superpositions
      const logosY = currentY;
      
      // Logo Boca Juniors à gauche (centré dans une zone)
      const leftLogoCenterX = pageWidth / 4; // 1/4 de la largeur
      if (bocaLogo) {
        try {
          console.log('🖼️ Chargement du logo Boca Juniors...');
          const logo = await loadImage(bocaLogo);
          if (logo && logo.width && logo.height && logo.width > 0 && logo.height > 0) {
            const logoRatio = logo.width / logo.height;
            const finalLogoHeight = logoSize;
            const finalLogoWidth = finalLogoHeight * logoRatio;
            const leftLogoX = leftLogoCenterX - (finalLogoWidth / 2);
            doc.addImage(logo, 'PNG', leftLogoX, logosY, finalLogoWidth, finalLogoHeight);
            console.log('✅ Logo Boca Juniors chargé avec succès');
          } else {
            console.warn('⚠️ Logo Boca Juniors invalide (dimensions manquantes ou nulles)');
          }
        } catch (error) {
          console.warn('⚠️ Erreur lors du chargement du logo Boca Juniors:', error);
          // Continuer sans le logo
        }
      } else {
        console.log('ℹ️ Pas de logo Boca Juniors disponible');
      }
      
      // Texte "VS" au centre (jaune, visible sur fond bleu foncé) - PLUS GRAND
      doc.setFontSize(11); // Augmenté de 9 à 11
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(252, 177, 49); // Jaune #FCB131 pour "VS"
      // Position VS au centre vertical des logos
      doc.text('VS', pageWidth / 2, logosY + (logoSize / 2), { align: 'center' });
      
      // Logo équipe adverse à droite (centré dans une zone)
      const rightLogoCenterX = (pageWidth * 3) / 4; // 3/4 de la largeur
      if (rivalLogo) {
        try {
          console.log('🖼️ Chargement du logo équipe adverse...');
          const logo = await loadImage(rivalLogo);
          if (logo && logo.width && logo.height && logo.width > 0 && logo.height > 0) {
            const logoRatio = logo.width / logo.height;
            const finalLogoHeight = logoSize;
            const finalLogoWidth = finalLogoHeight * logoRatio;
            const rightLogoX = rightLogoCenterX - (finalLogoWidth / 2);
            doc.addImage(logo, 'PNG', rightLogoX, logosY, finalLogoWidth, finalLogoHeight);
            console.log('✅ Logo équipe adverse chargé avec succès');
          } else {
            console.warn('⚠️ Logo équipe adverse invalide (dimensions manquantes ou nulles)');
          }
        } catch (error) {
          console.warn('⚠️ Erreur lors du chargement du logo équipe adverse:', error);
          // Continuer sans le logo
        }
      } else {
        console.log('ℹ️ Pas de logo équipe adverse disponible');
      }
      
      // Calculer la position Y après les logos (logoSize = 16mm)
      const afterLogosY = logosY + logoSize;
      
      // Noms des équipes sous les logos (centrés, blanc, TAILLE AUGMENTÉE)
      // Vérifier que les noms s'affichent avant la ligne jaune (qui est à headerHeight - 2)
      const namesY = afterLogosY + 2; // Position ajustée (police 7 = ~3mm de hauteur)
      
      // S'assurer que les noms ne dépassent pas le header (laisser au moins 4mm avant la ligne jaune)
      // Vérifier que les noms s'affichent correctement sans chevaucher la ligne jaune
      if (namesY + 3 <= headerHeight - 4) {
        doc.setFontSize(7); // Augmenté de 6 à 7
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); // Blanc
        doc.text('Boca Juniors', leftLogoCenterX, namesY, { align: 'center' });
        const rivalName = match.rival || rivalTeam?.name || rivalTeam?.short_name || 'Adversario';
        doc.text(rivalName, rightLogoCenterX, namesY, { align: 'center' });
      } else {
        // Si pas assez d'espace, ne pas afficher les noms pour éviter la superposition
        console.warn('⚠️ Pas assez d\'espace pour les noms des équipes (namesY:', namesY, 'headerHeight:', headerHeight, '), ils seront omis pour éviter la superposition');
      }
      
      // Ligne de séparation jaune en bas de l'en-tête
      doc.setFillColor(252, 177, 49); // #FCB131
      doc.rect(0, headerHeight - 2, pageWidth, 2, 'F');
      
      yPos = headerHeight + 5; // Espacement compact après le header
      
      // === CORPS DU DOCUMENT : TABLEAU POUR REMPLIR TOUT LE CORPS DE LA PAGE ===
      // Récupérer tous les socios depuis le service (au cas où allSocios n'est pas encore chargé)
      const sociosList = allSocios.length > 0 ? allSocios : dataService.getSocios();
      
      // Préparer les données des socios pour le tableau
      console.log('📋 Préparation des données des socios...');
      console.log('📊 Nombre de socios dans la liste:', sociosList.length);
      
      const sociosData = approvedRequests.map((req, index) => {
        try {
          const socio = sociosList.find(s => s.id === req.socio_id);
          const numeroSocio = socio?.numero_socio || socio?.dni || req.socio_dni || req.socio_id?.toString() || 'N/A';
          
          // Utiliser last_name et first_name si disponibles, sinon parser socio_name
          let apellido = '';
          let nombre = '';
          if (socio && socio.last_name && socio.first_name) {
            apellido = socio.last_name.toUpperCase();
            nombre = socio.first_name.charAt(0).toUpperCase() + socio.first_name.slice(1).toLowerCase();
          } else if (req.socio_name) {
            const nameParts = req.socio_name.trim().split(/\s+/).filter(p => p.trim() !== '');
            if (nameParts.length >= 2) {
              if (nameParts[0] === nameParts[0].toUpperCase() || nameParts[0].length > nameParts[1].length) {
                apellido = nameParts[0].toUpperCase();
                nombre = nameParts.slice(1).join(' ').charAt(0).toUpperCase() + nameParts.slice(1).join(' ').slice(1).toLowerCase();
              } else {
                apellido = nameParts[nameParts.length - 1].toUpperCase();
                nombre = nameParts.slice(0, -1).join(' ').charAt(0).toUpperCase() + nameParts.slice(0, -1).join(' ').slice(1).toLowerCase();
              }
            } else if (nameParts.length === 1) {
              apellido = nameParts[0].toUpperCase();
              nombre = '';
            } else {
              apellido = 'N/A';
              nombre = '';
            }
          } else {
            apellido = 'N/A';
            nombre = '';
          }
          
          return {
            apellido,
            nombre,
            numeroSocio: String(numeroSocio),
            consulado: req.consulado || 'N/A',
            nombreCompleto: `${apellido}, ${nombre}`.trim() || 'N/A'
          };
        } catch (error) {
          console.error(`❌ Erreur lors du traitement de la solicitude ${index}:`, error);
          // Retourner une valeur par défaut en cas d'erreur
          return {
            apellido: 'N/A',
            nombre: '',
            numeroSocio: String(req.socio_id || 'N/A'),
            consulado: req.consulado || 'N/A',
            nombreCompleto: 'N/A'
          };
        }
      });
      
      console.log('✅ Données des socios préparées:', sociosData.length, 'socios');
      
      // Trier par consulado puis par apellido
      sociosData.sort((a, b) => {
        const consuladoCompare = a.consulado.localeCompare(b.consulado);
        if (consuladoCompare !== 0) return consuladoCompare;
        return a.apellido.localeCompare(b.apellido);
      });
      
      // Grouper par consulado et créer les données du tableau
      const sociosByConsulado = sociosData.reduce((acc, socio) => {
        if (!acc[socio.consulado]) {
          acc[socio.consulado] = [];
        }
        acc[socio.consulado].push(socio);
        return acc;
      }, {} as Record<string, typeof sociosData>);
      
      // Créer les lignes du tableau groupées par consulado
      console.log('📋 Création des lignes du tableau groupées par consulado...');
      const tableBody: string[][] = [];
      const consulados = Object.keys(sociosByConsulado).sort();
      console.log('🏛️ Consulados trouvés:', consulados.length, consulados);
      
      if (consulados.length === 0) {
        // Si aucun socio, ajouter une ligne vide pour remplir l'espace
        console.log('⚠️ Aucun consulado trouvé, ajout d\'une ligne vide');
        tableBody.push(['', '', '', '']);
      } else {
        for (const consulado of consulados) {
          const sociosInConsulado = sociosByConsulado[consulado] || [];
          console.log(`📋 Consulado: ${consulado} - ${sociosInConsulado.length} socios`);
          
          // Ajouter une ligne d'en-tête pour le consulado (toutes les cellules remplies pour éviter les problèmes)
          tableBody.push([`CONSULADO: ${consulado}`, consulado, consulado, '']);
          
          // Ajouter les socios du consulado
          for (const socio of sociosInConsulado) {
            const socioRow = [
              String(socio.nombreCompleto || 'N/A'),
              String(socio.numeroSocio || 'N/A'),
              String(consulado || 'N/A'),
              ''
            ];
            tableBody.push(socioRow);
          }
          
          // Ajouter une ligne vide entre les consulados pour la séparation
          tableBody.push(['', '', '', '']);
        }
      }
      
      console.log('✅ Lignes du tableau créées:', tableBody.length, 'lignes');
      
      // Calculer l'espace disponible pour le tableau (entre le header et le footer)
      // Dimensions A4 explicites en mm (210mm x 297mm en portrait)
      const footerHeight = 20; // en mm
      const A4_HEIGHT = 297; // en mm
      const A4_WIDTH = 210; // en mm
      
      // Vérifier que yPos est valide (doit être après le header qui est à 62mm maintenant)
      if (yPos < headerHeight) {
        console.warn('⚠️ yPos est avant le header, correction...');
        yPos = headerHeight + 6;
      }
      
      const startYTable = Math.max(yPos, headerHeight + 6); // S'assurer que c'est après le header compact
      const endYTable = A4_HEIGHT - footerHeight - 5; // Laisse 5mm d'espace avant le footer (272mm)
      const availableHeight = Math.max(endYTable - startYTable, 50); // Minimum 50mm d'espace disponible
      
      console.log('📐 Calcul de l\'espace pour le tableau:', {
        headerHeight,
        yPos,
        startYTable,
        endYTable,
        availableHeight,
        pageHeight,
        A4_HEIGHT
      });
      
      // Si le tableau est vide ou très petit, ajouter des lignes vides pour remplir l'espace
      let finalTableBody = tableBody;
      if (!tableBody || tableBody.length === 0) {
        console.log('⚠️ Le tableau est vide, ajout de lignes vides...');
        // Calculer le nombre de lignes nécessaires pour remplir l'espace disponible
        // Hauteur du header du tableau: ~10mm, hauteur par ligne: ~6mm
        const tableHeaderHeight = 10;
        const rowHeight = 6;
        const availableRowsHeight = availableHeight - tableHeaderHeight;
        const numRowsNeeded = Math.max(Math.floor(availableRowsHeight / rowHeight), 20); // Au moins 20 lignes
        finalTableBody = Array(numRowsNeeded).fill(['', '', '', '']);
        console.log(`📊 Ajout de ${numRowsNeeded} lignes vides pour remplir l'espace`);
      } else if (tableBody.length <= 2 && tableBody.every(row => Array.isArray(row) && row.every(cell => !cell || (typeof cell === 'string' && cell.trim() === '')))) {
        // Si toutes les lignes sont vides, ajouter plus de lignes
        const tableHeaderHeight = 10;
        const rowHeight = 6;
        const availableRowsHeight = availableHeight - tableHeaderHeight;
        const numRowsNeeded = Math.max(Math.floor(availableRowsHeight / rowHeight), 20);
        finalTableBody = Array(numRowsNeeded).fill(['', '', '', '']);
        console.log(`📊 Remplacement des lignes vides par ${numRowsNeeded} lignes`);
      }
      
      console.log('📊 Nombre de lignes dans le tableau final:', finalTableBody.length);
      
      // Créer le tableau avec autoTable (configuration simplifiée pour éviter les erreurs)
      console.log('📊 Création du tableau avec', finalTableBody.length, 'lignes');
      console.log('📐 Dimensions du tableau - startY:', startYTable, 'availableHeight:', availableHeight);
      
      // Vérifier que finalTableBody est valide
      if (!Array.isArray(finalTableBody) || finalTableBody.length === 0) {
        console.error('❌ Erreur: finalTableBody est invalide ou vide');
        console.log('⚠️ Utilisation d\'un tableau par défaut...');
        // Créer un tableau par défaut avec des lignes vides plutôt que de throw une erreur
        finalTableBody = Array(20).fill(['', '', '', '']);
      }
      
      // Vérifier que toutes les lignes ont le bon nombre de colonnes (4)
      const validTableBody = finalTableBody.map((row, index) => {
        if (!Array.isArray(row)) {
          console.warn(`⚠️ Ligne ${index} n'est pas un tableau, correction...`);
          return ['', '', '', ''];
        }
        // S'assurer que la ligne a exactement 4 colonnes
        const correctedRow: string[] = [];
        for (let i = 0; i < 4; i++) {
          correctedRow[i] = row[i] !== undefined && row[i] !== null ? String(row[i]) : '';
        }
        return correctedRow;
      });
      
      console.log('📋 Tableau validé:', validTableBody.length, 'lignes, format:', validTableBody[0]?.length || 0, 'colonnes');
      
      try {
        // Configuration simplifiée d'autoTable (exactement comme dans Socios.tsx qui fonctionne)
        console.log('🔧 Configuration autoTable - startY:', startYTable, 'body rows:', validTableBody.length);
        console.log('📋 Première ligne du tableau:', validTableBody[0]);
        console.log('📋 Dernière ligne du tableau:', validTableBody[validTableBody.length - 1]);
        
        // Configuration minimale d'autoTable (exactement comme dans Socios.tsx qui fonctionne)
        autoTable(doc, {
          startY: startYTable,
          head: [['Apellido y Nombre', 'N° Socio', 'Consulado', 'Observaciones']],
          body: validTableBody,
          theme: 'grid',
          headStyles: { 
            fillColor: [0, 29, 74], 
            textColor: [252, 177, 49], 
            fontStyle: 'bold', 
            halign: 'center' 
          },
          columnStyles: { 
            0: { fontStyle: 'bold' }, 
            1: { halign: 'left' },
            2: { halign: 'left' },
            3: { halign: 'left' }
          },
          styles: { 
            fontSize: 9, 
            cellPadding: 3 
          },
          alternateRowStyles: { 
            fillColor: [248, 250, 252] 
          }
        });
        
        console.log('✅ Tableau créé avec succès');
        const finalTableY = (doc as any).lastAutoTable?.finalY;
        console.log('📐 Position finale du tableau (y):', finalTableY);
      } catch (tableError) {
        console.error('❌ Erreur lors de la création du tableau:', tableError);
        console.error('Détails de l\'erreur:', {
          message: tableError instanceof Error ? tableError.message : 'Unknown error',
          stack: tableError instanceof Error ? tableError.stack : 'No stack',
          finalTableBodyLength: finalTableBody.length,
          validTableBodyLength: validTableBody.length,
          firstRow: validTableBody[0],
          lastRow: validTableBody[validTableBody.length - 1],
          sampleRows: validTableBody.slice(0, 3),
          allRowsValid: validTableBody.every(row => Array.isArray(row) && row.length === 4),
          startYTable,
          availableHeight
        });
        
        // Ne pas throw - essayer de continuer sans le tableau
        console.warn('⚠️ Le tableau a échoué, mais on continue la génération du PDF...');
        
        // Ajouter un message simple à la place du tableau
        doc.setFontSize(10);
        doc.setTextColor(0, 29, 74);
        doc.text('Lista de Socios Habilitados', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        
        // Afficher une liste simple sans tableau
        doc.setFontSize(8);
        doc.setTextColor(0, 29, 74);
        for (const req of approvedRequests.slice(0, 40)) { // Limiter à 40 pour éviter de dépasser la page
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          const socio = sociosList.find(s => s.id === req.socio_id);
          const nombre = socio ? `${socio.last_name || ''}, ${socio.first_name || ''}` : (req.socio_name || 'N/A');
          const numero = socio?.numero_socio || socio?.dni || req.socio_dni || 'N/A';
          doc.text(`${nombre} - N° ${numero}`, margin, yPos);
          yPos += 5;
        }
      }
      
      // Mettre à jour yPos après le tableau
      let finalY: number;
      try {
        finalY = (doc as any).lastAutoTable?.finalY || (pageHeight - footerHeight - 5);
      } catch (error) {
        console.warn('⚠️ Impossible de récupérer la position finale du tableau, utilisation de la position par défaut');
        finalY = pageHeight - footerHeight - 5;
      }
      yPos = finalY + 5; // Petit espace après le tableau
      console.log('📐 Position Y après le tableau:', yPos);
      
      // === INFOS EN BAS DE LA PAGE (BLEU FONCÉ DARK, CENTRÉ) ===
      // Dimensions A4 explicites en mm (210mm x 297mm en portrait)
      const A4_HEIGHT_MM = 297;
      const A4_WIDTH_MM = 210;
      
      // IMPORTANT: Dessiner les infos en bas de TOUTES les pages
      const totalPages = doc.internal.getNumberOfPages();
      
      // Parcourir toutes les pages et ajouter les infos en bas de chacune
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        
        // Récupérer les dimensions réelles de la page depuis jsPDF
        const actualPageHeight = doc.internal.pageSize.getHeight();
        const actualPageWidth = doc.internal.pageSize.getWidth();
        
        // Position Y pour le texte en bas de la page (à 10mm du bas)
        const bottomTextY = actualPageHeight - 10;
        
        // Texte en bleu foncé dark (#001d4a) au centre
        doc.setTextColor(0, 29, 74); // Bleu foncé dark #001d4a
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const pdfDateStr = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        doc.text(
          `Documento oficial generado el ${pdfDateStr} a las ${timeStr} - Sistema Consulados CABJ`,
          actualPageWidth / 2,
          bottomTextY,
          { align: 'center' }
        );
        
        // Nombre total de socios habilitados (sur la dernière page uniquement)
        if (pageNum === totalPages) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(
            `Total de Socios Habilitados: ${approvedRequests.length}`,
            actualPageWidth / 2,
            bottomTextY + 8,
            { align: 'center' }
          );
        }
      }
      
      // Sauvegarder le PDF
      console.log('💾 Sauvegarde du PDF...');
      const pdfRivalName = (match.rival || 'Match').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
      const matchDateStr = formatDateDisplay(match.date || '');
      // Convertir le format jj-mm-aaaa en jj_mm_aaaa pour le nom de fichier
      const dateFileName = matchDateStr.replace(/-/g, '_');
      const fileName = `Lista_Definitiva_${pdfRivalName}_${dateFileName}.pdf`;
      console.log('📄 Nom du fichier PDF:', fileName);
      doc.save(fileName);
      console.log('✅ PDF généré et sauvegardé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du PDF:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Type d\'erreur:', typeof error);
      console.error('Erreur complète:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // Afficher un message d'erreur détaillé
      const errorMessage = error instanceof Error 
        ? `${error.message}${error.stack ? '\n\nStack: ' + error.stack.split('\n').slice(0, 5).join('\n') : ''}` 
        : String(error);
      alert(`Error al generar el PDF:\n\n${errorMessage}\n\nPor favor, verifique la consola para más detalles.`);
    }
  };
  
  // Fonction helper pour charger une image depuis une URL ou base64
  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      // Timeout de 10 secondes pour le chargement des images
      const timeout = setTimeout(() => {
        reject(new Error('Timeout lors du chargement de l\'image'));
      }, 10000);
      
      const img = new Image();
      if (url.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
      
      img.onload = () => {
        clearTimeout(timeout);
        if (img.width > 0 && img.height > 0) {
          resolve(img);
        } else {
          reject(new Error('Image invalide (dimensions nulles)'));
        }
      };
      
      img.onerror = (err) => {
        clearTimeout(timeout);
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
        </div>

        <div className="grid grid-cols-1 gap-4">
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
                <GlassCard key={match.id} className={`p-3 border flex flex-col relative overflow-hidden w-1/2 mx-auto ${getContainerStyle(match.status, match.is_home)}`}>
                    
                    <div className={`absolute top-0 right-0 p-1.5 rounded-bl-xl ${isDark ? 'bg-white/10' : isYellow ? 'bg-[#001d4a]/10' : isScheduled ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        {match.is_home ? <Home size={10} className={isDark ? 'text-[#FCB131]' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'} /> : <Plane size={10} className={isDark ? 'text-[#FCB131]' : isYellow ? 'text-[#001d4a]' : isScheduled ? 'text-[#003B94]' : 'text-[#003B94]'} />}
                    </div>

                    <div className="flex justify-between items-start mb-2 pr-7">
                        {getStatusBadge(match.status)}
                    </div>
                    
                    {/* Logos des équipes */}
                    <div className="flex items-center justify-center gap-2.5 mb-2">
                        {settings.matchLogoUrl ? (
                            <img 
                                src={settings.matchLogoUrl} 
                                alt="Boca Juniors" 
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 flex items-center justify-center">
                                <BocaLogoSVG style={{ width: '48px', height: '48px' }} />
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
                                // Fonction helper pour créer un hash unique d'un UUID string en nombre
                                const hashUUID = (uuid: string): number => {
                                  let hash = 0;
                                  for (let i = 0; i < uuid.length; i++) {
                                    const char = uuid.charCodeAt(i);
                                    hash = ((hash << 5) - hash) + char;
                                    hash = hash & hash; // Convertir en 32-bit integer
                                  }
                                  return Math.abs(hash) % 2147483647; // Max safe integer
                                };
                                
                                const matchId = typeof match.id === 'string' ? parseInt(match.id, 10) : match.id;
                                
                                // Pour les matches avec UUID, utiliser le hash pour trouver les solicitudes
                                const matchAny = match as any;
                                const hasOriginalId = matchAny._originalId !== undefined && matchAny._originalId !== null;
                                const isMatchUUID = typeof matchId === 'number' && matchId === 0 && hasOriginalId;
                                
                                let allRequests: Solicitud[] = [];
                                if (isMatchUUID && typeof matchAny._originalId === 'string') {
                                  // Utiliser le même hash que lors de la création des solicitudes
                                  const solicitudesMatchId = hashUUID(matchAny._originalId);
                                  // Pour compatibilité, aussi chercher avec 0 (anciennes solicitudes)
                                  const reqsWithHash = dataService.getSolicitudes(solicitudesMatchId);
                                  const reqsWithZero = dataService.getSolicitudes(0);
                                  const allReqs = [...(Array.isArray(reqsWithHash) ? reqsWithHash : []), ...(Array.isArray(reqsWithZero) ? reqsWithZero : [])];
                                  const uniqueReqs = Array.from(new Map(allReqs.map(r => [r.id, r])).values());
                                  // Filtrer pour ce match spécifique (hash OU 0) et exclure CANCELLATION_REQUESTED
                                  allRequests = uniqueReqs.filter(r => 
                                    (r.match_id === solicitudesMatchId || r.match_id === 0) &&
                                    r.status !== 'CANCELLATION_REQUESTED'
                                  );
                                } else {
                                  // Pour les matches normaux, chercher normalement
                                  const reqs = dataService.getSolicitudes(matchId);
                                  allRequests = Array.isArray(reqs) ? reqs.filter(r => r.status !== 'CANCELLATION_REQUESTED') : [];
                                }
                                
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
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300" style={{ height: '200px' }}>
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

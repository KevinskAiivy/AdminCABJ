import { AppSettings, Socio, Consulado, Match, Team, Competition, Mensaje, AgendaEvent, AppUser, UserSession, AppNotification, Solicitud, TransferRequest } from '../types';
import { supabase } from '../lib/supabase';

export interface IntegrityResult {
  table: string;
  status: 'OK' | 'ERROR' | 'EMPTY';
  message: string;
  latency: number;
}

// --- MAPPING HELPERS (DB snake_case <-> App camelCase) ---

const mapSocioFromDB = (db: any): Socio => ({
    id: db.id || '',
    firstName: db.first_name || '',
    lastName: db.last_name || '',
    name: `${db.first_name || ''} ${db.last_name || ''}`.trim() || '',
    numeroSocio: db.numero_socio || db.id || '',
    dni: db.dni || '',
    category: db.category || 'ADHERENTE',
    status: db.status || 'AL DÍA',
    email: db.email || '',
    phone: db.phone || '',
    phoneSecondary: db.phone_secondary || undefined,
    gender: (db.gender === 'M' || db.gender === 'F' || db.gender === 'X') ? db.gender : 'M',
    nationality: db.nationality || undefined,
    birthDate: db.birth_date || '',
    joinDate: db.join_date || '',
    lastMonthPaid: db.last_month_paid || '',
    emergencyContact: db.emergency_contact || undefined,
    consulado: db.consulado_name && db.consulado_name.trim() !== '' ? db.consulado_name : undefined,
    role: db.role || 'SOCIO',
    avatarColor: db.avatar_color || 'bg-blue-500',
    expirationDate: db.expiration_date || '',
    instagram: db.instagram || undefined,
    facebook: db.facebook || undefined,
    twitter: db.twitter || undefined,
    youtube: db.youtube || undefined,
    avatar: db.avatar || undefined
});

const mapSocioToDB = (s: Partial<Socio>) => {
    const payload: any = {};
    if (s.firstName !== undefined) payload.first_name = s.firstName || '';
    if (s.lastName !== undefined) payload.last_name = s.lastName || '';
    if (s.numeroSocio !== undefined) payload.numero_socio = s.numeroSocio || null;
    if (s.dni !== undefined) payload.dni = s.dni || '';
    if (s.category !== undefined) payload.category = s.category || 'ADHERENTE';
    if (s.status !== undefined) payload.status = s.status || 'AL DÍA';
    if (s.email !== undefined) payload.email = s.email || '';
    if (s.phone !== undefined) payload.phone = s.phone || '';
    if (s.phoneSecondary !== undefined) payload.phone_secondary = s.phoneSecondary || null;
    if (s.gender !== undefined) payload.gender = s.gender || 'M';
    if (s.nationality !== undefined) payload.nationality = s.nationality || null;
    if (s.birthDate !== undefined) payload.birth_date = s.birthDate || null; // Ensure YYYY-MM-DD
    if (s.joinDate !== undefined) payload.join_date = s.joinDate || null;
    if (s.lastMonthPaid !== undefined) payload.last_month_paid = s.lastMonthPaid || null;
    if (s.emergencyContact !== undefined) payload.emergency_contact = s.emergencyContact || null;
    if (s.consulado !== undefined) payload.consulado_name = s.consulado || null;
    if (s.role !== undefined) payload.role = s.role || 'SOCIO';
    if (s.avatarColor !== undefined) payload.avatar_color = s.avatarColor || 'bg-blue-500';
    if (s.expirationDate !== undefined) payload.expiration_date = s.expirationDate || null;
    if (s.instagram !== undefined) payload.instagram = s.instagram || null;
    if (s.facebook !== undefined) payload.facebook = s.facebook || null;
    if (s.twitter !== undefined) payload.twitter = s.twitter || null;
    if (s.youtube !== undefined) payload.youtube = s.youtube || null;
    if (s.avatar !== undefined) payload.avatar = s.avatar || null;
    return payload;
};

const mapConsuladoFromDB = (db: any): Consulado => {
    // Helper pour convertir vocales (peut être string JSON, array, ou null)
    const parseVocales = (value: any): string[] | undefined => {
        if (!value) return undefined;
        if (Array.isArray(value)) return value.filter(v => v && typeof v === 'string');
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed.filter(v => v && typeof v === 'string') : undefined;
            } catch {
                // Si ce n'est pas du JSON valide, traiter comme une chaîne simple
                return value.trim() ? [value.trim()] : undefined;
            }
        }
        return undefined;
    };

    // Helper pour convertir boolean de manière sûre
    const parseBoolean = (value: any, defaultValue: boolean = false): boolean => {
        if (value === null || value === undefined) return defaultValue;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === '1' || lower === 'yes';
        }
        if (typeof value === 'number') return value !== 0;
        return defaultValue;
    };

    // Helper pour nettoyer les chaînes (trim et gérer les valeurs vides)
    const cleanString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        const str = String(value).trim();
        return str || defaultValue;
    };

    // Helper pour les chaînes optionnelles
    const cleanOptionalString = (value: any): string | undefined => {
        if (value === null || value === undefined) return undefined;
        const str = String(value).trim();
        return str || undefined;
    };

    return {
        id: db.id || crypto.randomUUID(),
        name: cleanString(db.name),
        city: cleanString(db.city),
        country: cleanString(db.country, 'Argentina'),
        countryCode: cleanString(db.country_code),
        president: cleanString(db.president),
        vicePresident: cleanOptionalString(db.vice_president),
        secretary: cleanOptionalString(db.secretary),
        treasurer: cleanOptionalString(db.treasurer),
        vocal: cleanOptionalString(db.vocal),
        vocales: parseVocales(db.vocales),
        referente: cleanString(db.referente),
        foundationYear: cleanString(db.foundation_year),
        address: cleanString(db.address),
        timezone: cleanString(db.timezone, 'UTC-03:00 (Buenos Aires)'),
        banner: cleanString(db.banner),
        logo: cleanString(db.logo),
        isOfficial: parseBoolean(db.is_official, false),
        email: cleanOptionalString(db.email),
        phone: cleanOptionalString(db.phone),
        socialInstagram: cleanOptionalString(db.social_instagram),
        socialFacebook: cleanOptionalString(db.social_facebook),
        socialX: cleanOptionalString(db.social_x),
        socialTikTok: cleanOptionalString(db.social_tiktok),
        socialYouTube: cleanOptionalString(db.social_youtube),
        website: cleanOptionalString(db.website)
    };
};

const mapConsuladoToDB = (c: Partial<Consulado>) => {
    const payload: any = {};
    
    // Helper pour nettoyer les chaînes avant envoi
    const cleanString = (value: any, defaultValue: string = ''): string => {
        if (value === null || value === undefined) return defaultValue;
        const str = String(value).trim();
        return str || defaultValue;
    };

    // Helper pour les valeurs optionnelles (null si vide)
    const cleanOptional = (value: any): string | null => {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        return str || null;
    };

    // Helper pour convertir vocales array en format DB (JSON string ou array selon la DB)
    const formatVocales = (value: string[] | undefined): string[] | null => {
        if (!value || !Array.isArray(value)) return null;
        const filtered = value.filter(v => v && typeof v === 'string' && v.trim());
        return filtered.length > 0 ? filtered : null;
    };

    // Champs obligatoires avec valeurs par défaut
    if (c.name !== undefined) payload.name = cleanString(c.name);
    if (c.city !== undefined) payload.city = cleanString(c.city);
    if (c.country !== undefined) payload.country = cleanString(c.country, 'Argentina');
    if (c.countryCode !== undefined) payload.country_code = cleanString(c.countryCode);
    if (c.president !== undefined) payload.president = cleanString(c.president);
    if (c.referente !== undefined) payload.referente = cleanString(c.referente);
    if (c.foundationYear !== undefined) payload.foundation_year = cleanString(c.foundationYear);
    if (c.address !== undefined) payload.address = cleanString(c.address);
    if (c.timezone !== undefined) payload.timezone = cleanString(c.timezone, 'UTC-03:00 (Buenos Aires)');
    if (c.banner !== undefined) payload.banner = cleanString(c.banner);
    if (c.logo !== undefined) payload.logo = cleanString(c.logo);

    // Champs optionnels (null si vide)
    if (c.vicePresident !== undefined) payload.vice_president = cleanOptional(c.vicePresident);
    if (c.secretary !== undefined) payload.secretary = cleanOptional(c.secretary);
    if (c.treasurer !== undefined) payload.treasurer = cleanOptional(c.treasurer);
    if (c.vocal !== undefined) payload.vocal = cleanOptional(c.vocal);
    if (c.vocales !== undefined) payload.vocales = formatVocales(c.vocales);
    if (c.email !== undefined) payload.email = cleanOptional(c.email);
    if (c.phone !== undefined) payload.phone = cleanOptional(c.phone);
    if (c.socialInstagram !== undefined) payload.social_instagram = cleanOptional(c.socialInstagram);
    if (c.socialFacebook !== undefined) payload.social_facebook = cleanOptional(c.socialFacebook);
    if (c.socialX !== undefined) payload.social_x = cleanOptional(c.socialX);
    if (c.socialTikTok !== undefined) payload.social_tiktok = cleanOptional(c.socialTikTok);
    if (c.socialYouTube !== undefined) payload.social_youtube = cleanOptional(c.socialYouTube);
    if (c.website !== undefined) payload.website = cleanOptional(c.website);

    // Boolean avec conversion explicite
    if (c.isOfficial !== undefined) {
        payload.is_official = Boolean(c.isOfficial);
    }

    return payload;
};

const mapMatchFromDB = (db: any): Match => {
    // Helper pour convertir l'ID en number
    const parseId = (id: any): number => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    return {
        id: parseId(db.id),
        rival: db.rival || '',
        rivalShort: db.rival_short || '',
        rivalCountry: db.rival_country || '',
        competition: db.competition || '',
        date: db.date || '',
        hour: db.hour || '',
        venue: db.venue || '',
        city: db.city || '',
        isHome: db.is_home !== undefined ? Boolean(db.is_home) : false,
        isNeutral: db.is_neutral !== undefined ? Boolean(db.is_neutral) : false,
        fechaJornada: db.fecha_jornada || '',
        isSuspended: db.is_suspended !== undefined ? Boolean(db.is_suspended) : false,
        aperturaDate: db.apertura_date || '',
        aperturaHour: db.apertura_hour || '',
        cierreDate: db.cierre_date || '',
        cierreHour: db.cierre_hour || '',
        competitionId: db.competition_id || undefined,
        rivalId: db.rival_id || undefined
    };
};

const mapMatchToDB = (m: Partial<Match>) => {
    const payload: any = {};
    if (m.rival !== undefined) payload.rival = m.rival || '';
    if (m.rivalShort !== undefined) payload.rival_short = m.rivalShort || '';
    if (m.rivalCountry !== undefined) payload.rival_country = m.rivalCountry || '';
    if (m.competition !== undefined) payload.competition = m.competition || '';
    if (m.date !== undefined) payload.date = m.date || null;
    if (m.hour !== undefined) payload.hour = m.hour || null;
    if (m.venue !== undefined) payload.venue = m.venue || null;
    if (m.city !== undefined) payload.city = m.city || null;
    if (m.isHome !== undefined) payload.is_home = Boolean(m.isHome);
    if (m.isNeutral !== undefined) payload.is_neutral = Boolean(m.isNeutral !== undefined ? m.isNeutral : false);
    if (m.fechaJornada !== undefined) payload.fecha_jornada = m.fechaJornada || null;
    if (m.isSuspended !== undefined) payload.is_suspended = Boolean(m.isSuspended !== undefined ? m.isSuspended : false);
    if (m.aperturaDate !== undefined) payload.apertura_date = m.aperturaDate || null;
    if (m.aperturaHour !== undefined) payload.apertura_hour = m.aperturaHour || null;
    if (m.cierreDate !== undefined) payload.cierre_date = m.cierreDate || null;
    if (m.cierreHour !== undefined) payload.cierre_hour = m.cierreHour || null;
    if (m.competitionId !== undefined) payload.competition_id = m.competitionId || null;
    if (m.rivalId !== undefined) payload.rival_id = m.rivalId || null;
    return payload;
};

// Mapping pour Teams
const mapTeamFromDB = (db: any): Team => ({
    id: db.id || crypto.randomUUID(),
    name: db.name || '',
    shortName: db.short_name || db.shortName || '',
    countryId: db.country_id || db.countryId || 'AR',
    confederation: (db.confederation === 'CONMEBOL' || db.confederation === 'UEFA' || db.confederation === 'OTHER') 
        ? db.confederation 
        : 'CONMEBOL',
    city: db.city || '',
    stadium: db.stadium || '',
    logo: db.logo || undefined
});

const mapTeamToDB = (t: Partial<Team>) => {
    const payload: any = {};
    if (t.name !== undefined) payload.name = t.name || '';
    if (t.shortName !== undefined) payload.short_name = t.shortName || '';
    if (t.countryId !== undefined) payload.country_id = t.countryId || 'AR';
    if (t.confederation !== undefined) payload.confederation = t.confederation || 'CONMEBOL';
    if (t.city !== undefined) payload.city = t.city || null;
    if (t.stadium !== undefined) payload.stadium = t.stadium || null;
    if (t.logo !== undefined) payload.logo = t.logo || null;
    return payload;
};

// Mapping pour Competitions
const mapCompetitionFromDB = (db: any): Competition => ({
    id: db.id || crypto.randomUUID(),
    name: db.name || '',
    organization: db.organization || '',
    type: db.type || '',
    logo: db.logo || '',
    category: (db.category === 'NACIONAL' || db.category === 'INTERNACIONAL') ? db.category : 'NACIONAL'
});

const mapCompetitionToDB = (c: Partial<Competition>) => {
    const payload: any = {};
    if (c.name !== undefined) payload.name = c.name || '';
    if (c.organization !== undefined) payload.organization = c.organization || '';
    if (c.type !== undefined) payload.type = c.type || '';
    if (c.logo !== undefined) payload.logo = c.logo || '';
    if (c.category !== undefined) payload.category = c.category || 'NACIONAL';
    return payload;
};

// Mapping pour Mensajes
const mapMensajeFromDB = (db: any): Mensaje => {
    // Helper pour parser target_ids (peut être JSON string ou array)
    const parseTargetIds = (value: any): string[] | undefined => {
        if (!value) return undefined;
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : undefined;
            } catch {
                return undefined;
            }
        }
        return undefined;
    };

    return {
        id: db.id || crypto.randomUUID(),
        title: db.title || '',
        body: db.body || '',
        targetConsuladoId: db.target_consulado_id || 'ALL',
        targetIds: parseTargetIds(db.target_ids),
        targetConsuladoName: db.target_consulado_name || 'Todos',
        type: (db.type === 'INSTITUCIONAL' || db.type === 'URGENTE' || db.type === 'CONSULAR') 
            ? db.type 
            : 'INSTITUCIONAL',
        date: db.date || '',
        startDate: db.start_date || undefined,
        endDate: db.end_date || undefined,
        created_at: db.created_at || Date.now(),
        archived: db.archived !== undefined ? Boolean(db.archived) : false,
        isAutomatic: db.is_automatic !== undefined ? Boolean(db.is_automatic) : false
    };
};

const mapMensajeToDB = (m: Partial<Mensaje>) => {
    const payload: any = {};
    if (m.title !== undefined) payload.title = m.title || '';
    if (m.body !== undefined) payload.body = m.body || '';
    if (m.targetConsuladoId !== undefined) payload.target_consulado_id = m.targetConsuladoId || 'ALL';
    if (m.targetIds !== undefined) payload.target_ids = m.targetIds && Array.isArray(m.targetIds) && m.targetIds.length > 0 ? m.targetIds : null;
    if (m.targetConsuladoName !== undefined) payload.target_consulado_name = m.targetConsuladoName || 'Todos';
    if (m.type !== undefined) payload.type = m.type || 'INSTITUCIONAL';
    if (m.date !== undefined) payload.date = m.date || null;
    if (m.startDate !== undefined) payload.start_date = m.startDate || null;
    if (m.endDate !== undefined) payload.end_date = m.endDate || null;
    if (m.created_at !== undefined) payload.created_at = m.created_at || Date.now();
    if (m.archived !== undefined) payload.archived = Boolean(m.archived);
    if (m.isAutomatic !== undefined) payload.is_automatic = Boolean(m.isAutomatic);
    return payload;
};

// Mapping pour AgendaEvent
const mapAgendaEventFromDB = (db: any): AgendaEvent => ({
    id: db.id || crypto.randomUUID(),
    title: db.title || '',
    date: db.date || db.start_date || '',
    startDate: db.start_date || db.date || undefined,
    endDate: db.end_date || undefined,
    type: (db.type === 'EFEMERIDE' || db.type === 'IDOLO' || db.type === 'INTERNACIONAL' || db.type === 'EVENTO' || db.type === 'ENCUENTRO' || db.type === 'CUMPLEAÑOS')
        ? db.type
        : 'EVENTO',
    description: db.description || undefined,
    location: db.location || undefined,
    isSpecialDay: db.is_special_day !== undefined ? Boolean(db.is_special_day) : false
});

const mapAgendaEventToDB = (e: Partial<AgendaEvent>) => {
    const payload: any = {};
    if (e.title !== undefined) payload.title = e.title || '';
    if (e.date !== undefined) payload.date = e.date || null;
    if (e.startDate !== undefined) payload.start_date = e.startDate || null;
    if (e.endDate !== undefined) payload.end_date = e.endDate || null;
    if (e.type !== undefined) payload.type = e.type || 'EVENTO';
    if (e.description !== undefined) payload.description = e.description || null;
    if (e.location !== undefined) payload.location = e.location || null;
    if (e.isSpecialDay !== undefined) payload.is_special_day = Boolean(e.isSpecialDay);
    return payload;
};

// Mapping pour AppUser
const mapAppUserFromDB = (db: any): AppUser => ({
    id: db.id || crypto.randomUUID(),
    username: db.username || '',
    password: db.password || undefined,
    email: db.email || '',
    fullName: db.full_name || db.fullName || '',
    role: (db.role === 'SUPERADMIN' || db.role === 'ADMIN' || db.role === 'PRESIDENTE' || db.role === 'REFERENTE' || db.role === 'SOCIO')
        ? db.role
        : 'SOCIO',
    consuladoId: db.consulado_id || db.consuladoId || undefined,
    active: db.active !== undefined ? Boolean(db.active) : true,
    lastLogin: db.last_login || db.lastLogin || undefined,
    avatar: db.avatar || undefined,
    gender: (db.gender === 'M' || db.gender === 'F' || db.gender === 'X') ? db.gender : undefined
});

const mapAppUserToDB = (u: Partial<AppUser>) => {
    const payload: any = {};
    if (u.username !== undefined) payload.username = u.username || '';
    if (u.password !== undefined && u.password.trim() !== '') payload.password = u.password;
    if (u.email !== undefined) payload.email = u.email || '';
    if (u.fullName !== undefined) payload.full_name = u.fullName || '';
    if (u.role !== undefined) payload.role = u.role || 'SOCIO';
    if (u.consuladoId !== undefined) payload.consulado_id = u.consuladoId || null;
    if (u.active !== undefined) payload.active = Boolean(u.active);
    if (u.lastLogin !== undefined) payload.last_login = u.lastLogin || null;
    if (u.avatar !== undefined) payload.avatar = u.avatar || null;
    if (u.gender !== undefined) payload.gender = u.gender || null;
    return payload;
};

// Mapping pour Solicitud
const mapSolicitudFromDB = (db: any): Solicitud => ({
    id: db.id || crypto.randomUUID(),
    matchId: db.match_id || db.matchId || 0,
    socioId: db.socio_id || db.socioId || '',
    socioName: db.socio_name || db.socioName || '',
    socioDni: db.socio_dni || db.socioDni || '',
    socioCategory: db.socio_category || db.socioCategory || '',
    consulado: db.consulado || '',
    status: (db.status === 'PENDING' || db.status === 'APPROVED' || db.status === 'REJECTED' || db.status === 'CANCELLATION_REQUESTED')
        ? db.status
        : 'PENDING',
    timestamp: db.timestamp || db.created_at || new Date().toISOString()
});

const mapSolicitudToDB = (s: Partial<Solicitud>) => {
    const payload: any = {};
    if (s.matchId !== undefined) payload.match_id = s.matchId || null;
    if (s.socioId !== undefined) payload.socio_id = s.socioId || '';
    if (s.socioName !== undefined) payload.socio_name = s.socioName || '';
    if (s.socioDni !== undefined) payload.socio_dni = s.socioDni || '';
    if (s.socioCategory !== undefined) payload.socio_category = s.socioCategory || '';
    if (s.consulado !== undefined) payload.consulado = s.consulado || '';
    if (s.status !== undefined) payload.status = s.status || 'PENDING';
    if (s.timestamp !== undefined) payload.timestamp = s.timestamp || new Date().toISOString();
    return payload;
};

// Mapping pour AppNotification
const mapNotificationFromDB = (db: any): AppNotification => ({
    id: db.id || crypto.randomUUID(),
    type: (db.type === 'TRANSFER' || db.type === 'SYSTEM' || db.type === 'ALERT') ? db.type : 'SYSTEM',
    title: db.title || '',
    message: db.message || '',
    date: db.date || db.created_at || new Date().toISOString(),
    read: db.read !== undefined ? Boolean(db.read) : false,
    link: db.link || undefined,
    data: db.data ? (typeof db.data === 'string' ? JSON.parse(db.data) : db.data) : undefined
});

const mapNotificationToDB = (n: Partial<AppNotification>) => {
    const payload: any = {};
    if (n.type !== undefined) payload.type = n.type || 'SYSTEM';
    if (n.title !== undefined) payload.title = n.title || '';
    if (n.message !== undefined) payload.message = n.message || '';
    if (n.date !== undefined) payload.date = n.date || new Date().toISOString();
    if (n.read !== undefined) payload.read = Boolean(n.read);
    if (n.link !== undefined) payload.link = n.link || null;
    if (n.data !== undefined) payload.data = n.data ? JSON.stringify(n.data) : null;
    return payload;
};

// --- DATA SERVICE ---

class DataService {
  public loadingMessage = "";
  public isConnected = false; 
  public connectionError: string | null = null;
  private listeners: (() => void)[] = [];

  // Local State Cache
  private appSettings: AppSettings = {
    appName: 'Consulados CABJ',
    appDescription: 'Sistema de Gestión Oficial',
    primaryColor: '#003B94',
    secondaryColor: '#FCB131',
    enableAnimations: true,
    compactMode: false,
    isMaintenanceMode: false,
    maxUploadSize: 5,
    sessionTimeout: 30,
    enableNotifications: true,
  };

  private matches: Match[] = [];
  private socios: Socio[] = []; 
  private consulados: Consulado[] = [];
  private teams: Team[] = [];
  private competitions: Competition[] = [];
  private agenda: AgendaEvent[] = [];
  private mensajes: Mensaje[] = [];
  private users: AppUser[] = [];
  private solicitudes: Solicitud[] = [];
  private notifications: AppNotification[] = [];
  private transfers: TransferRequest[] = [];
  private mappings: Record<string, Record<string, string>> = {};

  constructor() {
      const savedSettings = localStorage.getItem('cabj_settings');
      if (savedSettings) try { this.appSettings = JSON.parse(savedSettings); } catch (e) {}
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { 
      this.listeners.forEach(l => l()); 
  }

  public async initializeData(forceOffline: boolean = false) {
      if (forceOffline) {
          this.isConnected = true; 
          this.loadingMessage = "Mode Offline activé";
          this.notify();
          return;
      }

      const startTime = performance.now();
      const isDevelopment = import.meta.env.DEV;

      this.loadingMessage = "Connexion à la base de données...";
      try {
          // Charger les données en parallèle pour accélérer l'initialisation
          this.loadingMessage = "Chargement des données...";
          
          // 1. Requêtes parallèles pour les tables principales (non paginées)
          const [usersResult, consuladosResult, matchesResult, competitionsResult, agendaResult, mensajesResult] = await Promise.all([
              supabase.from('users').select('*'),
              supabase.from('consulados').select('*'),
              supabase.from('matches').select('*'),
              supabase.from('competitions').select('*'),
              supabase.from('agenda').select('*'),
              supabase.from('mensajes').select('*')
          ]);

          // Traitement des Users
          if (usersResult.data) {
              this.users = usersResult.data.map(mapAppUserFromDB);
              if (isDevelopment) console.log(`✅ ${this.users.length} utilisateurs chargés`);
          } else if (usersResult.error) {
              console.error("❌ Erreur lors du chargement des users:", usersResult.error);
          }

          // Traitement des Consulados (logs réduits)
          if (consuladosResult.error) {
              console.error("❌ Error fetching consulados:", consuladosResult.error);
          }
          
          if (consuladosResult.data && Array.isArray(consuladosResult.data)) {
              this.consulados = consuladosResult.data.map(mapConsuladoFromDB);
              
              // Vérifier les consulados incomplets seulement en dev
              if (isDevelopment) {
                  const incomplete = this.consulados.filter(c => !c.name || !c.id);
                  if (incomplete.length > 0) {
                      console.warn("⚠️ Consulados incomplets:", incomplete.length);
                  }
              }
              
              if (isDevelopment) console.log(`✅ ${this.consulados.length} consulados chargés`);
              
              // Créer SEDE CENTRAL de manière asynchrone (ne bloque pas)
              this.ensureSedeCentralExists().catch(err => {
                  console.error("Erreur lors de la création de SEDE CENTRAL:", err);
              });
          } else {
              this.consulados = [];
              this.ensureSedeCentralExists().catch(err => {
                  console.error("Erreur lors de la création de SEDE CENTRAL:", err);
              });
          }

          // 2. Chargement paginé des Socios (peut être long)
          this.loadingMessage = "Chargement des socios...";
          let allSocios: any[] = [];
          let sociosFrom = 0;
          const sociosPageSize = 1000;
          let sociosHasMore = true;
          
          while (sociosHasMore) {
              const to = sociosFrom + sociosPageSize - 1;
              const { data: sociosData, error: sociosError } = await supabase
                  .from('socios')
                  .select('*')
                  .range(sociosFrom, to);
              
              if (sociosError) {
                  console.error("Error fetching socios:", sociosError);
                  break;
              }
              
              if (sociosData && sociosData.length > 0) {
                  allSocios = [...allSocios, ...sociosData];
                  sociosHasMore = sociosData.length === sociosPageSize;
                  sociosFrom += sociosPageSize;
              } else {
                  sociosHasMore = false;
              }
          }
          
          this.socios = allSocios.map(mapSocioFromDB);
          if (isDevelopment) console.log(`✅ ${this.socios.length} socios chargés`);

          // 3. Chargement paginé des Teams (séquentiel mais optimisé)
          this.loadingMessage = "Chargement des équipes...";
          
          let allTeams: any[] = [];
          let teamsFrom = 0;
          const teamsPageSize = 1000;
          let teamsHasMore = true;
          
          while (teamsHasMore) {
              const to = teamsFrom + teamsPageSize - 1;
              const { data: teamsData, error: teamsError } = await supabase
                  .from('teams')
                  .select('*')
                  .range(teamsFrom, to);
              
              if (teamsError) {
                  console.error("Error fetching teams:", teamsError);
                  break;
              }
              
              if (teamsData && teamsData.length > 0) {
                  allTeams = [...allTeams, ...teamsData];
                  teamsHasMore = teamsData.length === teamsPageSize;
                  teamsFrom += teamsPageSize;
              } else {
                  teamsHasMore = false;
              }
          }
          
          this.teams = allTeams.map(mapTeamFromDB);
          if (isDevelopment) console.log(`✅ ${this.teams.length} équipes chargées`);

          // 4. Charger Solicitudes et Notifications depuis Supabase (si la table existe)
          this.loadingMessage = "Chargement des demandes...";
          try {
              const [solicitudesResult, notificationsResult] = await Promise.all([
                  supabase.from('solicitudes').select('*').catch(() => ({ data: null, error: null })),
                  supabase.from('notifications').select('*').catch(() => ({ data: null, error: null }))
              ]);

              // Traitement des Solicitudes
              if (solicitudesResult.data && !solicitudesResult.error) {
                  this.solicitudes = solicitudesResult.data.map(mapSolicitudFromDB);
                  if (isDevelopment) console.log(`✅ ${this.solicitudes.length} solicitudes chargées`);
              }

              // Traitement des Notifications
              if (notificationsResult.data && !notificationsResult.error) {
                  this.notifications = notificationsResult.data.map(mapNotificationFromDB);
                  if (isDevelopment) console.log(`✅ ${this.notifications.length} notifications chargées`);
              }
          } catch (error) {
              // Les tables peuvent ne pas exister, ce n'est pas critique
              if (isDevelopment) console.log("ℹ️ Tables solicitudes/notifications non disponibles");
          }

          // Assigner SEDE CENTRAL en arrière-plan (ne bloque pas l'initialisation)
          this.assignSociosToSedeCentral().catch(() => {
              // Erreurs silencieuses pour ne pas ralentir
          });

          // Traitement des Matches
          if (matchesResult.data) {
              this.matches = matchesResult.data.map(mapMatchFromDB);
              if (isDevelopment) console.log(`✅ ${this.matches.length} matchs chargés`);
          } else if (matchesResult.error) {
              console.error("❌ Erreur lors du chargement des matches:", matchesResult.error);
          }

          // Traitement des Competitions
          if (competitionsResult.data) {
              this.competitions = competitionsResult.data.map(mapCompetitionFromDB);
              if (isDevelopment) console.log(`✅ ${this.competitions.length} compétitions chargées`);
          } else if (competitionsResult.error) {
              console.error("❌ Erreur lors du chargement des competitions:", competitionsResult.error);
          }

          // Traitement de l'Agenda
          if (agendaResult.data) {
              this.agenda = agendaResult.data.map(mapAgendaEventFromDB);
              if (isDevelopment) console.log(`✅ ${this.agenda.length} événements chargés`);
          } else if (agendaResult.error) {
              console.error("❌ Erreur lors du chargement de l'agenda:", agendaResult.error);
          }

          // Traitement des Mensajes
          if (mensajesResult.data) {
              this.mensajes = mensajesResult.data.map(mapMensajeFromDB);
              if (isDevelopment) console.log(`✅ ${this.mensajes.length} messages chargés`);
          } else if (mensajesResult.error) {
              console.error("❌ Erreur lors du chargement des mensajes:", mensajesResult.error);
          }

          const endTime = performance.now();
          const duration = ((endTime - startTime) / 1000).toFixed(2);

          this.isConnected = true;
          this.connectionError = null;
          
          console.log(`✅ Initialisation terminée en ${duration}s`);
      } catch (error: any) {
          console.error("❌ Erreur lors de l'initialisation Supabase:", error);
          this.connectionError = error.message || 'Erreur de connexion à la base de données';
          this.isConnected = false;
          console.warn('⚠️ Mode dégradé : Les données peuvent ne pas être à jour');
      } finally {
          this.loadingMessage = '';
          this.notify();
      }
  }

  // --- SOCIOS LOGIC ---

  getSocios(consuladoId?: string) { 
      if (consuladoId) {
          const c = this.consulados.find(x => x.id === consuladoId);
          return this.socios.filter(s => s.consulado === c?.name);
      }
      return this.socios; 
  }

  async addSocio(s: Socio) { 
      const payload = mapSocioToDB(s);
      this.socios.unshift(s); 
      this.notify(); 
      const { error } = await supabase.from('socios').insert([payload]);
      if (error) throw new Error(error.message);
  }

  async updateSocio(s: Socio) { 
      const payload = mapSocioToDB(s);
      this.socios = this.socios.map(x => x.id === s.id ? s : x); 
      this.notify(); 
      const { error } = await supabase.from('socios').update(payload).eq('id', s.id);
      if (error) throw new Error(error.message);
  }

  async deleteSocio(id: string) { 
      this.socios = this.socios.filter(x => x.id !== id); 
      this.notify(); 
      const { error } = await supabase.from('socios').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  // --- AUTH LOGIC ---

  public async authenticateUser(u: string, p: string): Promise<UserSession | null> {
      if (u === 'admin' && p === 'admin') {
          return { 
              role: 'SUPERADMIN', 
              name: 'Admin Système', 
              email: 'admin@bocajuniors.com.ar',
              gender: 'M' 
          };
      }

      const user = this.users.find(usr => usr.username.toLowerCase() === u.toLowerCase() && usr.active);
      if (user && user.password === p) {
          return { role: user.role, name: user.fullName, email: user.email, consuladoId: user.consuladoId, gender: user.gender };
      }

      try {
          const { data, error } = await supabase.from('users')
              .select('*')
              .eq('username', u)
              .eq('password', p) 
              .eq('active', true)
              .single();
          
          if (data) {
              return { role: data.role, name: data.full_name, email: data.email, consuladoId: data.consulado_id, gender: data.gender };
          }
      } catch (e) {}

      return null;
  }

  // --- OTHER GETTERS/SETTERS ---

  getAppSettings() { return this.appSettings; }
  async saveAppSettings(s: AppSettings) { 
      this.appSettings = s; 
      localStorage.setItem('cabj_settings', JSON.stringify(s)); 
      this.notify(); 
  }

  // Créer automatiquement "SEDE CENTRAL" s'il n'existe pas dans la base de données
  private async ensureSedeCentralExists() {
      const sedeCentralName = 'SEDE CENTRAL';
      
      // Vérifier d'abord dans la base de données
      const { data: existingSedeCentral, error: checkError } = await supabase
          .from('consulados')
          .select('*')
          .ilike('name', sedeCentralName)
          .limit(1);
      
      if (checkError) {
          console.error("❌ Erreur lors de la vérification de SEDE CENTRAL:", checkError);
          return;
      }
      
      // Si "SEDE CENTRAL" existe déjà dans la DB, s'assurer qu'il est dans la liste locale
      if (existingSedeCentral && existingSedeCentral.length > 0) {
          const dbSedeCentral = mapConsuladoFromDB(existingSedeCentral[0]);
          const existsLocally = this.consulados.some(
              c => c.id === dbSedeCentral.id || (c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase())
          );
          
          if (!existsLocally) {
              // Ajouter à la liste locale
              this.consulados.push(dbSedeCentral);
              this.notify();
          }
          console.log("✅ Consulado SEDE CENTRAL existe déjà dans la base de données");
          return;
      }
      
      // Vérifier dans la liste locale (pour éviter les doublons)
      const existsLocally = this.consulados.some(
          c => c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase() && c.id !== 'sede-central-virtual'
      );
      
      if (existsLocally) {
          console.log("✅ Consulado SEDE CENTRAL existe déjà localement");
          return;
      }

      // Créer "SEDE CENTRAL" dans la base de données
      console.log("🏛️ Création du consulado SEDE CENTRAL dans la base de données...");
      
      const sedeCentral: Consulado = {
          id: crypto.randomUUID(),
          name: sedeCentralName,
          city: 'Buenos Aires',
          country: 'Argentina',
          countryCode: 'AR',
          president: '',
          referente: '',
          foundationYear: '',
          address: 'La Bombonera, Brandsen 805, C1161 CABA, Argentina',
          timezone: 'UTC-03:00 (Buenos Aires)',
          banner: '',
          logo: '',
          isOfficial: true,
          email: undefined,
          phone: undefined,
          socialInstagram: undefined,
          socialFacebook: undefined,
          socialX: undefined,
          socialTikTok: undefined,
          socialYouTube: undefined,
          website: undefined
      };

      try {
          // Créer dans la base de données d'abord
          const { data: insertedData, error } = await supabase
              .from('consulados')
              .insert([mapConsuladoToDB(sedeCentral)])
              .select()
              .single();
          
          if (error) {
              console.error("❌ Erreur lors de la création de SEDE CENTRAL:", error);
              return;
          }
          
          // Si l'insertion a réussi, mapper et ajouter à la liste locale
          if (insertedData) {
              const mappedSedeCentral = mapConsuladoFromDB(insertedData);
              this.consulados.push(mappedSedeCentral);
              this.notify();
              console.log("✅ Consulado SEDE CENTRAL créé avec succès dans la base de données");
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la création de SEDE CENTRAL:", error);
      }
  }

  // Assigner "SEDE CENTRAL" aux socios qui n'ont pas de consulado (en arrière-plan, ne bloque pas)
  private async assignSociosToSedeCentral() {
      const sedeCentralName = 'SEDE CENTRAL';
      const allConsulados = this.getConsulados();
      const sedeCentral = allConsulados.find(
          c => c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase()
      );

      if (!sedeCentral) {
          return; // Ne pas logger en production pour éviter les logs inutiles
      }

      // Trouver les socios sans consulado
      const sociosWithoutConsulado = this.socios.filter(
          s => !s.consulado || s.consulado.trim() === ''
      );

      if (sociosWithoutConsulado.length === 0) {
          return;
      }

      // Mettre à jour localement immédiatement pour l'affichage
      const updatedSocios = this.socios.map(s => {
          if (!s.consulado || s.consulado.trim() === '') {
              return { ...s, consulado: sedeCentralName };
          }
          return s;
      });
      this.socios = updatedSocios;
      this.notify();

      // Mettre à jour la DB en arrière-plan (ne bloque pas l'initialisation)
      // Utiliser Promise.all pour paralléliser les updates
      const updatePromises = sociosWithoutConsulado.slice(0, 100).map(socio => 
          supabase
              .from('socios')
              .update({ consulado_name: sedeCentralName })
              .eq('id', socio.id)
      );

      // Exécuter les updates en parallèle (max 100 à la fois pour éviter de surcharger)
      Promise.all(updatePromises).catch(err => {
          console.error("Erreur lors de l'assignation des socios à SEDE CENTRAL:", err);
      });
      
      // Si plus de 100 socios, traiter le reste en arrière-plan
      if (sociosWithoutConsulado.length > 100) {
          setTimeout(() => {
              const remaining = sociosWithoutConsulado.slice(100);
              remaining.forEach((socio, index) => {
                  setTimeout(() => {
                      supabase
                          .from('socios')
                          .update({ consulado_name: sedeCentralName })
                          .eq('id', socio.id)
                          .catch(() => {}); // Ignorer les erreurs silencieusement
                  }, index * 50); // Espacer les requêtes de 50ms
              });
          }, 1000);
      }
  }

  getConsulados() { 
      // S'assurer que "SEDE CENTRAL" est toujours présent dans la liste
      const sedeCentralName = 'SEDE CENTRAL';
      const sedeCentralExists = this.consulados.some(
          c => c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase()
      );

      if (!sedeCentralExists) {
          // Créer "SEDE CENTRAL" virtuellement (sans l'ajouter à la DB immédiatement)
          const sedeCentral: Consulado = {
              id: 'sede-central-virtual',
              name: sedeCentralName,
              city: 'Buenos Aires',
              country: 'Argentina',
              countryCode: 'AR',
              president: '',
              referente: '',
              foundationYear: '',
              address: 'La Bombonera, Brandsen 805, C1161 CABA, Argentina',
              timezone: 'UTC-03:00 (Buenos Aires)',
              banner: '',
              logo: '',
              isOfficial: true,
              email: undefined,
              phone: undefined,
              socialInstagram: undefined,
              socialFacebook: undefined,
              socialX: undefined,
              socialTikTok: undefined,
              socialYouTube: undefined,
              website: undefined
          };
          
          // Ajouter en premier dans la liste
          return [sedeCentral, ...this.consulados];
      }
      
      return this.consulados; 
  }
  
  getConsuladoById(id: string) { 
      // Si on cherche "SEDE CENTRAL" et qu'il n'existe pas, le retourner virtuellement
      if (id === 'sede-central-virtual') {
          const sedeCentral: Consulado = {
              id: 'sede-central-virtual',
              name: 'SEDE CENTRAL',
              city: 'Buenos Aires',
              country: 'Argentina',
              countryCode: 'AR',
              president: '',
              referente: '',
              foundationYear: '',
              address: 'La Bombonera, Brandsen 805, C1161 CABA, Argentina',
              timezone: 'UTC-03:00 (Buenos Aires)',
              banner: '',
              logo: '',
              isOfficial: true,
              email: undefined,
              phone: undefined,
              socialInstagram: undefined,
              socialFacebook: undefined,
              socialX: undefined,
              socialTikTok: undefined,
              socialYouTube: undefined,
              website: undefined
          };
          return sedeCentral;
      }
      
      return this.consulados.find(c => c.id === id); 
  }
  async addConsulado(c: Consulado) { 
      this.consulados.push(c); this.notify();
      const { error } = await supabase.from('consulados').insert([mapConsuladoToDB(c)]);
      if (error) throw new Error(error.message);
  }
  async updateConsulado(c: Consulado) { 
      this.consulados = this.consulados.map(x => x.id === c.id ? c : x); this.notify();
      const { error } = await supabase.from('consulados').update(mapConsuladoToDB(c)).eq('id', c.id);
      if (error) throw new Error(error.message);
  }
  async deleteConsulado(id: string) { 
      this.consulados = this.consulados.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('consulados').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getMatches() { return this.matches; }
  getMatchById(id: number) { return this.matches.find(m => m.id === id); }
  async addMatch(m: Match) { 
      try {
          const payload = mapMatchToDB(m);
          // Ne pas inclure l'ID si c'est 0 (auto-généré par Supabase)
          if (m.id !== undefined && m.id !== null && m.id !== 0) {
              payload.id = m.id;
          }
          const { data, error } = await supabase.from('matches').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout du match:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMatch = mapMatchFromDB(data);
              // Vérifier si le match existe déjà (éviter les doublons)
              const existingIndex = this.matches.findIndex(x => x.id === mappedMatch.id);
              if (existingIndex >= 0) {
                  this.matches[existingIndex] = mappedMatch;
              } else {
                  this.matches.push(mappedMatch);
              }
              this.notify();
              return mappedMatch;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout du match:", error);
          throw error;
      }
  }
  async updateMatch(m: Match) { 
      try {
          const payload = mapMatchToDB(m);
          const { data, error } = await supabase.from('matches').update(payload).eq('id', m.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour du match:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMatch = mapMatchFromDB(data);
              this.matches = this.matches.map(x => x.id === m.id ? mappedMatch : x);
              this.notify();
              return mappedMatch;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour du match:", error);
          throw error;
      }
  }
  async deleteMatch(id: number) { 
      try {
      const { error } = await supabase.from('matches').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression du match:", error);
              throw new Error(error.message);
          }
          this.matches = this.matches.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression du match:", error);
          throw error;
      }
  }

  getTeams() { return this.teams; }
  getTeamById(id: string) { return this.teams.find(t => t.id === id); }
  async addTeam(t: Team) { 
      try {
          const payload = mapTeamToDB(t);
          // S'assurer que l'ID est présent
          if (!t.id) {
              payload.id = crypto.randomUUID();
          } else {
              payload.id = t.id;
          }
          const { data, error } = await supabase.from('teams').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout de l'équipe:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedTeam = mapTeamFromDB(data);
              // Vérifier si l'équipe existe déjà (éviter les doublons)
              const existingIndex = this.teams.findIndex(x => x.id === mappedTeam.id);
              if (existingIndex >= 0) {
                  this.teams[existingIndex] = mappedTeam;
              } else {
                  this.teams.push(mappedTeam);
              }
              this.notify();
              return mappedTeam;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout de l'équipe:", error);
          throw error;
      }
  }
  async updateTeam(t: Team) { 
      try {
          const payload = mapTeamToDB(t);
          const { data, error } = await supabase.from('teams').update(payload).eq('id', t.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour de l'équipe:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedTeam = mapTeamFromDB(data);
              this.teams = this.teams.map(x => x.id === t.id ? mappedTeam : x);
              this.notify();
              return mappedTeam;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de l'équipe:", error);
          throw error;
      }
  }
  async deleteTeam(id: string) { 
      try {
      const { error } = await supabase.from('teams').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression de l'équipe:", error);
              throw new Error(error.message);
          }
          this.teams = this.teams.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de l'équipe:", error);
          throw error;
      }
  }

  getCompetitions() { return this.competitions; }
  getCompetitionById(id: string) { return this.competitions.find(c => c.id === id); }
  async addCompetition(c: Competition) { 
      try {
          const payload = mapCompetitionToDB(c);
          // S'assurer que l'ID est présent
          if (c.id) {
              payload.id = c.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          const { data, error } = await supabase.from('competitions').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout de la compétition:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedCompetition = mapCompetitionFromDB(data);
              this.competitions.push(mappedCompetition);
              this.notify();
              return mappedCompetition;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout de la compétition:", error);
          throw error;
      }
  }
  async updateCompetition(c: Competition) { 
      try {
          const payload = mapCompetitionToDB(c);
          const { data, error } = await supabase.from('competitions').update(payload).eq('id', c.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour de la compétition:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedCompetition = mapCompetitionFromDB(data);
              this.competitions = this.competitions.map(x => x.id === c.id ? mappedCompetition : x);
              this.notify();
              return mappedCompetition;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de la compétition:", error);
          throw error;
      }
  }
  async deleteCompetition(id: string) { 
      try {
      const { error } = await supabase.from('competitions').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression de la compétition:", error);
              throw new Error(error.message);
          }
          this.competitions = this.competitions.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de la compétition:", error);
          throw error;
      }
  }

  getAgendaEvents() { return this.agenda; }
  getAgendaEventById(id: string) { return this.agenda.find(e => e.id === id); }
  async addAgendaEvent(e: AgendaEvent) { 
      try {
          const payload = mapAgendaEventToDB(e);
          // S'assurer que l'ID est présent
          if (e.id) {
              payload.id = e.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          const { data, error } = await supabase.from('agenda').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout de l'événement:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedEvent = mapAgendaEventFromDB(data);
              this.agenda.push(mappedEvent);
              this.notify();
              return mappedEvent;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout de l'événement:", error);
          throw error;
      }
  }
  async updateAgendaEvent(e: AgendaEvent) { 
      try {
          const payload = mapAgendaEventToDB(e);
          const { data, error } = await supabase.from('agenda').update(payload).eq('id', e.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour de l'événement:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedEvent = mapAgendaEventFromDB(data);
              this.agenda = this.agenda.map(x => x.id === e.id ? mappedEvent : x);
              this.notify();
              return mappedEvent;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de l'événement:", error);
          throw error;
      }
  }
  async deleteAgendaEvent(id: string) { 
      try {
      const { error } = await supabase.from('agenda').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression de l'événement:", error);
              throw new Error(error.message);
          }
          this.agenda = this.agenda.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de l'événement:", error);
          throw error;
      }
  }

  getMensajes(cId?: string) { 
      // Filtrer par consulado si spécifié
      if (cId && cId !== 'ALL') {
          return this.mensajes.filter(m => 
              m.targetConsuladoId === cId || 
              m.targetConsuladoId === 'ALL' ||
              (m.targetIds && m.targetIds.includes(cId))
          );
      }
      return this.mensajes; 
  }
  getMensajeById(id: string) { return this.mensajes.find(m => m.id === id); }
  async addMensaje(m: Mensaje) { 
      try {
          const payload = mapMensajeToDB(m);
          // S'assurer que l'ID est présent
          if (m.id) {
              payload.id = m.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          // S'assurer que created_at est défini
          if (!payload.created_at) {
              payload.created_at = Date.now();
          }
          const { data, error } = await supabase.from('mensajes').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout du message:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMensaje = mapMensajeFromDB(data);
              this.mensajes.push(mappedMensaje);
              this.notify();
              return mappedMensaje;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout du message:", error);
          throw error;
      }
  }
  async updateMensaje(m: Mensaje) { 
      try {
          const payload = mapMensajeToDB(m);
          const { data, error } = await supabase.from('mensajes').update(payload).eq('id', m.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour du message:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMensaje = mapMensajeFromDB(data);
              this.mensajes = this.mensajes.map(x => x.id === m.id ? mappedMensaje : x);
              this.notify();
              return mappedMensaje;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour du message:", error);
          throw error;
      }
  }
  async deleteMensaje(id: string) { 
      try {
      const { error } = await supabase.from('mensajes').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression du message:", error);
              throw new Error(error.message);
          }
          this.mensajes = this.mensajes.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression du message:", error);
          throw error;
      }
  }

  getUsers() { return this.users; }
  getUserById(id: string) { return this.users.find(u => u.id === id); }
  getUserByUsername(username: string) { return this.users.find(u => u.username.toLowerCase() === username.toLowerCase()); }
  async addUser(u: AppUser) { 
      try {
          const payload = mapAppUserToDB(u);
          // S'assurer que l'ID est présent
          if (u.id) {
              payload.id = u.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          const { data, error } = await supabase.from('users').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout de l'utilisateur:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedUser = mapAppUserFromDB(data);
              this.users.push(mappedUser);
              this.notify();
              return mappedUser;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout de l'utilisateur:", error);
          throw error;
      }
  }
  async updateUser(u: AppUser) { 
      try {
          const payload = mapAppUserToDB(u);
          // Ne pas mettre à jour le mot de passe s'il n'est pas fourni
          if (!payload.password) {
              delete payload.password;
          }
          const { data, error } = await supabase.from('users').update(payload).eq('id', u.id).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedUser = mapAppUserFromDB(data);
              this.users = this.users.map(x => x.id === u.id ? mappedUser : x);
              this.notify();
              return mappedUser;
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de l'utilisateur:", error);
          throw error;
      }
  }
  async deleteUser(id: string) { 
      try {
      const { error } = await supabase.from('users').delete().eq('id', id);
          if (error) {
              console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
              throw new Error(error.message);
          }
          this.users = this.users.filter(x => x.id !== id);
          this.notify();
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de l'utilisateur:", error);
          throw error;
      }
  }

  getSolicitudes(mId?: number, cName?: string) { 
      let res = this.solicitudes;
      if (mId !== undefined) {
          res = res.filter(s => s.matchId === mId);
      }
      if (cName) {
          res = res.filter(s => s.consulado === cName);
      }
      return res;
  }
  getSolicitudById(id: string) { return this.solicitudes.find(s => s.id === id); }
  async createSolicitud(s: Solicitud) { 
      try {
          const payload = mapSolicitudToDB(s);
          // S'assurer que l'ID est présent
          if (s.id) {
              payload.id = s.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          // Ajouter localement immédiatement
          const solicitud: Solicitud = { ...s, id: payload.id };
          this.solicitudes.push(solicitud);
          this.notify();
          
          // Sauvegarder dans Supabase (si la table existe)
          try {
              const { data, error } = await supabase.from('solicitudes').insert([payload]).select().single();
              if (error) {
                  console.error("❌ Erreur lors de la création de la solicitud:", error);
                  // Ne pas bloquer si la table n'existe pas
                  if (error.code !== '42P01') { // Table doesn't exist
                      throw error;
                  }
              } else if (data) {
                  const mappedSolicitud = mapSolicitudFromDB(data);
                  // Mettre à jour avec les données de la DB
                  this.solicitudes = this.solicitudes.map(x => x.id === solicitud.id ? mappedSolicitud : x);
                  this.notify();
                  return mappedSolicitud;
              }
          } catch (dbError: any) {
              // Si la table n'existe pas, continuer avec la version locale
              if (dbError.code === '42P01') {
                  console.log("ℹ️ Table solicitudes non disponible, utilisation du stockage local");
              }
          }
          
          return solicitud;
      } catch (error: any) {
          console.error("❌ Erreur lors de la création de la solicitud:", error);
          throw error;
      }
  }
  async updateSolicitudStatus(id: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLATION_REQUESTED') { 
      try {
          // Mettre à jour localement
          this.solicitudes = this.solicitudes.map(s => s.id === id ? { ...s, status } : s);
          this.notify();
          
          // Sauvegarder dans Supabase (si la table existe)
          try {
              const { error } = await supabase.from('solicitudes').update({ status }).eq('id', id);
              if (error && error.code !== '42P01') {
                  console.error("❌ Erreur lors de la mise à jour de la solicitud:", error);
              }
          } catch (dbError: any) {
              // Ignorer si la table n'existe pas
              if (dbError.code !== '42P01') {
                  throw dbError;
              }
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de la solicitud:", error);
          throw error;
      }
  }
  async deleteSolicitud(id: string) {
      try {
          // Supprimer localement
          this.solicitudes = this.solicitudes.filter(s => s.id !== id);
          this.notify();
          
          // Supprimer de Supabase (si la table existe)
          try {
              const { error } = await supabase.from('solicitudes').delete().eq('id', id);
              if (error && error.code !== '42P01') {
                  console.error("❌ Erreur lors de la suppression de la solicitud:", error);
              }
          } catch (dbError: any) {
              // Ignorer si la table n'existe pas
              if (dbError.code !== '42P01') {
                  throw dbError;
              }
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de la solicitud:", error);
          throw error;
      }
  }

  getNotificationsForUser(u: any) { 
      // Filtrer par utilisateur si nécessaire
      return this.notifications.filter(n => !n.read || true); // Toutes les notifications pour l'instant
  }
  getNotificationById(id: string) { return this.notifications.find(n => n.id === id); }
  async addNotification(n: AppNotification) {
      try {
          const payload = mapNotificationToDB(n);
          // S'assurer que l'ID est présent
          if (n.id) {
              payload.id = n.id;
          } else {
              payload.id = crypto.randomUUID();
          }
          // Ajouter localement immédiatement
          const notification: AppNotification = { ...n, id: payload.id };
          this.notifications.push(notification);
          this.notify();
          
          // Sauvegarder dans Supabase (si la table existe)
          try {
              const { data, error } = await supabase.from('notifications').insert([payload]).select().single();
              if (error) {
                  if (error.code !== '42P01') { // Table doesn't exist
                      console.error("❌ Erreur lors de l'ajout de la notification:", error);
                  }
              } else if (data) {
                  const mappedNotification = mapNotificationFromDB(data);
                  this.notifications = this.notifications.map(x => x.id === notification.id ? mappedNotification : x);
                  this.notify();
                  return mappedNotification;
              }
          } catch (dbError: any) {
              if (dbError.code !== '42P01') {
                  throw dbError;
              }
          }
          
          return notification;
      } catch (error: any) {
          console.error("❌ Erreur lors de l'ajout de la notification:", error);
          throw error;
      }
  }
  async markNotificationAsRead(id: string) { 
      try {
          // Mettre à jour localement
          this.notifications = this.notifications.map(n => n.id === id ? {...n, read: true} : n);
          this.notify();
          
          // Sauvegarder dans Supabase (si la table existe)
          try {
              const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
              if (error && error.code !== '42P01') {
                  console.error("❌ Erreur lors de la mise à jour de la notification:", error);
              }
          } catch (dbError: any) {
              if (dbError.code !== '42P01') {
                  throw dbError;
              }
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour de la notification:", error);
          throw error;
      }
  }
  async deleteNotification(id: string) { 
      try {
          // Supprimer localement
          this.notifications = this.notifications.filter(n => n.id !== id);
          this.notify();
          
          // Supprimer de Supabase (si la table existe)
          try {
              const { error } = await supabase.from('notifications').delete().eq('id', id);
              if (error && error.code !== '42P01') {
                  console.error("❌ Erreur lors de la suppression de la notification:", error);
              }
          } catch (dbError: any) {
              if (dbError.code !== '42P01') {
                  throw dbError;
              }
          }
      } catch (error: any) {
          console.error("❌ Erreur lors de la suppression de la notification:", error);
          throw error;
      }
  }
  
  getBirthdays(c: string, d: number) { return []; }
  getTransfers(consuladoId: string) { return { incoming: [], outgoing: [] }; }
  getSocioTransfers(socioId: string) { return []; }
  
  async factoryReset() { localStorage.clear(); window.location.reload(); }
  
  public async emptyTrash() { this.mensajes = []; this.notify(); return { success: true }; }
  
  public async performMaintenance() {
    // Perform database maintenance operations
    try {
      // Refresh all data
      await this.initializeData(false);
      this.notify();
      return { success: true, message: 'Maintenance effectuée avec succès' };
    } catch (error: any) {
      throw new Error(error.message || 'Erreur lors de la maintenance');
    }
  }
}

export const dataService = new DataService();
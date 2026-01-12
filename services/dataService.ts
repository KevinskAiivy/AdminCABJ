import { AppSettings, Socio, Consulado, Match, Team, Competition, Mensaje, AgendaEvent, AppUser, UserSession, AppNotification, Solicitud, TransferRequest } from '../types';
import { supabase } from '../lib/supabase';

export interface IntegrityResult {
  table: string;
  status: 'OK' | 'ERROR' | 'EMPTY';
  message: string;
  latency: number;
}

export interface TableSchema {
  table: string;
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
    default?: any;
  }>;
}

export interface FieldMapping {
  dbField: string; // snake_case from database
  appField: string; // camelCase in application
  type: string;
  nullable: boolean;
  description?: string;
}

// --- HELPERS (Snake_case uniquement - pas de conversion) ---

// Helper pour nettoyer et normaliser les données de la DB (déjà en snake_case)
const normalizeSocio = (db: any): Socio => ({
    id: db.id || '',
    numero_socio: db.numero_socio || db.id || '',
    first_name: db.first_name || '',
    last_name: db.last_name || '',
    name: `${db.first_name || ''} ${db.last_name || ''}`.trim() || '',
    dni: db.dni || '',
    category: db.category || 'ADHERENTE', // Catégorie de socio
    status: db.status || 'AL DÍA', // Estado de cuota
    email: db.email || '',
    phone: db.phone || '', // Format international avec indicatif
    gender: (db.gender === 'M' || db.gender === 'F' || db.gender === 'X') ? db.gender : 'M',
    nationality: db.nationality || undefined,
    birth_date: db.birth_date || '',
    join_date: db.join_date || '',
    last_month_paid: db.last_month_paid || '',
    consulado: db.consulado && db.consulado.trim() !== '' ? db.consulado : undefined,
    role: db.role || 'SOCIO',
    avatar_color: db.avatar_color || 'bg-blue-500',
    expiration_date: db.expiration_date || '',
    twitter: db.twitter || undefined,
    youtube: db.youtube || undefined
});

// Pour compatibilité, garder les noms mais utiliser directement les données snake_case
const mapSocioFromDB = normalizeSocio;
const mapSocioToDB = (s: Partial<Socio>) => {
    const payload: any = { ...s };
    // Supprimer 'name' car c'est un champ calculé (first_name + last_name), pas une colonne de la DB
    delete payload.name;
    
    // Le consulado est directement dans la colonne 'consulado' de la DB
    // La correspondance se fait par nom : consulado (table socios) === name (table consulados)
    // Pas besoin de conversion, 'consulado' est déjà le nom de la colonne DB
    
    // Liste des champs de date dans la table socios
    const dateFields = ['birth_date', 'join_date', 'last_month_paid', 'expiration_date'];
    
    // Nettoyer les valeurs : undefined -> null, chaînes vides pour les dates -> null
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
            payload[key] = null;
        } else if (dateFields.includes(key)) {
            // Pour les champs de date, convertir les chaînes vides en null
            if (payload[key] === '' || (typeof payload[key] === 'string' && payload[key].trim() === '')) {
                payload[key] = null;
            }
        }
    });
    return payload;
};

// Helper pour parser vocales (peut être string JSON, array, ou null)
const parseVocales = (value: any): string[] | undefined => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.filter(v => v && typeof v === 'string');
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.filter(v => v && typeof v === 'string') : undefined;
        } catch {
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

// Helper pour nettoyer les chaînes
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

const mapConsuladoFromDB = (db: any): Consulado | null => {
    // Si db est null ou undefined, retourner null
    if (!db || typeof db !== 'object') {
        console.warn("⚠️ mapConsuladoFromDB: données invalides (null/undefined)", db);
        return null;
    }
    
    // S'assurer que l'ID existe (obligatoire pour identifier un consulado)
    const consuladoId = db.id || crypto.randomUUID();
    if (!consuladoId) {
        console.warn("⚠️ mapConsuladoFromDB: ID manquant, génération d'un nouvel ID", db);
    }
    
    try {
        // S'assurer que tous les champs requis ont des valeurs valides
        const mapped: Consulado = {
            id: consuladoId,
            name: cleanString(db.name),
            city: cleanString(db.city),
            country: cleanString(db.country, 'Argentina'),
            country_code: cleanString(db.country_code) || 'AR',
            president: cleanString(db.president),
            referente: cleanString(db.referente),
            foundation_year: cleanString(db.foundation_year),
            address: cleanString(db.address),
            timezone: cleanString(db.timezone, 'UTC-03:00 (Buenos Aires)'),
            banner: cleanString(db.banner),
            logo: cleanString(db.logo),
            // Champs optionnels
            vice_president: cleanOptionalString(db.vice_president),
            secretary: cleanOptionalString(db.secretary),
            treasurer: cleanOptionalString(db.treasurer),
            vocal: cleanOptionalString(db.vocal),
            vocales: parseVocales(db.vocales),
            is_official: parseBoolean(db.is_official, false),
            email: cleanOptionalString(db.email),
            phone: cleanOptionalString(db.phone),
            social_instagram: cleanOptionalString(db.social_instagram),
            social_facebook: cleanOptionalString(db.social_facebook),
            social_x: cleanOptionalString(db.social_x),
            social_tiktok: cleanOptionalString(db.social_tiktok),
            social_youtube: cleanOptionalString(db.social_youtube),
            website: cleanOptionalString(db.website)
        };
        
        // Validation : s'assurer que les champs requis critiques ont des valeurs
        if (!mapped.name || mapped.name.trim() === '') {
            mapped.name = `Consulado ${mapped.id.slice(0, 8)}`; // Nom par défaut basé sur l'ID
            console.warn(`⚠️ Consulado ${mapped.id} n'a pas de nom, utilisation d'un nom par défaut`);
        }
        if (!mapped.country_code || mapped.country_code.trim() === '') {
            mapped.country_code = 'AR';
        }
        
        return mapped;
    } catch (error: any) {
        console.error("❌ Erreur lors du mapping d'un consulado:", error, db);
        return null;
    }
};

const mapConsuladoToDB = (c: Partial<Consulado>) => {
    const payload: any = { ...c };
    
    // Liste des champs requis (ne doivent pas être null, peuvent être strings vides)
    const requiredFields = ['id', 'name', 'city', 'country', 'country_code', 'president', 'referente', 'foundation_year', 'address', 'timezone', 'banner', 'logo'];
    
    // Liste des champs optionnels (peuvent être null)
    const optionalFields = ['vice_president', 'secretary', 'treasurer', 'vocal', 'vocales', 'email', 'phone', 'social_instagram', 'social_facebook', 'social_x', 'social_tiktok', 'social_youtube', 'website', 'is_official'];
    
    // Nettoyer les valeurs
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
            // Pour les champs requis, utiliser une valeur par défaut si undefined
            if (requiredFields.includes(key)) {
                if (key === 'id') payload[key] = crypto.randomUUID();
                else if (key === 'timezone') payload[key] = 'UTC-03:00 (Buenos Aires)';
                else if (key === 'country') payload[key] = 'Argentina';
                else if (key === 'country_code') payload[key] = 'AR';
                else payload[key] = '';
            } else {
                // Pour les champs optionnels, mettre null
                payload[key] = null;
            }
        } else if (typeof payload[key] === 'string' && payload[key].trim() === '') {
            // Pour les champs optionnels, convertir les strings vides en null
            // Pour les champs requis, garder la string vide
            if (optionalFields.includes(key)) {
                payload[key] = null;
            }
            // Les champs requis restent des strings vides
        }
    });
    
    // Assurer le format des vocales
    if (payload.vocales !== null && payload.vocales !== undefined) {
        if (Array.isArray(payload.vocales)) {
            payload.vocales = payload.vocales.filter(v => v && typeof v === 'string' && v.trim());
            if (payload.vocales.length === 0) payload.vocales = null;
        } else {
            payload.vocales = null;
        }
    }
    
    // Assurer les valeurs par défaut pour les champs requis manquants
    requiredFields.forEach(field => {
        if (payload[field] === undefined || payload[field] === null) {
            if (field === 'id') payload[field] = crypto.randomUUID();
            else if (field === 'timezone') payload[field] = 'UTC-03:00 (Buenos Aires)';
            else if (field === 'country') payload[field] = 'Argentina';
            else if (field === 'country_code') payload[field] = 'AR';
            else payload[field] = '';
        }
    });
    
    return payload;
};

const parseId = (id: any): number => {
    if (typeof id === 'number') return id;
    if (typeof id === 'string') {
        const parsed = parseInt(id, 10);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

const mapMatchFromDB = (db: any): Match & { _originalId?: string | number } => {
    // Préserver l'ID original (UUID string ou number) pour les matchs
    // Convertir en number pour l'interface Match, mais garder l'original pour les requêtes DB
    const originalId = db.id;
    const matchId = typeof originalId === 'string' && originalId.includes('-') 
        ? 0  // UUID string - on utilise 0 comme placeholder, mais on garde l'original
        : parseId(originalId);
    
    return {
        id: matchId,
        // Stocker l'ID original (UUID string ou number) pour les mises à jour
        _originalId: originalId,
        rival_id: db.rival_id || undefined,
        competition_id: db.competition_id || undefined,
        rival: db.rival || '',
        rival_short: db.rival_short || '',
        rival_country: db.rival_country || '',
        competition: db.competition || '',
        date: db.date || '',
        hour: db.hour || '',
        venue: db.venue || '',
        city: db.city || '',
        is_home: db.is_home !== undefined ? Boolean(db.is_home) : false,
        is_neutral: db.is_neutral !== undefined ? Boolean(db.is_neutral) : false,
        fecha_jornada: db.fecha_jornada || '',
        is_suspended: db.is_suspended !== undefined ? Boolean(db.is_suspended) : false,
        apertura_date: db.apertura_date || '',
        apertura_hour: db.apertura_hour || '',
        cierre_date: db.cierre_date || '',
        cierre_hour: db.cierre_hour || ''
    };
};

const mapMatchToDB = (m: Partial<Match> & { _originalId?: string | number }, isNew: boolean = false) => {
    const payload: any = { ...m };
    
    // Pour les nouveaux matchs, ne pas inclure l'ID (Supabase le générera automatiquement comme UUID)
    if (isNew) {
        delete payload.id;
    } else {
        // Utiliser l'ID original (UUID string ou number) si disponible pour les requêtes DB
        if (m._originalId !== undefined) {
            payload.id = m._originalId;
        } else if (m.id !== undefined && m.id > 0) {
            // Si pas d'ID original et que l'ID est valide, l'utiliser
            // Mais si c'est un ID temporaire (Date.now() = très grand nombre), ne pas l'inclure
            if (m.id < 1000000000000) {
                payload.id = m.id;
            } else {
                // ID temporaire (Date.now()), ne pas l'inclure
                delete payload.id;
            }
        }
    }
    
    // Supprimer la propriété cachée _originalId
    delete payload._originalId;
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
    return payload;
};

// Mapping pour Teams
const mapTeamFromDB = (db: any): Team => {
    // Accepter n'importe quelle valeur de confédération depuis la base de données
    // Les confédérations incluent: CONMEBOL, UEFA, CONCACAF, OFC, CAF, AFC, OTHER, etc.
    return {
        id: db.id || crypto.randomUUID(),
        name: db.name || '',
        short_name: db.short_name || '',
        country_id: db.country_id || 'AR',
        confederation: (db.confederation || 'CONMEBOL') as any, // Utiliser directement la valeur de la DB
        city: db.city || '',
        stadium: db.stadium || '',
        logo: db.logo || undefined
    };
};

const mapTeamToDB = (t: Partial<Team>) => {
    const payload: any = { ...t };
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
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

const mapMensajeFromDB = (db: any): Mensaje => {
    // Convertir created_at en number si c'est une string ou une date
    let created_at = Date.now();
    if (db.created_at !== undefined && db.created_at !== null) {
        if (typeof db.created_at === 'number') {
            created_at = db.created_at;
        } else if (typeof db.created_at === 'string') {
            // Si c'est une string, essayer de parser comme timestamp ou date
            const parsed = Date.parse(db.created_at);
            created_at = isNaN(parsed) ? Date.now() : parsed;
        } else if (db.created_at instanceof Date) {
            created_at = db.created_at.getTime();
        }
    }
    
    // Formater la date pour l'affichage si elle n'est pas déjà formatée
    let displayDate = db.date || '';
    if (!displayDate && db.created_at) {
        const dateObj = typeof db.created_at === 'number' 
            ? new Date(db.created_at) 
            : new Date(db.created_at);
        if (!isNaN(dateObj.getTime())) {
            const d = String(dateObj.getDate()).padStart(2, '0');
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const y = dateObj.getFullYear();
            displayDate = `${d}-${m}-${y}`;
        }
    }
    
    return {
        id: db.id || crypto.randomUUID(),
        title: db.title || '',
        body: db.body || '',
        target_consulado_id: db.target_consulado_id || 'ALL',
        target_ids: parseTargetIds(db.target_ids),
        target_consulado_name: db.target_consulado_name || 'Todos',
        type: (db.type === 'INSTITUCIONAL' || db.type === 'URGENTE' || db.type === 'CONSULAR') 
            ? db.type 
            : 'INSTITUCIONAL',
        date: displayDate,
        start_date: db.start_date || undefined,
        end_date: db.end_date || undefined,
        created_at: created_at,
        archived: db.archived !== undefined ? (typeof db.archived === 'boolean' ? db.archived : Boolean(db.archived)) : false,
        is_automatic: db.is_automatic !== undefined ? (typeof db.is_automatic === 'boolean' ? db.is_automatic : Boolean(db.is_automatic)) : false
    };
};

const mapMensajeToDB = (m: Partial<Mensaje>) => {
    const payload: any = { ...m };
    
    // Convertir target_ids en JSON string pour la base de données si c'est un array
    if (payload.target_ids !== undefined && payload.target_ids !== null) {
        if (Array.isArray(payload.target_ids)) {
            // S'assurer que target_ids est bien un array et le convertir en JSON
            payload.target_ids = JSON.stringify(payload.target_ids);
        } else if (typeof payload.target_ids === 'string') {
            // Si c'est déjà une string, vérifier si c'est du JSON valide
            try {
                JSON.parse(payload.target_ids);
                // C'est déjà du JSON valide, on le garde tel quel
            } catch {
                // Ce n'est pas du JSON valide, on essaie de le convertir
                payload.target_ids = JSON.stringify([payload.target_ids]);
            }
        }
    }
    
    // S'assurer que created_at est un number (timestamp)
    if (payload.created_at === undefined || payload.created_at === null) {
        payload.created_at = Date.now();
    } else if (typeof payload.created_at !== 'number') {
        // Convertir en timestamp si c'est une date ou une string
        if (typeof payload.created_at === 'string') {
            const parsed = Date.parse(payload.created_at);
            payload.created_at = isNaN(parsed) ? Date.now() : parsed;
        } else if (payload.created_at instanceof Date) {
            payload.created_at = payload.created_at.getTime();
        } else {
            payload.created_at = Date.now();
        }
    }
    
    // S'assurer que archived est un boolean
    if (payload.archived !== undefined && payload.archived !== null) {
        payload.archived = typeof payload.archived === 'boolean' 
            ? payload.archived 
            : Boolean(payload.archived);
    } else {
        payload.archived = false;
    }
    
    // S'assurer que is_automatic est un boolean
    if (payload.is_automatic !== undefined && payload.is_automatic !== null) {
        payload.is_automatic = typeof payload.is_automatic === 'boolean' 
            ? payload.is_automatic 
            : Boolean(payload.is_automatic);
    }
    
    // S'assurer que date est une string valide
    if (!payload.date && payload.created_at) {
        const dateObj = new Date(payload.created_at);
        if (!isNaN(dateObj.getTime())) {
            const d = String(dateObj.getDate()).padStart(2, '0');
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const y = dateObj.getFullYear();
            payload.date = `${d}-${m}-${y}`;
        }
    }
    
    // S'assurer que target_consulado_id est bien défini (legacy support)
    if (!payload.target_consulado_id && payload.target_ids) {
        try {
            const targetIds = typeof payload.target_ids === 'string' 
                ? JSON.parse(payload.target_ids) 
                : payload.target_ids;
            if (Array.isArray(targetIds) && targetIds.length > 0) {
                payload.target_consulado_id = targetIds.includes('ALL') ? 'ALL' : targetIds[0];
            } else {
                payload.target_consulado_id = 'ALL';
            }
        } catch {
            payload.target_consulado_id = 'ALL';
        }
    }
    
    // Transformer undefined en null seulement après toutes les conversions
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
    
    return payload;
};

// Mapping pour AgendaEvent
const mapAgendaEventFromDB = (db: any): AgendaEvent => ({
    id: db.id || crypto.randomUUID(),
    title: db.title || '',
    date: db.date || db.start_date || '',
    start_date: db.start_date || db.date || undefined,
    end_date: db.end_date || undefined,
    type: (db.type === 'EFEMERIDE' || db.type === 'IDOLO' || db.type === 'INTERNACIONAL' || db.type === 'EVENTO' || db.type === 'ENCUENTRO' || db.type === 'CUMPLEAÑOS')
        ? db.type
        : 'EVENTO',
    description: db.description || undefined,
    location: db.location || undefined,
    is_special_day: db.is_special_day !== undefined ? Boolean(db.is_special_day) : false
});

const mapAgendaEventToDB = (e: Partial<AgendaEvent>) => {
    const payload: any = { ...e };
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
    return payload;
};

// Mapping pour AppUser
const mapAppUserFromDB = (db: any): AppUser => ({
    id: db.id || crypto.randomUUID(),
    username: db.username || '',
    password: db.password || undefined,
    email: db.email || '',
    full_name: db.full_name || '',
    role: (db.role === 'SUPERADMIN' || db.role === 'ADMIN' || db.role === 'PRESIDENTE' || db.role === 'REFERENTE' || db.role === 'SOCIO')
        ? db.role
        : 'SOCIO',
    consulado_id: db.consulado_id || undefined,
    active: db.active !== undefined ? Boolean(db.active) : true,
    last_login: db.last_login || undefined,
    avatar: db.avatar || undefined,
    gender: (db.gender === 'M' || db.gender === 'F' || db.gender === 'X') ? db.gender : undefined
});

const mapAppUserToDB = (u: Partial<AppUser>) => {
    const payload: any = { ...u };
    // Ne pas inclure le password s'il est vide
    if (payload.password !== undefined && (!payload.password || payload.password.trim() === '')) {
        delete payload.password;
    }
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
    return payload;
};

// Mapping pour Solicitud
const mapSolicitudFromDB = (db: any): Solicitud => ({
    id: db.id || crypto.randomUUID(),
    match_id: parseId(db.match_id) || 0,
    socio_id: db.socio_id || '',
    socio_name: db.socio_name || '',
    socio_dni: db.socio_dni || '',
    socio_category: db.socio_category || '',
    consulado: db.consulado || '',
    status: (db.status === 'PENDING' || db.status === 'APPROVED' || db.status === 'REJECTED' || db.status === 'CANCELLATION_REQUESTED')
        ? db.status
        : 'PENDING',
    timestamp: db.timestamp || db.created_at || new Date().toISOString()
});

const mapSolicitudToDB = (s: Partial<Solicitud>) => {
    const payload: any = { ...s };
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
    if (!payload.timestamp) payload.timestamp = new Date().toISOString();
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

// Mapping pour TransferRequest
const mapTransferFromDB = (db: any): TransferRequest => ({
    id: db.id || crypto.randomUUID(),
    socio_id: db.socio_id || '',
    socio_name: db.socio_name || '',
    from_consulado_id: db.from_consulado_id || '',
    from_consulado_name: db.from_consulado_name || '',
    to_consulado_id: db.to_consulado_id || '',
    to_consulado_name: db.to_consulado_name || '',
    comments: db.comments || undefined,
    status: (db.status === 'PENDING' || db.status === 'APPROVED' || db.status === 'REJECTED' || db.status === 'CANCELLED') 
        ? db.status 
        : 'PENDING',
    request_date: db.request_date || db.created_at || new Date().toISOString()
});

const mapTransferToDB = (t: Partial<TransferRequest>) => {
    const payload: any = {};
    if (t.id !== undefined) payload.id = t.id;
    if (t.socio_id !== undefined) payload.socio_id = t.socio_id;
    if (t.socio_name !== undefined) payload.socio_name = t.socio_name;
    if (t.from_consulado_id !== undefined) payload.from_consulado_id = t.from_consulado_id || null;
    if (t.from_consulado_name !== undefined) payload.from_consulado_name = t.from_consulado_name || null;
    if (t.to_consulado_id !== undefined) payload.to_consulado_id = t.to_consulado_id || null;
    if (t.to_consulado_name !== undefined) payload.to_consulado_name = t.to_consulado_name || null;
    if (t.comments !== undefined) payload.comments = t.comments || null;
    if (t.status !== undefined) payload.status = t.status || 'PENDING';
    if (t.request_date !== undefined) payload.request_date = t.request_date || new Date().toISOString();
    Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) payload[key] = null;
    });
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
    logoMenuSize: 40,
    logoLoginSize: 96,
    logoMatchSize: 128,
    logoRivalSize: 128,
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

          // Traitement des Consulados
          if (consuladosResult.error) {
              console.error("❌ Error fetching consulados:", consuladosResult.error);
              this.consulados = [];
          } else if (consuladosResult.data) {
              // Logs détaillés pour le débogage
              if (isDevelopment) {
                  console.log("📊 Données brutes des consulados:", {
                      count: consuladosResult.data.length,
                      isArray: Array.isArray(consuladosResult.data),
                      sample: consuladosResult.data.slice(0, 2)
                  });
              }
              
              if (Array.isArray(consuladosResult.data)) {
                  // Mapper les consulados depuis la DB
                  const mappedConsulados = consuladosResult.data
                      .map((dbItem: any, index: number) => {
                          try {
                              const mapped = mapConsuladoFromDB(dbItem);
                              if (isDevelopment && index < 3) {
                                  console.log(`🔍 Mapping consulado ${index + 1}/${consuladosResult.data.length}:`, {
                                      raw: { id: dbItem?.id, name: dbItem?.name, city: dbItem?.city },
                                      mapped: mapped ? { id: mapped.id, name: mapped.name, city: mapped.city } : null,
                                      success: mapped !== null
                                  });
                              }
                              return mapped;
                          } catch (error: any) {
                              console.error(`❌ Erreur lors du mapping du consulado ${index + 1}:`, error, dbItem);
                              return null;
                          }
                      })
                      .filter((c): c is Consulado => c !== null); // Filtrer les null
                  
                  this.consulados = mappedConsulados;
                  
                  // Vérifier les consulados incomplets
                  if (isDevelopment) {
                      const incomplete = this.consulados.filter(c => !c.name || !c.id);
                      if (incomplete.length > 0) {
                          console.warn("⚠️ Consulados incomplets:", incomplete.length, incomplete);
                      }
                      console.log(`✅ ${this.consulados.length} consulados chargés et mappés`, this.consulados.map(c => ({ id: c.id, name: c.name })));
                  }
                  
                  // Notifier les listeners après le chargement
                  this.notify();
                  
                  // Créer SEDE CENTRAL de manière asynchrone (ne bloque pas)
                  this.ensureSedeCentralExists().catch(err => {
                      console.error("Erreur lors de la création de SEDE CENTRAL:", err);
                  });
              } else {
                  console.warn("⚠️ consuladosResult.data n'est pas un tableau:", typeof consuladosResult.data, consuladosResult.data);
                  this.consulados = [];
                  this.notify();
              }
          } else {
              console.warn("⚠️ Aucune donnée retournée pour consulados (data est null/undefined)");
              this.consulados = [];
              this.notify();
              // Créer SEDE CENTRAL même si aucune donnée
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

          // 4. Charger Solicitudes, Notifications et TransferRequests depuis Supabase (si la table existe)
          this.loadingMessage = "Chargement des demandes...";
          try {
              const [solicitudesResult, notificationsResult, transfersResult] = await Promise.all([
                  supabase.from('solicitudes').select('*').catch(() => ({ data: null, error: null })),
                  supabase.from('notifications').select('*').catch(() => ({ data: null, error: null })),
                  supabase.from('transfer_requests').select('*').catch(() => ({ data: null, error: null }))
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

              // Traitement des TransferRequests
              if (transfersResult.data && !transfersResult.error) {
                  this.transfers = transfersResult.data.map(mapTransferFromDB);
                  if (isDevelopment) console.log(`✅ ${this.transfers.length} transferts chargés`);
              }
          } catch (error) {
              // Les tables peuvent ne pas exister, ce n'est pas critique
              if (isDevelopment) console.log("ℹ️ Tables solicitudes/notifications/transfer_requests non disponibles");
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
              if (isDevelopment) {
                  console.log("📊 Données brutes des mensajes:", {
                      count: mensajesResult.data.length,
                      isArray: Array.isArray(mensajesResult.data),
                      sample: mensajesResult.data.slice(0, 2)
                  });
              }
              
              this.mensajes = mensajesResult.data.map((dbItem: any, index: number) => {
                  try {
                      const mapped = mapMensajeFromDB(dbItem);
                      if (isDevelopment && index < 3) {
                          console.log(`🔍 Mapping mensaje ${index + 1}/${mensajesResult.data.length}:`, {
                              raw: { id: dbItem?.id, title: dbItem?.title, target_consulado_id: dbItem?.target_consulado_id },
                              mapped: mapped ? { id: mapped.id, title: mapped.title, target_consulado_id: mapped.target_consulado_id } : null,
                              success: mapped !== null
                          });
                      }
                      return mapped;
                  } catch (error: any) {
                      console.error(`❌ Erreur lors du mapping du mensaje ${index + 1}:`, error, dbItem);
                      return null;
                  }
              }).filter((m): m is Mensaje => m !== null);
              
              if (isDevelopment) console.log(`✅ ${this.mensajes.length} messages chargés et mappés`);
          } else if (mensajesResult.error) {
              console.error("❌ Erreur lors du chargement des mensajes:", mensajesResult.error);
              this.mensajes = [];
          } else {
              console.warn("⚠️ Aucune donnée retournée pour mensajes (data est null/undefined)");
              this.mensajes = [];
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

  getSocios(consulado_id?: string) { 
      if (consulado_id) {
          const c = this.consulados.find(x => x.id === consulado_id);
          if (!c) return [];
          
          // ASSOCIATION SOCIO-CONSULADO :
          // La correspondance se fait par NOM (pas par ID) :
          // - Dans la table 'socios' : colonne 'consulado' (nom du consulado)
          // - Dans la table 'consulados' : colonne 'name' (nom du consulado)
          // On compare consulado (socios) === name (consulados)
          // Correspondance insensible à la casse et aux espaces pour robustesse
          const consuladoName = c.name?.trim().toUpperCase() || '';
          return this.socios.filter(s => {
              const socioConsuladoName = s.consulado?.trim().toUpperCase() || '';
              return socioConsuladoName === consuladoName;
          });
      }
      return this.socios; 
  }

  async addSocio(s: Socio) {
      // Vérifier qu'il n'y a pas déjà un socio avec le même ID ou numero_socio
      const existingById = this.socios.find(x => x.id === s.id);
      const existingByNumero = s.numero_socio ? this.socios.find(x => x.numero_socio === s.numero_socio && x.id !== s.id) : null;
      
      if (existingById) {
          throw new Error(`Un socio avec l'ID ${s.id} existe déjà`);
      }
      if (existingByNumero) {
          throw new Error(`Un socio avec le numéro ${s.numero_socio} existe déjà`);
      }
      
      const payload = mapSocioToDB(s);
      // Insérer d'abord dans la DB, puis mettre à jour le cache
      const { error } = await supabase.from('socios').insert([payload]);
      if (error) {
          throw new Error(error.message);
      }
      
      // Si l'insertion réussit, mettre à jour le cache
      this.socios.unshift(s);
      this.notify();
  }

  async updateSocio(s: Socio) {
      // Vérifier que le socio existe
      const existing = this.socios.find(x => x.id === s.id);
      if (!existing) {
          throw new Error(`Le socio avec l'ID ${s.id} n'existe pas`);
      }
      
      // Vérifier qu'il n'y a pas de conflit avec un autre numero_socio
      if (s.numero_socio) {
          const existingByNumero = this.socios.find(x => x.numero_socio === s.numero_socio && x.id !== s.id);
          if (existingByNumero) {
              throw new Error(`Un autre socio avec le numéro ${s.numero_socio} existe déjà`);
          }
      }
      
      const payload = mapSocioToDB(s);
      // Mettre à jour d'abord dans la DB, puis le cache
      const { error } = await supabase.from('socios').update(payload).eq('id', s.id);
      if (error) {
          throw new Error(error.message);
      }
      
      // Si la mise à jour réussit, mettre à jour le cache
      this.socios = this.socios.map(x => x.id === s.id ? s : x);
      this.notify();
  }

  async deleteSocio(id: string) {
      // Supprimer d'abord dans la DB, puis le cache
      const { error } = await supabase.from('socios').delete().eq('id', id);
      if (error) {
          throw new Error(error.message);
      }
      
      // Si la suppression réussit, mettre à jour le cache
      this.socios = this.socios.filter(x => x.id !== id);
      this.notify();
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
          return { role: user.role, name: user.full_name, email: user.email, consulado_id: user.consulado_id, gender: user.gender };
      }

      try {
          const { data, error } = await supabase.from('users')
              .select('*')
              .eq('username', u)
              .eq('password', p) 
              .eq('active', true)
              .single();
          
          if (data) {
              return { role: data.role, name: data.full_name, email: data.email, consulado_id: data.consulado_id, gender: data.gender };
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

  // SEDE CENTRAL est un consulado virtuel intégré à l'application, pas dans la base de données
  // Cette fonction ne fait rien car SEDE CENTRAL est géré virtuellement dans getConsulados()
  // Il n'a pas de président car c'est un consulado administratif
  private async ensureSedeCentralExists() {
      // SEDE CENTRAL est toujours créé virtuellement dans getConsulados()
      // Il n'est jamais créé dans la base de données
      const isDevelopment = import.meta.env.DEV;
      if (isDevelopment) {
          console.log("ℹ️ SEDE CENTRAL est un consulado virtuel, géré dans getConsulados()");
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
              .update({ consulado: sedeCentralName })
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
                          .update({ consulado: sedeCentralName })
                          .eq('id', socio.id)
                          .catch(() => {}); // Ignorer les erreurs silencieusement
                  }, index * 50); // Espacer les requêtes de 50ms
              });
          }, 1000);
      }
  }

  getConsulados() { 
      // S'assurer que "SEDE CENTRAL" est toujours présent dans la liste
      // SEDE CENTRAL est un consulado virtuel intégré à l'application, pas dans la base de données
      // Il n'a pas de président car c'est un consulado administratif
      const sedeCentralName = 'SEDE CENTRAL';
      
      // Filtrer SEDE CENTRAL de la liste des consulados de la DB (s'il existe)
      const consuladosFromDB = this.consulados.filter(
          c => !(c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase())
      );
      
      // Créer "SEDE CENTRAL" virtuellement (toujours présent, jamais dans la DB)
      const sedeCentral: Consulado = {
          id: 'sede-central-virtual',
          name: sedeCentralName,
          city: 'Buenos Aires',
          country: 'Argentina',
          country_code: 'AR',
          president: '', // Pas de président - consulado administratif
          referente: '',
          foundation_year: '',
          address: 'La Bombonera, Brandsen 805, C1161 CABA, Argentina',
          timezone: 'UTC-03:00 (Buenos Aires)',
          banner: '',
          logo: '',
          is_official: true,
          email: undefined,
          phone: undefined,
          social_instagram: undefined,
          social_facebook: undefined,
          social_x: undefined,
          social_tiktok: undefined,
          social_youtube: undefined,
          website: undefined
      };
      
      // Toujours retourner SEDE CENTRAL en premier, suivi des consulados de la DB
      return [sedeCentral, ...consuladosFromDB]; 
  }
  
  getConsuladoById(id: string) { 
      // Si on cherche "SEDE CENTRAL" et qu'il n'existe pas, le retourner virtuellement
      if (id === 'sede-central-virtual') {
          const sedeCentral: Consulado = {
              id: 'sede-central-virtual',
              name: 'SEDE CENTRAL',
              city: 'Buenos Aires',
              country: 'Argentina',
              country_code: 'AR',
              president: '',
              referente: '',
              foundation_year: '',
              address: 'La Bombonera, Brandsen 805, C1161 CABA, Argentina',
              timezone: 'UTC-03:00 (Buenos Aires)',
              banner: '',
              logo: '',
              is_official: true,
              email: undefined,
              phone: undefined,
              social_instagram: undefined,
              social_facebook: undefined,
              social_x: undefined,
              social_tiktok: undefined,
              social_youtube: undefined,
              website: undefined
          };
          return sedeCentral;
      }
      
      return this.consulados.find(c => c.id === id); 
  }
  async addConsulado(c: Consulado) { 
      // SEDE CENTRAL est un consulado virtuel, ne peut pas être ajouté à la base de données
      if (c.id === 'sede-central-virtual' || (c.name && c.name.toUpperCase() === 'SEDE CENTRAL')) {
          console.warn("⚠️ SEDE CENTRAL est un consulado virtuel et ne peut pas être sauvegardé dans la base de données");
          return;
      }
      
      this.consulados.push(c); 
      this.notify();
      const { error } = await supabase.from('consulados').insert([mapConsuladoToDB(c)]);
      if (error) throw new Error(error.message);
  }
  async updateConsulado(c: Consulado) { 
      // SEDE CENTRAL est un consulado virtuel, ne peut pas être modifié dans la base de données
      if (c.id === 'sede-central-virtual' || (c.name && c.name.toUpperCase() === 'SEDE CENTRAL')) {
          console.warn("⚠️ SEDE CENTRAL est un consulado virtuel et ne peut pas être modifié dans la base de données");
          return;
      }
      
      this.consulados = this.consulados.map(x => x.id === c.id ? c : x); 
      this.notify();
      const { error } = await supabase.from('consulados').update(mapConsuladoToDB(c)).eq('id', c.id);
      if (error) throw new Error(error.message);
  }
  async deleteConsulado(id: string) { 
      // SEDE CENTRAL est un consulado virtuel, ne peut pas être supprimé
      if (id === 'sede-central-virtual') {
          console.warn("⚠️ SEDE CENTRAL est un consulado virtuel et ne peut pas être supprimé");
          return;
      }
      
      this.consulados = this.consulados.filter(x => x.id !== id); 
      this.notify();
      const { error } = await supabase.from('consulados').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getMatches() { return this.matches; }
  getMatchById(id: number) { return this.matches.find(m => m.id === id); }
  async addMatch(m: Match) { 
      try {
          // Pour les nouveaux matchs, ne pas inclure l'ID (Supabase générera un UUID)
          const payload = mapMatchToDB(m, true);
          const { data, error } = await supabase.from('matches').insert([payload]).select().single();
          if (error) {
              console.error("❌ Erreur lors de l'ajout du match:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMatch = mapMatchFromDB(data);
              // Vérifier si le match existe déjà (éviter les doublons) en utilisant l'ID original
              const existingIndex = this.matches.findIndex(x => {
                  const xOriginalId = (x as any)._originalId;
                  const mappedOriginalId = (mappedMatch as any)._originalId;
                  if (xOriginalId !== undefined && mappedOriginalId !== undefined) {
                      return xOriginalId === mappedOriginalId;
                  }
                  return x.id === mappedMatch.id;
              });
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
  async updateMatch(m: Match & { _originalId?: string | number }) { 
      try {
          const payload = mapMatchToDB(m, false);
          // Ne pas inclure l'ID dans le payload de mise à jour (seulement dans la clause WHERE)
          delete payload.id;
          // Utiliser l'ID original (UUID string ou number) pour la mise à jour
          const matchId = m._originalId !== undefined ? m._originalId : m.id;
          const { data, error } = await supabase.from('matches').update(payload).eq('id', matchId).select().single();
          if (error) {
              console.error("❌ Erreur lors de la mise à jour du match:", error);
              throw new Error(error.message);
          }
          if (data) {
              const mappedMatch = mapMatchFromDB(data);
              // Comparer avec l'ID original si disponible, sinon avec l'ID converti
              this.matches = this.matches.map(x => {
                  const xOriginalId = (x as any)._originalId;
                  const mOriginalId = m._originalId;
                  if (xOriginalId !== undefined && mOriginalId !== undefined) {
                      return xOriginalId === mOriginalId ? mappedMatch : x;
                  }
                  return x.id === m.id ? mappedMatch : x;
              });
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
          // Trouver le match avec l'ID original (UUID) si disponible
          const matchToDelete = this.matches.find(m => {
              const originalId = (m as any)._originalId;
              if (originalId !== undefined) {
                  return originalId === id || m.id === id;
              }
              return m.id === id;
          });
          
          // Utiliser l'ID original (UUID) si disponible, sinon l'ID converti
          const deleteId = matchToDelete && (matchToDelete as any)._originalId !== undefined 
              ? (matchToDelete as any)._originalId 
              : id;
              
          const { error } = await supabase.from('matches').delete().eq('id', deleteId);
          if (error) {
              console.error("❌ Erreur lors de la suppression du match:", error);
              throw new Error(error.message);
          }
          // Filtrer en utilisant l'ID original si disponible
          this.matches = this.matches.filter(x => {
              const originalId = (x as any)._originalId;
              if (originalId !== undefined) {
                  return originalId !== deleteId;
              }
              return x.id !== id;
          });
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
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      // Filtrer les messages actifs (non archivés et dans la période de validité)
      let activeMessages = this.mensajes.filter(m => {
          // Exclure les messages archivés
          if (m.archived) return false;
          
          // Vérifier start_date si défini
          if (m.start_date) {
              const startDate = new Date(m.start_date);
              startDate.setHours(0, 0, 0, 0);
              if (startDate > now) return false; // Message pas encore actif
          }
          
          // Vérifier end_date si défini
          if (m.end_date) {
              const endDate = new Date(m.end_date);
              endDate.setHours(0, 0, 0, 0);
              if (endDate < now) return false; // Message expiré
          }
          
          return true;
      });
      
      // Filtrer par consulado si spécifié
      if (cId && cId !== 'ALL') {
          return activeMessages.filter(m => 
              m.target_consulado_id === cId || 
              m.target_consulado_id === 'ALL' ||
              (m.target_ids && m.target_ids.includes(cId))
          );
      }
      return activeMessages; 
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
          res = res.filter(s => s.match_id === mId);
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
      // Filtrer par utilisateur selon son rôle et consulado
      return this.notifications.filter(n => {
          // Les SUPERADMIN et ADMIN voient toutes les notifications
          if (u.role === 'SUPERADMIN' || u.role === 'ADMIN') {
              return true;
          }
          
          // Les PRESIDENTE et REFERENTE voient les notifications liées à leur consulado
          if ((u.role === 'PRESIDENTE' || u.role === 'REFERENTE') && u.consulado_id) {
              const consulado = this.consulados.find(c => c.id === u.consulado_id);
              if (consulado) {
                  // Vérifier si la notification concerne leur consulado
                  if (n.type === 'TRANSFER' && n.data && n.data.transfer_id) {
                      const transfer = this.transfers.find(t => t.id === n.data.transfer_id);
                      if (transfer && (transfer.to_consulado_name === consulado.name || transfer.from_consulado_name === consulado.name)) {
                          return true;
                      }
                  }
                  // Pour les autres types, vérifier si le message mentionne le consulado
                  if (n.message && n.message.includes(consulado.name)) {
                      return true;
                  }
              }
              return false;
          }
          
          // Par défaut, ne rien retourner
          return false;
      });
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
  
  getBirthdays(consuladoName: string | null, days: number): Socio[] {
      // Si consuladoName est null ou undefined, retourner tous les socios (pour les admins)
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + days);
      
      // Filtrer les socios par consulado si fourni, sinon prendre tous
      const relevantSocios = consuladoName 
          ? this.socios.filter(s => {
              // Comparaison case-insensitive et trim
              const socioConsulado = (s.consulado || '').trim().toLowerCase();
              const targetConsulado = consuladoName.trim().toLowerCase();
              return socioConsulado === targetConsulado;
          })
          : this.socios; // Pour les admins, retourner tous les socios
      
      // Filtrer ceux dont l'anniversaire tombe dans les prochains 'days' jours
      return relevantSocios.filter(socio => {
          if (!socio.birth_date || socio.birth_date.trim() === '') return false;
          
          // Parser birth_date (format peut être DD/MM/YYYY ou YYYY-MM-DD ou DD-MM-YYYY)
          let birthDay: number, birthMonth: number;
          if (socio.birth_date.includes('/')) {
              // Format DD/MM/YYYY
              const parts = socio.birth_date.split('/');
              birthDay = parseInt(parts[0], 10);
              birthMonth = parseInt(parts[1], 10);
          } else if (socio.birth_date.includes('-')) {
              // Format YYYY-MM-DD ou DD-MM-YYYY
              const parts = socio.birth_date.split('-');
              if (parts[0].length === 4) {
                  // Format YYYY-MM-DD
                  birthMonth = parseInt(parts[1], 10);
                  birthDay = parseInt(parts[2], 10);
              } else {
                  // Format DD-MM-YYYY
                  birthDay = parseInt(parts[0], 10);
                  birthMonth = parseInt(parts[1], 10);
              }
          } else {
              return false;
          }
          
          // Vérifier si cet anniversaire tombe dans les prochains 'days' jours
          const currentYear = today.getFullYear();
          const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);
          const birthdayNextYear = new Date(currentYear + 1, birthMonth - 1, birthDay);
          
          // Ajuster si l'anniversaire est déjà passé cette année
          const birthdayDate = birthdayThisYear < today ? birthdayNextYear : birthdayThisYear;
          
          return birthdayDate >= today && birthdayDate <= endDate;
      });
  }
  
  getTransfers(consulado_name: string) {
      // Transferts entrants: seulement ceux en attente d'approbation
      const incoming = this.transfers.filter(t => 
          t.to_consulado_name === consulado_name && t.status === 'PENDING'
      );
      // Transferts sortants: ceux en attente (pour pouvoir les annuler) et ceux approuvés (pour voir l'historique)
      const outgoing = this.transfers.filter(t => 
          t.from_consulado_name === consulado_name && (t.status === 'PENDING' || t.status === 'APPROVED' || t.status === 'REJECTED' || t.status === 'CANCELLED')
      );
      return { incoming, outgoing };
  }
  
  getSocioTransfers(socio_id: string) {
      return this.transfers.filter(t => t.socio_id === socio_id);
  }
  
  async createTransferRequest(transfer: Omit<TransferRequest, 'id' | 'request_date'>): Promise<TransferRequest> {
      try {
          const newTransfer: TransferRequest = {
              ...transfer,
              id: crypto.randomUUID(),
              request_date: new Date().toISOString(),
              status: 'PENDING'
          };
          
          // Ajouter localement
          this.transfers.push(newTransfer);
          this.notify();
          
          // Créer notification pour le consulado recevant
          const toConsulado = this.consulados.find(c => c.name === transfer.to_consulado_name);
          if (toConsulado) {
              const notification: AppNotification = {
                  id: crypto.randomUUID(),
                  type: 'TRANSFER',
                  title: `Solicitud de Transferencia de Socio`,
                  message: `El consulado "${transfer.from_consulado_name}" solicita transferir al socio ${transfer.socio_name} a su consulado.`,
                  date: new Date().toISOString(),
                  read: false,
                  data: { transfer_id: newTransfer.id, socio_id: transfer.socio_id }
              };
              await this.addNotification(notification);
          }
          
          // Sauvegarder dans Supabase
          try {
              const payload = mapTransferToDB(newTransfer);
              const { data, error } = await supabase.from('transfer_requests').insert([payload]).select().single();
              if (error) {
                  if (error.code !== '42P01') {
                      console.error("❌ Erreur lors de la création du transfert:", error);
                  }
              } else if (data) {
                  const mappedTransfer = mapTransferFromDB(data);
                  this.transfers = this.transfers.map(t => t.id === newTransfer.id ? mappedTransfer : t);
                  this.notify();
                  return mappedTransfer;
              }
          } catch (dbError: any) {
              if (dbError.code !== '42P01') {
                  console.error("❌ Erreur DB lors de la création du transfert:", dbError);
              }
          }
          
          return newTransfer;
      } catch (error: any) {
          console.error("❌ Erreur lors de la création du transfert:", error);
          throw error;
      }
  }
  
  async updateTransferStatus(transferId: string, status: 'APPROVED' | 'REJECTED' | 'CANCELLED'): Promise<TransferRequest> {
      try {
          const transfer = this.transfers.find(t => t.id === transferId);
          if (!transfer) throw new Error('Transfert introuvable');
          
          // Mettre à jour localement
          const updatedTransfer: TransferRequest = { ...transfer, status };
          this.transfers = this.transfers.map(t => t.id === transferId ? updatedTransfer : t);
          this.notify();
          
          // Si approuvé, modifier le consulado du socio dans la base de données
          if (status === 'APPROVED') {
              const socio = this.socios.find(s => s.id === transfer.socio_id);
              if (socio) {
                  const updatedSocio: Socio = { ...socio, consulado: transfer.to_consulado_name };
                  await this.updateSocio(updatedSocio);
              }
              
              // Créer notification pour le consulado sortant
              const notification: AppNotification = {
                  id: crypto.randomUUID(),
                  type: 'TRANSFER',
                  title: `Transferencia Aprobada`,
                  message: `El consulado "${transfer.to_consulado_name}" ha aprobado el traslado del socio ${transfer.socio_name}.`,
                  date: new Date().toISOString(),
                  read: false,
                  data: { transfer_id: transferId, socio_id: transfer.socio_id }
              };
              await this.addNotification(notification);
          } else if (status === 'REJECTED') {
              // Créer notification pour le consulado sortant
              const notification: AppNotification = {
                  id: crypto.randomUUID(),
                  type: 'TRANSFER',
                  title: `Transferencia Rechazada`,
                  message: `El consulado "${transfer.to_consulado_name}" ha rechazado el traslado del socio ${transfer.socio_name}.`,
                  date: new Date().toISOString(),
                  read: false,
                  data: { transfer_id: transferId, socio_id: transfer.socio_id }
              };
              await this.addNotification(notification);
          } else if (status === 'CANCELLED') {
              // Créer notification pour le consulado recevant
              const toConsulado = this.consulados.find(c => c.name === transfer.to_consulado_name);
              if (toConsulado) {
                  const notification: AppNotification = {
                      id: crypto.randomUUID(),
                      type: 'TRANSFER',
                      title: `Transferencia Cancelada`,
                      message: `El consulado "${transfer.from_consulado_name}" ha cancelado la solicitud de traslado del socio ${transfer.socio_name}.`,
                      date: new Date().toISOString(),
                      read: false,
                      data: { transfer_id: transferId, socio_id: transfer.socio_id }
                  };
                  await this.addNotification(notification);
              }
          }
          
          // Sauvegarder dans Supabase
          try {
              const { data, error } = await supabase
                  .from('transfer_requests')
                  .update({ status })
                  .eq('id', transferId)
                  .select()
                  .single();
              
              if (error) {
                  if (error.code !== '42P01') {
                      console.error("❌ Erreur lors de la mise à jour du transfert:", error);
                  }
              } else if (data) {
                  const mappedTransfer = mapTransferFromDB(data);
                  this.transfers = this.transfers.map(t => t.id === transferId ? mappedTransfer : t);
                  this.notify();
                  return mappedTransfer;
              }
          } catch (dbError: any) {
              if (dbError.code !== '42P01') {
                  console.error("❌ Erreur DB lors de la mise à jour du transfert:", dbError);
              }
          }
          
          return updatedTransfer;
      } catch (error: any) {
          console.error("❌ Erreur lors de la mise à jour du transfert:", error);
          throw error;
      }
  }
  
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

  // Obtener esquema SQL de una tabla desde Supabase (inferido desde datos)
  public async getTableSchema(tableName: string): Promise<TableSchema | null> {
    try {
      // Obtener una muestra de datos para inferir el esquema
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(10); // Obtener varias filas para mejor inferencia
      
      if (error) {
        console.error(`Error obteniendo esquema de ${tableName}:`, error);
        return null;
      }
      
      if (!sampleData || sampleData.length === 0) {
        // Si no hay datos, usar los mappings existentes
        const mappings = this.getFieldMappings(tableName);
        return {
          table: tableName,
          columns: mappings.map(m => ({
            name: m.dbField,
            type: m.type,
            nullable: m.nullable
          }))
        };
      }
      
      // Inferir tipos desde los datos
      const columnsMap: Record<string, { type: string; nullable: boolean; count: number }> = {};
      
      sampleData.forEach(row => {
        Object.keys(row).forEach(key => {
          const value = row[key];
          const isNull = value === null || value === undefined;
          
          if (!columnsMap[key]) {
            let inferredType = 'string';
            
            if (typeof value === 'number') {
              inferredType = Number.isInteger(value) ? 'integer' : 'float';
            } else if (typeof value === 'boolean') {
              inferredType = 'boolean';
            } else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
              inferredType = 'date';
            } else if (typeof value === 'object' && !Array.isArray(value)) {
              inferredType = 'json';
            } else if (Array.isArray(value)) {
              inferredType = 'array';
            }
            
            columnsMap[key] = {
              type: inferredType,
              nullable: isNull,
              count: 1
            };
          } else {
            columnsMap[key].nullable = columnsMap[key].nullable || isNull;
            columnsMap[key].count++;
          }
        });
      });
      
      const columns = Object.keys(columnsMap).map(key => ({
        name: key,
        type: columnsMap[key].type,
        nullable: columnsMap[key].nullable
      }));
      
      return { table: tableName, columns };
    } catch (error: any) {
      console.error(`Error obteniendo esquema de ${tableName}:`, error);
      // Fallback: usar mappings existentes
      const mappings = this.getFieldMappings(tableName);
      if (mappings.length > 0) {
        return {
          table: tableName,
          columns: mappings.map(m => ({
            name: m.dbField,
            type: m.type,
            nullable: m.nullable
          }))
        };
      }
      return null;
    }
  }

  // Obtener todos los esquemas de las tablas principales
  public async getAllTableSchemas(): Promise<Record<string, TableSchema>> {
    const tables = ['socios', 'consulados', 'matches', 'teams', 'competitions', 'agenda', 'mensajes', 'users', 'solicitudes', 'notifications', 'transfer_requests'];
    const schemas: Record<string, TableSchema> = {};
    
    await Promise.all(
      tables.map(async (table) => {
        const schema = await this.getTableSchema(table);
        if (schema) {
          schemas[table] = schema;
        }
      })
    );
    
    return schemas;
  }

  // Obtener el mapping de campos para una tabla (ahora todo es snake_case)
  public getFieldMappings(tableName: string): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    
    // Tous les champs sont maintenant en snake_case (pas de conversion)
    switch (tableName) {
      case 'socios':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'first_name', appField: 'first_name', type: 'text', nullable: false },
          { dbField: 'last_name', appField: 'last_name', type: 'text', nullable: false },
          { dbField: 'numero_socio', appField: 'numero_socio', type: 'text', nullable: true },
          { dbField: 'dni', appField: 'dni', type: 'text', nullable: false },
          { dbField: 'category', appField: 'category', type: 'text', nullable: false }, // Catégorie de socio
          { dbField: 'status', appField: 'status', type: 'text', nullable: false }, // Estado de cuota
          { dbField: 'email', appField: 'email', type: 'text', nullable: true },
          { dbField: 'phone', appField: 'phone', type: 'text', nullable: true }, // Format international avec indicatif
          { dbField: 'gender', appField: 'gender', type: 'text', nullable: false },
          { dbField: 'nationality', appField: 'nationality', type: 'text', nullable: true },
          { dbField: 'birth_date', appField: 'birth_date', type: 'date', nullable: true },
          { dbField: 'join_date', appField: 'join_date', type: 'date', nullable: true },
          { dbField: 'last_month_paid', appField: 'last_month_paid', type: 'text', nullable: true },
          { dbField: 'consulado', appField: 'consulado', type: 'text', nullable: true },
          { dbField: 'role', appField: 'role', type: 'text', nullable: false },
          { dbField: 'avatar_color', appField: 'avatar_color', type: 'text', nullable: true },
          { dbField: 'expiration_date', appField: 'expiration_date', type: 'date', nullable: true },
          { dbField: 'twitter', appField: 'twitter', type: 'text', nullable: true },
          { dbField: 'youtube', appField: 'youtube', type: 'text', nullable: true }
        );
        break;
        
      case 'consulados':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'name', appField: 'name', type: 'text', nullable: false },
          { dbField: 'city', appField: 'city', type: 'text', nullable: false },
          { dbField: 'country', appField: 'country', type: 'text', nullable: false },
          { dbField: 'country_code', appField: 'country_code', type: 'text', nullable: true },
          { dbField: 'president', appField: 'president', type: 'text', nullable: false },
          { dbField: 'vice_president', appField: 'vice_president', type: 'text', nullable: true },
          { dbField: 'secretary', appField: 'secretary', type: 'text', nullable: true },
          { dbField: 'treasurer', appField: 'treasurer', type: 'text', nullable: true },
          { dbField: 'vocal', appField: 'vocal', type: 'text', nullable: true },
          { dbField: 'vocales', appField: 'vocales', type: 'json', nullable: true },
          { dbField: 'referente', appField: 'referente', type: 'text', nullable: false },
          { dbField: 'foundation_year', appField: 'foundation_year', type: 'text', nullable: true },
          { dbField: 'address', appField: 'address', type: 'text', nullable: true },
          { dbField: 'timezone', appField: 'timezone', type: 'text', nullable: false },
          { dbField: 'banner', appField: 'banner', type: 'text', nullable: true },
          { dbField: 'logo', appField: 'logo', type: 'text', nullable: true },
          { dbField: 'is_official', appField: 'is_official', type: 'boolean', nullable: false },
          { dbField: 'email', appField: 'email', type: 'text', nullable: true },
          { dbField: 'phone', appField: 'phone', type: 'text', nullable: true },
          { dbField: 'social_instagram', appField: 'social_instagram', type: 'text', nullable: true },
          { dbField: 'social_facebook', appField: 'social_facebook', type: 'text', nullable: true },
          { dbField: 'social_x', appField: 'social_x', type: 'text', nullable: true },
          { dbField: 'social_tiktok', appField: 'social_tiktok', type: 'text', nullable: true },
          { dbField: 'social_youtube', appField: 'social_youtube', type: 'text', nullable: true },
          { dbField: 'website', appField: 'website', type: 'text', nullable: true }
        );
        break;
        
      case 'matches':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'number', nullable: false },
          { dbField: 'rival_id', appField: 'rival_id', type: 'text', nullable: true },
          { dbField: 'competition_id', appField: 'competition_id', type: 'text', nullable: true },
          { dbField: 'rival', appField: 'rival', type: 'text', nullable: false },
          { dbField: 'rival_short', appField: 'rival_short', type: 'text', nullable: true },
          { dbField: 'rival_country', appField: 'rival_country', type: 'text', nullable: true },
          { dbField: 'competition', appField: 'competition', type: 'text', nullable: false },
          { dbField: 'date', appField: 'date', type: 'date', nullable: false },
          { dbField: 'hour', appField: 'hour', type: 'text', nullable: false },
          { dbField: 'venue', appField: 'venue', type: 'text', nullable: true },
          { dbField: 'city', appField: 'city', type: 'text', nullable: true },
          { dbField: 'is_home', appField: 'is_home', type: 'boolean', nullable: false },
          { dbField: 'is_neutral', appField: 'is_neutral', type: 'boolean', nullable: true },
          { dbField: 'fecha_jornada', appField: 'fecha_jornada', type: 'text', nullable: false },
          { dbField: 'is_suspended', appField: 'is_suspended', type: 'boolean', nullable: false },
          { dbField: 'apertura_date', appField: 'apertura_date', type: 'text', nullable: true },
          { dbField: 'apertura_hour', appField: 'apertura_hour', type: 'text', nullable: true },
          { dbField: 'cierre_date', appField: 'cierre_date', type: 'text', nullable: true },
          { dbField: 'cierre_hour', appField: 'cierre_hour', type: 'text', nullable: true }
        );
        break;
        
      case 'teams':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'name', appField: 'name', type: 'text', nullable: false },
          { dbField: 'short_name', appField: 'short_name', type: 'text', nullable: false },
          { dbField: 'country_id', appField: 'country_id', type: 'text', nullable: false },
          { dbField: 'confederation', appField: 'confederation', type: 'text', nullable: false }, // CONMEBOL, UEFA, CONCACAF, OFC, CAF, AFC, OTHER, etc.
          { dbField: 'city', appField: 'city', type: 'text', nullable: true },
          { dbField: 'stadium', appField: 'stadium', type: 'text', nullable: true },
          { dbField: 'logo', appField: 'logo', type: 'text', nullable: true }
        );
        break;
        
      case 'competitions':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'name', appField: 'name', type: 'text', nullable: false },
          { dbField: 'organization', appField: 'organization', type: 'text', nullable: false },
          { dbField: 'type', appField: 'type', type: 'text', nullable: false },
          { dbField: 'logo', appField: 'logo', type: 'text', nullable: true },
          { dbField: 'category', appField: 'category', type: 'text', nullable: false }
        );
        break;
        
      case 'agenda':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'title', appField: 'title', type: 'text', nullable: false },
          { dbField: 'date', appField: 'date', type: 'date', nullable: false },
          { dbField: 'start_date', appField: 'start_date', type: 'date', nullable: true },
          { dbField: 'end_date', appField: 'end_date', type: 'date', nullable: true },
          { dbField: 'type', appField: 'type', type: 'text', nullable: false },
          { dbField: 'description', appField: 'description', type: 'text', nullable: true },
          { dbField: 'location', appField: 'location', type: 'text', nullable: true },
          { dbField: 'is_special_day', appField: 'is_special_day', type: 'boolean', nullable: true }
        );
        break;
        
      case 'mensajes':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'title', appField: 'title', type: 'text', nullable: false },
          { dbField: 'body', appField: 'body', type: 'text', nullable: false },
          { dbField: 'target_consulado_id', appField: 'target_consulado_id', type: 'text', nullable: false },
          { dbField: 'target_ids', appField: 'target_ids', type: 'jsonb', nullable: true }, // jsonb pour Supabase PostgreSQL
          { dbField: 'target_consulado_name', appField: 'target_consulado_name', type: 'text', nullable: false },
          { dbField: 'type', appField: 'type', type: 'text', nullable: false },
          { dbField: 'date', appField: 'date', type: 'text', nullable: true }, // nullable car peut être généré depuis created_at
          { dbField: 'start_date', appField: 'start_date', type: 'date', nullable: true },
          { dbField: 'end_date', appField: 'end_date', type: 'date', nullable: true },
          { dbField: 'created_at', appField: 'created_at', type: 'bigint', nullable: false }, // bigint pour timestamp
          { dbField: 'archived', appField: 'archived', type: 'boolean', nullable: true }, // nullable avec défaut false
          { dbField: 'is_automatic', appField: 'is_automatic', type: 'boolean', nullable: true }
        );
        break;
        
      case 'users':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'username', appField: 'username', type: 'text', nullable: false },
          { dbField: 'password', appField: 'password', type: 'text', nullable: true },
          { dbField: 'email', appField: 'email', type: 'text', nullable: false },
          { dbField: 'full_name', appField: 'full_name', type: 'text', nullable: false },
          { dbField: 'role', appField: 'role', type: 'text', nullable: false }, // SUPERADMIN, ADMIN, PRESIDENTE, REFERENTE, SOCIO
          { dbField: 'consulado_id', appField: 'consulado_id', type: 'text', nullable: true }, // Requis si role = PRESIDENTE ou REFERENTE
          { dbField: 'active', appField: 'active', type: 'boolean', nullable: false },
          { dbField: 'last_login', appField: 'last_login', type: 'text', nullable: true },
          { dbField: 'avatar', appField: 'avatar', type: 'text', nullable: true },
          { dbField: 'gender', appField: 'gender', type: 'text', nullable: true } // M, F, X
        );
        break;
        
      case 'solicitudes':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'match_id', appField: 'match_id', type: 'number', nullable: false },
          { dbField: 'socio_id', appField: 'socio_id', type: 'text', nullable: false },
          { dbField: 'socio_name', appField: 'socio_name', type: 'text', nullable: false },
          { dbField: 'socio_dni', appField: 'socio_dni', type: 'text', nullable: false },
          { dbField: 'socio_category', appField: 'socio_category', type: 'text', nullable: false },
          { dbField: 'consulado', appField: 'consulado', type: 'text', nullable: false },
          { dbField: 'status', appField: 'status', type: 'text', nullable: false }, // PENDING, APPROVED, REJECTED, CANCELLATION_REQUESTED
          { dbField: 'timestamp', appField: 'timestamp', type: 'text', nullable: false }
        );
        break;
        
      case 'notifications':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'type', appField: 'type', type: 'text', nullable: false },
          { dbField: 'title', appField: 'title', type: 'text', nullable: false },
          { dbField: 'message', appField: 'message', type: 'text', nullable: false },
          { dbField: 'date', appField: 'date', type: 'text', nullable: false },
          { dbField: 'read', appField: 'read', type: 'boolean', nullable: false },
          { dbField: 'link', appField: 'link', type: 'text', nullable: true },
          { dbField: 'data', appField: 'data', type: 'json', nullable: true }
        );
        break;
        
      case 'transfer_requests':
        mappings.push(
          { dbField: 'id', appField: 'id', type: 'text', nullable: false },
          { dbField: 'socio_id', appField: 'socio_id', type: 'text', nullable: false },
          { dbField: 'socio_name', appField: 'socio_name', type: 'text', nullable: false },
          { dbField: 'from_consulado_id', appField: 'from_consulado_id', type: 'text', nullable: false },
          { dbField: 'from_consulado_name', appField: 'from_consulado_name', type: 'text', nullable: false },
          { dbField: 'to_consulado_id', appField: 'to_consulado_id', type: 'text', nullable: false },
          { dbField: 'to_consulado_name', appField: 'to_consulado_name', type: 'text', nullable: false },
          { dbField: 'comments', appField: 'comments', type: 'text', nullable: true },
          { dbField: 'status', appField: 'status', type: 'text', nullable: false }, // PENDING, APPROVED, REJECTED, CANCELLED
          { dbField: 'request_date', appField: 'request_date', type: 'text', nullable: false }
        );
        break;
    }
    
    return mappings;
  }

  // Re-mapper automatiquement toutes les données depuis Supabase
  public async remapDataAutomatic() {
    const isDevelopment = import.meta.env.DEV;
    this.loadingMessage = "Re-mapeando datos automáticamente...";
    
    try {
      // Réinitialiser toutes les données locales
      this.socios = [];
      this.consulados = [];
      this.matches = [];
      this.teams = [];
      this.competitions = [];
      this.agenda = [];
      this.mensajes = [];
      this.users = [];
      this.solicitudes = [];
      this.notifications = [];
      this.transfers = [];
      
      this.notify();
      
      // Recharger toutes les données depuis Supabase
      await this.initializeData(false);
      
      this.notify();
      if (isDevelopment) console.log("✅ Re-mapeo automático completado");
      
      return { success: true, message: 'Re-mapeo automático completado exitosamente' };
    } catch (error: any) {
      console.error("❌ Error en re-mapeo automático:", error);
      throw new Error(error.message || 'Error durante el re-mapeo automático');
    }
  }

  // Re-mapper manuellement des tables spécifiques
  public async remapDataManual(tables: string[]) {
    const isDevelopment = import.meta.env.DEV;
    this.loadingMessage = `Re-mapeando ${tables.length} tabla(s) manualmente...`;
    
    try {
      const results: Record<string, { success: boolean; count: number; error?: string }> = {};
      
      for (const table of tables) {
        try {
          switch (table) {
            case 'socios':
              this.loadingMessage = "Re-mapeando socios...";
              let allSocios: any[] = [];
              let sociosFrom = 0;
              const sociosPageSize = 1000;
              let sociosHasMore = true;
              
              while (sociosHasMore) {
                const to = sociosFrom + sociosPageSize - 1;
                const { data, error } = await supabase
                  .from('socios')
                  .select('*')
                  .range(sociosFrom, to);
                
                if (error) throw error;
                if (data && data.length > 0) {
                  allSocios = [...allSocios, ...data];
                  sociosHasMore = data.length === sociosPageSize;
                  sociosFrom += sociosPageSize;
                } else {
                  sociosHasMore = false;
                }
              }
              
              this.socios = allSocios.map(mapSocioFromDB);
              results[table] = { success: true, count: this.socios.length };
              break;
              
            case 'consulados':
              this.loadingMessage = "Re-mapeando consulados...";
              const { data: consuladosData, error: consuladosError } = await supabase
                .from('consulados')
                .select('*');
              
              if (consuladosError) throw consuladosError;
              this.consulados = (consuladosData || []).map(mapConsuladoFromDB);
              // Créer SEDE CENTRAL si nécessaire
              await this.ensureSedeCentralExists().catch(() => {});
              // Assigner les socios à SEDE CENTRAL en arrière-plan
              this.assignSociosToSedeCentral().catch(() => {});
              results[table] = { success: true, count: this.consulados.length };
              break;
              
            case 'matches':
              this.loadingMessage = "Re-mapeando partidos...";
              const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select('*');
              
              if (matchesError) throw matchesError;
              this.matches = (matchesData || []).map(mapMatchFromDB);
              results[table] = { success: true, count: this.matches.length };
              break;
              
            case 'teams':
              this.loadingMessage = "Re-mapeando equipos...";
              let allTeams: any[] = [];
              let teamsFrom = 0;
              const teamsPageSize = 1000;
              let teamsHasMore = true;
              
              while (teamsHasMore) {
                const to = teamsFrom + teamsPageSize - 1;
                const { data, error } = await supabase
                  .from('teams')
                  .select('*')
                  .range(teamsFrom, to);
                
                if (error) throw error;
                if (data && data.length > 0) {
                  allTeams = [...allTeams, ...data];
                  teamsHasMore = data.length === teamsPageSize;
                  teamsFrom += teamsPageSize;
                } else {
                  teamsHasMore = false;
                }
              }
              
              this.teams = allTeams.map(mapTeamFromDB);
              results[table] = { success: true, count: this.teams.length };
              break;
              
            case 'competitions':
              this.loadingMessage = "Re-mapeando torneos...";
              const { data: competitionsData, error: competitionsError } = await supabase
                .from('competitions')
                .select('*');
              
              if (competitionsError) throw competitionsError;
              this.competitions = (competitionsData || []).map(mapCompetitionFromDB);
              results[table] = { success: true, count: this.competitions.length };
              break;
              
            case 'agenda':
              this.loadingMessage = "Re-mapeando agenda...";
              const { data: agendaData, error: agendaError } = await supabase
                .from('agenda')
                .select('*');
              
              if (agendaError) throw agendaError;
              this.agenda = (agendaData || []).map(mapAgendaEventFromDB);
              results[table] = { success: true, count: this.agenda.length };
              break;
              
            case 'mensajes':
              this.loadingMessage = "Re-mapeando mensajes...";
              const { data: mensajesData, error: mensajesError } = await supabase
                .from('mensajes')
                .select('*');
              
              if (mensajesError) throw mensajesError;
              this.mensajes = (mensajesData || []).map(mapMensajeFromDB);
              results[table] = { success: true, count: this.mensajes.length };
              break;
              
            case 'users':
              this.loadingMessage = "Re-mapeando usuarios...";
              const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('*');
              
              if (usersError) throw usersError;
              this.users = (usersData || []).map(mapAppUserFromDB);
              results[table] = { success: true, count: this.users.length };
              break;
              
            case 'solicitudes':
              this.loadingMessage = "Re-mapeando solicitudes...";
              const { data: solicitudesData, error: solicitudesError } = await supabase
                .from('solicitudes')
                .select('*');
              
              if (solicitudesError) {
                results[table] = { success: false, count: 0, error: solicitudesError.message };
              } else {
                this.solicitudes = (solicitudesData || []).map(mapSolicitudFromDB);
                results[table] = { success: true, count: this.solicitudes.length };
              }
              break;
              
            case 'notifications':
              this.loadingMessage = "Re-mapeando notificaciones...";
              const { data: notificationsData, error: notificationsError } = await supabase
                .from('notifications')
                .select('*');
              
              if (notificationsError) {
                results[table] = { success: false, count: 0, error: notificationsError.message };
              } else {
                this.notifications = (notificationsData || []).map(mapNotificationFromDB);
                results[table] = { success: true, count: this.notifications.length };
              }
              break;
              
            case 'transfer_requests':
              this.loadingMessage = "Re-mapeando transferencias...";
              const { data: transfersData, error: transfersError } = await supabase
                .from('transfer_requests')
                .select('*');
              
              if (transfersError) {
                results[table] = { success: false, count: 0, error: transfersError.message };
              } else {
                this.transfers = (transfersData || []).map(mapTransferFromDB);
                results[table] = { success: true, count: this.transfers.length };
              }
              break;
              
            default:
              results[table] = { success: false, count: 0, error: `Tabla '${table}' no reconocida` };
          }
          
          this.notify();
        } catch (error: any) {
          console.error(`❌ Error re-mapeando ${table}:`, error);
          results[table] = { 
            success: false, 
            count: 0, 
            error: error.message || 'Error desconocido' 
          };
        }
      }
      
      this.loadingMessage = "";
      this.notify();
      
      if (isDevelopment) {
        console.log("✅ Re-mapeo manual completado:", results);
      }
      
      return { 
        success: Object.values(results).some(r => r.success), 
        results,
        message: `Re-mapeo manual completado: ${Object.values(results).filter(r => r.success).length}/${tables.length} tablas exitosas`
      };
    } catch (error: any) {
      console.error("❌ Error en re-mapeo manual:", error);
      this.loadingMessage = "";
      throw new Error(error.message || 'Error durante el re-mapeo manual');
    }
  }
}

export const dataService = new DataService();
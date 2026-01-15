
export interface Socio {
  id: string;
  numero_socio?: string;
  first_name: string;
  last_name: string;
  name: string; // Nom complet (prénom + nom)
  dni: string;
  category: 'ACTIVO' | 'ADHERENTE' | 'INTERNACIONAL' | 'CADETE' | 'MENOR' | 'VITALICIO' | 'BEBÉ' | 'ACTIVO EXTERIOR'; // Catégorie de socio
  status: 'AL DÍA' | 'EN DEUDA' | 'DE BAJA'; // Estado de cuota (état de la cotisation)
  email: string;
  phone: string; // Format international avec indicatif (ex: +54 9 11 1234-5678)
  twitter?: string;
  youtube?: string;
  gender: 'M' | 'F' | 'X';
  nationality?: string;
  birth_date: string;
  last_month_paid: string; // Format "MM/YYYY"
  join_date: string;
  expiration_date: string;
  avatar_color: string;
  consulado?: string;
  role?: string;
  foto?: string; // URL de la photo du socio stockée dans Supabase Storage
}

export interface Consulado {
  id: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  president: string; // Name
  vice_president?: string; // Name or ID
  secretary?: string;
  treasurer?: string;
  vocal?: string; // Legacy/Main vocal
  vocales?: string[]; // New: List of up to 8 vocales
  referente: string; // Nom du socio référent
  email?: string;
  phone?: string;
  foundation_year: string;
  address: string;
  timezone: string;
  social_instagram?: string;
  social_facebook?: string;
  social_x?: string;
  social_tiktok?: string;
  social_youtube?: string;
  website?: string;
  banner: string;
  logo: string;
  is_official?: boolean;
  official_date?: string; // Date d'officialisation (format DD/MM/YYYY)
}

export interface Logo {
  id: string;
  consulado_id: string;
  marco_url: string | null; // URL du logo "marco" (cadre)
  logotipo_url: string | null; // URL du logo "logotipo"
  marco_uploaded_at: string | null;
  logotipo_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppAsset {
  id: string;
  asset_key: string; // Identifiant unique (ex: 'navbar_logo')
  name: string;
  description: string | null;
  category: 'navbar' | 'footer' | 'general' | 'icons';
  file_url: string | null; // Chemin dans Storage
  file_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  fallback_svg: string | null;
  fallback_color: string | null;
  display_size: number;
  is_active: boolean;
  uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  file_path: string; // Chemin complet dans Storage
  file_name: string; // Nom original
  bucket_name: string; // Nom du bucket
  file_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null; // ID utilisateur
  entity_type: string | null; // 'consulado', 'socio', 'team', etc.
  entity_id: string | null; // ID de l'entité
  field_name: string | null; // 'logo', 'banner', 'avatar', etc.
  public_url: string | null;
  is_active: boolean;
  uploaded_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: number;
  // Relational Fields
  rival_id?: string;       // Link to teams table
  competition_id?: string; // Link to competitions table
  
  // Snapshot Fields (Saved at creation for history/display)
  rival: string;
  rival_short: string;
  rival_country: string;
  competition: string;
  
  date: string;
  hour: string;
  venue: string;
  city: string;
  is_home: boolean;
  is_neutral?: boolean;
  fecha_jornada: string;
  is_suspended: boolean;
  
  // Habilitation Logic
  apertura_date: string;
  apertura_hour: string;
  cierre_date: string;
  cierre_hour: string;
  is_list_validated?: boolean; // TRUE si la liste définitive a été validée par les admins
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  country_id: string;
  confederation: 'CONMEBOL' | 'UEFA' | 'CONCACAF' | 'OFC' | 'CAF' | 'AFC' | 'OTHER' | string; // Accepte toutes les confédérations de la base de données
  city: string;
  stadium: string;
  logo?: string;
}

export interface Competition {
  id: string;
  name: string;
  organization: string; // AFA, CONMEBOL, FIFA
  type: string; // Liga, Copa, etc.
  logo: string;
  category: 'NACIONAL' | 'INTERNACIONAL';
}

export interface Mensaje {
  id: string;
  title: string;
  body: string;
  target_consulado_id: string; // 'ALL' or Single ID (Legacy/Display)
  target_ids?: string[]; // New: Multiple IDs
  target_consulado_name: string;
  type: 'INSTITUCIONAL' | 'URGENTE' | 'CONSULAR';
  date: string; // Legacy display date
  start_date?: string; // New: Display from
  end_date?: string; // New: Display until
  created_at: number;
  archived?: boolean; // New: Soft delete status
  is_automatic?: boolean;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Used as Start Date mainly)
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  type: 'EFEMERIDE' | 'IDOLO' | 'INTERNACIONAL' | 'EVENTO' | 'ENCUENTRO' | 'CUMPLEAÑOS';
  description?: string;
  location?: string;
  is_special_day?: boolean;
}

export interface Solicitud {
  id: string;
  match_id: number;
  socio_id: string;
  socio_name: string;
  socio_dni: string;
  socio_category: string;
  consulado: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  cancellation_requested?: boolean; // TRUE si demande d'annulation en cours, FALSE/undefined sinon
  cancellation_rejected?: boolean; // TRUE si demande d'annulation refusée par admins
  timestamp: string;
}

export interface TransferRequest {
  id: string;
  socio_id: string;
  socio_name: string;
  from_consulado_id: string;
  from_consulado_name: string;
  to_consulado_id: string;
  to_consulado_name: string;
  comments?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  request_date: string;
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'PRESIDENTE' | 'REFERENTE' | 'SOCIO';

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  email: string;
  full_name: string;
  role: UserRole;
  consulado_id?: string; // Requis pour PRESIDENTE, REFERENTE
  active: boolean;
  last_login?: string;
  avatar?: string;
  gender?: 'M' | 'F' | 'X'; // Added for gender-aware roles
}

export interface UserSession {
  role: UserRole;
  consulado_id?: string; 
  name: string;
  email?: string;
  gender?: 'M' | 'F' | 'X';
}

export interface AppNotification {
  id: string;
  type: 'TRANSFER' | 'SYSTEM' | 'ALERT';
  title: string;
  message: string;
  date: string;
  read: boolean; // if true, removed from dropdown but visible in full page
  link?: string;
  data?: any;
}

// Historique des présences aux matchs
export interface MatchAttendance {
  id: string;
  match_id: string;
  socio_id: string;
  consulado_id?: string;
  
  // Infos match (dénormalisées)
  match_date: string;
  match_competition?: string;
  match_opponent?: string;
  match_location?: string;
  match_type?: 'LOCAL' | 'VISITANTE';
  
  // Infos socio (dénormalisées)
  socio_name: string;
  socio_numero?: string;
  socio_dni?: string;
  
  // Statut demande
  request_status: 'SOLICITADO' | 'ACEPTADO' | 'RECHAZADO' | 'CANCELADO' | 'EXPIRADO';
  
  // Statut présence (post-match)
  attendance_status?: 'PRESENTE' | 'AUSENTE_SIN_AVISO' | 'AUSENTE_CON_AVISO' | 'ANULADO' | null;
  
  // Métadonnées
  requested_at?: string;
  requested_by?: string;
  processed_at?: string;
  processed_by?: string;
  rejection_reason?: string;
  attendance_recorded_at?: string;
  attendance_recorded_by?: string;
  attendance_notes?: string;
  
  // Places
  places_requested?: number;
  places_granted?: number;
  
  created_at?: string;
  updated_at?: string;
}

// Statistiques d'un socio aux matchs
export interface SocioMatchStats {
  total_requests: number;
  total_accepted: number;
  total_rejected: number;
  total_attended: number;
  total_no_show: number;
  total_excused: number;
  attendance_rate: number | null;
}

export interface AppSettings {
  // Identidad
  appName: string;
  appDescription: string;
  
  // Visual
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string; 
  loginLogoUrl?: string; 
  matchLogoUrl?: string; 
  faviconUrl?: string; 
  transitionLogoUrl?: string;
  // Taille des logos (en pixels)
  logoMenuSize?: number; // Taille du logo dans le menu (défaut: 40)
  logoLoginSize?: number; // Taille du logo sur la page de connexion (défaut: 96)
  logoMatchSize?: number; // Taille du logo de match (défaut: 128)
  logoRivalSize?: number; // Taille du logo de l'équipe adverse (défaut: 128)
  enableAnimations: boolean;
  compactMode: boolean; // For denser tables/lists
  habilitacionesBackgroundImage?: string; // Image de fond pour les cartes d'habilitaciones
  habilitacionesBackgroundOpacity?: number; // Opacité de l'image de fond (0-100, défaut: 20)
  
  // Sistema & Limites
  isMaintenanceMode: boolean;
  maxUploadSize: number; // En MB
  sessionTimeout: number; // En minutes
  enableNotifications: boolean;
}

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
}

export interface Team {
  id: string;
  name: string;
  short_name: string;
  country_id: string;
  confederation: 'CONMEBOL' | 'UEFA' | 'OTHER';
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLATION_REQUESTED';
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
  enableAnimations: boolean;
  compactMode: boolean; // For denser tables/lists
  
  // Sistema & Limites
  isMaintenanceMode: boolean;
  maxUploadSize: number; // En MB
  sessionTimeout: number; // En minutes
  enableNotifications: boolean;
}
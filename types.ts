
export interface Socio {
  id: string;
  numeroSocio?: string; // Mappé depuis numero_socio (DB)
  firstName: string;
  lastName: string;
  name: string; // Nom complet (prénom + nom)
  dni: string;
  category: 'ACTIVO' | 'ADHERENTE' | 'INTERNACIONAL' | 'CADETE' | 'MENOR' | 'VITALICIO' | 'BEBÉ' | 'ACTIVO EXTERIOR';
  status: 'AL DÍA' | 'EN DEUDA' | 'DE BAJA';
  email: string;
  phone: string;
  phoneSecondary?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  youtube?: string;
  gender: 'M' | 'F' | 'X';
  nationality?: string;
  birthDate: string;
  lastMonthPaid: string; // Format "MM/YYYY"
  emergencyContact?: string;
  joinDate: string;
  expirationDate: string;
  avatarColor: string;
  avatar?: string;
  consulado?: string;
  role?: string;
}

export interface Consulado {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  president: string; // Name
  vicePresident?: string; // Name or ID
  secretary?: string;
  treasurer?: string;
  vocal?: string; // Legacy/Main vocal
  vocales?: string[]; // New: List of up to 8 vocales
  referente: string; // Nom du socio référent
  email?: string;
  phone?: string;
  foundationYear: string;
  address: string;
  timezone: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialX?: string;
  socialTikTok?: string;
  socialYouTube?: string;
  website?: string;
  banner: string;
  logo: string;
  isOfficial?: boolean;
}

export interface Match {
  id: number;
  // Relational Fields
  rivalId?: string;       // Link to teams table
  competitionId?: string; // Link to competitions table
  
  // Snapshot Fields (Saved at creation for history/display)
  rival: string;
  rivalShort: string;
  rivalCountry: string;
  competition: string;
  
  date: string;
  hour: string;
  venue: string;
  city: string;
  isHome: boolean;
  isNeutral?: boolean;
  fechaJornada: string;
  isSuspended: boolean;
  
  // Habilitation Logic
  aperturaDate: string;
  aperturaHour: string;
  cierreDate: string;
  cierreHour: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  countryId: string;
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
  targetConsuladoId: string; // 'ALL' or Single ID (Legacy/Display)
  targetIds?: string[]; // New: Multiple IDs
  targetConsuladoName: string;
  type: 'INSTITUCIONAL' | 'URGENTE' | 'CONSULAR';
  date: string; // Legacy display date
  startDate?: string; // New: Display from
  endDate?: string; // New: Display until
  created_at: number;
  archived?: boolean; // New: Soft delete status
  isAutomatic?: boolean;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD (Used as Start Date mainly)
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  type: 'EFEMERIDE' | 'IDOLO' | 'INTERNACIONAL' | 'EVENTO' | 'ENCUENTRO' | 'CUMPLEAÑOS';
  description?: string;
  location?: string;
  isSpecialDay?: boolean;
}

export interface Solicitud {
  id: string;
  matchId: number;
  socioId: string;
  socioName: string;
  socioDni: string;
  socioCategory: string;
  consulado: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLATION_REQUESTED';
  timestamp: string;
}

export interface TransferRequest {
  id: string;
  socioId: string;
  socioName: string;
  fromConsuladoId: string;
  fromConsuladoName: string;
  toConsuladoId: string;
  toConsuladoName: string;
  comments?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  requestDate: string;
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'PRESIDENTE' | 'REFERENTE' | 'SOCIO';

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  email: string;
  fullName: string;
  role: UserRole;
  consuladoId?: string; // Requis pour PRESIDENTE, REFERENTE
  active: boolean;
  lastLogin?: string;
  avatar?: string;
  gender?: 'M' | 'F' | 'X'; // Added for gender-aware roles
}

export interface UserSession {
  role: UserRole;
  consuladoId?: string; 
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
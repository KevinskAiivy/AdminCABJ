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

const mapMatchFromDB = (db: any): Match => ({
    id: db.id || 0,
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
});

const mapMatchToDB = (m: Partial<Match>) => {
    const payload: any = {};
    if (m.rival !== undefined) payload.rival = m.rival || '';
    if (m.rivalShort !== undefined) payload.rival_short = m.rivalShort || '';
    if (m.rivalCountry !== undefined) payload.rival_country = m.rivalCountry || '';
    if (m.competition !== undefined) payload.competition = m.competition || '';
    if (m.date !== undefined) payload.date = m.date || '';
    if (m.hour !== undefined) payload.hour = m.hour || '';
    if (m.venue !== undefined) payload.venue = m.venue || '';
    if (m.city !== undefined) payload.city = m.city || '';
    if (m.isHome !== undefined) payload.is_home = Boolean(m.isHome);
    if (m.isNeutral !== undefined) payload.is_neutral = Boolean(m.isNeutral);
    if (m.fechaJornada !== undefined) payload.fecha_jornada = m.fechaJornada || '';
    if (m.isSuspended !== undefined) payload.is_suspended = Boolean(m.isSuspended);
    if (m.aperturaDate !== undefined) payload.apertura_date = m.aperturaDate || null;
    if (m.aperturaHour !== undefined) payload.apertura_hour = m.aperturaHour || null;
    if (m.cierreDate !== undefined) payload.cierre_date = m.cierreDate || null;
    if (m.cierreHour !== undefined) payload.cierre_hour = m.cierreHour || null;
    if (m.competitionId !== undefined) payload.competition_id = m.competitionId || null;
    if (m.rivalId !== undefined) payload.rival_id = m.rivalId || null;
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

      this.loadingMessage = "Connexion à la base de données...";
      try {
          // 1. Fetch Users
          const { data: usersData, error: usersError } = await supabase.from('users').select('*');
          if (usersData) this.users = usersData.map((u: any) => ({ ...u, fullName: u.full_name, consuladoId: u.consulado_id }));

          // 2. Fetch Consulados
          console.log("🔍 Début du chargement des consulados...");
          const { data: consuladosData, error: consuladosError } = await supabase.from('consulados').select('*');
          
          if (consuladosError) {
              console.error("❌ Error fetching consulados:", consuladosError);
              console.error("Détails de l'erreur:", JSON.stringify(consuladosError, null, 2));
          }
          
          console.log(`📊 Données brutes reçues de Supabase:`, {
              count: consuladosData?.length || 0,
              isArray: Array.isArray(consuladosData),
              data: consuladosData
          });
          
          if (consuladosData && Array.isArray(consuladosData)) {
              console.log(`✅ ${consuladosData.length} consulados trouvés dans la base de données`);
              
              this.consulados = consuladosData.map((db: any, index: number) => {
                  console.log(`📝 Mapping consulado ${index + 1}:`, {
                      id: db.id,
                      name: db.name,
                      rawData: db
                  });
                  
                  const mapped = mapConsuladoFromDB(db);
                  
                  console.log(`✅ Consulado mappé ${index + 1}:`, {
                      id: mapped.id,
                      name: mapped.name,
                      city: mapped.city,
                      country: mapped.country
                  });
                  
                  // Log de débogage pour les consulados avec des données problématiques
                  if (!mapped.name || !mapped.id) {
                      console.warn("⚠️ Consulado avec données incomplètes mappé:", { 
                          index: index + 1,
                          db, 
                          mapped 
                      });
                  }
                  
                  return mapped;
              });
              
              console.log(`✅ Total de ${this.consulados.length} consulados chargés et mappés`);
              console.log("📋 Liste des consulados mappés:", this.consulados.map(c => ({ id: c.id, name: c.name })));
              
              // Vérifier et créer "SEDE CENTRAL" s'il n'existe pas
              await this.ensureSedeCentralExists();
          } else {
              console.warn("⚠️ No consulados data received from database ou format invalide");
              console.warn("Type de données reçues:", typeof consuladosData);
              this.consulados = [];
              // Créer SEDE CENTRAL même si aucun consulado n'existe
              await this.ensureSedeCentralExists();
          }

          // 3. Fetch Socios (with pagination to get all records - no limit)
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
                  // If we got less than sociosPageSize, we've reached the end
                  sociosHasMore = sociosData.length === sociosPageSize;
                  sociosFrom += sociosPageSize;
              } else {
                  sociosHasMore = false;
              }
          }
          
          this.socios = allSocios.map(mapSocioFromDB);
          console.log(`Loaded ${this.socios.length} socios from database`);
          
          // Assigner "SEDE CENTRAL" aux socios sans consulado
          await this.assignSociosToSedeCentral();

          // 4. Fetch Matches
          const { data: matchesData } = await supabase.from('matches').select('*');
          if (matchesData) this.matches = matchesData.map(mapMatchFromDB);

          // 5. Fetch Competitions & Teams
          const { data: compsData } = await supabase.from('competitions').select('*');
          if (compsData) this.competitions = compsData;
          
          // Fetch Teams with pagination to get all records
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
          
          if (allTeams.length > 0) {
              this.teams = allTeams.map((t: any) => ({
                  id: t.id,
                  name: t.name || '',
                  shortName: t.short_name || t.shortName || '',
                  countryId: t.country_id || t.countryId || 'AR',
                  confederation: t.confederation || 'CONMEBOL',
                  city: t.city || '',
                  stadium: t.stadium || '',
                  logo: t.logo || ''
              }));
          }
          console.log(`Loaded ${this.teams.length} teams from database`);

          // 6. Fetch Agenda & Mensajes
          const { data: agendaData } = await supabase.from('agenda').select('*');
          if (agendaData) this.agenda = agendaData.map((a: any) => ({...a, startDate: a.start_date, endDate: a.end_date, isSpecialDay: a.is_special_day}));

          const { data: msgsData } = await supabase.from('mensajes').select('*');
          if (msgsData) this.mensajes = msgsData.map((m: any) => ({...m, targetConsuladoId: m.target_consulado_id, targetConsuladoName: m.target_consulado_name, targetIds: m.target_ids}));

          this.isConnected = true;
      } catch (error: any) {
          console.error("Supabase Init Error:", error);
          this.connectionError = error.message;
          this.isConnected = false;
      } finally {
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

  // Assigner "SEDE CENTRAL" aux socios qui n'ont pas de consulado
  private async assignSociosToSedeCentral() {
      const sedeCentralName = 'SEDE CENTRAL';
      // Vérifier dans la liste actuelle ou dans getConsulados() qui inclut le virtuel
      const allConsulados = this.getConsulados();
      const sedeCentral = allConsulados.find(
          c => c.name && c.name.toUpperCase() === sedeCentralName.toUpperCase()
      );

      if (!sedeCentral) {
          console.warn("⚠️ SEDE CENTRAL n'existe pas, impossible d'assigner les socios");
          return;
      }

      // Trouver les socios sans consulado ou avec consulado vide/null
      const sociosWithoutConsulado = this.socios.filter(
          s => !s.consulado || s.consulado.trim() === ''
      );

      if (sociosWithoutConsulado.length === 0) {
          console.log("✅ Tous les socios ont déjà un consulado assigné");
          return;
      }

      console.log(`🔄 Assignation de ${sociosWithoutConsulado.length} socio(s) à SEDE CENTRAL...`);

      // Mettre à jour les socios localement
      const updatedSocios = this.socios.map(s => {
          if (!s.consulado || s.consulado.trim() === '') {
              return { ...s, consulado: sedeCentralName };
          }
          return s;
      });
      this.socios = updatedSocios;
      this.notify();

      // Mettre à jour dans la base de données (en batch pour éviter trop de requêtes)
      const batchSize = 50;
      for (let i = 0; i < sociosWithoutConsulado.length; i += batchSize) {
          const batch = sociosWithoutConsulado.slice(i, i + batchSize);
          const updates = batch.map(socio => ({
              id: socio.id,
              consulado_name: sedeCentralName
          }));

          try {
              // Mettre à jour chaque socio individuellement (Supabase ne supporte pas les updates multiples avec différentes conditions)
              for (const update of updates) {
                  const { error } = await supabase
                      .from('socios')
                      .update({ consulado_name: sedeCentralName })
                      .eq('id', update.id);
                  
                  if (error) {
                      console.error(`❌ Erreur lors de la mise à jour du socio ${update.id}:`, error);
                  }
              }
          } catch (error: any) {
              console.error(`❌ Erreur lors de la mise à jour du batch de socios:`, error);
          }
      }

      console.log(`✅ ${sociosWithoutConsulado.length} socio(s) assigné(s) à SEDE CENTRAL`);
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
  async addMatch(m: Match) { 
      this.matches.push(m); this.notify();
      const { error } = await supabase.from('matches').insert([mapMatchToDB(m)]);
      if (error) throw new Error(error.message);
  }
  async updateMatch(m: Match) { 
      this.matches = this.matches.map(x => x.id === m.id ? m : x); this.notify();
      const { error } = await supabase.from('matches').update(mapMatchToDB(m)).eq('id', m.id);
      if (error) throw new Error(error.message);
  }
  async deleteMatch(id: number) { 
      this.matches = this.matches.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('matches').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getTeams() { return this.teams; }
  async addTeam(t: Team) { 
      this.teams.push(t); this.notify();
      const payload: any = {
          id: t.id || crypto.randomUUID(),
          name: t.name || '',
          short_name: t.shortName || '',
          country_id: t.countryId || 'AR',
          confederation: t.confederation || 'CONMEBOL',
          city: t.city || '',
          stadium: t.stadium || '',
          logo: t.logo || null
      };
      const { error } = await supabase.from('teams').insert([payload]);
      if (error) throw new Error(error.message);
  }
  async updateTeam(t: Team) { 
      this.teams = this.teams.map(x => x.id === t.id ? t : x); this.notify();
      const payload: any = {
          name: t.name || '',
          short_name: t.shortName || '',
          country_id: t.countryId || 'AR',
          confederation: t.confederation || 'CONMEBOL',
          city: t.city || '',
          stadium: t.stadium || '',
          logo: t.logo || null
      };
      const { error } = await supabase.from('teams').update(payload).eq('id', t.id);
      if (error) throw new Error(error.message);
  }
  async deleteTeam(id: string) { 
      this.teams = this.teams.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('teams').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getCompetitions() { return this.competitions; }
  async addCompetition(c: Competition) { 
      this.competitions.push(c); this.notify();
      const { error } = await supabase.from('competitions').insert([c]);
      if (error) throw new Error(error.message);
  }
  async updateCompetition(c: Competition) { 
      this.competitions = this.competitions.map(x => x.id === c.id ? c : x); this.notify();
      const { error } = await supabase.from('competitions').update(c).eq('id', c.id);
      if (error) throw new Error(error.message);
  }
  async deleteCompetition(id: string) { 
      this.competitions = this.competitions.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('competitions').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getAgendaEvents() { return this.agenda; }
  async addAgendaEvent(e: AgendaEvent) { 
      this.agenda.push(e); this.notify();
      const { error } = await supabase.from('agenda').insert([{
          id: e.id, title: e.title, date: e.date, start_date: e.startDate, 
          end_date: e.endDate, type: e.type, description: e.description, 
          location: e.location, is_special_day: e.isSpecialDay
      }]);
      if (error) throw new Error(error.message);
  }
  async updateAgendaEvent(e: AgendaEvent) { 
      this.agenda = this.agenda.map(x => x.id === e.id ? e : x); this.notify();
      const { error } = await supabase.from('agenda').update({
          title: e.title, date: e.date, start_date: e.startDate, 
          end_date: e.endDate, type: e.type, description: e.description, 
          location: e.location, is_special_day: e.isSpecialDay
      }).eq('id', e.id);
      if (error) throw new Error(error.message);
  }
  async deleteAgendaEvent(id: string) { 
      this.agenda = this.agenda.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('agenda').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getMensajes(cId?: string) { return this.mensajes; }
  async addMensaje(m: Mensaje) { 
      this.mensajes.push(m); this.notify();
      const { error } = await supabase.from('mensajes').insert([{
          id: m.id, title: m.title, body: m.body, type: m.type, date: m.date,
          target_consulado_id: m.targetConsuladoId, target_ids: m.targetIds,
          target_consulado_name: m.targetConsuladoName, created_at: m.created_at
      }]);
      if (error) throw new Error(error.message);
  }
  async updateMensaje(m: Mensaje) { 
      this.mensajes = this.mensajes.map(x => x.id === m.id ? m : x); this.notify();
      const { error } = await supabase.from('mensajes').update({
          title: m.title, body: m.body, type: m.type, target_ids: m.targetIds
      }).eq('id', m.id);
      if (error) throw new Error(error.message);
  }
  async deleteMensaje(id: string) { 
      this.mensajes = this.mensajes.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('mensajes').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getUsers() { return this.users; }
  async addUser(u: AppUser) { 
      this.users.push(u); this.notify();
      const { error } = await supabase.from('users').insert([{
          id: u.id, username: u.username, password: u.password, email: u.email,
          full_name: u.fullName, role: u.role, consulado_id: u.consuladoId, active: u.active
      }]);
      if (error) throw new Error(error.message);
  }
  async updateUser(u: AppUser) { 
      this.users = this.users.map(x => x.id === u.id ? u : x); this.notify();
      const payload: any = {
          username: u.username, email: u.email, full_name: u.fullName, 
          role: u.role, consulado_id: u.consuladoId, active: u.active
      };
      if (u.password) payload.password = u.password;
      const { error } = await supabase.from('users').update(payload).eq('id', u.id);
      if (error) throw new Error(error.message);
  }
  async deleteUser(id: string) { 
      this.users = this.users.filter(x => x.id !== id); this.notify();
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw new Error(error.message);
  }

  getSolicitudes(mId: number, cName?: string) { 
      let res = this.solicitudes.filter(s => s.matchId === mId); 
      if (cName) res = res.filter(s => s.consulado === cName);
      return res;
  }
  async createSolicitud(s: Solicitud) { 
      this.solicitudes.push(s); this.notify(); 
  }
  async updateSolicitudStatus(id: string, status: any) { 
      this.solicitudes = this.solicitudes.map(s => s.id === id ? { ...s, status } : s); this.notify(); 
  }

  async deleteNotification(id: string) { this.notifications = this.notifications.filter(n => n.id !== id); this.notify(); }
  getNotificationsForUser(u: any) { return this.notifications; }
  markNotificationAsRead(id: string) { this.notifications = this.notifications.map(n => n.id === id ? {...n, read: true} : n); this.notify(); }
  
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
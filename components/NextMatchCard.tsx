
import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Trophy } from 'lucide-react';
import { BocaLogoSVG } from '../constants';
import { dataService } from '../services/dataService';

// Flag helper
const getFlag = (code: string) => {
    const flags: Record<string, string> = {
        'AR': '🇦🇷', 'ES': '🇪🇸', 'US': '🇺🇸', 'IT': '🇮🇹', 'FR': '🇫🇷', 
        'BR': '🇧🇷', 'UY': '🇺🇾', 'PY': '🇵🇾', 'CL': '🇨🇱', 'BO': '🇧🇴',
        'PE': '🇵🇪', 'CO': '🇨🇴', 'EC': '🇪🇨', 'VE': '🇻🇪', 'MX': '🇲🇽'
    };
    return flags[code] || '🇦🇷';
};

const CountdownUnit = ({ value, label }: { value: number, label: string }) => (
  <div className="flex flex-col items-center gap-0 group">
    <div className="relative w-6 h-7 md:w-7 md:h-8 bg-[#FCB131] rounded flex items-center justify-center shadow-[0_2px_8px_rgba(252,177,49,0.3)] overflow-hidden group-hover:scale-105 transition-all duration-300 border border-[#FFD23F]">
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div key={value} className="relative z-10 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <span className="oswald text-sm md:text-base font-black text-[#001d4a] leading-none tracking-tighter">
                {value.toString().padStart(2, '0')}
            </span>
        </div>
    </div>
    <span className="text-[4px] md:text-[5px] text-[#FCB131] font-black uppercase tracking-[0.1em] opacity-70">{label}</span>
  </div>
);

interface NextMatchCardProps {
    match: any;
    userTimezone?: string; // e.g., "UTC+01:00 (Madrid/París)"
    userCountryCode?: string; // e.g., "ES"
}

// Fonction pour formater la date au format jj.mm.aaaa
const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '--.--.----';
    if (dateStr.includes('-')) {
        const [y, m, d] = dateStr.split('-');
        // Format jj.mm.aaaa
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }
    if (dateStr.includes('/')) {
        const [d, m, y] = dateStr.split('/');
        // Format jj.mm.aaaa
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }
    return dateStr;
};

export const NextMatchCard = ({ match, userTimezone, userCountryCode }: NextMatchCardProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [rivalLogo, setRivalLogo] = useState<string | null>(null);
  const [compLogo, setCompLogo] = useState<string | null>(null);
  const [bocaLogo, setBocaLogo] = useState<string | null>(null);
  const [displayTime, setDisplayTime] = useState(match.hour);
  const [displayFlag, setDisplayFlag] = useState('🇦🇷');
  const [logoMatchSize, setLogoMatchSize] = useState<number>(128);
  const [logoRivalSize, setLogoRivalSize] = useState<number>(128);

  useEffect(() => {
    if (!match || !match.date || !match.hour) return;

    // Fonction pour mettre à jour les logos
    const updateLogos = () => {
        const teams = dataService.getTeams();
        
        // Chercher le logo de Boca dans la table teams
        const bocaTeam = teams.find(t => 
          t.name && (
            t.name.toLowerCase().includes('boca') ||
            t.name.toLowerCase().includes('club atlético boca juniors')
          )
        );
        
        if (bocaTeam?.logo) {
          setBocaLogo(bocaTeam.logo);
        } else {
          // Fallback vers app_assets si Boca n'est pas dans teams
          setBocaLogo(dataService.getAssetUrl('match_logo'));
        }
        
        // Taille depuis app_assets
        const matchAsset = dataService.getAssetByKey('match_logo');
        if (matchAsset) {
          setLogoMatchSize(matchAsset.display_size || 128);
          setLogoRivalSize(matchAsset.display_size || 128);
        }
        // Recherche plus robuste : par ID d'abord, puis par nom (insensible à la casse et trim)
        const foundTeam = teams.find(t => 
            (match.rival_id && t.id === match.rival_id) || 
            (match.rival && t.name && t.name.trim().toLowerCase() === match.rival.trim().toLowerCase())
        ) || teams.find(t => 
            match.rival && t.name && (
                t.name.trim().toLowerCase().includes(match.rival.trim().toLowerCase()) ||
                match.rival.trim().toLowerCase().includes(t.name.trim().toLowerCase())
            )
        );
        setRivalLogo(foundTeam?.logo || null);

        const competitions = dataService.getCompetitions();
        // Try precise match then fuzzy
        const foundComp = competitions.find(c => c.name === match.competition) || competitions.find(c => match.competition.includes(c.name));
        setCompLogo(foundComp?.logo || null);
    };
    
    // Charger les logos immédiatement
    updateLogos();

    // 1. Calculate Countdown
    const calculateTimeLeft = () => {
        let d, M, y;
        // Robust Date Parsing
        if (match.date.includes('/')) {
            // DD/MM/YYYY
            [d, M, y] = match.date.split('/').map(Number);
        } else if (match.date.includes('-')) {
            // YYYY-MM-DD
            [y, M, d] = match.date.split('-').map(Number);
        } else {
            return;
        }

        const [h, min] = match.hour.split(':').map(Number);
        const dateObj = new Date(y, M - 1, d, h, min);

        const diff = dateObj.getTime() - new Date().getTime();
        if (diff > 0) {
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                mins: Math.floor((diff % 3600000) / 60000),
                secs: Math.floor((diff % 60000) / 1000)
            });
        } else {
             setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    // 2. Timezone Conversion Logic - Convertir l'heure du match (UTC-3 Buenos Aires) vers l'heure locale du consulado
    const [h, min] = match.hour.split(':').map(Number);
    
    // Parser le timezone du consulado (format: "UTC-03:00 (Buenos Aires)" ou "UTC+01:00 (Madrid/París)")
    let displayTimeStr = '';
    let displayFlagStr = '🇦🇷';
    
    if (userTimezone && userTimezone.trim() !== '' && userTimezone !== 'UTC-03:00 (Buenos Aires)' && userTimezone !== 'UTC-3 (Buenos Aires)') {
        // Extraire l'offset du timezone (format: UTC-03:00 ou UTC+01:00)
        const offsetMatch = userTimezone.match(/UTC([+-])(\d{1,2}):?(\d{2})?/);
        
        if (offsetMatch) {
            const sign = offsetMatch[1] === '+' ? 1 : -1;
            const hours = parseInt(offsetMatch[2] || '0');
            const minutes = offsetMatch[3] ? parseInt(offsetMatch[3]) : 0;
            
            // L'heure du match est en UTC-3 (Buenos Aires)
            const matchOffsetMinutes = -3 * 60; // -180 minutes
            
            // Calculer l'offset du consulado en minutes
            const consuladoOffsetMinutes = sign * (hours * 60 + minutes);
            
            // Calculer la différence en minutes entre le timezone du consulado et UTC-3
            const diffMinutes = consuladoOffsetMinutes - matchOffsetMinutes;
            
            // Convertir l'heure du match en minutes totales
            const matchTotalMinutes = h * 60 + min;
            
            // Ajouter la différence
            let newTotalMinutes = matchTotalMinutes + diffMinutes;
            
            // Gérer les cas où on dépasse 24h ou on est en négatif
            while (newTotalMinutes < 0) newTotalMinutes += 24 * 60;
            while (newTotalMinutes >= 24 * 60) newTotalMinutes -= 24 * 60;
            
            // Convertir en heures et minutes
            const newH = Math.floor(newTotalMinutes / 60);
            const newM = newTotalMinutes % 60;
            
            displayTimeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')} hs`;
            displayFlagStr = getFlag(userCountryCode || '');
        } else {
            // Si le parsing échoue, utiliser l'heure originale
            displayTimeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} hs`;
            displayFlagStr = '🇦🇷';
        }
    } else {
        // Pas de conversion nécessaire (déjà en UTC-3)
        displayTimeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} hs`;
        displayFlagStr = '🇦🇷';
    }
    
    setDisplayTime(displayTimeStr);
    setDisplayFlag(displayFlagStr);

    // S'abonner aux mises à jour des données pour recharger les logos
    const unsubscribe = dataService.subscribe(updateLogos);

    return () => {
        clearInterval(timer);
        unsubscribe();
    };
  }, [match, userTimezone, userCountryCode]);

  if (!match) return null;

  return (
    <div className="relative w-full flex flex-col bg-[#00040a] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden group transition-all hover:border-white/10">
          
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 animate-pan-zoom"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-[#000d24] via-[#001d4a]/95 to-[#000d24]"></div>
      </div>
      
      {/* Glow Effects */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#003B94]/40 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-[#FCB131]/10 rounded-full blur-[120px] animate-bounce duration-[15s] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center py-8 px-4 gap-6">
          
          {/* 1. COMPETITION HEADER - Compact */}
          <div className="flex flex-col items-center gap-1 w-full">
              {/* Logo and Competition Name on Same Line */}
              <div className="flex items-center justify-center gap-2">
                  {/* Dynamic Competition Logo */}
                  <div className="relative h-10 flex items-center justify-center shrink-0">
                      {compLogo ? (
                          (compLogo.startsWith('data:') || compLogo.startsWith('http') || compLogo.length > 5) ? (
                              <img 
                                src={compLogo} 
                                alt={match.competition} 
                                className="h-full w-auto object-contain drop-shadow-[0_0_10px_rgba(252,177,49,0.3)] relative z-10 filter brightness-110"
                              />
                          ) : (
                              // Fallback Text Code
                              <div className="h-8 w-8 bg-[#001d4a] rounded-lg border border-[#FCB131] flex items-center justify-center shadow-md">
                                  <span className="oswald text-sm font-black text-[#FCB131] tracking-tighter">{compLogo}</span>
                              </div>
                          )
                      ) : (
                          <Trophy className="text-[#FCB131] drop-shadow-lg" size={20} />
                      )}
                  </div>

                  <div className="flex flex-col items-start">
                      <h2 className="oswald text-sm md:text-base font-black uppercase text-white tracking-[0.15em] leading-none drop-shadow-md">
                          {match.competition}
                      </h2>
                      <span className="text-[#FCB131] oswald text-[10px] font-bold uppercase tracking-[0.2em] drop-shadow-sm">
                          {match.fecha_jornada || 'PRÓXIMO PARTIDO'}{match.venue ? ` - ${match.venue}` : ''}
                      </span>
                  </div>
              </div>
          </div>

          {/* 2. COUNTDOWN - Petit et en haut */}
          <div className="flex items-center gap-1 bg-black/30 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/5 shadow-lg">
              <CountdownUnit value={timeLeft.days} label="D" />
              <span className="oswald text-sm text-[#FCB131] mt-[-8px] font-bold animate-pulse">:</span>
              <CountdownUnit value={timeLeft.hours} label="H" />
              <span className="oswald text-sm text-[#FCB131] mt-[-8px] font-bold animate-pulse">:</span>
              <CountdownUnit value={timeLeft.mins} label="M" />
              <span className="oswald text-sm text-[#FCB131] mt-[-8px] font-bold animate-pulse">:</span>
              <CountdownUnit value={timeLeft.secs} label="S" />
          </div>

          {/* 3. TEAMS - Logos au centre, proches */}
          <div className="w-full flex items-center justify-center gap-6 md:gap-10">
              
              {/* Boca Logo */}
              <div className="flex flex-col items-center gap-1 text-center group/team">
                  <div className="relative drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover/team:scale-110 transition-transform duration-500 flex items-center justify-center">
                      {bocaLogo ? (
                        <img 
                            src={bocaLogo} 
                            alt="Boca" 
                            style={{ width: `${logoMatchSize * 0.7}px`, height: `${logoMatchSize * 0.7}px` }}
                            className="object-contain filter brightness-110"
                            onError={() => setBocaLogo(null)}
                        />
                      ) : (
                        <BocaLogoSVG 
                            style={{ width: `${logoMatchSize * 0.7}px`, height: `${logoMatchSize * 0.7}px` }}
                            className="filter brightness-110" 
                        />
                      )}
                  </div>
                  <h3 className="oswald text-[10px] md:text-xs font-black uppercase text-white tracking-tight drop-shadow-md">Boca Juniors</h3>
              </div>

              {/* VS + Date/Heure */}
              <div className="flex flex-col items-center gap-1">
                  <span className="oswald text-xl md:text-2xl font-black text-white/20 tracking-tighter">VS</span>
                  <div className="flex flex-col items-center">
                      <span className="oswald text-base md:text-lg font-black text-white tracking-tighter leading-none">
                          {formatDateDisplay(match.date)}
                      </span>
                      <span className="oswald text-sm md:text-base font-black text-[#FCB131] tracking-tight">
                          {displayTime}
                      </span>
                  </div>
              </div>

              {/* Rival Logo */}
              <div className="flex flex-col items-center gap-1 text-center group/team">
                  <div className="relative flex items-center justify-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover/team:scale-110 transition-transform duration-500">
                      {rivalLogo ? (
                          <img 
                              src={rivalLogo} 
                              alt={match.rival} 
                              style={{ width: `${logoRivalSize * 0.7}px`, height: `${logoRivalSize * 0.7}px` }}
                              className="object-contain filter brightness-110" 
                          />
                      ) : (
                          <span 
                              className="oswald font-black text-white/10 italic tracking-tighter select-none"
                              style={{ fontSize: `${logoRivalSize * 0.25}px` }}
                          >
                              {match.rival_short}
                          </span>
                      )}
                  </div>
                  <h3 className="oswald text-[10px] md:text-xs font-black uppercase text-white/80 tracking-tight truncate max-w-[100px]" title={match.rival}>
                      {match.rival}
                  </h3>
              </div>
          </div>

      </div>
    </div>
  );
};

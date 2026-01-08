
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
  <div className="flex flex-col items-center gap-0.5 group">
    <div className="relative w-12 h-14 md:w-14 md:h-16 bg-[#FCB131] rounded-xl flex items-center justify-center shadow-[0_4px_15px_rgba(252,177,49,0.4)] overflow-hidden group-hover:scale-105 transition-all duration-300 border border-[#FFD23F]">
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div key={value} className="relative z-10 animate-in slide-in-from-bottom-2 fade-in duration-500">
            <span className="oswald text-3xl md:text-4xl font-black text-[#001d4a] leading-none tracking-tighter">
                {value.toString().padStart(2, '0')}
            </span>
        </div>
    </div>
    <span className="text-[7px] md:text-[8px] text-[#FCB131] font-black uppercase tracking-[0.2em] opacity-80">{label}</span>
  </div>
);

interface NextMatchCardProps {
    match: any;
    userTimezone?: string; // e.g., "UTC+01:00 (Madrid/París)"
    userCountryCode?: string; // e.g., "ES"
}

export const NextMatchCard = ({ match, userTimezone, userCountryCode }: NextMatchCardProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [rivalLogo, setRivalLogo] = useState<string | null>(null);
  const [compLogo, setCompLogo] = useState<string | null>(null);
  const [settings, setSettings] = useState(dataService.getAppSettings());
  const [displayTime, setDisplayTime] = useState(match.hour);
  const [displayFlag, setDisplayFlag] = useState('🇦🇷');

  useEffect(() => {
    if (!match || !match.date || !match.hour) return;

    setSettings(dataService.getAppSettings());

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

    // 2. Timezone Conversion Logic (Strict HH:mm)
    const [h, min] = match.hour.split(':').map(Number);
    
    if (userTimezone && userTimezone !== 'UTC-3 (Buenos Aires)') {
        const offsetMatch = userTimezone.match(/UTC([+-]\d{1,2}):/);
        const offsetHours = offsetMatch ? parseInt(offsetMatch[1]) : -3;
        const diffHours = offsetHours - (-3); // Match is normally UTC-3
        
        let newH = h + diffHours;
        // Handle simple overflow
        if (newH >= 24) newH -= 24;
        if (newH < 0) newH += 24;

        setDisplayTime(`${newH.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        setDisplayFlag(getFlag(userCountryCode || ''));
    } else {
        setDisplayTime(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        setDisplayFlag('🇦🇷');
    }

    // 3. Fetch Logos dynamically from DB
    const teams = dataService.getTeams();
    const foundTeam = teams.find(t => t.name === match.rival);
    setRivalLogo(foundTeam?.logo || null);

    const competitions = dataService.getCompetitions();
    // Try precise match then fuzzy
    const foundComp = competitions.find(c => c.name === match.competition) || competitions.find(c => match.competition.includes(c.name));
    setCompLogo(foundComp?.logo || null);

    return () => clearInterval(timer);
  }, [match, userTimezone, userCountryCode]);

  if (!match) return null;

  return (
    <div className="relative w-full min-h-[380px] md:min-h-[420px] flex flex-col bg-[#00040a] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/5 overflow-hidden group transition-all hover:border-white/10">
          
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-20 animate-pan-zoom"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-[#000d24] via-[#001d4a]/95 to-[#000d24]"></div>
      </div>
      
      {/* Glow Effects */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-[#003B94]/40 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-[#FCB131]/10 rounded-full blur-[120px] animate-bounce duration-[15s] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center justify-between h-full py-8 px-4 gap-6">
          
          {/* 1. COMPETITION HEADER */}
          <div className="flex flex-col items-center gap-2 w-full">
              {/* Dynamic Competition Logo */}
              <div className="relative h-16 flex items-center justify-center">
                  {compLogo ? (
                      (compLogo.startsWith('data:') || compLogo.startsWith('http') || compLogo.length > 5) ? (
                          <img 
                            src={compLogo} 
                            alt={match.competition} 
                            className="h-full w-auto object-contain drop-shadow-[0_0_15px_rgba(252,177,49,0.4)] relative z-10 filter brightness-110"
                          />
                      ) : (
                          // Fallback Text Code
                          <div className="h-12 w-12 bg-[#001d4a] rounded-xl border border-[#FCB131] flex items-center justify-center shadow-lg">
                              <span className="oswald text-xl font-black text-[#FCB131] tracking-tighter">{compLogo}</span>
                          </div>
                      )
                  ) : (
                      <Trophy className="text-[#FCB131] drop-shadow-lg" size={32} />
                  )}
              </div>

              <div className="flex flex-col items-center">
                  <h2 className="oswald text-xl md:text-2xl font-black uppercase text-white tracking-[0.2em] leading-none text-center drop-shadow-md">
                      {match.competition}
                  </h2>
                  <span className="text-[#FCB131] oswald text-xs font-bold uppercase tracking-[0.25em] mt-1 drop-shadow-sm">
                      {match.fechaJornada || 'PRÓXIMO PARTIDO'}
                  </span>
              </div>
          </div>

          {/* 2. MATCH INFO (Teams vs Clock) */}
          <div className="w-full flex items-center justify-center gap-4 md:gap-16 flex-1">
              
              {/* Boca Logic */}
              <div className="flex-1 flex flex-col items-center gap-2 text-center group/team">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover/team:scale-110 transition-transform duration-500 flex items-center justify-center">
                      {settings.matchLogoUrl ? (
                          <img src={settings.matchLogoUrl} alt="Boca" className="w-full h-full object-contain filter brightness-110" />
                      ) : (
                          <BocaLogoSVG className="w-full h-full filter brightness-110" />
                      )}
                  </div>
                  <h3 className="oswald text-lg md:text-xl font-black uppercase text-white tracking-tight drop-shadow-md">Boca Juniors</h3>
              </div>

              {/* Central Info */}
              <div className="flex flex-col items-center gap-6 shrink-0 z-20">
                  
                  {/* Clock (Strictly HH:mm, no seconds) - REDUCED SIZE */}
                  <div className="flex items-baseline gap-2 animate-in zoom-in duration-700">
                      <span className="text-xl drop-shadow-md grayscale-[0.2] hover:grayscale-0 transition-all cursor-help" title={`Hora local: ${userCountryCode || 'AR'}`}>
                          {displayFlag}
                      </span>
                      <span className="oswald text-xl md:text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(252,177,49,0.4)] leading-none">
                          {displayTime}
                      </span>
                      <span className="text-[#FCB131] text-[8px] font-black uppercase tracking-widest">HS</span>
                  </div>

                  {/* Countdown (Larger, Yellow BG, Blue Text, WITH SECONDS) */}
                  <div className="flex items-center gap-2 md:gap-3 bg-black/40 backdrop-blur-xl p-5 rounded-2xl border border-white/5 shadow-2xl transform scale-105">
                      <CountdownUnit value={timeLeft.days} label="DÍAS" />
                      <span className="oswald text-3xl text-[#FCB131] mt-[-20px] font-bold animate-pulse">:</span>
                      <CountdownUnit value={timeLeft.hours} label="HRS" />
                      <span className="oswald text-3xl text-[#FCB131] mt-[-20px] font-bold animate-pulse">:</span>
                      <CountdownUnit value={timeLeft.mins} label="MIN" />
                      <span className="oswald text-3xl text-[#FCB131] mt-[-20px] font-bold animate-pulse">:</span>
                      <CountdownUnit value={timeLeft.secs} label="SEG" />
                  </div>
              </div>

              {/* Rival Logic */}
              <div className="flex-1 flex flex-col items-center gap-2 text-center group/team">
                  <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover/team:scale-110 transition-transform duration-500">
                      {rivalLogo ? (
                          <img src={rivalLogo} alt={match.rival} className="w-full h-full object-contain filter brightness-110" />
                      ) : (
                          <span className="oswald text-4xl md:text-6xl font-black text-white/10 italic tracking-tighter select-none">{match.rivalShort}</span>
                      )}
                  </div>
                  <h3 className="oswald text-lg md:text-xl font-black uppercase text-white/80 tracking-tight truncate w-full max-w-[140px]" title={match.rival}>
                      {match.rival}
                  </h3>
              </div>
          </div>

          {/* 3. FOOTER INFO */}
          <div className="w-full flex justify-center mt-2">
              <div className="flex items-center gap-6 px-6 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white/60">
                    <Calendar size={12} className="text-[#FCB131]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">{match.date}</span>
                  </div>
                  <div className="w-px h-3 bg-white/10"></div>
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin size={12} className="text-[#FCB131]" />
                    <span className="text-[9px] font-black uppercase tracking-[0.15em]">{match.venue}</span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

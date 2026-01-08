import React, { useState, useEffect, useRef } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Ticket, Send, Trash2, Calendar, MapPin, AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { Match, Solicitud, Socio } from '../../types';

type StagedSocio = Socio & {
    submissionStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export const HabilitacionesPresident = ({ consuladoId, consuladoName }: { consuladoId: string, consuladoName: string }) => {
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [stagedSocios, setStagedSocios] = useState<StagedSocio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedRequests, setSubmittedRequests] = useState<Solicitud[]>([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [showCancelAllModal, setShowCancelAllModal] = useState(false);

  useEffect(() => {
      const matches = dataService.getMatches();
      const now = new Date();
      
      const openMatch = matches.find(m => {
          if (!m.aperturaDate || !m.cierreDate) return false;
          const [ad, am, ay] = m.aperturaDate.split('/').map(Number);
          const [ah, amin] = m.aperturaHour.split(':').map(Number);
          const openTime = new Date(ay, am - 1, ad, ah, amin);

          const [cd, cm, cy] = m.cierreDate.split('/').map(Number);
          const [ch, cmin] = m.cierreHour.split(':').map(Number);
          const closeTime = new Date(cy, cm - 1, cd, ch, cmin);

          return now >= openTime && now <= closeTime && !m.isSuspended && (m.isHome || m.isNeutral);
      });

      setActiveMatch(openMatch || null);

      const mySocios = dataService.getSocios(consuladoId);
      setSocios(mySocios.filter(s => s.status === 'AL DÍA'));

      if (openMatch) {
          const reqs = dataService.getSolicitudes(openMatch.id, consuladoName);
          setSubmittedRequests(reqs);
      }
  }, [consuladoId, consuladoName]);

  const toggleStageSocio = (socio: Socio) => {
      if (stagedSocios.find(s => s.id === socio.id)) {
          setStagedSocios(prev => prev.filter(s => s.id !== socio.id));
      } else {
          setStagedSocios(prev => [...prev, socio]);
      }
  };

  const confirmSubmit = async () => {
      if (!activeMatch) return;
      
      for (const socio of stagedSocios) {
          await dataService.createSolicitud({
              id: crypto.randomUUID(),
              matchId: activeMatch.id,
              socioId: socio.id,
              socioName: socio.name,
              socioDni: socio.dni,
              socioCategory: socio.category,
              consulado: consuladoName,
              status: 'PENDING',
              timestamp: new Date().toISOString()
          });
      }
      
      const reqs = dataService.getSolicitudes(activeMatch.id, consuladoName);
      setSubmittedRequests(reqs);
      setStagedSocios([]);
      setShowConfirmSubmit(false);
  };

  const confirmClearStage = () => {
      setStagedSocios([]);
      setShowCancelAllModal(false);
  };

  if (!activeMatch) {
      return (
          <div className="max-w-4xl mx-auto py-20 px-4 text-center">
              <div className="bg-white rounded-[2.5rem] p-12 border border-[#003B94]/10 shadow-xl flex flex-col items-center">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                      <Ticket size={48} className="text-gray-300" />
                  </div>
                  <h2 className="oswald text-3xl font-black text-[#001d4a] uppercase tracking-tight mb-2">No hay Habilitaciones Activas</h2>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">La ventana de habilitación se encuentra cerrada.</p>
              </div>
          </div>
      );
  }

  const filteredSocios = socios.filter(s => 
      !submittedRequests.some(r => r.socioId === s.id) && 
      (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.dni.includes(searchQuery))
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 animate-boca-entrance">
        <div className="liquid-glass-dark p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Ticket size={200} /></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#FCB131] text-[#001d4a] px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest animate-pulse">Habilitación Abierta</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{activeMatch.competition}</span>
                    </div>
                    <h1 className="oswald text-4xl font-black uppercase tracking-tighter leading-none mb-1">vs {activeMatch.rival}</h1>
                    <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wide opacity-80">
                        <span className="flex items-center gap-1"><Calendar size={14}/> {activeMatch.date}</span>
                        <span className="flex items-center gap-1"><Clock size={14}/> {activeMatch.hour} HS</span>
                        <span className="flex items-center gap-1"><MapPin size={14}/> {activeMatch.venue}</span>
                    </div>
                </div>
                
                <div className="flex gap-4">
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-[#FCB131]">{submittedRequests.length}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest">Enviados</span>
                    </div>
                    <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm text-center min-w-[100px]">
                        <span className="block text-2xl font-black text-white">{stagedSocios.length}</span>
                        <span className="text-[8px] font-black uppercase tracking-widest">Borrador</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex flex-col gap-4">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2"><Ticket size={16}/> Seleccionar Socios</h3>
                    <input type="text" placeholder="Buscar socio..." className="w-full bg-gray-50 border border-transparent rounded-lg py-2.5 px-4 outline-none text-xs font-bold text-[#001d4a] focus:bg-white focus:border-[#003B94]/30 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                
                <div className="bg-white border border-[#003B94]/10 rounded-[1.5rem] overflow-hidden shadow-sm max-h-[500px] overflow-y-auto custom-scrollbar">
                    {filteredSocios.map(socio => {
                        const isSelected = stagedSocios.some(s => s.id === socio.id);
                        return (
                            <div key={socio.id} onClick={() => toggleStageSocio(socio)} className={`p-4 border-b border-gray-50 cursor-pointer transition-all hover:bg-gray-50 flex items-center justify-between group ${isSelected ? 'bg-blue-50/50' : ''}`}>
                                <div>
                                    <p className={`font-black text-xs uppercase ${isSelected ? 'text-[#003B94]' : 'text-[#001d4a]'}`}>{socio.name}</p>
                                    <p className="text-[9px] font-bold text-gray-400">DNI: {socio.dni} • CAT: {socio.category}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#003B94] border-[#003B94]' : 'border-gray-200 group-hover:border-[#003B94]'}`}>{isSelected && <Send size={10} className="text-white" />}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-[#003B94]/10 flex items-center justify-between">
                    <h3 className="text-[#001d4a] font-black uppercase text-sm tracking-widest flex items-center gap-2"><Send size={16}/> Lista de Envío</h3>
                    {stagedSocios.length > 0 && (
                        <button onClick={() => setShowCancelAllModal(true)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                    )}
                </div>

                <div className="bg-white border border-[#003B94]/10 rounded-[1.5rem] overflow-hidden shadow-sm min-h-[300px] flex flex-col">
                    {stagedSocios.length > 0 ? (
                        <>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                                {stagedSocios.map(socio => (
                                    <div key={socio.id} className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
                                        <div><p className="font-black text-[#001d4a] text-xs uppercase">{socio.name}</p><p className="text-[9px] font-bold text-gray-400">{socio.dni}</p></div>
                                        <button onClick={() => toggleStageSocio(socio)} className="text-gray-300 hover:text-red-500"><X size={16}/></button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                <button onClick={() => setShowConfirmSubmit(true)} className="w-full bg-[#003B94] text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-[#001d4a] transition-all flex items-center justify-center gap-2"><Send size={14} /> Enviar Solicitudes ({stagedSocios.length})</button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 p-8">
                            <AlertCircle size={48} className="mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Lista Vacía</p>
                            <p className="text-[9px] mt-1">Seleccione socios del panel izquierdo</p>
                        </div>
                    )}
                </div>

                {submittedRequests.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-[#003B94]/10">
                        <h4 className="text-[#003B94] font-black uppercase text-xs tracking-widest mb-4">Historial de Envío ({submittedRequests.length})</h4>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                            {submittedRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-100 opacity-70">
                                    <span className="text-[10px] font-bold uppercase text-[#001d4a]">{req.socioName}</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' : req.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>{req.status === 'APPROVED' ? 'Aprobado' : req.status === 'REJECTED' ? 'Rechazado' : 'Pendiente'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {showConfirmSubmit && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-[#003B94] rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-white shadow-lg"><Send size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-2">Confirmar Envío</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6 leading-relaxed">Se enviarán <strong>{stagedSocios.length} solicitudes</strong> para habilitación.<br/>Una vez aprobadas, los socios podrán ingresar con su carnet.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowConfirmSubmit(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Revisar</button>
                        <button onClick={confirmSubmit} className="flex-1 py-3 rounded-xl bg-[#001d4a] text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-[#003B94] transition-all">Confirmar</button>
                    </div>
                </div>
            </div>
        )}

        {showCancelAllModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="relative w-full max-w-sm bg-white rounded-[2rem] p-8 shadow-[0_50px_100px_rgba(0,0,0,0.3)] text-center border border-white">
                    <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner"><Trash2 size={32} /></div>
                    <h2 className="oswald text-2xl font-black text-[#001d4a] uppercase mb-2">Vaciar Lista</h2>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-6">¿Seguro que deseas eliminar todos los socios de la lista de envío? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowCancelAllModal(false)} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={confirmClearStage} className="flex-1 py-3 rounded-xl bg-red-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar Todo</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default HabilitacionesPresident;
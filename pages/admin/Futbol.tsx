
import React, { useState } from 'react';
import { Partidos } from './Partidos';
import { Equipos } from './Equipos';
import { Competitions } from './Competitions';
import { Sword, ShieldCheck, Trophy, LayoutGrid } from 'lucide-react';

export const Futbol = () => {
  const [activeTab, setActiveTab] = useState<'PARTIDOS' | 'EQUIPOS' | 'TORNEOS'>('PARTIDOS');

  const tabs = [
      { id: 'PARTIDOS', label: 'Partidos', icon: Sword },
      { id: 'EQUIPOS', label: 'Equipos', icon: ShieldCheck },
      { id: 'TORNEOS', label: 'Torneos', icon: Trophy }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-boca-entrance">
        {/* Header */}
        <div className="liquid-glass-dark p-8 rounded-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden mx-4">
            <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                <LayoutGrid size={300} className="text-white" />
            </div>
            
            <div className="flex items-center gap-5 relative z-10">
                <div className="bg-white/10 p-4 rounded-xl border border-white/20">
                    <LayoutGrid size={28} className="text-[#FCB131]" />
                </div>
                <div>
                    <h1 className="oswald text-3xl font-black text-white uppercase tracking-tighter">
                        Fútbol
                    </h1>
                    <p className="text-[#FCB131] font-black uppercase text-[10px] tracking-[0.4em] mt-1">
                        Administración Deportiva
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="relative z-10 w-full md:w-auto">
                <div className="bg-[#001d4a]/40 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md flex flex-col md:flex-row gap-1.5">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 group flex-1 md:flex-none ${
                                    isActive 
                                    ? 'bg-white text-[#001d4a] shadow-lg' 
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <Icon size={14} className={isActive ? 'text-[#FCB131]' : ''} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'PARTIDOS' && <Partidos />}
            {activeTab === 'EQUIPOS' && <Equipos />}
            {activeTab === 'TORNEOS' && <Competitions />}
        </div>
    </div>
  );
};

export default Futbol;

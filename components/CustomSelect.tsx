
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    icon?: React.ElementType;
    searchable?: boolean;
    disabled?: boolean;
    className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label, value, onChange, options, placeholder = "Seleccionar...", icon: Icon,
  searchable = false, disabled = false, className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchable || !search) return options;
        return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search, searchable]);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <div className={`space-y-1 relative ${className}`} ref={wrapperRef}>
            {label && (
                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                    {Icon && <Icon size={10} />} {label}
                </label>
            )}
            <div 
                className={`w-full bg-gray-50 border rounded-lg py-2 px-3 font-bold text-xs text-[#001d4a] outline-none transition-all flex items-center justify-between
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[#003B94]/50'}
                ${isOpen && !disabled ? 'border-[#003B94] ring-1 ring-[#003B94]/20 bg-white' : 'border-gray-200'}`}
                onClick={() => { if (!disabled) { setIsOpen(!isOpen); if (searchable) setSearch(''); } }}
            >
                <span className={`truncate ${!value ? 'text-gray-400 font-normal' : ''}`}>
                    {value ? selectedLabel : placeholder}
                </span>
                {!disabled && (
                    isOpen ? <ChevronUp size={12} className="text-[#003B94] shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />
                )}
            </div>

            {isOpen && !disabled && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-w-full">
                    {searchable && (
                        <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                                <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    autoFocus
                                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-7 pr-3 text-[10px] font-bold text-[#001d4a] outline-none focus:border-[#003B94] transition-all"
                                    placeholder="Buscar..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    <div className="max-h-40 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt.value} 
                                    className={`px-3 py-2 hover:bg-[#003B94]/5 cursor-pointer text-[10px] font-bold flex items-center justify-between group transition-colors ${value === opt.value ? 'bg-[#003B94]/10 text-[#003B94]' : 'text-[#001d4a]'}`}
                                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={10} className="text-[#003B94] shrink-0 ml-2" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-[10px] text-gray-400 font-bold text-center italic">No se encontraron resultados</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

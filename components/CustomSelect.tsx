
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const selectRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            // Ignorer les clics dans le wrapper (select) ou le dropdown
            if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
                return;
            }
            // Fermer uniquement si le clic est vraiment en dehors
            setIsOpen(false);
            setDropdownPosition(null);
        };
        
        if (isOpen) {
            // Utiliser un délai pour éviter la fermeture immédiate lors du clic sur le select
            const timeoutId = setTimeout(() => {
                document.addEventListener("mousedown", handleClickOutside);
            }, 100);
            
            // Calculer la position pour le positionnement fixed
            if (selectRef.current) {
                const rect = selectRef.current.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const dropdownHeight = 300; // Max height
                const spaceBelow = viewportHeight - rect.bottom;
                const spaceAbove = rect.top;
                
                // Positionner en haut si pas assez de place en bas
                let top: number;
                if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    top = rect.top + window.scrollY - dropdownHeight - 4;
                } else {
                    top = rect.bottom + window.scrollY + 4;
                }
                
                setDropdownPosition({
                    top: Math.max(4, top), // Au moins 4px du haut
                    left: rect.left + window.scrollX,
                    width: Math.max(rect.width, 200) // Largeur minimale
                });
            }
            
            return () => {
                clearTimeout(timeoutId);
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }
    }, [isOpen]);

    // Repositionner le dropdown lors du scroll de la fenêtre (mais pas lors du scroll dans le dropdown lui-même)
    useEffect(() => {
        if (!isOpen || !dropdownRef.current || !selectRef.current) return;
        
        const handleScroll = (e: Event) => {
            const target = e.target as Node;
            // Ignorer le scroll si c'est dans le dropdown lui-même
            if (dropdownRef.current && dropdownRef.current.contains(target)) {
                return;
            }
            
            // Recalculer la position uniquement si le scroll vient de la fenêtre ou d'un autre élément
            if (selectRef.current) {
                requestAnimationFrame(() => {
                    if (selectRef.current) {
                        const rect = selectRef.current.getBoundingClientRect();
                        const viewportHeight = window.innerHeight;
                        const dropdownHeight = 300;
                        const spaceBelow = viewportHeight - rect.bottom;
                        const spaceAbove = rect.top;
                        
                        let top: number;
                        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                            top = rect.top + window.scrollY - dropdownHeight - 4;
                        } else {
                            top = rect.bottom + window.scrollY + 4;
                        }
                        
                        setDropdownPosition({
                            top: Math.max(4, top),
                            left: rect.left + window.scrollX,
                            width: Math.max(rect.width, 200)
                        });
                    }
                });
            }
        };
        
        // Écouter uniquement le scroll de la fenêtre et du body, pas dans les éléments enfants
        window.addEventListener('scroll', handleScroll, false);
        document.addEventListener('scroll', handleScroll, false);
        
        return () => {
            window.removeEventListener('scroll', handleScroll, false);
            document.removeEventListener('scroll', handleScroll, false);
        };
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !search) return options;
        return options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    }, [options, search, searchable]);

    const selectedLabel = options.find(o => o.value === value)?.label || value;

    return (
        <>
            <div className={`space-y-1 relative ${className}`} ref={wrapperRef}>
                {label && (
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                        {Icon && <Icon size={10} />} {label}
                    </label>
                )}
                <div 
                    ref={selectRef}
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
            </div>
            {isOpen && !disabled && dropdownPosition && typeof document !== 'undefined' && createPortal(
                <div 
                    ref={dropdownRef}
                    className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{
                        top: `${dropdownPosition.top}px`,
                        left: `${dropdownPosition.left}px`,
                        width: `${dropdownPosition.width}px`,
                        maxHeight: '300px'
                    }}
                    onMouseDown={(e) => {
                        // Empêcher la propagation mais permettre les interactions normales
                        e.stopPropagation();
                    }}
                    onWheel={(e) => {
                        // Empêcher la propagation du scroll au parent pour éviter la fermeture
                        e.stopPropagation();
                        // Mais permettre le scroll normal dans la liste
                    }}
                    onTouchStart={(e) => {
                        e.stopPropagation();
                    }}
                    onTouchMove={(e) => {
                        e.stopPropagation();
                    }}
                    onClick={(e) => {
                        // Empêcher la propagation des clics dans le dropdown
                        e.stopPropagation();
                    }}
                >
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
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>
                    )}
                    <div 
                        className="max-h-60 overflow-y-auto custom-scrollbar"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                        }}
                        onWheel={(e) => {
                            e.stopPropagation();
                            // Permettre le scroll normal dans la liste, mais empêcher la propagation
                        }}
                        onTouchStart={(e) => {
                            e.stopPropagation();
                        }}
                        onTouchMove={(e) => {
                            e.stopPropagation();
                            // Permettre le scroll normal dans la liste
                        }}
                        onScroll={(e) => {
                            e.stopPropagation();
                            // Empêcher la propagation du scroll pour éviter la fermeture
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                    >
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div 
                                    key={opt.value} 
                                    className={`px-3 py-2 hover:bg-[#003B94]/5 cursor-pointer text-[10px] font-bold flex items-center justify-between group transition-colors ${value === opt.value ? 'bg-[#003B94]/10 text-[#003B94]' : 'text-[#001d4a]'}`}
                                    onClick={(e) => { 
                                        e.stopPropagation();
                                        onChange(opt.value); 
                                        setIsOpen(false); 
                                        setDropdownPosition(null); 
                                    }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                    }}
                                >
                                    <span className="truncate">{opt.label}</span>
                                    {value === opt.value && <Check size={10} className="text-[#003B94] shrink-0 ml-2" />}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-2 text-[10px] text-gray-400 font-bold text-center italic">No se encontraron resultados</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

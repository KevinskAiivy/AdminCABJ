
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-4xl'
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent) => {
    // Only drag on the header itself, not on buttons inside it
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  if (!isOpen) return null;

  // Limiter le déplacement pour garder la modale dans le viewport
  const constrainedPosition = {
    x: typeof window !== 'undefined' ? Math.max(Math.min(position.x, window.innerWidth * 0.3), -window.innerWidth * 0.3) : 0,
    y: typeof window !== 'undefined' ? Math.max(Math.min(position.y, window.innerHeight * 0.3), -window.innerHeight * 0.3) : 0
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#001d4a]/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        ref={modalRef}
        style={{ transform: `translate(${constrainedPosition.x}px, ${constrainedPosition.y}px)` }}
        className={`relative w-full ${maxWidth} bg-white rounded-[2rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col border border-white/60 max-h-[90vh] animate-in zoom-in-95 duration-300`}
      >
        <div
          onMouseDown={handleDragStart}
          className="liquid-glass-dark p-4 text-white flex items-center justify-between shrink-0 cursor-move select-none active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl border border-white/10">
              <Icon size={18} className="text-[#FCB131]" />
            </div>
            <div>
              <h2 className="oswald text-lg font-black uppercase tracking-tight">{title}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
          {children}
        </div>

        {footer && (
          <div className="shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

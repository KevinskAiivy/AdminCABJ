import React, { useEffect, useState } from 'react';
import { BocaLogoSVG } from '../constants';
import { dataService } from '../services/dataService';

export const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [shouldRenderContent, setShouldRenderContent] = useState(false);
  const [loadingLogoUrl, setLoadingLogoUrl] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [logoSize, setLogoSize] = useState<number>(96);

  useEffect(() => {
    // Mettre à jour le logo de chargement depuis app_assets
    const updateLogo = () => {
      const url = dataService.getAssetUrl('loading_logo');
      setLoadingLogoUrl(url);
      setLogoError(false);
      
      // Récupérer la taille configurée pour le logo de chargement
      const asset = dataService.getAssetByKey('loading_logo');
      if (asset && asset.display_size) {
        setLogoSize(asset.display_size);
      }
    };
    updateLogo();
    const unsubscribe = dataService.subscribe(updateLogo);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setIsTransitioning(true);
    setShouldRenderContent(false);

    const contentTimer = setTimeout(() => setShouldRenderContent(true), 150);
    const finishTimer = setTimeout(() => setIsTransitioning(false), 800);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(finishTimer);
    };
  }, [children]);

  return (
    <div className="relative min-h-screen pb-12 px-4 md:px-6">
      {isTransitioning && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex items-center justify-center transition-all duration-700 pointer-events-none">
          <div className="relative flex flex-col items-center">
            <div className="absolute inset-0 bg-[#FCB131] blur-[60px] opacity-10 animate-pulse rounded-full"></div>
            <div className="animate-boca-entrance">
                {loadingLogoUrl && !logoError ? (
                  <img 
                    src={loadingLogoUrl} 
                    alt="Cargando" 
                    style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                    className="object-contain relative z-10 drop-shadow-md" 
                    onError={() => {
                      // Fallback vers SVG si l'image ne charge pas
                      console.warn('Error al cargar el logo de carga, usando SVG por defecto');
                      setLogoError(true);
                    }}
                  />
                ) : (
                  <BocaLogoSVG 
                    style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
                    className="relative z-10" 
                  />
                )}
            </div>
            <div className="mt-6 overflow-hidden">
                <p className="oswald text-[11px] font-bold text-[#003B94] uppercase tracking-[0.6em] animate-pulse">
                    Cargando...
                </p>
            </div>
          </div>
        </div>
      )}

      <div 
        className={`transition-all duration-1000 transform ${
          isTransitioning 
            ? 'opacity-0 scale-[0.98] translate-y-4 filter blur-sm' 
            : 'opacity-100 scale-100 translate-y-0 filter blur-0'
        }`}
      >
        {shouldRenderContent && children}
      </div>
    </div>
  );
};
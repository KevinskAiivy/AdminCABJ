/**
 * EXEMPLES PRATIQUES D'UTILISATION DES LOGOS
 * 
 * Ce fichier contient des exemples concrets d'utilisation de getConsuladoLogoUrl()
 * avec la structure de sous-dossiers du bucket 'logo'.
 * 
 * Structure du bucket :
 * - consulados/ : logos et bannières des consulados
 * - (racine) : photos des socios
 */

import React, { useState, useEffect } from 'react';
import { getConsuladoLogoUrl, listStorageFiles } from './lib/supabase';
import { Consulado, Socio } from './types';

// ============================================================================
// EXEMPLE 1 : Card de Consulado avec logo
// ============================================================================

interface ConsuladoCardProps {
  consulado: Consulado;
}

export const ConsuladoCardSimple: React.FC<ConsuladoCardProps> = ({ consulado }) => {
  // Le consulado.logo contient déjà le chemin complet : "consulados/consulado_123_logo_1234567890.png"
  const logoUrl = getConsuladoLogoUrl(consulado.logo);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <img 
        src={logoUrl}
        alt={`Logo ${consulado.name}`}
        className="w-24 h-24 object-contain mx-auto mb-4"
        onError={(e) => {
          // Fallback en cas d'erreur de chargement
          e.currentTarget.src = getConsuladoLogoUrl(null);
        }}
      />
      <h3 className="text-lg font-bold text-center">{consulado.name}</h3>
      <p className="text-sm text-gray-500 text-center">{consulado.city}</p>
    </div>
  );
};

// ============================================================================
// EXEMPLE 2 : Liste de Consulados avec logos ET bannières
// ============================================================================

export const ConsuladosList: React.FC<{ consulados: Consulado[] }> = ({ consulados }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {consulados.map(consulado => {
        const logoUrl = getConsuladoLogoUrl(consulado.logo);
        const bannerUrl = getConsuladoLogoUrl(consulado.banner);

        return (
          <div key={consulado.id} className="bg-white rounded-xl overflow-hidden shadow-lg">
            {/* Bannière en haut */}
            <div 
              className="h-32 bg-cover bg-center"
              style={{ backgroundImage: `url(${bannerUrl})` }}
            />
            
            {/* Logo superposé */}
            <div className="relative -mt-12 flex justify-center">
              <img 
                src={logoUrl}
                alt={consulado.name}
                className="w-24 h-24 rounded-full border-4 border-white object-cover bg-white"
              />
            </div>

            {/* Info */}
            <div className="p-4 text-center">
              <h3 className="font-black text-[#003B94] text-lg">{consulado.name}</h3>
              <p className="text-sm text-gray-600">{consulado.city}, {consulado.country}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// EXEMPLE 3 : Profil de Socio avec photo
// ============================================================================

interface SocioProfileProps {
  socio: Socio;
}

export const SocioProfile: React.FC<SocioProfileProps> = ({ socio }) => {
  // Le socio.foto contient le chemin : "12345678_1234567890.jpg" (à la racine du bucket)
  const photoUrl = getConsuladoLogoUrl(socio.foto);

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-md">
      <img 
        src={photoUrl}
        alt={socio.name}
        className="w-16 h-16 rounded-full object-cover border-2 border-[#003B94]"
        onError={(e) => {
          e.currentTarget.src = getConsuladoLogoUrl(null);
        }}
      />
      <div>
        <h3 className="font-bold text-[#001d4a]">{socio.name}</h3>
        <p className="text-sm text-gray-500">DNI: {socio.dni}</p>
        <p className="text-xs text-[#003B94] font-bold">{socio.category}</p>
      </div>
    </div>
  );
};

// ============================================================================
// EXEMPLE 4 : Select de Consulados avec logos
// ============================================================================

interface ConsuladoSelectProps {
  consulados: Consulado[];
  value: string;
  onChange: (id: string) => void;
}

export const ConsuladoSelect: React.FC<ConsuladoSelectProps> = ({ consulados, value, onChange }) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="w-full border rounded-lg px-3 py-2"
    >
      <option value="">Seleccionar consulado...</option>
      {consulados.map(consulado => (
        <option key={consulado.id} value={consulado.id}>
          {consulado.name} - {consulado.city}
        </option>
      ))}
    </select>
  );
};

// Version custom avec images (nécessite un composant personnalisé)
export const ConsuladoSelectWithImages: React.FC<ConsuladoSelectProps> = ({ consulados, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedConsulado = consulados.find(c => c.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border rounded-lg px-3 py-2 flex items-center gap-3 bg-white"
      >
        {selectedConsulado ? (
          <>
            <img 
              src={getConsuladoLogoUrl(selectedConsulado.logo)}
              alt={selectedConsulado.name}
              className="w-6 h-6 object-contain"
            />
            <span>{selectedConsulado.name}</span>
          </>
        ) : (
          <span className="text-gray-400">Seleccionar consulado...</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {consulados.map(consulado => (
            <button
              key={consulado.id}
              onClick={() => {
                onChange(consulado.id);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 flex items-center gap-3 hover:bg-gray-100 transition-colors"
            >
              <img 
                src={getConsuladoLogoUrl(consulado.logo)}
                alt={consulado.name}
                className="w-6 h-6 object-contain"
              />
              <span>{consulado.name} - {consulado.city}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXEMPLE 5 : Galerie d'images du dossier consulados
// ============================================================================

export const ConsuladosImageGallery: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      const { data } = await listStorageFiles('consulados', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' }
      });
      setImages(data);
      setLoading(false);
    };
    loadImages();
  }, []);

  if (loading) {
    return <div className="text-center py-10">Cargando imágenes...</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {images.map(image => (
        <div key={image.fullPath} className="aspect-square border rounded-lg overflow-hidden">
          <img 
            src={image.publicUrl}
            alt={image.name}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// EXEMPLE 6 : Upload d'image et affichage immédiat
// ============================================================================

export const ImageUploadPreview: React.FC<{ onUpload: (url: string) => void }> = ({ onUpload }) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Prévisualisation locale
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload vers Supabase (à implémenter selon votre logique)
    // Après l'upload, vous obtiendrez un filePath comme "consulados/consulado_123_logo_1234567890.png"
    // Puis vous pouvez utiliser getConsuladoLogoUrl(filePath) pour obtenir l'URL
  };

  return (
    <div className="space-y-4">
      <input 
        type="file" 
        accept="image/*"
        onChange={handleFileSelect}
        className="block"
      />
      
      {previewUrl && (
        <div className="border rounded-lg p-4">
          <p className="text-sm font-bold mb-2">Previsualización:</p>
          <img 
            src={previewUrl}
            alt="Preview"
            className="w-32 h-32 object-contain border rounded"
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXEMPLE 7 : Composant avec lazy loading des images
// ============================================================================

export const LazyLoadedConsuladoLogo: React.FC<{ logoPath: string | null; alt: string }> = ({ logoPath, alt }) => {
  const [loaded, setLoaded] = useState(false);
  const logoUrl = getConsuladoLogoUrl(logoPath);

  return (
    <div className="relative w-24 h-24">
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      <img 
        src={logoUrl}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

// ============================================================================
// EXEMPLE 8 : Comparaison de logos (avant/après)
// ============================================================================

export const LogoComparison: React.FC<{ 
  oldLogoPath: string | null; 
  newLogoPath: string | null;
  consuladoName: string;
}> = ({ oldLogoPath, newLogoPath, consuladoName }) => {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
      <div className="text-center">
        <p className="text-xs font-bold text-gray-500 mb-2">ANTERIOR</p>
        <img 
          src={getConsuladoLogoUrl(oldLogoPath)}
          alt={`Logo anterior ${consuladoName}`}
          className="w-32 h-32 object-contain mx-auto border-2 border-gray-300 rounded-lg"
        />
      </div>
      <div className="text-center">
        <p className="text-xs font-bold text-[#003B94] mb-2">NUEVO</p>
        <img 
          src={getConsuladoLogoUrl(newLogoPath)}
          alt={`Logo nuevo ${consuladoName}`}
          className="w-32 h-32 object-contain mx-auto border-2 border-[#003B94] rounded-lg"
        />
      </div>
    </div>
  );
};

// ============================================================================
// EXEMPLE 9 : Badge avec logo miniature
// ============================================================================

export const ConsuladoBadge: React.FC<{ consulado: Consulado; size?: 'sm' | 'md' | 'lg' }> = ({ 
  consulado, 
  size = 'md' 
}) => {
  const sizes = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div className="inline-flex items-center gap-2 bg-[#003B94]/10 px-3 py-1 rounded-full">
      <img 
        src={getConsuladoLogoUrl(consulado.logo)}
        alt={consulado.name}
        className={`${sizes[size]} object-contain`}
      />
      <span className="font-bold text-[#003B94]">{consulado.name}</span>
    </div>
  );
};

// ============================================================================
// EXEMPLE 10 : Grid responsive avec tous les logos
// ============================================================================

export const AllConsuladosLogosGrid: React.FC<{ consulados: Consulado[] }> = ({ consulados }) => {
  return (
    <div className="bg-gray-50 p-8 rounded-2xl">
      <h2 className="text-2xl font-black text-[#003B94] mb-6 text-center">
        Todos los Consulados
      </h2>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {consulados.map(consulado => (
          <div 
            key={consulado.id}
            className="bg-white p-3 rounded-xl shadow-md hover:shadow-xl transition-shadow cursor-pointer group"
            title={consulado.name}
          >
            <img 
              src={getConsuladoLogoUrl(consulado.logo)}
              alt={consulado.name}
              className="w-full aspect-square object-contain group-hover:scale-110 transition-transform"
            />
            <p className="text-xs text-center mt-2 font-bold text-gray-700 truncate">
              {consulado.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// NOTES D'UTILISATION
// ============================================================================

/**
 * POINTS IMPORTANTS :
 * 
 * 1. Chemins complets avec sous-dossiers :
 *    - Consulados : "consulados/consulado_123_logo_1234567890.png"
 *    - Socios : "12345678_1234567890.jpg" (à la racine)
 * 
 * 2. Gestion des erreurs :
 *    - Toujours utiliser onError avec fallback vers getConsuladoLogoUrl(null)
 * 
 * 3. Performance :
 *    - getConsuladoLogoUrl() est rapide (pas de requête réseau)
 *    - Pour les listes longues, considérer le lazy loading
 * 
 * 4. Placeholder automatique :
 *    - Si logo/banner/foto est null, placeholder SVG automatique
 *    - Couleurs Boca (bleu #003B94, or #FCB131)
 * 
 * 5. Formats supportés :
 *    - .jpg, .jpeg, .png, .gif, .webp, .svg
 */

import React, { useState, useEffect } from 'react';
import { GlassCard } from '../../components/GlassCard';
import { Upload, Image as ImageIcon, Loader2, Save, RefreshCw, Trash2, CheckCircle2, Database, HardDrive, Info } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { AppAsset } from '../../types';
import { uploadFileWithTracking } from '../../lib/uploadHelper';

/**
 * Página de gestión de logos y assets de la marca
 * Todos los logos se almacenan en la tabla app_assets
 * Se cargan al inicio de la aplicación
 */
export const MarcaLogotipos = () => {
  const [assets, setAssets] = useState<AppAsset[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssets();
    // Suscribirse a los cambios
    const unsubscribe = dataService.subscribe(() => {
      setAssets(dataService.getAppAssets());
    });
    return () => unsubscribe();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      await dataService.loadAppAssets();
      setAssets(dataService.getAppAssets());
    } catch (error) {
      console.error('Error al cargar assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (assetKey: string, file: File) => {
    setUploading(assetKey);
    try {
      await dataService.uploadAssetFile(assetKey, file);
      alert('¡Logo actualizado con éxito!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(null);
    }
  };

  const handleSizeChange = async (assetKey: string, newSize: number) => {
    try {
      await dataService.updateAppAsset(assetKey, { display_size: newSize });
      // No es necesario alert, la actualización es inmediata
    } catch (error: any) {
      alert('Error al actualizar tamaño: ' + error.message);
    }
  };

  // Filtrar solo los logos útiles con nombres en español
  const usefulLogos = [
    'navbar_logo_main',
    'login_logo',
    'loading_logo',
    'app_logo_main',
    'match_logo',
    'favicon'
  ];

  const displayedAssets = assets.filter(a => usefulLogos.includes(a.asset_key));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-[#003B94]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <h2 className="text-2xl font-black text-[#003B94] mb-2">
              🎨 Marca y Logotipos
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Gestiona todos los logos de la aplicación. Los cambios se aplican inmediatamente en toda la plataforma.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 text-green-600">
                <HardDrive size={14} />
                <span className="font-bold">Almacenamiento:</span>
                <span>Bucket "Logo" → assets/</span>
              </div>
              <div className="flex items-center gap-2 text-blue-600">
                <Database size={14} />
                <span className="font-bold">Tabla:</span>
                <span>app_assets</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <CheckCircle2 size={14} />
                <span className="font-bold">{displayedAssets.filter(a => a.file_url).length}/{displayedAssets.length}</span>
                <span>subidos</span>
              </div>
            </div>
          </div>
          <button
            onClick={loadAssets}
            className="flex items-center gap-2 px-4 py-2 bg-[#003B94] text-white rounded-xl font-bold text-sm hover:bg-[#001d4a] transition-all"
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>
      </GlassCard>
      
      {/* Info sobre aplicación de logos */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-bold mb-1">Estos logos se aplican a todos los perfiles:</p>
            <ul className="list-disc list-inside text-xs space-y-1 text-blue-700">
              <li><strong>Logo Principal:</strong> Aparece en la barra de navegación para todos los usuarios</li>
              <li><strong>Logo de Carga:</strong> Se muestra durante la carga inicial de la aplicación</li>
              <li><strong>Logo de Conexión:</strong> Visible en la página de inicio de sesión</li>
              <li><strong>Favicon:</strong> Icono que aparece en la pestaña del navegador</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Logos Principales */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-black text-[#003B94] mb-4 flex items-center gap-2">
          <ImageIcon size={20} />
          Logos de la Aplicación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedAssets.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onUpload={handleUpload}
              onSizeChange={handleSizeChange}
              uploading={uploading === asset.asset_key}
            />
          ))}
        </div>
        
        {displayedAssets.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-sm font-bold">
              No hay logos configurados. Ejecute el script CREATE_APP_ASSETS_TABLE.sql en Supabase.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

// Nombres en español para los assets
const assetNames: Record<string, { name: string; description: string }> = {
  'navbar_logo_main': { 
    name: 'Logo de Navegación Principal', 
    description: 'Logo que aparece en la barra de navegación superior para todos los usuarios' 
  },
  'login_logo': { 
    name: 'Logo de Página de Conexión', 
    description: 'Logo mostrado en la pantalla de inicio de sesión' 
  },
  'loading_logo': { 
    name: 'Logo de Carga', 
    description: 'Logo que se muestra durante la carga inicial de la aplicación' 
  },
  'app_logo_main': { 
    name: 'Logo Principal de la Aplicación', 
    description: 'Logo principal utilizado en varios lugares de la aplicación' 
  },
  'match_logo': { 
    name: 'Logo de Partidos', 
    description: 'Logo mostrado en las tarjetas de partidos' 
  },
  'favicon': { 
    name: 'Favicon', 
    description: 'Icono pequeño que aparece en la pestaña del navegador' 
  }
};

// Componente para mostrar un asset
const AssetCard = ({ 
  asset, 
  onUpload,
  onSizeChange,
  uploading,
  compact = false
}: { 
  asset: AppAsset; 
  onUpload: (key: string, file: File) => void;
  onSizeChange: (key: string, size: number) => void;
  uploading: boolean;
  compact?: boolean;
}) => {
  const imageUrl = dataService.getAssetUrl(asset.asset_key);
  const hasFile = asset.file_url !== null;
  const [localSize, setLocalSize] = React.useState(asset.display_size || 40);
  
  // Obtener nombres en español
  const spanishInfo = assetNames[asset.asset_key] || { name: asset.name, description: asset.description };

  return (
    <div className={`border-2 rounded-xl p-4 hover:border-[#003B94] transition-all ${hasFile ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-bold text-sm text-[#001d4a]">{spanishInfo.name}</h4>
          {!compact && spanishInfo.description && (
            <p className="text-xs text-gray-500 mt-1">{spanishInfo.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFile ? (
            <>
              <HardDrive size={14} className="text-green-600" title="Almacenado en Storage" />
              <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            </>
          ) : (
            <span className="text-xs text-gray-400 font-bold">SVG</span>
          )}
        </div>
      </div>

      {/* Vista previa de la imagen */}
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center mb-3 ${compact ? 'h-24' : 'h-40'} relative overflow-hidden`}>
        <img 
          src={imageUrl}
          alt={spanishInfo.name}
          style={{ 
            width: `${Math.min(localSize, compact ? 80 : 120)}px`,
            height: `${Math.min(localSize, compact ? 80 : 120)}px`
          }}
          className="object-contain transition-all duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        {/* Indicador de tamaño */}
        <div className="absolute bottom-2 right-2 bg-[#003B94] text-white text-[8px] font-black px-2 py-1 rounded-full">
          {localSize}px
        </div>
      </div>

      {/* Metadatos */}
      {!compact && (
        <div className="text-xs text-gray-500 mb-3 space-y-2">
          {hasFile && (
            <div className="flex items-center gap-2 text-green-600 font-bold">
              <HardDrive size={12} />
              <span>Almacenado en Storage</span>
            </div>
          )}
          
          {/* Control de tamaño */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700">📐 Tamaño:</span>
              <span className="font-black text-[#003B94]">{localSize}px</span>
            </div>
            <input
              type="range"
              min="20"
              max="200"
              step="4"
              value={localSize}
              onChange={(e) => {
                const newSize = parseInt(e.target.value);
                setLocalSize(newSize);
                onSizeChange(asset.asset_key, newSize);
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#003B94]"
            />
            <div className="flex justify-between text-[9px] text-gray-400">
              <span>20px</span>
              <span>200px</span>
            </div>
          </div>
          
          {asset.file_type && (
            <div>📄 Tipo: {asset.file_type}</div>
          )}
          {asset.file_size && (
            <div>💾 Peso: {(asset.file_size / 1024).toFixed(1)} KB</div>
          )}
          {asset.file_url && (
            <div className="text-[10px] text-gray-400 truncate" title={asset.file_url}>
              📂 {asset.file_url}
            </div>
          )}
        </div>
      )}

      {/* Subir archivo */}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(asset.asset_key, file);
          }}
          disabled={uploading}
          className="hidden"
          id={`upload-${asset.asset_key}`}
        />
        <label
          htmlFor={`upload-${asset.asset_key}`}
          className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg font-bold text-xs uppercase tracking-wider cursor-pointer transition-all ${
            uploading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#FCB131] text-[#001d4a] hover:bg-[#FFD23F]'
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Subiendo...
            </>
          ) : (
            <>
              <Upload size={14} />
              {hasFile ? 'Reemplazar' : 'Subir'}
            </>
          )}
        </label>
      </div>
    </div>
  );
};

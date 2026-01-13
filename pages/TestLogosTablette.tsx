import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { supabase, getConsuladoLogoUrl } from '../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

/**
 * Page de diagnostic pour tester le chargement des logos sur tablette
 * À utiliser temporairement pour diagnostiquer les problèmes
 */
export const TestLogosTablette = () => {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});

  useEffect(() => {
    // Collecter les infos de l'appareil
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      online: navigator.onLine,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      pixelRatio: window.devicePixelRatio,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    });
  }, []);

  const runTests = async () => {
    setLoading(true);
    const results: any[] = [];

    // Test 1: Connexion Supabase
    results.push({ name: 'Connexion Supabase', status: 'loading', message: 'Test en cours...' });
    setTests([...results]);
    
    try {
      const { data, error } = await supabase.from('consulados').select('count').limit(1);
      if (error) throw error;
      results[0] = { name: 'Connexion Supabase', status: 'success', message: 'Connexion OK' };
    } catch (error: any) {
      results[0] = { name: 'Connexion Supabase', status: 'error', message: error.message };
    }
    setTests([...results]);

    // Test 2: Bucket Logo accessible
    results.push({ name: 'Bucket Logo', status: 'loading', message: 'Test en cours...' });
    setTests([...results]);
    
    try {
      const response = await fetch('https://mihvnjyicixelzdwztet.supabase.co/storage/v1/object/public/Logo/');
      if (response.ok) {
        results[1] = { name: 'Bucket Logo', status: 'success', message: 'Bucket accessible' };
      } else {
        results[1] = { name: 'Bucket Logo', status: 'error', message: `Erreur ${response.status}: ${response.statusText}` };
      }
    } catch (error: any) {
      results[1] = { name: 'Bucket Logo', status: 'error', message: error.message };
    }
    setTests([...results]);

    // Test 3: Récupérer la liste des consulados
    results.push({ name: 'Liste consulados', status: 'loading', message: 'Chargement...' });
    setTests([...results]);
    
    try {
      const { data: consulados, error } = await supabase
        .from('consulados')
        .select('id, name, logo, banner')
        .limit(5);
      
      if (error) throw error;
      results[2] = { 
        name: 'Liste consulados', 
        status: 'success', 
        message: `${consulados?.length || 0} consulados récupérés`,
        data: consulados
      };
    } catch (error: any) {
      results[2] = { name: 'Liste consulados', status: 'error', message: error.message };
    }
    setTests([...results]);

    // Test 4: Charger une image réelle
    if (results[2].data && results[2].data.length > 0) {
      const consulado = results[2].data[0];
      if (consulado.logo) {
        results.push({ name: 'Chargement image', status: 'loading', message: 'Test image...' });
        setTests([...results]);

        const logoUrl = getConsuladoLogoUrl(consulado.logo);
        
        try {
          await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = (e) => reject(new Error('Erreur chargement image'));
            img.src = logoUrl;
            
            // Timeout après 10 secondes
            setTimeout(() => reject(new Error('Timeout après 10s')), 10000);
          });
          
          results[3] = { 
            name: 'Chargement image', 
            status: 'success', 
            message: `Image ${consulado.name} chargée`,
            imageUrl: logoUrl
          };
        } catch (error: any) {
          results[3] = { 
            name: 'Chargement image', 
            status: 'error', 
            message: error.message,
            imageUrl: logoUrl
          };
        }
        setTests([...results]);
      }
    }

    // Test 5: Vérifier la table logos
    results.push({ name: 'Table logos', status: 'loading', message: 'Vérification...' });
    setTests([...results]);
    
    try {
      const { data: logos, error } = await supabase
        .from('logos')
        .select('*')
        .limit(5);
      
      if (error) throw error;
      results[results.length - 1] = { 
        name: 'Table logos', 
        status: 'success', 
        message: `${logos?.length || 0} logos dans la table`,
        data: logos
      };
    } catch (error: any) {
      results[results.length - 1] = { 
        name: 'Table logos', 
        status: 'error', 
        message: error.message 
      };
    }
    setTests([...results]);

    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'loading':
        return <Loader2 className="text-blue-500 animate-spin" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <GlassCard className="p-6">
          <h1 className="text-2xl font-black text-[#003B94] mb-2">
            🔍 Diagnostic Logos - Tablette
          </h1>
          <p className="text-sm text-gray-600">
            Testez le chargement des logos depuis votre tablette
          </p>
        </GlassCard>

        {/* Device Info */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-black text-[#003B94] mb-4">📱 Informations Appareil</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-bold">Plateforme:</span> {deviceInfo.platform}
            </div>
            <div>
              <span className="font-bold">Langue:</span> {deviceInfo.language}
            </div>
            <div>
              <span className="font-bold">Écran:</span> {deviceInfo.screenWidth}x{deviceInfo.screenHeight}
            </div>
            <div>
              <span className="font-bold">Pixel Ratio:</span> {deviceInfo.pixelRatio}
            </div>
            <div>
              <span className="font-bold">Connexion:</span> {deviceInfo.connection}
            </div>
            <div>
              <span className="font-bold">En ligne:</span> {deviceInfo.online ? '✅ Oui' : '❌ Non'}
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 break-all">
            <span className="font-bold">User Agent:</span> {deviceInfo.userAgent}
          </div>
        </GlassCard>

        {/* Run Tests Button */}
        <button
          onClick={runTests}
          disabled={loading}
          className="w-full bg-[#003B94] text-white py-4 rounded-xl font-black uppercase text-sm tracking-widest flex items-center justify-center gap-2 hover:bg-[#001d4a] transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Tests en cours...
            </>
          ) : (
            <>
              <RefreshCw size={20} />
              Lancer les tests
            </>
          )}
        </button>

        {/* Test Results */}
        {tests.length > 0 && (
          <GlassCard className="p-6">
            <h2 className="text-lg font-black text-[#003B94] mb-4">📊 Résultats des Tests</h2>
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div key={index} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(test.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-[#001d4a]">{test.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                    
                    {test.imageUrl && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2 break-all">{test.imageUrl}</p>
                        <img 
                          src={test.imageUrl} 
                          alt="Test" 
                          className="w-32 h-32 object-contain bg-gray-100 rounded-lg border border-gray-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.border = '2px solid red';
                          }}
                        />
                      </div>
                    )}
                    
                    {test.data && test.data.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer">Voir les données</summary>
                        <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Instructions */}
        <GlassCard className="p-6 bg-blue-50 border-2 border-blue-200">
          <h3 className="font-black text-[#003B94] mb-3">💡 Instructions</h3>
          <ol className="text-sm space-y-2 text-gray-700">
            <li>1. Cliquez sur "Lancer les tests"</li>
            <li>2. Attendez que tous les tests se terminent</li>
            <li>3. Notez les erreurs (icônes rouges ❌)</li>
            <li>4. Prenez une capture d'écran des résultats</li>
            <li>5. Consultez le fichier DIAGNOSTIC_LOGOS_TABLETTE.md pour les solutions</li>
          </ol>
        </GlassCard>
      </div>
    </div>
  );
};

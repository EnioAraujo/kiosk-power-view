import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type PresentationItem = Tables<'presentation_items'>;

// Utility function to validate URLs
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function PresentationView() {
  const { id } = useParams<{ id: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideTimeRemaining, setSlideTimeRemaining] = useState(0);
  const [refreshTimeRemaining, setRefreshTimeRemaining] = useState(0);

  // Fetch presentation data
  const { data: presentation } = useQuery({
    queryKey: ['presentation', id],
    queryFn: async () => {
      if (!id) throw new Error('No presentation ID provided');
      
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch presentation items
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['presentation-items', id],
    queryFn: async () => {
      if (!id) throw new Error('No presentation ID provided');
      
      const { data, error } = await supabase
        .from('presentation_items')
        .select('*')
        .eq('presentation_id', id)
        .order('order_index');
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
    refetchInterval: 30000, // Refetch every 30 seconds to get updates
  });

  // Auto-advance slides with proper cleanup
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem || currentItem.display_time <= 0) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, currentItem.display_time * 60000);

    return () => clearTimeout(timer);
  }, [currentIndex, items]);

  // Reset current index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  // Memoize current item to prevent unnecessary re-renders
  const currentItem = useMemo(() => items[currentIndex], [items, currentIndex]);

  // Countdown timer for current slide with proper cleanup
  useEffect(() => {
    if (!currentItem || currentItem.display_time <= 0) return;

    const startTime = Date.now();
    const duration = currentItem.display_time * 60000;
    setSlideTimeRemaining(Math.ceil(duration / 1000));

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSlideTimeRemaining(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentItem]);

  // Countdown timer for refresh with proper cleanup
  useEffect(() => {
    if (!presentation || presentation.refresh_interval <= 0) return;

    const refreshInterval = presentation.refresh_interval * 60000;
    let refreshStartTime = Date.now();
    setRefreshTimeRemaining(Math.ceil(refreshInterval / 1000));

    const interval = setInterval(() => {
      const elapsed = Date.now() - refreshStartTime;
      const remaining = Math.max(0, Math.ceil((refreshInterval - elapsed) / 1000));
      setRefreshTimeRemaining(remaining);
      
      if (remaining === 0) {
        refreshStartTime = Date.now();
        setRefreshTimeRemaining(Math.ceil(refreshInterval / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [presentation]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-2xl">Carregando apresentação...</div>
      </div>
    );
  }

  if (error || !items.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">📺</div>
          <div className="text-2xl mb-2">Apresentação não encontrada</div>
          <div className="text-gray-400">Verifique se o ID está correto ou se há itens configurados</div>
        </div>
      </div>
    );
  }

  // Format time display helper
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!currentItem) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <div className="text-2xl mb-2">Carregando item...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black overflow-hidden flex flex-col">
      {/* Status bar */}
      <div className="bg-black/90 text-white px-4 py-2 flex items-center justify-between text-sm border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="font-medium">{currentItem?.title}</span>
          <span className="text-white/70">
            {currentIndex + 1} de {items.length}
          </span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-white/70">Próximo:</span>
            <span className="font-mono text-green-400">
              {formatTime(slideTimeRemaining)}
            </span>
          </div>
          
          {presentation && (
            <div className="flex items-center gap-2">
              <span className="text-white/70">Atualização:</span>
              <span className="font-mono text-blue-400">
                {formatTime(refreshTimeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content area with error handling */}
      <div className="flex-1 relative">
        {currentItem?.type === 'image' && currentItem.url && (
          <div className="h-full w-full flex items-center justify-center bg-gray-900">
            {isValidUrl(currentItem.url) ? (
              <img
                src={currentItem.url}
                alt={currentItem.title}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  console.error('Error loading image:', currentItem.url);
                  e.currentTarget.style.display = 'none';
                  const errorDiv = document.createElement('div');
                  errorDiv.className = 'text-white text-center p-8';
                  errorDiv.innerHTML = `
                    <div class="text-6xl mb-4">🖼️</div>
                    <div class="text-xl">Erro ao carregar imagem</div>
                    <div class="text-sm text-gray-400 mt-2">${currentItem.title}</div>
                  `;
                  e.currentTarget.parentNode?.appendChild(errorDiv);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully:', currentItem.url);
                }}
              />
            ) : (
              <div className="text-white text-center p-8">
                <div className="text-6xl mb-4">⚠️</div>
                <div className="text-xl">URL de imagem inválida</div>
                <div className="text-sm text-gray-400 mt-2">{currentItem.title}</div>
              </div>
            )}
          </div>
        )}

        {currentItem?.type === 'powerbi' && currentItem.url && (
          <div className="h-full w-full">
            {isValidUrl(currentItem.url) ? (
              <iframe
                src={currentItem.url}
                className="h-full w-full border-0"
                title={currentItem.title}
                allow="fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms"
                onError={() => {
                  console.error('Error loading Power BI dashboard:', currentItem.url);
                }}
                onLoad={() => {
                  console.log('Power BI dashboard loaded successfully:', currentItem.url);
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-black text-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <div className="text-xl">URL do Power BI inválida</div>
                  <div className="text-sm text-gray-400 mt-2">{currentItem.title}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom progress bar */}
      <div className="bg-black/90 p-2 flex justify-center">
        <div className="flex space-x-1">
          {items.map((_, index) => (
            <div
              key={index}
              className={`w-8 h-1 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
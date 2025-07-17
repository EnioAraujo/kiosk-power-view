import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type PresentationItem = Tables<'presentation_items'>;

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

  // Auto-advance slides
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, currentItem.display_time * 60000);

    return () => clearTimeout(timer);
  }, [currentIndex, items]);

  // Reset current index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

  // Countdown timer for current slide
  useEffect(() => {
    if (items.length === 0) return;

    const currentItem = items[currentIndex];
    if (!currentItem) return;

    const startTime = Date.now();
    const duration = currentItem.display_time * 60000; // Convert minutes to milliseconds
    setSlideTimeRemaining(Math.ceil(duration / 1000));

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setSlideTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, items]);

  // Countdown timer for refresh
  useEffect(() => {
    if (!presentation) return;

    const refreshInterval = presentation.refresh_interval * 60000; // Convert minutes to milliseconds
    let refreshStartTime = Date.now();
    setRefreshTimeRemaining(Math.ceil(refreshInterval / 1000));

    const interval = setInterval(() => {
      const elapsed = Date.now() - refreshStartTime;
      const remaining = Math.max(0, Math.ceil((refreshInterval - elapsed) / 1000));
      setRefreshTimeRemaining(remaining);
      
      // Reset timer when it reaches 0
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

  const currentItem = items[currentIndex];

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
            <span className="font-mono">
              {Math.floor(slideTimeRemaining / 60)}:{(slideTimeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
          
          {presentation && (
            <div className="flex items-center gap-2">
              <span className="text-white/70">Atualização:</span>
              <span className="font-mono">
                {Math.floor(refreshTimeRemaining / 60)}:{(refreshTimeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        {currentItem?.type === 'image' && currentItem.url && (
          <div className="h-full w-full flex items-center justify-center">
            <img
              src={currentItem.url}
              alt={currentItem.title}
              className="max-h-full max-w-full object-contain"
              onError={(e) => {
                console.error('Error loading image:', currentItem.url);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {currentItem?.type === 'powerbi' && currentItem.url && (
          <iframe
            src={currentItem.url}
            className="h-full w-full border-0"
            title={currentItem.title}
            allow="fullscreen"
            onError={() => {
              console.error('Error loading Power BI dashboard:', currentItem.url);
            }}
          />
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
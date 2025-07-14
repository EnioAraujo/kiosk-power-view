import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type PresentationItem = Tables<'presentation_items'>;

export default function PresentationView() {
  const { id } = useParams<{ id: string }>();
  const [currentIndex, setCurrentIndex] = useState(0);

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
    }, currentItem.display_time * 1000);

    return () => clearTimeout(timer);
  }, [currentIndex, items]);

  // Reset current index when items change
  useEffect(() => {
    setCurrentIndex(0);
  }, [items]);

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
    <div className="h-screen w-screen bg-black overflow-hidden relative">
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

      {/* Progress indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {items.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Title overlay */}
      {currentItem && (
        <div className="absolute top-4 left-4 bg-black/50 text-white px-4 py-2 rounded-lg">
          <div className="text-lg font-semibold">{currentItem.title}</div>
          <div className="text-sm opacity-75">
            {currentIndex + 1} de {items.length}
          </div>
        </div>
      )}
    </div>
  );
}
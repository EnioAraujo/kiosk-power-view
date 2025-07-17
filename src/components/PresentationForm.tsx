import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Image, BarChart3, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Presentation = Tables<'presentations'>;
type PresentationItem = Tables<'presentation_items'>;

interface PresentationFormProps {
  presentation?: Presentation;
  onSubmit: (data?: any) => void;
  isSubmitting?: boolean;
}

export default function PresentationForm({ presentation, onSubmit, isSubmitting = false }: PresentationFormProps) {
  const [title, setTitle] = useState(presentation?.title || '');
  const [refreshInterval, setRefreshInterval] = useState(presentation?.refresh_interval || 5);
  const queryClient = useQueryClient();

  const isEditing = !!presentation;

  // Fetch presentation items if editing
  const { data: items = [] } = useQuery({
    queryKey: ['presentation-items', presentation?.id],
    queryFn: async () => {
      if (!presentation?.id) return [];
      
      const { data, error } = await supabase
        .from('presentation_items')
        .select('*')
        .eq('presentation_id', presentation.id)
        .order('order_index');
      
      if (error) throw error;
      return data;
    },
    enabled: !!presentation?.id,
  });

  // Add item mutation
  const addItemMutation = useMutation({
    mutationFn: async (newItem: Omit<PresentationItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('presentation_items')
        .insert([newItem])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-items', presentation?.id] });
      toast.success('Item adicionado com sucesso!');
    },
    onError: (error) => {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async (item: Partial<PresentationItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('presentation_items')
        .update(item)
        .eq('id', item.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-items', presentation?.id] });
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Erro ao atualizar item');
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('presentation_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentation-items', presentation?.id] });
      toast.success('Item removido com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Nome da apresentação é obrigatório');
      return;
    }
    
    onSubmit({ 
      title: title.trim(), 
      refresh_interval: refreshInterval 
    });
  };

  const addItem = (type: 'image' | 'powerbi') => {
    if (!presentation?.id) return;
    
    const newItem = {
      presentation_id: presentation.id,
      type,
      title: type === 'image' ? 'Nova Imagem' : 'Novo Dashboard',
      url: '',
      display_time: 1,
      order_index: items.length,
    };
    
    addItemMutation.mutate(newItem);
  };

  const updateItem = (id: string, updates: Partial<PresentationItem>) => {
    updateItemMutation.mutate({ id, ...updates });
  };

  const deleteItem = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload to Supabase Storage
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('presentation-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(fileName);

      // Update item with the new URL
      updateItem(itemId, { url: publicUrl });
      
      toast.success('Imagem carregada com sucesso!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    }
  };

  const getItemIcon = (type: string) => {
    return type === 'image' ? <Image className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Nome da Apresentação</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Digite o nome da apresentação"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="refresh-interval">Intervalo de Atualização (minutos)</Label>
          <Select value={refreshInterval.toString()} onValueChange={(value) => setRefreshInterval(parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 minuto</SelectItem>
              <SelectItem value="2">2 minutos</SelectItem>
              <SelectItem value="3">3 minutos</SelectItem>
              <SelectItem value="4">4 minutos</SelectItem>
              <SelectItem value="5">5 minutos</SelectItem>
              <SelectItem value="6">6 minutos</SelectItem>
              <SelectItem value="7">7 minutos</SelectItem>
              <SelectItem value="8">8 minutos</SelectItem>
              <SelectItem value="9">9 minutos</SelectItem>
              <SelectItem value="10">10 minutos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {!isEditing && (
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Criando...' : 'Criar Apresentação'}
          </Button>
        )}
      </form>

      {isEditing && presentation && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Itens da Apresentação</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem('image')}
                disabled={addItemMutation.isPending}
              >
                <Image className="w-4 h-4 mr-2" />
                Adicionar Imagem
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addItem('powerbi')}
                disabled={addItemMutation.isPending}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Adicionar Power BI
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <Card key={item.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    {getItemIcon(item.type)}
                    Item {index + 1} - {item.type === 'image' ? 'Imagem' : 'Power BI'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Título</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="Título do item"
                      className="text-sm"
                    />
                  </div>
                  
                  <div>
                    <Label>
                      {item.type === 'image' ? 'Arquivo de Imagem' : 'URL do Dashboard'}
                    </Label>
                    {item.type === 'image' ? (
                      <div className="space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, item.id)}
                          className="text-sm"
                        />
                        {item.url && (
                          <div className="flex items-center space-x-2">
                            <img 
                              src={item.url} 
                              alt="Preview" 
                              className="w-16 h-16 object-cover rounded border"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-muted-foreground truncate">
                                {item.url.split('/').pop()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        value={item.url}
                        onChange={(e) => updateItem(item.id, { url: e.target.value })}
                        placeholder="https://app.powerbi.com/..."
                        className="text-sm font-mono"
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                      <Label>Tempo de Exibição (minutos)</Label>
                      <Select 
                        value={item.display_time.toString()} 
                        onValueChange={(value) => updateItem(item.id, { display_time: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 minuto</SelectItem>
                          <SelectItem value="2">2 minutos</SelectItem>
                          <SelectItem value="3">3 minutos</SelectItem>
                          <SelectItem value="4">4 minutos</SelectItem>
                          <SelectItem value="5">5 minutos</SelectItem>
                          <SelectItem value="6">6 minutos</SelectItem>
                          <SelectItem value="7">7 minutos</SelectItem>
                          <SelectItem value="8">8 minutos</SelectItem>
                          <SelectItem value="9">9 minutos</SelectItem>
                          <SelectItem value="10">10 minutos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      disabled={deleteItemMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-muted-foreground">
                Nenhum item adicionado ainda. Adicione imagens ou dashboards do Power BI.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
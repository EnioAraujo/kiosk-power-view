import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Image, BarChart3, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import imageCompression from 'browser-image-compression';

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
  const [uploadStates, setUploadStates] = useState<Record<string, {
    isCompressing: boolean;
    isUploading: boolean;
    originalSize?: number;
    compressedSize?: number;
  }>>({});
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

  // Função para validar arquivo de imagem
  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSizeBeforeCompression = 20 * 1024 * 1024; // 20MB

    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não suportado. Use JPG, PNG, WebP ou GIF.');
      return false;
    }

    if (file.size > maxSizeBeforeCompression) {
      toast.error('Arquivo muito grande. Tamanho máximo: 20MB.');
      return false;
    }

    return true;
  };

  // Função para comprimir imagem
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1, // Tamanho máximo: 1MB
      maxWidthOrHeight: 1920, // Resolução máxima
      useWebWorker: true, // Usar web worker para não bloquear UI
      initialQuality: 0.8, // Qualidade inicial: 80%
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log('Compressão concluída:', {
        original: file.size,
        compressed: compressedFile.size,
        reduction: Math.round((1 - compressedFile.size / file.size) * 100)
      });
      return compressedFile;
    } catch (error) {
      console.error('Erro na compressão:', error);
      toast.error('Erro ao comprimir imagem. Tentando upload sem compressão.');
      return file;
    }
  };

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

    // Validar arquivo
    if (!validateImageFile(file)) {
      event.target.value = ''; // Limpar input
      return;
    }

    // Atualizar estado de upload
    setUploadStates(prev => ({
      ...prev,
      [itemId]: {
        isCompressing: true,
        isUploading: false,
        originalSize: file.size
      }
    }));

    try {
      // Comprimir imagem
      const compressedFile = await compressImage(file);
      
      // Atualizar estado para upload
      setUploadStates(prev => ({
        ...prev,
        [itemId]: {
          isCompressing: false,
          isUploading: true,
          originalSize: file.size,
          compressedSize: compressedFile.size
        }
      }));

      // Upload para Supabase Storage - sanitizar nome do arquivo
      const sanitizedName = compressedFile.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9.-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_{2,}/g, '_'); // Remove underscores duplos
      
      const fileName = `${Date.now()}_${sanitizedName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('presentation-images')
        .upload(fileName, compressedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('presentation-images')
        .getPublicUrl(fileName);

      // Update item with the new URL
      updateItem(itemId, { url: publicUrl });
      
      const reduction = Math.round((1 - compressedFile.size / file.size) * 100);
      toast.success(`Imagem carregada com sucesso! Redução de ${reduction}%`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      // Limpar estado de upload
      setUploadStates(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
      event.target.value = ''; // Limpar input
    }
  };

  const getItemIcon = (type: string) => {
    return type === 'image' ? <Image className="w-4 h-4" /> : <BarChart3 className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
            {items.map((item, index) => {
              const uploadState = uploadStates[item.id];
              
              return (
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
                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                            onChange={(e) => handleImageUpload(e, item.id)}
                            className="text-sm"
                            disabled={uploadState?.isCompressing || uploadState?.isUploading}
                          />
                          
                          {uploadState && (
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {uploadState.isCompressing && (
                                <span>Comprimindo imagem...</span>
                              )}
                              {uploadState.isUploading && (
                                <span>
                                  Fazendo upload... 
                                  {uploadState.originalSize && uploadState.compressedSize && (
                                    <span className="ml-1">
                                      ({formatFileSize(uploadState.originalSize)} → {formatFileSize(uploadState.compressedSize)})
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {item.url && !uploadState && (
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
                          
                          <p className="text-xs text-muted-foreground">
                            Formatos aceitos: JPG, PNG, WebP, GIF. Tamanho máximo: 20MB (será comprimido automaticamente).
                          </p>
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
                        disabled={deleteItemMutation.isPending || uploadState?.isCompressing || uploadState?.isUploading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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

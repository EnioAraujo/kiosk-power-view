import { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Edit, Trash2, Settings, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import PresentationForm from './PresentationForm';
import EditableTitle from './EditableTitle';
import AuthDialog from './AuthDialog';

type Presentation = Tables<'presentations'>;

export default function PresentationManager() {
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const queryClient = useQueryClient();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Fetch presentations
  const { data: presentations = [], isLoading } = useQuery({
    queryKey: ['presentations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('presentations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => subscription.unsubscribe();
  }, []);

  // Create presentation mutation
  const createMutation = useMutation({
    mutationFn: async (newPresentation: { title: string; refresh_interval: number }) => {
      if (!session?.user?.id) {
        throw new Error('Usuário não autenticado');
      }
      
      const { data, error } = await supabase
        .from('presentations')
        .insert([{
          ...newPresentation,
          user_id: session.user.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      setIsCreateOpen(false);
      toast.success('Apresentação criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating presentation:', error);
      toast.error('Erro ao criar apresentação');
    },
  });

  // Update presentation title mutation
  const updateTitleMutation = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { data, error } = await supabase
        .from('presentations')
        .update({ title })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      toast.success('Título atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating presentation:', error);
      toast.error('Erro ao atualizar título');
    },
  });

  // Update presentation settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async ({ id, title, refresh_interval }: { id: string; title: string; refresh_interval: number }) => {
      const { data, error } = await supabase
        .from('presentations')
        .update({ title, refresh_interval })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      queryClient.invalidateQueries({ queryKey: ['presentation'] });
      toast.success('Apresentação atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating presentation:', error);
      toast.error('Erro ao atualizar apresentação');
    },
  });

  // Delete presentation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete all presentation items
      await supabase
        .from('presentation_items')
        .delete()
        .eq('presentation_id', id);
      
      // Then delete the presentation
      const { error } = await supabase
        .from('presentations')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['presentations'] });
      toast.success('Apresentação deletada com sucesso!');
    },
    onError: (error) => {
      console.error('Error deleting presentation:', error);
      toast.error('Erro ao deletar apresentação');
    },
  });

  const handleCreatePresentation = (data: { title: string; refresh_interval: number }) => {
    if (!session) {
      toast.error('Faça login para criar apresentações');
      setIsAuthOpen(true);
      return;
    }
    createMutation.mutate(data);
  };

  const handleUpdateTitle = (id: string, title: string) => {
    if (!session) {
      toast.error('Faça login para editar');
      setIsAuthOpen(true);
      return;
    }
    updateTitleMutation.mutate({ id, title });
  };

  const handleDelete = (id: string) => {
    if (!session) {
      toast.error('Faça login para deletar');
      setIsAuthOpen(true);
      return;
    }
    if (window.confirm('Tem certeza que deseja deletar esta apresentação?')) {
      deleteMutation.mutate(id);
    }
  };

  const openPresentation = (id: string) => {
    window.open(`/presentation/${id}`, '_blank');
  };

  const sharePresentation = (id: string) => {
    const shareUrl = `${window.location.origin}/presentation/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success('Link copiado para a área de transferência!');
    }).catch(() => {
      toast.error('Erro ao copiar link');
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando apresentações...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Gerenciador de Apresentações</h1>
          <p className="text-muted-foreground">
            Gerencie suas apresentações para exibição em TV
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <Button
            onClick={() => {
              if (session) setIsCreateOpen(true);
              else {
                setIsAuthOpen(true);
                toast.error('Faça login para criar apresentações');
              }
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Apresentação
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Apresentação</DialogTitle>
            </DialogHeader>
            <PresentationForm
              onSubmit={handleCreatePresentation}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {presentations.map((presentation) => (
          <Card key={presentation.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <EditableTitle
                  title={presentation.title}
                  onSave={(newTitle) => handleUpdateTitle(presentation.id, newTitle)}
                  isUpdating={updateTitleMutation.isPending}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>Intervalo: {presentation.refresh_interval}min</p>
                  <p>Status: {presentation.is_public ? 'Público' : 'Privado'}</p>
                  <p>Criado: {new Date(presentation.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openPresentation(presentation.id)}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Reproduzir
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => sharePresentation(presentation.id)}
                    title="Compartilhar apresentação"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  
                  <Dialog open={isEditOpen && selectedPresentation?.id === presentation.id} 
                          onOpenChange={(open) => {
                            setIsEditOpen(open);
                            if (!open) setSelectedPresentation(null);
                          }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (!session) {
                            setIsAuthOpen(true);
                            toast.error('Faça login para editar');
                            return;
                          }
                          setSelectedPresentation(presentation);
                          setIsEditOpen(true);
                        }}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Configurar Apresentação</DialogTitle>
                      </DialogHeader>
                      {selectedPresentation && (
                        <PresentationForm
                          presentation={selectedPresentation}
                          onSubmit={(data) => {
                            if (data && selectedPresentation) {
                              updateSettingsMutation.mutate({
                                id: selectedPresentation.id,
                                title: data.title,
                                refresh_interval: data.refresh_interval
                              });
                            }
                            setIsEditOpen(false);
                            setSelectedPresentation(null);
                          }}
                          isSubmitting={updateSettingsMutation.isPending}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(presentation.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {presentations.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📺</div>
          <h3 className="text-xl font-semibold mb-2">Nenhuma apresentação criada</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua primeira apresentação para começar
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Apresentação
          </Button>
        </div>
      )}

      <AuthDialog
        open={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        onAuthSuccess={() => {
          setIsAuthOpen(false);
          toast.success('Login realizado');
        }}
      />
    </div>
  );
}
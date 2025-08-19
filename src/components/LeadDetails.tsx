
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  Monitor
} from 'lucide-react';
import { Lead, EtiquetaHistory } from '@/types/lead';
import { clientDataService } from '@/services/clientDataService';

interface LeadDetailsProps {
  lead: Lead;
  onClose: () => void;
  onUpdateStatus: (leadId: string, newStatus: Lead['status']) => void;
  availableEtiquetas: string[];
}

export const LeadDetails: React.FC<LeadDetailsProps> = ({ 
  lead, 
  onClose, 
  onUpdateStatus, 
  availableEtiquetas
}) => {
  // Estado local para forçar re-render
  const [forceUpdate, setForceUpdate] = React.useState(0);
  // Função para recarregar histórico
  const reloadHistory = React.useCallback(async () => {
    try {
      const currentClient = clientDataService.getCurrentClient();
      if (currentClient?.historicoEtiquetasSheetId) {
        console.log(`[LeadDetails] 🔄 Recarregando histórico para lead ${lead.id}`);
        const historyFromSheets = await clientDataService.loadEtiquetaHistoryFromSheets(lead.id);
        
        if (historyFromSheets.length > 0) {
          // Atualizar o lead com o histórico da planilha
          lead.etiquetaHistory = historyFromSheets;
          console.log(`[LeadDetails] ✅ Histórico atualizado: ${historyFromSheets.length} registros`);
          
          // Forçar re-render
          setForceUpdate(prev => prev + 1);
          
                  // Log silencioso de sucesso
        console.log(`[LeadDetails] ✅ Histórico atualizado com ${historyFromSheets.length} registros`);
        }
      }
    } catch (error) {
      console.error('[LeadDetails] ❌ Erro ao recarregar histórico:', error);
              console.log('[LeadDetails] ❌ Erro ao recarregar histórico');
    }
  }, [lead.id]);



  // Não carregar automaticamente ao abrir para evitar lentidão; o usuário usará o botão Recarregar
  React.useEffect(() => {
    console.log(`[LeadDetails] Aberto lead ${lead.id}. Histórico será carregado apenas ao clicar em Recarregar.`);
  }, [lead.id]);

  // Escutar mudanças de etiquetas em tempo real
  React.useEffect(() => {
    const handleEtiquetaChange = (event: CustomEvent) => {
      if (event.detail.leadId === lead.id) {
        console.log(`[LeadDetails] 🎯 Mudança de etiqueta detectada para este lead:`, event.detail);
        
        // Log silencioso da mudança
        console.log(`[LeadDetails] 🎯 Etiqueta alterada: ${event.detail.etiquetaAnterior} → ${event.detail.etiquetaNova}`);
        
        // Recarregar histórico automaticamente
        reloadHistory();
      }
    };

    // Listener para atualizações automáticas de leads
    const handleLeadsUpdated = (event: CustomEvent) => {
      const change = event.detail.changes?.find((c: any) => c.leadId === lead.id);
      if (change) {
        console.log(`[LeadDetails] 🔄 Mudança detectada na planilha para este lead:`, change);
        
        // Log silencioso da atualização
        console.log(`[LeadDetails] 🔄 Etiqueta atualizada na planilha: ${change.etiquetaAnterior} → ${change.etiquetaNova}`);
        
        // Recarregar histórico
        reloadHistory();
      }
    };

    // Adicionar listeners para eventos customizados
    window.addEventListener('etiquetaChanged', handleEtiquetaChange as EventListener);
    window.addEventListener('leadsUpdated', handleLeadsUpdated as EventListener);
    
    // Cleanup
    return () => {
      window.removeEventListener('etiquetaChanged', handleEtiquetaChange as EventListener);
      window.removeEventListener('leadsUpdated', handleLeadsUpdated as EventListener);
    };
  }, [lead.id, reloadHistory]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'contato': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'qualificado': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'proposta': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ganho': return 'bg-green-100 text-green-800 border-green-200';
      case 'perdido': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('55')) {
      const cleanPhone = phone.substring(2);
      return `+55 (${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    }
    return phone;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
              {lead.nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{lead.nome}</h2>
              <Badge className={`${getStatusColor(lead.status)} border mt-1`}>
                {lead.etapaEtiquetas || 'Sem Etiqueta'}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

                <div className="mt-6">
          {/* Informações do Lead */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Telefone:</span>
                  <a href={`tel:${lead.telefone}`} className="text-blue-600 hover:underline">
                    {formatPhone(lead.telefone)}
                  </a>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">Data:</span>
                  <span>{lead.data}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-medium">Origem:</span>
                  <span>{lead.origem}</span>
                </div>

                {lead.clienteLocal && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Local:</span>
                    <span>{lead.clienteLocal}</span>
                  </div>
                )}

                <Separator />

                <div>
                  <span className="font-medium">Campanha:</span>
                  <p className="text-sm text-gray-600 mt-1">{lead.campanha}</p>
                </div>

                <div>
                  <span className="font-medium">Conjunto:</span>
                  <p className="text-sm text-gray-600 mt-1">{lead.conjunto}</p>
                </div>

                {lead.anuncio && (
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Anúncio:</span>
                    <span className="text-sm text-gray-600">{lead.anuncio}</span>
                  </div>
                )}

                {lead.linkAnuncio && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                    <a 
                      href={lead.linkAnuncio} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ver Anúncio Original
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="etiqueta-info" className="font-medium">
                  Etiqueta:
                </Label>
                <div className="mt-2 px-3 py-2 border rounded-md bg-gray-50">
                  <span className="text-gray-700">
                    {lead.etapaEtiquetas || 'Sem Etiqueta'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  A etiqueta é definida automaticamente pela planilha
                </p>
                
                {/* Botões para testar mudança de etiqueta e sincronização automática */}
                <div className="mt-3 flex gap-2">
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const etiquetaAtual = lead.etapaEtiquetas || 'Sem Etiqueta';
                      const novaEtiqueta = 'NEGOCIAÇÃO';
                      
                      try {
                        await clientDataService.trackEtiquetaChange(
                          lead.id, 
                          etiquetaAtual, 
                          novaEtiqueta, 
                          'Teste de funcionalidade', 
                          'Usuário Demo'
                        );
                        
                        // Atualizar estado local
                        lead.etiquetaHistory = lead.etiquetaHistory || [];
                        lead.etiquetaHistory.unshift({
                          id: `etiqueta_${Date.now()}`,
                          leadId: lead.id,
                          nomeLead: lead.nome,
                          etiquetaAnterior: etiquetaAtual,
                          etiquetaNova: novaEtiqueta,
                          data: new Date().toISOString(),
                          usuario: 'Usuário Demo',
                          motivo: 'Teste de funcionalidade'
                        });
                        
                        // Disparar evento para atualizar o dashboard
                        window.dispatchEvent(new Event('storage'));
                        
                        console.log('✅ Etiqueta NEGOCIAÇÃO testada e sincronizada!');
                      } catch (error) {
                        console.error('❌ Erro ao testar etiqueta:', error);
                      }
                    }}
                    className="text-xs"
                  >
                    Testar NEGOCIAÇÃO + Sync
                  </Button>
                  
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const etiquetaAtual = lead.etapaEtiquetas || 'Sem Etiqueta';
                      const novaEtiqueta = 'QUALIFICADO';
                      
                      try {
                        await clientDataService.trackEtiquetaChange(
                          lead.id, 
                          etiquetaAtual, 
                          novaEtiqueta, 
                          'Lead qualificado após contato', 
                          'Usuário Demo'
                        );
                        
                        // Atualizar estado local
                        lead.etiquetaHistory = lead.etiquetaHistory || [];
                        lead.etiquetaHistory.unshift({
                          id: `etiqueta_${Date.now()}`,
                          leadId: lead.id,
                          nomeLead: lead.nome,
                          etiquetaAnterior: etiquetaAtual,
                          etiquetaNova: novaEtiqueta,
                          data: new Date().toISOString(),
                          usuario: 'Usuário Demo',
                          motivo: 'Lead qualificado após contato'
                        });
                        
                        // Disparar evento para atualizar o dashboard
                        window.dispatchEvent(new Event('storage'));
                        
                        console.log('✅ Etiqueta QUALIFICADO testada e sincronizada!');
                      } catch (error) {
                        console.error('❌ Erro ao testar etiqueta:', error);
                      }
                    }}
                    className="text-xs"
                  >
                    Testar QUALIFICADO + Sync
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Etiquetas */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Badge className="w-5 h-5 p-0 flex items-center justify-center text-xs">📊</Badge>
              Histórico de Etiquetas
            </CardTitle>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Acompanhe todas as mudanças de etiqueta deste lead
              </p>
                            <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={reloadHistory}
                >
                  🔄 Recarregar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    try {
                      console.log('🔄 Forçando sincronização com Google Sheets...');
                      await clientDataService.autoSyncEtiquetaHistory(lead.id);
                      console.log('✅ Sincronização forçada concluída!');
                      reloadHistory();
                    } catch (error) {
                      console.log('❌ Erro na sincronização forçada:', error);
                    }
                  }}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  🚀 Forçar Sync
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    try {
                      clientDataService.removeDuplicateEtiquetas(lead.id);
                      console.log('✅ Duplicatas removidas com sucesso!');
                      reloadHistory();
                    } catch (error) {
                      console.log('❌ Erro ao remover duplicatas');
                    }
                  }}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                >
                  🧹 Limpar Duplicatas
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
                        {lead.etiquetaHistory && lead.etiquetaHistory.length > 0 ? (
              <div key={`history-${forceUpdate}`} className="space-y-3">
                {lead.etiquetaHistory
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map((history, index) => (
                    <div key={history.id} className="border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-sm font-medium text-gray-700">
                            {index === 0 ? 'Etiqueta Atual' : 'Mudança'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(history.data).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-gray-600">De:</span>
                        <Badge variant="outline" className="text-xs">
                          {history.etiquetaAnterior || 'Sem Etiqueta'}
                        </Badge>
                        <span className="text-gray-400">→</span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                          {history.etiquetaNova}
                        </Badge>
                      </div>
                      
                      {history.motivo && (
                        <div className="text-xs text-gray-600 bg-white p-2 rounded border">
                          <span className="font-medium">Motivo:</span> {history.motivo}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Alterado por: {history.usuario}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-gray-500 mb-2">Nenhuma mudança de etiqueta registrada</p>
                <p className="text-xs text-gray-400">
                  Este lead ainda não teve suas etiquetas alteradas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        {lead.observacoes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{lead.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

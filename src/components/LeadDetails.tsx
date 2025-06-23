
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Phone, 
  Calendar, 
  MapPin, 
  ExternalLink, 
  MessageSquare, 
  PhoneCall, 
  Mail, 
  UserCheck,
  Clock,
  Plus,
  Monitor
} from 'lucide-react';
import { Lead, Interaction } from '@/types/lead';

interface LeadDetailsProps {
  lead: Lead;
  onClose: () => void;
  onUpdateStatus: (leadId: string, newStatus: Lead['status']) => void;
  onAddInteraction: (leadId: string, interaction: Omit<Interaction, 'id' | 'leadId'>) => void;
  availableEtiquetas: string[];
}

export const LeadDetails: React.FC<LeadDetailsProps> = ({ 
  lead, 
  onClose, 
  onUpdateStatus, 
  onAddInteraction,
  availableEtiquetas
}) => {
  const [newInteraction, setNewInteraction] = useState('');
  const [interactionType, setInteractionType] = useState<Interaction['tipo']>('note');

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

  const getInteractionIcon = (type: Interaction['tipo']) => {
    switch (type) {
      case 'call': return <PhoneCall className="w-4 h-4" />;
      case 'email': return <Mail className="w-4 h-4" />;
      case 'meeting': return <UserCheck className="w-4 h-4" />;
      case 'note': return <MessageSquare className="w-4 h-4" />;
    }
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('55')) {
      const cleanPhone = phone.substring(2);
      return `+55 (${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    }
    return phone;
  };

  const handleAddInteraction = () => {
    if (newInteraction.trim()) {
      onAddInteraction(lead.id, {
        tipo: interactionType,
        descricao: newInteraction,
        data: new Date().toLocaleString('pt-BR'),
        usuario: 'Usuário Atual'
      });
      setNewInteraction('');
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
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
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Interações */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Histórico de Interações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {lead.interactions.length > 0 ? (
                  lead.interactions.map((interaction) => (
                    <div key={interaction.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        {getInteractionIcon(interaction.tipo)}
                        <span className="font-medium text-sm capitalize">{interaction.tipo}</span>
                        <Clock className="w-3 h-3 text-gray-500 ml-auto" />
                        <span className="text-xs text-gray-500">{interaction.data}</span>
                      </div>
                      <p className="text-sm text-gray-700">{interaction.descricao}</p>
                      <p className="text-xs text-gray-500 mt-1">por {interaction.usuario}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Nenhuma interação registrada ainda
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Adicionar Nova Interação */}
              <div className="space-y-3">
                <Label className="font-medium">Nova Interação:</Label>
                <div className="flex gap-2">
                  <select 
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value as Interaction['tipo'])}
                    className="px-3 py-2 border rounded-md bg-background text-sm"
                  >
                    <option value="note">Observação</option>
                    <option value="call">Ligação</option>
                    <option value="email">E-mail</option>
                    <option value="meeting">Reunião</option>
                  </select>
                </div>
                <Textarea
                  placeholder="Descreva a interação..."
                  value={newInteraction}
                  onChange={(e) => setNewInteraction(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleAddInteraction}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={!newInteraction.trim()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Interação
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

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

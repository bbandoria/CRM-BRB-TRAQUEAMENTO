import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Mail, MapPin, Calendar, ExternalLink } from 'lucide-react';
import { Lead } from '@/types/lead';

interface LeadsListProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: Lead['status']) => void;
  availableEtiquetas: string[];
}

export const LeadsList: React.FC<LeadsListProps> = ({ 
  leads, 
  onSelectLead, 
  onUpdateStatus, 
  availableEtiquetas 
}) => {
  const getStatusColor = (etiqueta: string) => {
    if (!etiqueta || etiqueta === 'sem-etiqueta') return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const lowerEtiqueta = etiqueta.toLowerCase();
    if (lowerEtiqueta.includes('novo')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (lowerEtiqueta.includes('contato') || lowerEtiqueta.includes('andamento')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (lowerEtiqueta.includes('qualificado') || lowerEtiqueta.includes('interessado')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (lowerEtiqueta.includes('proposta')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (lowerEtiqueta.includes('ganho') || lowerEtiqueta.includes('convertido')) return 'bg-green-100 text-green-800 border-green-200';
    if (lowerEtiqueta.includes('perdido') || lowerEtiqueta.includes('descartado')) return 'bg-red-100 text-red-800 border-red-200';
    
    return 'bg-indigo-100 text-indigo-800 border-indigo-200';
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('55')) {
      const cleanPhone = phone.substring(2);
      return `+55 (${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    }
    return phone;
  };

  const handleEtiquetaChange = (leadId: string, newEtiqueta: string) => {
    // Por enquanto, mantemos a função original mas ela deveria atualizar etapaEtiquetas
    onUpdateStatus(leadId, 'novo'); // Placeholder - idealmente seria uma função separada
  };

  if (leads.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum lead encontrado</h3>
            <p className="text-gray-600 mb-4">Tente ajustar os filtros ou adicionar um novo lead.</p>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              Adicionar Lead
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {leads.map((lead) => (
        <Card key={lead.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {lead.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{lead.nome}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {formatPhone(lead.telefone)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {lead.data}
                        </div>
                      </div>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(lead.etapaEtiquetas || 'sem-etiqueta')} border`}>
                    {lead.etapaEtiquetas || 'Sem Etiqueta'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Origem:</span>
                    <span className="ml-2 text-gray-600">{lead.origem}</span>
                  </div>
                  {lead.clienteLocal && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-600">{lead.clienteLocal}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-700">Campanha:</span>
                    <span className="ml-2 text-gray-600 truncate block max-w-[200px]" title={lead.campanha}>
                      {lead.campanha}
                    </span>
                  </div>
                </div>

                {lead.observacoes && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Observações:</span> {lead.observacoes}
                    </p>
                  </div>
                )}

                {lead.interactions.length > 0 && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Última interação:</span> {lead.interactions[lead.interactions.length - 1].descricao}
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-2 lg:min-w-[200px]">
                <select 
                  value={lead.etapaEtiquetas || 'sem-etiqueta'}
                  onChange={(e) => handleEtiquetaChange(lead.id, e.target.value)}
                  className="px-3 py-2 border rounded-md bg-background text-sm"
                >
                  <option value="sem-etiqueta">Sem Etiqueta</option>
                  {availableEtiquetas.filter(etiqueta => etiqueta !== 'sem-etiqueta').map(etiqueta => (
                    <option key={etiqueta} value={etiqueta}>
                      {etiqueta}
                    </option>
                  ))}
                </select>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSelectLead(lead)}
                  className="hover:bg-blue-50 hover:border-blue-300"
                >
                  Ver detalhes
                </Button>

                {lead.linkAnuncio && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    asChild
                  >
                    <a href={lead.linkAnuncio} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

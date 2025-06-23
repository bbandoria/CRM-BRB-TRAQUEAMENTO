
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Calendar, MapPin } from 'lucide-react';
import { Lead } from '@/types/lead';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (leadId: string, newStatus: Lead['status']) => void;
  onSelectLead: (lead: Lead) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ leads, onUpdateStatus, onSelectLead }) => {
  // Gerar colunas dinamicamente baseado no campo etapaEtiquetas
  const statusColumns = useMemo(() => {
    const etiquetasSet = new Set<string>();
    
    leads.forEach(lead => {
      if (lead.etapaEtiquetas && lead.etapaEtiquetas.trim()) {
        etiquetasSet.add(lead.etapaEtiquetas.trim());
      } else {
        etiquetasSet.add('sem-etiqueta');
      }
    });

    const etiquetas = Array.from(etiquetasSet).sort();
    
    return etiquetas.map((etiqueta, index) => {
      const colors = [
        'bg-blue-100 border-blue-300',
        'bg-yellow-100 border-yellow-300',
        'bg-purple-100 border-purple-300',
        'bg-orange-100 border-orange-300',
        'bg-green-100 border-green-300',
        'bg-red-100 border-red-300',
        'bg-pink-100 border-pink-300',
        'bg-indigo-100 border-indigo-300',
        'bg-teal-100 border-teal-300',
        'bg-gray-100 border-gray-300'
      ];
      
      return {
        key: etiqueta,
        title: etiqueta === 'sem-etiqueta' ? 'Sem Etiqueta' : etiqueta,
        color: colors[index % colors.length]
      };
    });
  }, [leads]);

  const getLeadsByEtiqueta = (etiqueta: string) => {
    return leads.filter(lead => {
      if (etiqueta === 'sem-etiqueta') {
        return !lead.etapaEtiquetas || !lead.etapaEtiquetas.trim();
      }
      return lead.etapaEtiquetas?.trim() === etiqueta;
    });
  };

  const formatPhone = (phone: string) => {
    if (phone.startsWith('55')) {
      const cleanPhone = phone.substring(2);
      return `+55 (${cleanPhone.substring(0, 2)}) ${cleanPhone.substring(2, 7)}-${cleanPhone.substring(7)}`;
    }
    return phone;
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, newEtiqueta: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    // Por enquanto, mantemos a função original mas poderíamos expandir para atualizar etapaEtiquetas
    onUpdateStatus(leadId, 'contato' as Lead['status']);
  };

  return (
    <div className={`grid gap-6 h-[calc(100vh-300px)]`} style={{ gridTemplateColumns: `repeat(${statusColumns.length}, minmax(300px, 1fr))` }}>
      {statusColumns.map((column) => {
        const columnLeads = getLeadsByEtiqueta(column.key);
        
        return (
          <div key={column.key} className="flex flex-col h-full">
            <Card className={`border-2 ${column.color} mb-4`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  {column.title}
                  <Badge variant="secondary" className="text-xs">
                    {columnLeads.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>
            
            <div 
              className="flex-1 border-2 border-dashed border-gray-200 rounded-lg p-2 overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.key)}
            >
              <ScrollArea className="h-full">
                <div className="space-y-3 pr-2">
                  {columnLeads.map((lead) => (
                    <Card 
                      key={lead.id}
                      className="cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 border-0 shadow-md"
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {lead.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate">{lead.nome}</h4>
                              <p className="text-xs text-muted-foreground truncate">{lead.origem}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              <span className="truncate">{formatPhone(lead.telefone)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{lead.data}</span>
                            </div>
                            {lead.clienteLocal && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{lead.clienteLocal}</span>
                              </div>
                            )}
                          </div>

                          {lead.observacoes && (
                            <div className="bg-gray-50 rounded p-2">
                              <p className="text-xs text-gray-700 line-clamp-2">
                                {lead.observacoes}
                              </p>
                            </div>
                          )}

                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-xs h-6 flex-1"
                              onClick={() => onSelectLead(lead)}
                            >
                              Detalhes
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {columnLeads.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                      Arraste leads aqui
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      })}
    </div>
  );
};

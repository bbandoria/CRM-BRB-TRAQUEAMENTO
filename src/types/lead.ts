export interface Lead {
  id: string;
  data: string;
  nome: string;
  telefone: string;
  origem: string;
  etapaEtiquetas: string;
  etapaAltas: string;
  clienteLocal: string;
  campanha: string;
  conjunto: string;
  anuncio: string;
  media: string;
  ref: string;
  linkAnuncio: string;
  dispositivo: string;
  observacoes?: string;
  status: 'novo' | 'contato' | 'qualificado' | 'proposta' | 'ganho' | 'perdido';
  ultimaInteracao?: string;
  proximoFollowup?: string;
  interactions: Interaction[];
}

export interface Interaction {
  id: string;
  leadId: string;
  tipo: 'call' | 'email' | 'meeting' | 'note';
  descricao: string;
  data: string;
  usuario: string;
}

export interface DashboardStats {
  totalLeads: number;
  novosLeads: number;
  leadsQualificados: number;
  taxaConversao: number;
  leadsPorOrigem: Record<string, number>;
}

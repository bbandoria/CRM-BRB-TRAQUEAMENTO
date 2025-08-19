import { supabase, SUPABASE_CONFIG } from '@/config/supabase';
import { Lead, Interaction, EtiquetaHistory } from '@/types/lead';

class SupabaseService {
  // ===== CONFIGURAÇÃO DE CLIENTES =====
  async createClientTables(clientId: string, clientName: string): Promise<boolean> {
    try {
      console.log(`[Supabase] Criando tabelas para o cliente: ${clientName} (${clientId})`);
      
      // 1. Criar tabela de leads do cliente
      const leadsTableName = SUPABASE_CONFIG.getClientTableName(clientId, 'leads');
      const { error: leadsError } = await supabase.rpc('create_client_leads_table', {
        table_name: leadsTableName,
        client_id: clientId
      });
      
      if (leadsError) {
        console.error('Erro ao criar tabela de leads:', leadsError);
        throw new Error('Falha ao criar tabela de leads');
      }

      // 2. Criar tabela de histórico de etiquetas do cliente
      const historicoTableName = SUPABASE_CONFIG.getClientTableName(clientId, 'historico_etiquetas');
      const { error: historicoError } = await supabase.rpc('create_client_historico_table', {
        table_name: historicoTableName,
        client_id: clientId
      });
      
      if (historicoError) {
        console.error('Erro ao criar tabela de histórico:', historicoError);
        throw new Error('Falha ao criar tabela de histórico');
      }

      // 3. Criar tabela de interações do cliente
      const interactionsTableName = SUPABASE_CONFIG.getClientTableName(clientId, 'interactions');
      const { error: interactionsError } = await supabase.rpc('create_client_interactions_table', {
        table_name: interactionsTableName,
        client_id: clientId
      });
      
      if (interactionsError) {
        console.error('Erro ao criar tabela de interações:', interactionsError);
        throw new Error('Falha ao criar tabela de interações');
      }

      // 4. Registrar configuração do cliente
      const { error: configError } = await supabase
        .from(SUPABASE_CONFIG.TABLES.CLIENT_CONFIGS)
        .insert([{
          client_id: clientId,
          client_name: clientName,
          leads_table: leadsTableName,
          historico_table: historicoTableName,
          interactions_table: interactionsTableName,
          created_at: new Date().toISOString()
        }]);

      if (configError) {
        console.error('Erro ao registrar configuração do cliente:', configError);
        throw new Error('Falha ao registrar configuração do cliente');
      }

      console.log(`[Supabase] ✅ Tabelas criadas com sucesso para ${clientName}`);
      return true;

    } catch (error) {
      console.error('Erro ao criar tabelas do cliente:', error);
      throw new Error('Falha ao criar tabelas do cliente');
    }
  }

  async getClientConfig(clientId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from(SUPABASE_CONFIG.TABLES.CLIENT_CONFIGS)
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) {
        console.error('Erro ao buscar configuração do cliente:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar configuração do cliente:', error);
      return null;
    }
  }

  // ===== LEADS POR CLIENTE =====
  async fetchLeadsByClient(clientId: string): Promise<Lead[]> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .select(`
          *,
          interactions:${clientConfig.interactions_table}(*),
          etiquetaHistory:${clientConfig.historico_table}(*)
        `)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads do cliente:', error);
        throw new Error('Falha ao buscar leads do cliente');
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads do cliente:', error);
      throw new Error('Falha ao buscar leads do cliente');
    }
  }

  async createLeadForClient(clientId: string, lead: Omit<Lead, 'id'>): Promise<Lead> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .insert([lead])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar lead para o cliente:', error);
        throw new Error('Falha ao criar lead');
      }

      return data;
    } catch (error) {
      console.error('Erro ao criar lead para o cliente:', error);
      throw new Error('Falha ao criar lead no banco');
    }
  }

  async updateLeadForClient(clientId: string, leadId: string, updates: Partial<Lead>): Promise<Lead> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) {
        console.error('Erro ao atualizar lead do cliente:', error);
        throw new Error('Falha ao atualizar lead');
      }

      return data;
    } catch (error) {
      console.error('Erro ao atualizar lead do cliente:', error);
      throw new Error('Falha ao atualizar lead no banco');
    }
  }

  // ===== HISTÓRICO DE ETIQUETAS POR CLIENTE =====
  async appendEtiquetaHistoryForClient(clientId: string, historyData: Omit<EtiquetaHistory, 'id'>[]): Promise<void> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      console.log(`[Supabase] Adicionando ${historyData.length} registros ao histórico do cliente ${clientId}`);
      
      const { error } = await supabase
        .from(clientConfig.historico_table)
        .insert(historyData);

      if (error) {
        console.error('Erro ao adicionar histórico do cliente:', error);
        throw new Error('Falha ao salvar histórico no banco');
      }

      console.log('[Supabase] ✅ Histórico do cliente salvo com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar histórico do cliente:', error);
      throw new Error('Falha ao salvar histórico no banco');
    }
  }

  async readEtiquetaHistoryForClient(clientId: string): Promise<EtiquetaHistory[]> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.historico_table)
        .select('*')
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico do cliente:', error);
        throw new Error('Falha ao buscar histórico do cliente');
      }

      console.log(`${data?.length || 0} registros de histórico do cliente carregados`);
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico do cliente:', error);
      return [];
    }
  }

  // ===== INTERAÇÕES POR CLIENTE =====
  async addInteractionForClient(clientId: string, interaction: Omit<Interaction, 'id'>): Promise<Interaction> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.interactions_table)
        .insert([interaction])
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar interação do cliente:', error);
        throw new Error('Falha ao adicionar interação');
      }

      return data;
    } catch (error) {
      console.error('Erro ao adicionar interação do cliente:', error);
      throw new Error('Falha ao adicionar interação no banco');
    }
  }

  // ===== MIGRAÇÃO DE PLANILHAS =====
  async importLeadsFromCSVForClient(clientId: string, csvData: string): Promise<Lead[]> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const leads = this.parseCSVData(csvData);
      
      if (leads.length === 0) {
        return [];
      }

      // Inserir leads na tabela específica do cliente
      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .insert(leads)
        .select();

      if (error) {
        console.error('Erro ao importar leads para o cliente:', error);
        throw new Error('Falha ao importar leads');
      }

      console.log(`${leads.length} leads importados com sucesso para o cliente ${clientId}`);
      return data || [];
    } catch (error) {
      console.error('Erro ao importar leads para o cliente:', error);
      throw new Error('Falha ao importar leads do CSV');
    }
  }

  // ===== FUNÇÕES UTILITÁRIAS =====
  private parseCSVData(csvText: string): Omit<Lead, 'id'>[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      console.log('Nenhum dado encontrado no CSV');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads: Omit<Lead, 'id'>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === 0) continue;

      const lead: Omit<Lead, 'id'> = {
        data: row[headers.indexOf('Data')] || row[0] || new Date().toLocaleDateString('pt-BR'),
        nome: row[headers.indexOf('Nome')] || row[headers.indexOf('nome')] || `Lead ${i}`,
        telefone: row[headers.indexOf('Telefone')] || row[headers.indexOf('telefone')] || '',
        origem: row[headers.indexOf('Origem')] || row[headers.indexOf('origem')] || 'CSV Import',
        etapaEtiquetas: row[headers.indexOf('Etapa Etiquetas')] || row[headers.indexOf('etapaEtiquetas')] || '',
        etapaAltas: row[headers.indexOf('Etapa Altas')] || row[headers.indexOf('etapaAltas')] || '',
        clienteLocal: row[headers.indexOf('Cliente Local')] || row[headers.indexOf('clienteLocal')] || '',
        campanha: row[headers.indexOf('Campanha')] || row[headers.indexOf('campanha')] || '',
        conjunto: row[headers.indexOf('Conjunto')] || row[headers.indexOf('conjunto')] || '',
        anuncio: row[headers.indexOf('Anuncio')] || row[headers.indexOf('anuncio')] || '',
        media: row[headers.indexOf('Media')] || row[headers.indexOf('media')] || '',
        ref: row[headers.indexOf('Ref')] || row[headers.indexOf('ref')] || '',
        linkAnuncio: row[headers.indexOf('Link Anuncio')] || row[headers.indexOf('linkAnuncio')] || '',
        dispositivo: row[headers.indexOf('Dispositivo')] || row[headers.indexOf('dispositivo')] || 'desktop',
        observacoes: row[headers.indexOf('Observacoes')] || row[headers.indexOf('observacoes')] || row[headers.indexOf('Observações')] || '',
        status: 'novo' as const,
        interactions: [],
        etiquetaHistory: []
      };

      leads.push(lead);
    }

    return leads;
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result.map(field => field.replace(/^"|"$/g, ''));
  }

  // ===== BUSCA E FILTROS POR CLIENTE =====
  async searchLeadsByClient(clientId: string, query: string): Promise<Lead[]> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .select(`
          *,
          interactions:${clientConfig.interactions_table}(*),
          etiquetaHistory:${clientConfig.historico_table}(*)
        `)
        .or(`nome.ilike.%${query}%,telefone.ilike.%${query}%,origem.ilike.%${query}%`)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads do cliente:', error);
        throw new Error('Falha ao buscar leads');
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads do cliente:', error);
      throw new Error('Falha ao buscar leads no banco');
    }
  }

  async getLeadsByStatusForClient(clientId: string, status: Lead['status']): Promise<Lead[]> {
    try {
      const clientConfig = await this.getClientConfig(clientId);
      if (!clientConfig) {
        throw new Error('Cliente não configurado');
      }

      const { data, error } = await supabase
        .from(clientConfig.leads_table)
        .select(`
          *,
          interactions:${clientConfig.interactions_table}(*),
          etiquetaHistory:${clientConfig.historico_table}(*)
        `)
        .eq('status', status)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar leads por status do cliente:', error);
        throw new Error('Falha ao buscar leads por status');
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar leads por status do cliente:', error);
      throw new Error('Falha ao buscar leads por status no banco');
    }
  }

  // ===== UTILITÁRIOS =====
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();

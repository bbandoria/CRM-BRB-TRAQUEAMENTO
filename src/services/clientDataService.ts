import { googleSheetsService } from './googleSheetsService';
import { getWebAppUrl } from '@/config/googleSheets';

export interface ClientConfig {
  id: string;
  nome: string;
  accessKey?: string; // Senha para clientes acessarem apenas seus dados
  sheetId?: string; // ID da planilha do Google Sheets para sync automático
  ultimaAtualizacao?: string;
  etiquetasConversao?: string[]; 
  historicoEtiquetasSheetId?: string; // ID da planilha de histórico de etiquetas
}

class ClientDataService {
  private readonly CLIENTS_KEY = 'crm_clients';
  private readonly CURRENT_CLIENT_KEY = 'crm_current_client';
  private readonly CLIENT_LEADS_PREFIX = 'crm_client_leads_';
  private readonly CLIENT_CONFIG_SHEET_ID_KEY = 'crm_client_config_sheet_id';
  private readonly DEFAULT_CONFIG_SHEET_ID = '1o0ugH_lzj3FKFqE4Pc3zHOnrcyshFXCVKzoBpSot0uo'; // ID da sua planilha de configuração
  
  constructor() {
    // Configurar automaticamente o ID da planilha de configuração se não estiver definido
    if (!this.getClientConfigSheetId()) {
      console.log('[ClientDataService] Configurando planilha de configuração padrão:', this.DEFAULT_CONFIG_SHEET_ID);
      this.setClientConfigSheetId(this.DEFAULT_CONFIG_SHEET_ID);
    }
  }

  getClients(): ClientConfig[] {
    try {
      const clients = localStorage.getItem(this.CLIENTS_KEY);
      return clients ? JSON.parse(clients) : [];
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      return [];
    }
  }

  async createNewClient(nome: string, accessKey?: string): Promise<ClientConfig> {
    const clients = this.getClients();
    
    // Verificar se já existe um cliente com o mesmo nome
    const existingClient = clients.find(client => client.nome.toLowerCase() === nome.toLowerCase());
    if (existingClient) {
      throw new Error('Já existe um cliente com este nome');
    }

    const newClient: ClientConfig = {
      id: `client_${Date.now()}`,
      nome,
      accessKey,
      ultimaAtualizacao: new Date().toISOString()
    };

    clients.push(newClient);
    localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
    
    // Definir como cliente atual
    this.setCurrentClient(newClient.id);
    
    // Sincronizar com Google Sheets automaticamente
    console.log('Sincronizando novo cliente com Google Sheets...');
    try {
      await this.syncClientsToGoogleSheets();
      console.log('Cliente sincronizado com sucesso');
    } catch (error) {
      console.error('Erro ao sincronizar novo cliente:', error);
    }
    
    return newClient;
  }

  deleteClient(clientId: string): void {
    try {
      const clients = this.getClients();
      const updatedClients = clients.filter(client => client.id !== clientId);
      localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(updatedClients));
      
      // Limpar dados do cliente
      localStorage.removeItem(`${this.CLIENT_LEADS_PREFIX}${clientId}`);
      
      // Se o cliente atual foi removido, limpar
      const currentClient = this.getCurrentClient();
      if (currentClient?.id === clientId) {
        localStorage.removeItem(this.CURRENT_CLIENT_KEY);
      }
      
      // Sincronizar com Google Sheets se disponível
      this.syncClientsToGoogleSheets();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  }

  getCurrentClient(): ClientConfig | null {
    try {
      const clients = this.getClients();
      const currentClientId = localStorage.getItem(this.CURRENT_CLIENT_KEY);
      
      if (!currentClientId) return null;
      
      return clients.find(client => client.id === currentClientId) || null;
    } catch (error) {
      console.error('Erro ao carregar cliente atual:', error);
      return null;
    }
  }

  setCurrentClient(clientId: string): void {
    localStorage.setItem(this.CURRENT_CLIENT_KEY, clientId);
  }

  updateClientSheetId(clientId: string, sheetId: string): void {
    const clients = this.getClients();
    const clientIndex = clients.findIndex(client => client.id === clientId);
    
    if (clientIndex !== -1) {
      clients[clientIndex].sheetId = sheetId;
      clients[clientIndex].ultimaAtualizacao = new Date().toISOString();
      localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
      
      // Sincronizar com Google Sheets se disponível
      this.syncClientsToGoogleSheets();
    }
  }

  // Gerenciamento de leads por cliente
  saveClientLeads(clientId: string, leads: any[]): void {
    try {
      localStorage.setItem(`${this.CLIENT_LEADS_PREFIX}${clientId}`, JSON.stringify(leads));
      
      // Atualizar timestamp do cliente
      const clients = this.getClients();
      const clientIndex = clients.findIndex(client => client.id === clientId);
      if (clientIndex !== -1) {
        clients[clientIndex].ultimaAtualizacao = new Date().toISOString();
        localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(clients));
      }
    } catch (error) {
      console.error('Erro ao salvar leads do cliente:', error);
    }
  }

  getClientLeads(clientId: string): any[] {
    try {
      const leads = localStorage.getItem(`${this.CLIENT_LEADS_PREFIX}${clientId}`);
      return leads ? JSON.parse(leads) : [];
    } catch (error) {
      console.error('Erro ao carregar leads do cliente:', error);
      return [];
    }
  }

  // Métodos para sincronização com Google Sheets
  setClientConfigSheetId(sheetId: string): void {
    console.log('Configurando ID da planilha de configuração:', sheetId);
    localStorage.setItem(this.CLIENT_CONFIG_SHEET_ID_KEY, sheetId);
  }

  getClientConfigSheetId(): string | null {
    return localStorage.getItem(this.CLIENT_CONFIG_SHEET_ID_KEY);
  }

  // Exportar clientes locais para Google Sheets usando Web App
  async exportClientsToGoogleSheets(sheetId: string): Promise<boolean> {
    try {
      const clients = this.getClients();
      console.log(`Exportando ${clients.length} clientes para a planilha ${sheetId}`);
      
      if (clients.length === 0) {
        console.log('Nenhum cliente local para exportar');
        return true;
      }

      // Preparar dados para envio para Web App
      const clientsData = clients.map(client => ({
        id: client.id,
        nome: client.nome,
        accessKey: client.accessKey || '',
        sheetId: client.sheetId || '',
        ultimaAtualizacao: client.ultimaAtualizacao || new Date().toISOString()
      }));

      console.log('Dados dos clientes preparados para exportação:', clientsData);
      
      // URL do Google Apps Script Web App (usar configuração centralizada)
      const webAppUrl = getWebAppUrl();
      console.log(`[ClientDataService] 🔗 URL do Web App para clientes: ${webAppUrl}`);
      console.log(`[ClientDataService] 🔍 Debug - URL completa: ${webAppUrl}`);
      
      try {
        const response = await fetch(webAppUrl, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateClients',
            sheetId: sheetId,
            clients: clientsData
          })
        });

        if (response.ok) {
          console.log('Clientes exportados com sucesso via Web App');
          return true;
        } else {
          console.error('Erro ao exportar clientes via Web App:', response.statusText);
          return false;
        }
      } catch (error) {
        console.error('Falha ao comunicar com o Web App do Google Sheets:', error);
        return false;
      }
    } catch (error) {
      console.error('Erro ao preparar exportação de clientes:', error);
      return false;
    }
  }

  // Sincronizar clientes para o Google Sheets
  async syncClientsToGoogleSheets(): Promise<boolean> {
    try {
      const sheetId = this.getClientConfigSheetId();
      if (!sheetId) {
        console.log('Nenhuma planilha de configuração definida');
        return false;
      }

      console.log('Sincronizando clientes para a planilha:', sheetId);
      
      // Exportar clientes locais
      const exportSuccess = await this.exportClientsToGoogleSheets(sheetId);
      
      if (exportSuccess) {
        console.log('Clientes sincronizados com sucesso');
        return true;
      } else {
        throw new Error('Falha na exportação dos clientes');
      }
    } catch (error) {
      console.error('Erro ao sincronizar clientes com Google Sheets:', error);
      return false;
    }
  }

  // Recuperar clientes do Google Sheets
  async syncClientsFromGoogleSheets(): Promise<boolean> {
    try {
      const sheetId = this.getClientConfigSheetId();
      if (!sheetId) {
        console.log('Nenhuma planilha de configuração definida');
        return false;
      }

      console.log('Importando configurações de clientes da planilha:', sheetId);
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      const response = await fetch(csvUrl, {
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('Erro ao acessar a planilha de configuração de clientes. Verifique se ela está pública.');
      }

      const csvText = await response.text();
      console.log('Dados CSV recebidos da planilha de configuração:', csvText);
      
      const clientsFromSheet = this.parseClientConfigCSV(csvText);
      
      const localClients = this.getClients();
      const mergedClients = [...localClients];

      clientsFromSheet.forEach(sheetClient => {
        const localIndex = mergedClients.findIndex(c => c.id === sheetClient.id || c.nome.toLowerCase() === sheetClient.nome.toLowerCase());
        if (localIndex !== -1) {
          console.log(`[sync] Mesclando cliente da planilha: ${sheetClient.nome}. Etiquetas: ${sheetClient.etiquetasConversao}`);
          mergedClients[localIndex] = { ...mergedClients[localIndex], ...sheetClient };
        } else {
          console.log(`[sync] Adicionando novo cliente da planilha: ${sheetClient.nome}. Etiquetas: ${sheetClient.etiquetasConversao}`);
          mergedClients.push(sheetClient);
        }
      });
      
      console.log('[sync] Clientes finais para salvar no localStorage:', mergedClients);
      localStorage.setItem(this.CLIENTS_KEY, JSON.stringify(mergedClients));
      
      return true;
    } catch (error) {
      console.error('Erro ao importar clientes do Google Sheets:', error);
      return false;
    }
  }

  // Converter CSV da planilha para objetos ClientConfig
  private parseClientConfigCSV(csvText: string): ClientConfig[] {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        console.log('Planilha vazia ou sem dados válidos');
        return [];
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      console.log('Cabeçalhos encontrados na planilha:', headers);
      
      const clients: ClientConfig[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        console.log(`Linha ${i} da planilha:`, values);
        
        if (values.length === 0 || !values[0]) continue;

        // Usar método que trata etiquetasConversao corretamente
        const client = this.importClientFromSheet(values, headers, i);
        clients.push(client);
      }

      return clients;
    } catch (error) {
      console.error('Erro ao analisar CSV de configuração de clientes:', error);
      return [];
    }
  }

  // Parse de linha CSV
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let inQuotes = false;
    let value = '';
    for (const char of line) {
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(value.trim());
            value = '';
        } else {
            value += char;
        }
    }
    values.push(value.trim());
    return values;
  }

  // Método para configurar planilha de configuração a partir de URL
  setClientConfigSheetFromUrl(url: string): string | null {
    const sheetId = this.extractSheetIdFromUrl(url);
    if (sheetId) {
      this.setClientConfigSheetId(sheetId);
      console.log('ID da planilha de configuração definido a partir da URL:', sheetId);
    }
    return sheetId;
  }

  // Extrair ID da planilha de diferentes formatos de URL
  private extractSheetIdFromUrl(url: string): string | null {
    console.log('Extraindo ID da URL:', url);
    
    // Padrão 1: /spreadsheets/d/{ID}/
    let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      console.log('ID extraído (padrão 1):', match[1]);
      return match[1];
    }
    
    // Padrão 2: id={ID}
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (match) {
      console.log('ID extraído (padrão 2):', match[1]);
      return match[1];
    }
    
    // Se já é apenas o ID
    if (/^[a-zA-Z0-9-_]+$/.test(url.trim())) {
      console.log('URL já é um ID:', url.trim());
      return url.trim();
    }
    
    console.log('Não foi possível extrair ID da URL');
    return null;
  }

  // Método para inicializar e sincronizar clientes quando uma planilha é configurada
  async initializeWithConfigSheet(url: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Inicializando com a planilha de configuração:', url);
      const sheetId = this.setClientConfigSheetFromUrl(url);
      
      if (!sheetId) {
        return { success: false, message: 'URL da planilha de configuração inválida.' };
      }

      const syncSuccess = await this.syncClientsFromGoogleSheets();
      if (!syncSuccess) {
        return { success: false, message: 'Falha ao sincronizar dados da planilha de configuração.' };
      }

      return { success: true, message: 'Clientes sincronizados com sucesso!' };
    } catch (error: any) {
      console.error('Erro ao inicializar com planilha de configuração:', error);
      return { success: false, message: error.message || 'Erro desconhecido' };
    }
  }

  private importClientFromSheet(values: string[], headers: string[], index: number): ClientConfig {
    const etiquetasIndex = headers.indexOf('etiquetasconversao');
    const etiquetasValue = etiquetasIndex > -1 ? values[etiquetasIndex] : undefined;
    
    const historicoIndex = headers.indexOf('historicoetiquetassheetid');
    const historicoValue = historicoIndex > -1 ? values[historicoIndex] : undefined;
    
    console.log(`[importClientFromSheet] Linha ${index}: Valor de 'etiquetasconversao' extraído:`, etiquetasValue);
    console.log(`[importClientFromSheet] Linha ${index}: Valor de 'historicoetiquetassheetid' extraído:`, historicoValue);

    const client: ClientConfig = {
      id: values[headers.indexOf('id')] || `client_${Date.now()}_${index}`,
      nome: values[headers.indexOf('nome')] || `Cliente ${index}`,
      accessKey: values[headers.indexOf('accesskey')] || undefined,
      sheetId: values[headers.indexOf('sheetid')] || undefined,
      etiquetasConversao: etiquetasValue ? etiquetasValue.split(',').map(t => t.trim()) : undefined,
      historicoEtiquetasSheetId: historicoValue || undefined,
      ultimaAtualizacao: values[headers.indexOf('ultimaatualizacao')] || new Date().toISOString()
    };
    console.log('[importClientFromSheet] Objeto cliente importado:', client);
    return client;
  }

  // Função para rastrear mudanças de etiquetas (otimizada)
  trackEtiquetaChange(leadId: string, etiquetaAnterior: string, etiquetaNova: string, motivo?: string, usuario: string = 'Sistema'): void {
    try {
      // Usar debounce para evitar múltiplas operações simultâneas
      if (this.trackEtiquetaTimeout) {
        clearTimeout(this.trackEtiquetaTimeout);
      }
      
      this.trackEtiquetaTimeout = setTimeout(() => {
        this._performEtiquetaChange(leadId, etiquetaAnterior, etiquetaNova, motivo, usuario);
      }, 100); // Reduzido para 100ms para resposta mais rápida
    } catch (error) {
      console.error('Erro ao rastrear mudança de etiqueta:', error);
    }
  }

  private trackEtiquetaTimeout: NodeJS.Timeout | null = null;

  private async _performEtiquetaChange(leadId: string, etiquetaAnterior: string, etiquetaNova: string, motivo?: string, usuario: string = 'Sistema'): Promise<void> {
    try {
      const leads = this.getAllLeads();
      const lead = leads.find(l => l.id === leadId);
      
      if (lead) {
        // Inicializar histórico se não existir
        if (!lead.etiquetaHistory) {
          lead.etiquetaHistory = [];
        }

        // Determinar a etiqueta anterior real
        let etiquetaAnteriorReal = etiquetaAnterior;
        
        // Se é a primeira entrada no histórico e o lead já tem etiqueta, usar a etiqueta atual
        if (lead.etiquetaHistory.length === 0 && lead.etapaEtiquetas && lead.etapaEtiquetas.trim() !== '') {
          etiquetaAnteriorReal = lead.etapaEtiquetas;
          console.log(`[Etiqueta] Primeira etiqueta detectada: ${etiquetaAnteriorReal} → ${etiquetaNova}`);
        }
        
        // Normalizar valores para evitar variações
        const etiquetaAnteriorNorm = (etiquetaAnterior || '').trim();
        const etiquetaNovaNorm = (etiquetaNova || '').trim();

        // Ignorar se não há mudança real
        if (etiquetaAnteriorNorm.toLowerCase() === etiquetaNovaNorm.toLowerCase()) {
          console.log(`[Etiqueta] Nenhuma mudança real detectada para ${leadId} ("${etiquetaAnteriorNorm}")`);
          return;
        }

        // Adicionar nova entrada no histórico
        const historyEntry = {
          id: `etiqueta_${Date.now()}`,
          historyId: `${leadId}-${Date.now()}`,
          leadId,
          nomeLead: lead.nome || `Lead ${leadId}`, // Nome do lead para identificação
          etiquetaAnterior: etiquetaAnteriorReal,
          etiquetaNova: etiquetaNovaNorm,
          data: new Date().toISOString(),
          usuario,
          motivo
        };

        lead.etiquetaHistory.push(historyEntry);

        // Atualizar a etiqueta atual do lead para refletir a mudança
        lead.etapaEtiquetas = etiquetaNovaNorm;
        
        // Verificar e remover duplicidades automaticamente
        this.removeDuplicateEtiquetas(leadId);
        
        // Salvar leads atualizados de forma assíncrona
        setTimeout(() => {
          this.saveAllLeads(leads);
        }, 100);
        
        // Sincronizar automaticamente com Google Sheets se configurado
        const currentClient = this.getCurrentClient();
        if (currentClient?.historicoEtiquetasSheetId) {
          try {
            await this.autoSyncEtiquetaHistory(leadId);
            console.log(`[Sync] Histórico sincronizado automaticamente para lead ${leadId}`);
          } catch (syncError) {
            console.error('Erro na sincronização automática:', syncError);
          }
        }
        
        console.log(`[Etiqueta] Histórico atualizado para lead ${leadId}: ${etiquetaAnteriorNorm} → ${etiquetaNovaNorm}`);
        
        // Disparar evento customizado para notificar mudanças
        window.dispatchEvent(new CustomEvent('etiquetaChanged', {
          detail: { leadId, etiquetaAnterior: etiquetaAnteriorReal, etiquetaNova, usuario }
        }));
      }
    } catch (error) {
      console.error('Erro ao rastrear mudança de etiqueta:', error);
    }
  }

  // Função para obter histórico de etiquetas de um lead
  getEtiquetaHistory(leadId: string): any[] {
    try {
      const leads = this.getAllLeads();
      const lead = leads.find(l => l.id === leadId);
      return lead?.etiquetaHistory || [];
    } catch (error) {
      console.error('Erro ao obter histórico de etiquetas:', error);
      return [];
    }
  }

  // Função para sincronizar histórico de etiquetas com Google Sheets
  async syncEtiquetaHistoryToSheets(leadId: string): Promise<void> {
    try {
      const history = this.getEtiquetaHistory(leadId);
      if (history.length === 0) return;

      const currentClient = this.getCurrentClient();
      if (!currentClient?.historicoEtiquetasSheetId) {
        console.log('[Sync] Cliente não possui planilha de histórico configurada');
        return;
      }

      // Preparar dados: enviar apenas mudanças novas desde a última sincronização
      const lastIndex = this.getLastSyncedIndex(leadId);
      const newEntries = history.slice(lastIndex);
      if (newEntries.length === 0) return;
      const data = newEntries.map(entry => [
        entry.data,
        entry.leadId,
        entry.nomeLead || `Lead ${entry.leadId}`,
        entry.etiquetaAnterior,
        entry.etiquetaNova,
        entry.usuario,
        entry.motivo || '',
        currentClient.nome,
        entry.historyId || `${entry.leadId}-${new Date(entry.data).getTime()}`
      ]);

      // Enviar para Google Sheets usando o ID configurado
      console.log(`[Sync] Enviando ${data.length} registro(s) de histórico para planilha: ${currentClient.historicoEtiquetasSheetId}`);
      
      // Enviar para Google Sheets usando o ID configurado
      await googleSheetsService.appendEtiquetaHistory(currentClient.historicoEtiquetasSheetId, data);
      // Atualizar índice de sincronização: tudo até o fim enviado
      this.setLastSyncedIndex(leadId, history.length);
      
    } catch (error) {
      console.error('Erro ao sincronizar histórico com Google Sheets:', error);
    }
  }

  // Função para carregar histórico de etiquetas do Google Sheets
  async loadEtiquetaHistoryFromSheets(leadId: string): Promise<any[]> {
    try {
      const currentClient = this.getCurrentClient();
      if (!currentClient?.historicoEtiquetasSheetId) {
        console.log('[Load] Cliente não possui planilha de histórico configurada');
        return [];
      }

      // Carregar histórico da planilha usando o Google Sheets Service
      const allHistory = await googleSheetsService.readEtiquetaHistory(currentClient.historicoEtiquetasSheetId);
      
      console.log(`[Load] 🔍 Debug - Total de registros carregados: ${allHistory.length}`);
      console.log(`[Load] 🔍 Debug - Lead ID buscado: ${leadId}`);
      console.log(`[Load] 🔍 Debug - TODOS os IDs na planilha:`, allHistory.map(h => h.leadId));
      console.log(`[Load] 🔍 Debug - Primeiros 3 registros:`, allHistory.slice(0, 3).map(h => ({ leadId: h.leadId, etiquetaAnterior: h.etiquetaAnterior, etiquetaNova: h.etiquetaNova })));
      
      // Buscar o lead atual para obter o nome
      const leads = this.getAllLeads();
      const currentLead = leads.find(l => l.id === leadId);
      const leadName = currentLead?.nome || '';
      
      console.log(`[Load] 🔍 Debug - Nome do lead: ${leadName}`);
      
      // BUSCA MAIS ROBUSTA - Filtrar por ID primeiro, depois por nome se não encontrar
      let leadHistory = allHistory.filter(entry => {
        const matchById = entry.leadId === leadId;
        const matchByName = entry.nomeLead === leadName;
        const matchByPartialName = leadName && entry.nomeLead && entry.nomeLead.includes(leadName);
        
        if (matchById || matchByName || matchByPartialName) {
          console.log(`[Load] ✅ Match encontrado: ID=${entry.leadId}, Nome=${entry.nomeLead}`);
          return true;
        }
        return false;
      });
      
      // Se não encontrou por ID/nome, tentar busca por padrões similares
      if (leadHistory.length === 0) {
        console.log(`[Load] 🔍 Tentando busca por padrões similares...`);
        
        // Buscar por leads com nomes similares
        const similarLeads = allHistory.filter(entry => {
          if (!entry.nomeLead || !leadName) return false;
          
          // Verificar se o nome contém palavras similares
          const entryWords = entry.nomeLead.toLowerCase().split(/\s+/);
          const leadWords = leadName.toLowerCase().split(/\s+/);
          
          const hasCommonWords = entryWords.some(word => 
            leadWords.some(leadWord => 
              leadWord.length > 3 && (word.includes(leadWord) || leadWord.includes(word))
            )
          );
          
          if (hasCommonWords) {
            console.log(`[Load] 🔍 Nome similar encontrado: "${entry.nomeLead}" vs "${leadName}"`);
            return true;
          }
          return false;
        });
        
        if (similarLeads.length > 0) {
          leadHistory = similarLeads;
          console.log(`[Load] 🔍 Usando leads similares: ${similarLeads.length} encontrados`);
        }
      }
      
      // Se ainda não encontrou, criar histórico inicial
      if (leadHistory.length === 0) {
        console.log(`[Load] 🔧 Criando histórico inicial para lead ${leadId}`);
        
        const allLeadsForInit = this.getAllLeads();
        const currentLead = allLeadsForInit.find(l => l.id === leadId);
        if (currentLead && currentLead.etapaEtiquetas) {
          const initialHistory: EtiquetaHistory = {
            id: `initial-${leadId}-${Date.now()}`,
            leadId: leadId,
            nomeLead: currentLead.nome,
            etiquetaAnterior: 'Sem Etiqueta',
            etiquetaNova: currentLead.etapaEtiquetas,
            data: new Date().toISOString(),
            usuario: 'Sistema',
            descricao: 'Etiqueta inicial importada da planilha',
            cliente: currentClient.nome || 'BRB'
          };
          
          // Adicionar ao histórico local
          this.addEtiquetaHistory(initialHistory);
          
          // Tentar sincronizar com Google Sheets
          try {
            await this.syncEtiquetaHistoryToSheets(leadId);
            console.log(`[Load] ✅ Histórico inicial sincronizado com Google Sheets`);
          } catch (syncError) {
            console.log(`[Load] ⚠️ Erro ao sincronizar histórico inicial:`, syncError);
          }
          
          leadHistory = [initialHistory];
          console.log(`[Load] ✅ Histórico inicial criado e sincronizado`);
        }
      }
      
      console.log(`[Load] Carregando histórico da planilha: ${currentClient.historicoEtiquetasSheetId}`);
      console.log(`[Load] Histórico encontrado para lead ${leadId} (${leadName}): ${leadHistory.length} registros`);
      
      return leadHistory;
      
    } catch (error) {
      console.error('Erro ao carregar histórico do Google Sheets:', error);
      return [];
    }
  }

  // Função para sincronizar automaticamente o histórico de etiquetas
  async autoSyncEtiquetaHistory(leadId: string): Promise<void> {
    try {
      const currentClient = this.getCurrentClient();
      if (!currentClient?.historicoEtiquetasSheetId) {
        console.log(`[AutoSync] ⚠️ Cliente não possui planilha de histórico configurada`);
        return;
      }

      console.log(`[AutoSync] 🔄 Sincronizando histórico para lead ${leadId}`);
      
      // Buscar histórico local atualizado
      const localHistory = this.getEtiquetaHistory(leadId);
      console.log(`[AutoSync] 📊 Histórico local: ${localHistory.length} registros`);
      
      // Se não há histórico local, tentar carregar da planilha primeiro
      if (localHistory.length === 0) {
        console.log(`[AutoSync] 🔍 Carregando histórico da planilha primeiro...`);
        const sheetHistory = await this.loadEtiquetaHistoryFromSheets(leadId);
        
        if (sheetHistory.length > 0) {
          console.log(`[AutoSync] ✅ Histórico carregado da planilha: ${sheetHistory.length} registros`);
          // Atualizar o lead local com o histórico da planilha
          const allLeads = this.getAllLeads();
          const lead = allLeads.find(l => l.id === leadId);
          if (lead) {
            lead.etiquetaHistory = sheetHistory;
            console.log(`[AutoSync] ✅ Lead local atualizado com histórico da planilha`);
            this.saveAllLeads(allLeads);
          }
        } else {
          console.log(`[AutoSync] ⚠️ Nenhum histórico encontrado na planilha para este lead`);
        }
      }

      // Sincronizar com Google Sheets (mesmo que não tenha histórico local)
      // Tentar sincronizar (sem travar o fluxo em caso de CORS)
      this.syncEtiquetaHistoryToSheets(leadId)
        .then(() => console.log(`[AutoSync] ✅ Sincronização com Google Sheets concluída`))
        .catch(err => console.log(`[AutoSync] ⚠️ Erro na sincronização com Google Sheets (ignorado):`, err));
      
      console.log(`[AutoSync] ✅ Processo de sincronização concluído para lead ${leadId}`);
    } catch (error) {
      console.error(`[AutoSync] ❌ Erro na sincronização automática para lead ${leadId}:`, error);
      throw error; // Re-throw para tratamento no componente
    }
  }

  // Função para usar IndexedDB (mais rápido que localStorage)
  async initIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CRM_EtiquetaHistory', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('etiquetaHistory')) {
          const store = db.createObjectStore('etiquetaHistory', { keyPath: 'id' });
          store.createIndex('leadId', 'leadId', { unique: false });
          store.createIndex('data', 'data', { unique: false });
        }
      };
    });
  }

  // Salvar histórico no IndexedDB
  async saveEtiquetaHistoryToIndexedDB(history: any[]): Promise<void> {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['etiquetaHistory'], 'readwrite');
      const store = transaction.objectStore('etiquetaHistory');
      
      for (const entry of history) {
        await store.put(entry);
      }
      
      console.log(`[IndexedDB] ${history.length} registros salvos`);
    } catch (error) {
      console.error('Erro ao salvar no IndexedDB:', error);
    }
  }

  // Carregar histórico do IndexedDB
  async loadEtiquetaHistoryFromIndexedDB(leadId: string): Promise<any[]> {
    try {
      const db = await this.initIndexedDB();
      const transaction = db.transaction(['etiquetaHistory'], 'readonly');
      const store = transaction.objectStore('etiquetaHistory');
      const index = store.index('leadId');
      
      const request = index.getAll(leadId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Erro ao carregar do IndexedDB:', error);
      return [];
    }
  }

  // Função auxiliar para obter todos os leads
  private getAllLeads(): any[] {
    const allLeads: any[] = [];
    const clients = this.getClients();
    
    clients.forEach(client => {
      const clientLeads = this.getClientLeads(client.id);
      allLeads.push(...clientLeads);
    });
    
    return allLeads;
  }

  // Função auxiliar para salvar todos os leads
  private saveAllLeads(leads: any[]): void {
    const clients = this.getClients();
    
    clients.forEach(client => {
      const clientLeads = leads.filter(lead => 
        this.getClientLeads(client.id).some(cl => cl.id === lead.id)
      );
      this.saveClientLeads(client.id, clientLeads);
    });
  }

  // Adicionar uma entrada de histórico ao lead e salvar localmente
  private addEtiquetaHistory(entry: any): void {
    try {
      const leads = this.getAllLeads();
      const lead = leads.find(l => l.id === entry.leadId);
      if (!lead) return;
      if (!Array.isArray(lead.etiquetaHistory)) {
        lead.etiquetaHistory = [];
      }
      // Evitar duplicação por etiqueta e timestamp (~1s)
      const exists = lead.etiquetaHistory.some((e: any) =>
        e.leadId === entry.leadId &&
        e.etiquetaNova === entry.etiquetaNova &&
        Math.abs(new Date(e.data).getTime() - new Date(entry.data).getTime()) < 1000
      );
      if (!exists) {
        lead.etiquetaHistory.push(entry);
        this.saveAllLeads(leads);
      }
    } catch (error) {
      console.error('Erro ao adicionar histórico local:', error);
    }
  }

  // Função para verificar e remover duplicidades de etiquetas
  removeDuplicateEtiquetas(leadId: string): void {
    try {
      const leads = this.getAllLeads();
      const lead = leads.find(l => l.id === leadId);
      
      if (lead && lead.etiquetaHistory && lead.etiquetaHistory.length > 0) {
        // Remover duplicidades baseado em timestamp, leadId e etiquetaNova
        const uniqueHistory = lead.etiquetaHistory.filter((entry, index, self) => {
          const duplicateIndex = self.findIndex(e => 
            e.leadId === entry.leadId && 
            e.etiquetaNova === entry.etiquetaNova &&
            Math.abs(new Date(e.data).getTime() - new Date(entry.data).getTime()) < 1000 // 1 segundo de tolerância
          );
          return duplicateIndex === index;
        });
        
        if (uniqueHistory.length !== lead.etiquetaHistory.length) {
          console.log(`[Duplicidades] Removidas ${lead.etiquetaHistory.length - uniqueHistory.length} entradas duplicadas para lead ${leadId}`);
          lead.etiquetaHistory = uniqueHistory;
          
          // Salvar leads atualizados
          setTimeout(() => {
            this.saveAllLeads(leads);
          }, 100);
        }
      }
    } catch (error) {
      console.error('Erro ao remover duplicidades de etiquetas:', error);
    }
  }

  // Função para verificar duplicidades em toda a base de dados
  checkAllDuplicates(): { leadId: string; duplicates: number; total: number }[] {
    try {
      const leads = this.getAllLeads();
      const duplicatesReport: { leadId: string; duplicates: number; total: number }[] = [];
      
      leads.forEach(lead => {
        if (lead.etiquetaHistory && lead.etiquetaHistory.length > 0) {
          const uniqueHistory = lead.etiquetaHistory.filter((entry, index, self) => {
            const duplicateIndex = self.findIndex(e => 
              e.leadId === entry.leadId && 
              e.etiquetaNova === entry.etiquetaNova &&
              Math.abs(new Date(e.data).getTime() - new Date(entry.data).getTime()) < 1000
            );
            return duplicateIndex === index;
          });
          
          const duplicates = lead.etiquetaHistory.length - uniqueHistory.length;
          if (duplicates > 0) {
            duplicatesReport.push({
              leadId: lead.id,
              duplicates,
              total: lead.etiquetaHistory.length
            });
          }
        }
      });
      
      return duplicatesReport;
    } catch (error) {
      console.error('Erro ao verificar duplicidades:', error);
      return [];
    }
  }

  // Função para limpar todas as duplicidades automaticamente
  async cleanAllDuplicates(): Promise<{ cleaned: number; totalDuplicates: number }> {
    try {
      const leads = this.getAllLeads();
      let totalDuplicates = 0;
      let cleaned = 0;
      
      leads.forEach(lead => {
        if (lead.etiquetaHistory && lead.etiquetaHistory.length > 0) {
          const originalLength = lead.etiquetaHistory.length;
          this.removeDuplicateEtiquetas(lead.id);
          const newLength = lead.etiquetaHistory.length;
          const duplicates = originalLength - newLength;
          
          if (duplicates > 0) {
            totalDuplicates += duplicates;
            cleaned++;
          }
        }
      });
      
      // Salvar todas as alterações
      this.saveAllLeads(leads);
      
      console.log(`[Limpeza] ${cleaned} leads limpos, ${totalDuplicates} duplicatas removidas`);
      return { cleaned, totalDuplicates };
    } catch (error) {
      console.error('Erro ao limpar duplicidades:', error);
      return { cleaned: 0, totalDuplicates: 0 };
    }
  }

  // Função para sincronização automática contínua
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private lastSyncTimestamp: string = '';
  private isAutoSyncRunning: boolean = false;
  private readonly LAST_SYNCED_INDEX_KEY = 'crm_last_synced_index_by_lead';

  private loadLastSyncedIndexMap(): Record<string, number> {
    try {
      const raw = localStorage.getItem(this.LAST_SYNCED_INDEX_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }
  private saveLastSyncedIndexMap(map: Record<string, number>): void {
    try {
      localStorage.setItem(this.LAST_SYNCED_INDEX_KEY, JSON.stringify(map));
    } catch {}
  }
  private getLastSyncedIndex(leadId: string): number {
    const map = this.loadLastSyncedIndexMap();
    return map[leadId] ?? 0;
  }
  private setLastSyncedIndex(leadId: string, index: number): void {
    const map = this.loadLastSyncedIndexMap();
    map[leadId] = index;
    this.saveLastSyncedIndexMap(map);
  }

  // Iniciar sincronização automática
  startAutoSync(intervalMs: number = 10000): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }

    console.log(`[AutoSync] 🚀 Iniciando sincronização automática a cada ${intervalMs}ms`);
    
    this.autoSyncInterval = setInterval(async () => {
      try {
        if (this.isAutoSyncRunning) return;
        this.isAutoSyncRunning = true;
        await this.performAutoSync();
      } catch (error) {
        console.error('[AutoSync] ❌ Erro na sincronização automática:', error);
      } finally {
        this.isAutoSyncRunning = false;
      }
    }, intervalMs);
  }

  // Garante que a etiqueta atual da planilha principal esteja registrada no histórico
  private async ensureSheetEtiquetaRecorded(leadId: string): Promise<void> {
    const currentClient = this.getCurrentClient();
    if (!currentClient?.sheetId || !currentClient?.historicoEtiquetasSheetId) return;

    // Carregar último histórico (prioriza planilha para evitar desatualização)
    const historyFromSheet = await this.loadEtiquetaHistoryFromSheets(leadId);
    const lastEtiquetaHistorico = (historyFromSheet[historyFromSheet.length - 1]?.etiquetaNova || '').trim();

    // Buscar etiqueta atual da planilha principal
    const { googleSheetsService } = await import('./googleSheetsService');
    const sheetLeads = await googleSheetsService.fetchLeadsFromSheet(currentClient.sheetId);

    // Encontrar lead por ID ou nome
    const localLead = this.getAllLeads().find(l => l.id === leadId);
    const leadName = localLead?.nome || '';
    let sheetLead = sheetLeads.find(l => l.id === leadId);
    if (!sheetLead && leadName) {
      sheetLead = sheetLeads.find(l => l.nome === leadName);
    }

    if (!sheetLead) return;

    const etiquetaSheetAtual = (sheetLead.etapaEtiquetas || '').trim();

    // Se já existe pelo menos um registro para esse estado, não criar novamente ao abrir detalhes
    const alreadyRecorded = historyFromSheet.some(h => h.etiquetaNova && h.etiquetaNova.trim().toLowerCase() === etiquetaSheetAtual.toLowerCase());
    if (etiquetaSheetAtual && lastEtiquetaHistorico.toLowerCase() !== etiquetaSheetAtual.toLowerCase() && !alreadyRecorded) {
      // Registrar a mudança apenas uma vez
      const etiquetaAnterior = lastEtiquetaHistorico || (localLead?.etapaEtiquetas || 'Sem Etiqueta');
      await this._performEtiquetaChange(leadId, etiquetaAnterior, etiquetaSheetAtual, 'Sincronização automática da planilha', 'Sistema');
      await this.autoSyncEtiquetaHistory(leadId);
    }
  }

  // Parar sincronização automática
  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('[AutoSync] ⏹️ Sincronização automática parada');
    }
  }

  // Executar sincronização automática
  private async performAutoSync(): Promise<void> {
    try {
      const currentClient = this.getCurrentClient();
      if (!currentClient?.sheetId || !currentClient?.historicoEtiquetasSheetId) {
        return;
      }

      console.log('[AutoSync] 🔄 Verificando mudanças na planilha principal...');
      
      // Buscar dados mais recentes da planilha principal
      const { googleSheetsService } = await import('./googleSheetsService');
      const latestLeads = await googleSheetsService.fetchLeadsFromSheet(currentClient.sheetId);

      // Também buscar o histórico já gravado na planilha (uma vez) para comparar
      const historyData = await googleSheetsService.readEtiquetaHistory(currentClient.historicoEtiquetasSheetId);
      const lastEtiquetaByLead: Record<string, string> = {};
      for (const h of historyData) {
        // manter sempre a última ocorrência (mais recente)
        lastEtiquetaByLead[h.leadId] = h.etiquetaNova || '';
      }

      // Detectar mudanças comparando a planilha principal vs última etiqueta já gravada na planilha de histórico
      const changes = latestLeads.reduce<Array<{ leadId: string; etiquetaAnterior: string; etiquetaNova: string; nomeLead: string }>>((acc, sheetLead) => {
        const sheetEtiqueta = (sheetLead.etapaEtiquetas || 'Sem Etiqueta').trim();
        const lastHist = (lastEtiquetaByLead[sheetLead.id] || '').trim();

        if (sheetEtiqueta && sheetEtiqueta.toLowerCase() !== lastHist.toLowerCase()) {
          acc.push({
            leadId: sheetLead.id,
            etiquetaAnterior: lastHist || 'Sem Etiqueta',
            etiquetaNova: sheetEtiqueta,
            nomeLead: sheetLead.nome
          });
        }
        return acc;
      }, []);
      
      if (changes.length > 0) {
        console.log(`[AutoSync] 📊 ${changes.length} mudanças de etiqueta detectadas`);
        
        // Preparar um único envio em lote para reduzir carga
        const rowsToAppend: any[] = [];
        const localLeads = this.getAllLeads();

        for (const change of changes) {
          const anteriorNorm = (change.etiquetaAnterior || '').trim().toLowerCase();
          const novaNorm = (change.etiquetaNova || '').trim().toLowerCase();
          if (anteriorNorm === novaNorm) continue;

          // Atualizar localmente o lead (etiqueta atual e histórico em memória)
          const lead = localLeads.find(l => l.id === change.leadId);
          if (lead) {
            lead.etapaEtiquetas = change.etiquetaNova;
            lead.etiquetaHistory = Array.isArray(lead.etiquetaHistory) ? lead.etiquetaHistory : [];
            const historyId = `${change.leadId}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
            lead.etiquetaHistory.push({
              id: `etiqueta_${Date.now()}`,
              historyId,
              leadId: change.leadId,
              nomeLead: change.nomeLead,
              etiquetaAnterior: change.etiquetaAnterior,
              etiquetaNova: change.etiquetaNova,
              data: new Date().toISOString(),
              usuario: 'Sistema',
              motivo: 'Sincronização automática da planilha'
            });

            // Linha para append em lote
            rowsToAppend.push([
              new Date().toISOString(),
              change.leadId,
              change.nomeLead,
              change.etiquetaAnterior,
              change.etiquetaNova,
              'Sistema',
              'Sincronização automática da planilha',
              currentClient.nome,
              historyId
            ]);
          }
        }

        // Enviar o lote (se houver)
        if (rowsToAppend.length > 0) {
          try {
            await googleSheetsService.appendEtiquetaHistory(currentClient.historicoEtiquetasSheetId, rowsToAppend);
            console.log(`[AutoSync] ✅ Envio em lote concluído (${rowsToAppend.length} registro(s))`);
          } catch (err) {
            console.error('[AutoSync] ❌ Falha ao enviar lote para histórico:', err);
          }
        }
        
        // Atualizar leads locais
        this.saveClientLeads(currentClient.id, localLeads);
        
        // Disparar evento para atualizar interface
        window.dispatchEvent(new CustomEvent('leadsUpdated', {
          detail: { changes, timestamp: new Date().toISOString() }
        }));
        
        console.log('[AutoSync] ✅ Sincronização automática concluída com histórico atualizado');
      } else {
        console.log('[AutoSync] ✅ Nenhuma mudança detectada');
      }
      
      this.lastSyncTimestamp = new Date().toISOString();
      
    } catch (error) {
      console.error('[AutoSync] ❌ Erro na sincronização automática:', error);
    }
  }

  // Detectar mudanças de etiquetas entre leads locais e da planilha
  private detectEtiquetaChanges(localLeads: any[], sheetLeads: any[]): Array<{
    leadId: string;
    etiquetaAnterior: string;
    etiquetaNova: string;
    nomeLead: string;
  }> {
    const changes: Array<{
      leadId: string;
      etiquetaAnterior: string;
      etiquetaNova: string;
      nomeLead: string;
    }> = [];

    console.log(`[DetectChanges] 🔍 Comparando ${localLeads.length} leads locais com ${sheetLeads.length} leads da planilha`);

    sheetLeads.forEach(sheetLead => {
      // Tentar encontrar por ID primeiro, depois por nome
      let localLead = localLeads.find(l => l.id === sheetLead.id);
      
      if (!localLead) {
        localLead = localLeads.find(l => l.nome === sheetLead.nome);
      }
      
      if (localLead) {
        const localEtiqueta = (localLead.etapaEtiquetas || 'Sem Etiqueta').trim();
        const sheetEtiqueta = (sheetLead.etapaEtiquetas || 'Sem Etiqueta').trim();
        
        console.log(`[DetectChanges] 📊 Lead: ${localLead.nome} | Local: "${localEtiqueta}" | Planilha: "${sheetEtiqueta}"`);
        
        if (localEtiqueta.toLowerCase() !== sheetEtiqueta.toLowerCase()) {
          console.log(`[DetectChanges] 🔄 Mudança detectada: "${localEtiqueta}" → "${sheetEtiqueta}"`);
          changes.push({
            leadId: localLead.id,
            etiquetaAnterior: localEtiqueta,
            etiquetaNova: sheetEtiqueta,
            nomeLead: localLead.nome
          });
        }
      } else {
        console.log(`[DetectChanges] ⚠️ Lead não encontrado localmente: ${sheetLead.nome} (ID: ${sheetLead.id})`);
      }
    });

    console.log(`[DetectChanges] 📈 Total de mudanças detectadas: ${changes.length}`);
    return changes;
  }

  // Verificar se a sincronização automática está ativa
  isAutoSyncActive(): boolean {
    return this.autoSyncInterval !== null;
  }

  // Obter status da sincronização
  getSyncStatus(): {
    isActive: boolean;
    lastSync: string;
    nextSync: string;
  } {
    return {
      isActive: this.isAutoSyncActive(),
      lastSync: this.lastSyncTimestamp,
      nextSync: this.lastSyncTimestamp ? new Date(new Date(this.lastSyncTimestamp).getTime() + 10000).toISOString() : 'N/A'
    };
  }
}

export const clientDataService = new ClientDataService();

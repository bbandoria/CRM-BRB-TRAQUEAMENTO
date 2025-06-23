export interface ClientConfig {
  id: string;
  nome: string;
  accessKey?: string; // Senha para clientes acessarem apenas seus dados
  sheetId?: string; // ID da planilha do Google Sheets para sync automático
  ultimaAtualizacao?: string;
  etiquetasConversao?: string[]; 
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
      
      // URL do Google Apps Script Web App (precisa ser configurado)
      const webAppUrl = 'https://script.google.com/macros/s/AKfycbxxx/exec'; // Placeholder - precisa ser configurado
      
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
    console.log(`[importClientFromSheet] Linha ${index}: Valor de 'etiquetasconversao' extraído:`, etiquetasValue);

    const client: ClientConfig = {
      id: values[headers.indexOf('id')] || `client_${Date.now()}_${index}`,
      nome: values[headers.indexOf('nome')] || `Cliente ${index}`,
      accessKey: values[headers.indexOf('accesskey')] || undefined,
      sheetId: values[headers.indexOf('sheetid')] || undefined,
      etiquetasConversao: etiquetasValue ? etiquetasValue.split(',').map(t => t.trim()) : undefined,
      ultimaAtualizacao: values[headers.indexOf('ultimaatualizacao')] || new Date().toISOString()
    };
    console.log('[importClientFromSheet] Objeto cliente importado:', client);
    return client;
  }
}

export const clientDataService = new ClientDataService();

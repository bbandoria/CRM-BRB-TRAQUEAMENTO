
import { Lead } from '@/types/lead';
import { EtiquetaHistory } from '@/types/lead';
import { getWebAppUrl, GOOGLE_SHEETS_CONFIG } from '@/config/googleSheets';

class GoogleSheetsService {
  async fetchLeadsFromSheet(sheetId: string): Promise<Lead[]> {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      console.log('Buscando dados da planilha:', csvUrl);

      const response = await fetch(csvUrl, {
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('Erro ao acessar a planilha. Verifique se ela está pública e acessível.');
      }

      const csvText = await response.text();
      console.log('Dados CSV recebidos:', csvText.substring(0, 200) + '...');

      const leads = this.parseCSVData(csvText);
      console.log(`${leads.length} leads importados da planilha`);
      
      return leads;

    } catch (error) {
      console.error('Erro ao buscar dados da planilha:', error);
      throw new Error('Falha ao conectar com o Google Sheets');
    }
  }

  private parseCSVData(csvText: string): Lead[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      console.log('Nenhum dado encontrado na planilha');
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads: Lead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === 0) continue;

      const lead: Lead = {
        id: `sheet-${Date.now()}-${i}`,
        data: row[headers.indexOf('Data')] || row[0] || new Date().toLocaleDateString('pt-BR'),
        nome: row[headers.indexOf('Nome')] || row[headers.indexOf('nome')] || `Lead ${i}`,
        telefone: row[headers.indexOf('Telefone')] || row[headers.indexOf('telefone')] || '',
        origem: row[headers.indexOf('Origem')] || row[headers.indexOf('origem')] || 'Google Sheets',
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

  // Função para adicionar histórico de etiquetas à planilha
  async appendEtiquetaHistory(sheetId: string, historyData: any[]): Promise<void> {
    try {
      console.log(`[GoogleSheets] Adicionando ${historyData.length} registros ao histórico`);
      console.log(`[GoogleSheets] Planilha: ${sheetId}`);
      
      // URL do Web App do Google Apps Script
      const webAppUrl = getWebAppUrl();
      console.log(`[GoogleSheets] 🔗 URL do Web App: ${webAppUrl}`);
      console.log(`[GoogleSheets] 📋 Configuração carregada de: ${import.meta.url}`);
      console.log(`[GoogleSheets] 🔧 Configuração direta: ${GOOGLE_SHEETS_CONFIG.HISTORICO_ETIQUETAS_WEBAPP_URL}`);
      
      // Usar URL de configuração (sem hardcode)
      const finalUrl = webAppUrl;

      // 1) Tentar enviar com sendBeacon (no-cors, fire-and-forget)
      try {
        if (navigator && 'sendBeacon' in navigator) {
          const payload = new Blob([JSON.stringify(historyData)], { type: 'text/plain' });
          const sent = navigator.sendBeacon(finalUrl, payload);
          if (sent) {
            console.log('[GoogleSheets] ✅ Enviado via sendBeacon (no-cors)');
            return;
          }
        }
      } catch (_) { /* continua para fallback */ }

      // 2) Fallback: POST com no-cors (não lê resposta, apenas envia)
      try {
        await fetch(finalUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(historyData)
        });
        console.log('[GoogleSheets] ✅ Enviado via POST no-cors');
        return;
      } catch (postError) {
        console.log('[GoogleSheets] ⚠️ POST no-cors falhou, tentando GET no-cors:', postError);
      }

      // 3) Último fallback: GET no-cors com querystring
      try {
        const params = new URLSearchParams();
        params.append('data', JSON.stringify(historyData));
        params.append('action', 'append');
        const getUrl = `${finalUrl}?${params.toString()}`;
        await fetch(getUrl, { method: 'GET', mode: 'no-cors' });
        console.log('[GoogleSheets] ✅ Enviado via GET no-cors');
        return;
      } catch (getError) {
        console.error('[GoogleSheets] ❌ Todos os métodos de envio falharam:', getError);
        throw getError;
      }
      
    } catch (error) {
      console.error('Erro ao adicionar histórico à planilha:', error);
      throw new Error('Falha ao salvar histórico no Google Sheets');
    }
  }

  // Função para ler histórico de etiquetas da planilha
  async readEtiquetaHistory(sheetId: string): Promise<EtiquetaHistory[]> {
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
      
      console.log('Buscando histórico da planilha:', csvUrl);

      const response = await fetch(csvUrl, {
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error('Erro ao acessar a planilha de histórico. Verifique se ela está pública.');
      }

      const csvText = await response.text();
      const history = this.parseHistoryCSVData(csvText);
      
      console.log(`${history.length} registros de histórico carregados`);
      return history;

    } catch (error) {
      console.error('Erro ao buscar histórico da planilha:', error);
      return [];
    }
  }

  private parseHistoryCSVData(csvText: string): EtiquetaHistory[] {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const history: EtiquetaHistory[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i]);
      if (row.length === 0) continue;

      const historyEntry: EtiquetaHistory = {
        id: `history-${Date.now()}-${i}`,
        leadId: row[headers.indexOf('leadId')] || row[1] || '',
        nomeLead: row[headers.indexOf('nomeLead')] || row[2] || '',
        etiquetaAnterior: row[headers.indexOf('etiquetaAnterior')] || row[3] || '',
        etiquetaNova: row[headers.indexOf('etiquetaNova')] || row[4] || '',
        data: row[headers.indexOf('data')] || row[0] || new Date().toISOString(),
        usuario: row[headers.indexOf('usuario')] || row[5] || 'Sistema',
        motivo: row[headers.indexOf('motivo')] || row[6] || '',
        historyId: row[headers.indexOf('historyId')] || row[8] || undefined
      };

      history.push(historyEntry);
    }

    // Remover duplicidades baseado em timestamp, leadId e etiquetaNova
    const uniqueHistory = history.filter((entry, index, self) => {
      const duplicateIndex = self.findIndex(e => 
        (entry.historyId && e.historyId === entry.historyId) ||
        (
          e.leadId === entry.leadId && 
          e.etiquetaNova === entry.etiquetaNova &&
          Math.abs(new Date(e.data).getTime() - new Date(entry.data).getTime()) < 1000
        ) // 1 segundo de tolerância
      );
      return duplicateIndex === index;
    });

    if (uniqueHistory.length !== history.length) {
      console.log(`[GoogleSheets] 🧹 Removidas ${history.length - uniqueHistory.length} duplicatas ao carregar histórico`);
    }

    return uniqueHistory;
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
}

export const googleSheetsService = new GoogleSheetsService();

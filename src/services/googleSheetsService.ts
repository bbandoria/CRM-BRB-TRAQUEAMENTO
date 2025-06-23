
import { Lead } from '@/types/lead';

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
        interactions: []
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
}

export const googleSheetsService = new GoogleSheetsService();

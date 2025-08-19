import { supabaseService } from '@/services/supabaseService';
import { googleSheetsService } from '@/services/googleSheetsService';
import { Lead } from '@/types/lead';

export interface ClientMigrationConfig {
  clientId: string;
  clientName: string;
  leadsSheetId: string;
  historicoSheetId?: string;
}

export class MigrationHelper {
  /**
   * Migra um cliente específico do Google Sheets para o Supabase
   */
  static async migrateClientFromGoogleSheets(config: ClientMigrationConfig): Promise<{
    success: boolean;
    message: string;
    migratedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let migratedCount = 0;

    try {
      console.log(`🔄 Iniciando migração do cliente ${config.clientName} (${config.clientId})...`);
      
      // 1. Criar tabelas para o cliente no Supabase
      console.log(`📊 Criando tabelas para o cliente ${config.clientName}...`);
      await supabaseService.createClientTables(config.clientId, config.clientName);
      
      // 2. Buscar leads da planilha principal
      console.log(`📋 Buscando leads da planilha principal...`);
      const sheetsLeads = await googleSheetsService.fetchLeadsFromSheet(config.leadsSheetId);
      console.log(`📊 ${sheetsLeads.length} leads encontrados na planilha principal`);

      if (sheetsLeads.length === 0) {
        return {
          success: false,
          message: `Nenhum lead encontrado na planilha principal do cliente ${config.clientName}`,
          migratedCount: 0,
          errors: []
        };
      }

      // 3. Migrar leads para a tabela específica do cliente
      console.log(`🚀 Migrando leads para a tabela do cliente ${config.clientName}...`);
      for (const lead of sheetsLeads) {
        try {
          // Remover ID temporário da planilha
          const { id, ...leadWithoutId } = lead;
          
          await supabaseService.createLeadForClient(config.clientId, leadWithoutId);
          migratedCount++;
          
          if (migratedCount % 10 === 0) {
            console.log(`✅ ${migratedCount}/${sheetsLeads.length} leads migrados para ${config.clientName}...`);
          }
        } catch (error: any) {
          const errorMsg = `Erro ao migrar lead "${lead.nome}": ${error.message}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      // 4. Migrar histórico de etiquetas se disponível
      if (config.historicoSheetId) {
        try {
          console.log(`📝 Migrando histórico de etiquetas do cliente ${config.clientName}...`);
          const etiquetaHistory = await googleSheetsService.readEtiquetaHistory(config.historicoSheetId);
          
          if (etiquetaHistory.length > 0) {
            console.log(`📝 ${etiquetaHistory.length} registros de histórico encontrados...`);
            
            const historyWithoutIds = etiquetaHistory.map(({ id, ...rest }) => rest);
            await supabaseService.appendEtiquetaHistoryForClient(config.clientId, historyWithoutIds);
            
            console.log(`✅ Histórico de etiquetas do cliente ${config.clientName} migrado com sucesso`);
          }
        } catch (error: any) {
          console.warn(`⚠️ Não foi possível migrar histórico de etiquetas do cliente ${config.clientName}:`, error.message);
        }
      }

      const success = errors.length === 0;
      const message = success 
        ? `Migração do cliente ${config.clientName} concluída com sucesso! ${migratedCount} leads migrados.`
        : `Migração do cliente ${config.clientName} concluída com ${errors.length} erros. ${migratedCount} leads migrados.`;

      console.log(`🎉 ${message}`);

      return {
        success,
        message,
        migratedCount,
        errors
      };

    } catch (error: any) {
      const errorMsg = `Erro geral na migração do cliente ${config.clientName}: ${error.message}`;
      console.error(errorMsg);
      
      return {
        success: false,
        message: errorMsg,
        migratedCount,
        errors: [errorMsg]
      };
    }
  }

  /**
   * Migra múltiplos clientes de uma vez
   */
  static async migrateMultipleClients(clients: ClientMigrationConfig[]): Promise<{
    totalClients: number;
    successfulClients: number;
    failedClients: number;
    results: Array<{
      clientId: string;
      clientName: string;
      success: boolean;
      message: string;
      migratedCount: number;
      errors: string[];
    }>;
  }> {
    const results = [];
    let successfulClients = 0;
    let failedClients = 0;

    console.log(`🚀 Iniciando migração de ${clients.length} clientes...`);

    for (const client of clients) {
      try {
        console.log(`\n--- Migrando cliente: ${client.clientName} ---`);
        const result = await this.migrateClientFromGoogleSheets(client);
        
        results.push({
          clientId: client.clientId,
          clientName: client.clientName,
          ...result
        });

        if (result.success) {
          successfulClients++;
        } else {
          failedClients++;
        }

        // Aguardar um pouco entre as migrações para não sobrecarregar
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        console.error(`❌ Erro fatal na migração do cliente ${client.clientName}:`, error);
        results.push({
          clientId: client.clientId,
          clientName: client.clientName,
          success: false,
          message: `Erro fatal: ${error.message}`,
          migratedCount: 0,
          errors: [error.message]
        });
        failedClients++;
      }
    }

    console.log(`\n🎉 Migração em lote concluída!`);
    console.log(`✅ Clientes com sucesso: ${successfulClients}`);
    console.log(`❌ Clientes com falha: ${failedClients}`);
    console.log(`📊 Total de clientes: ${clients.length}`);

    return {
      totalClients: clients.length,
      successfulClients,
      failedClients,
      results
    };
  }

  /**
   * Verifica se há dados duplicados entre Google Sheets e Supabase para um cliente específico
   */
  static async checkDuplicatesForClient(clientId: string, leadsSheetId: string): Promise<{
    duplicates: Lead[];
    totalInSheet: number;
    totalInSupabase: number;
  }> {
    try {
      // Buscar leads da planilha
      const sheetsLeads = await googleSheetsService.fetchLeadsFromSheet(leadsSheetId);
      
      // Buscar leads do Supabase para o cliente específico
      const supabaseLeads = await supabaseService.fetchLeadsByClient(clientId);
      
      // Verificar duplicatas por telefone e nome
      const duplicates: Lead[] = [];
      
      for (const sheetLead of sheetsLeads) {
        const duplicate = supabaseLeads.find(supabaseLead => 
          (sheetLead.telefone && supabaseLead.telefone === sheetLead.telefone) ||
          (sheetLead.nome && supabaseLead.nome === sheetLead.nome)
        );
        
        if (duplicate) {
          duplicates.push(duplicate);
        }
      }

      return {
        duplicates,
        totalInSheet: sheetsLeads.length,
        totalInSupabase: supabaseLeads.length
      };
    } catch (error: any) {
      console.error('Erro ao verificar duplicatas do cliente:', error);
      throw new Error('Falha ao verificar duplicatas');
    }
  }

  /**
   * Verifica se as tabelas de um cliente existem no Supabase
   */
  static async checkClientTablesExist(clientId: string): Promise<{
    exists: boolean;
    tables: {
      leads: boolean;
      historico: boolean;
      interactions: boolean;
    };
  }> {
    try {
      const clientConfig = await supabaseService.getClientConfig(clientId);
      
      if (!clientConfig) {
        return {
          exists: false,
          tables: { leads: false, historico: false, interactions: false }
        };
      }

      // Verificar se as tabelas existem
      const leadsExists = await supabaseService.checkTableExists(clientConfig.leads_table);
      const historicoExists = await supabaseService.checkTableExists(clientConfig.historico_table);
      const interactionsExists = await supabaseService.checkTableExists(clientConfig.interactions_table);

      return {
        exists: leadsExists && historicoExists && interactionsExists,
        tables: {
          leads: leadsExists,
          historico: historicoExists,
          interactions: interactionsExists
        }
      };
    } catch (error: any) {
      console.error('Erro ao verificar tabelas do cliente:', error);
      return {
        exists: false,
        tables: { leads: false, historico: false, interactions: false }
      };
    }
  }

  /**
   * Limpa dados temporários após migração bem-sucedida
   */
  static async cleanupAfterMigration(): Promise<void> {
    try {
      // Aqui você pode adicionar lógica para limpar dados temporários
      // ou marcar a migração como concluída
      console.log('🧹 Limpeza pós-migração concluída');
    } catch (error: any) {
      console.error('Erro na limpeza pós-migração:', error);
    }
  }

  /**
   * Gera relatório de migração
   */
  static generateMigrationReport(results: Array<{
    clientId: string;
    clientName: string;
    success: boolean;
    message: string;
    migratedCount: number;
    errors: string[];
  }>): string {
    let report = `# 📊 Relatório de Migração\n\n`;
    report += `**Data:** ${new Date().toLocaleString('pt-BR')}\n`;
    report += `**Total de Clientes:** ${results.length}\n\n`;

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    report += `## ✅ Clientes Migrados com Sucesso: ${successful.length}\n\n`;
    successful.forEach(result => {
      report += `- **${result.clientName}** (${result.clientId}): ${result.migratedCount} leads\n`;
    });

    if (failed.length > 0) {
      report += `\n## ❌ Clientes com Falha: ${failed.length}\n\n`;
      failed.forEach(result => {
        report += `- **${result.clientName}** (${result.clientId}): ${result.message}\n`;
        if (result.errors.length > 0) {
          report += `  - Erros: ${result.errors.slice(0, 3).join(', ')}\n`;
        }
      });
    }

    const totalLeads = results.reduce((sum, r) => sum + r.migratedCount, 0);
    report += `\n## 📈 Resumo\n`;
    report += `- **Total de Leads Migrados:** ${totalLeads}\n`;
    report += `- **Taxa de Sucesso:** ${((successful.length / results.length) * 100).toFixed(1)}%\n`;

    return report;
  }
}

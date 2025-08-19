import { clientDataService } from '@/services/clientDataService';

/**
 * Utilitários para testar funcionalidades de etiquetas
 */
export const etiquetaTestUtils = {
  /**
   * Simula mudanças de etiqueta para testar sincronização
   */
  async testEtiquetaChanges(leadId: string, iterations: number = 5): Promise<void> {
    console.log(`🧪 Testando ${iterations} mudanças de etiqueta para lead ${leadId}`);
    
    const etiquetas = ['NOVO', 'CONTATO', 'QUALIFICADO', 'PROPOSTA', 'FECHADO'];
    
    for (let i = 0; i < iterations; i++) {
      const etiquetaAnterior = i === 0 ? 'Sem Etiqueta' : etiquetas[i - 1];
      const etiquetaNova = etiquetas[i];
      
      console.log(`🔄 Teste ${i + 1}: ${etiquetaAnterior} → ${etiquetaNova}`);
      
      await clientDataService.trackEtiquetaChange(
        leadId,
        etiquetaAnterior,
        etiquetaNova,
        `Teste automatizado ${i + 1}`,
        'Sistema de Teste'
      );
      
      // Aguardar um pouco entre as mudanças
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('✅ Teste de mudanças de etiqueta concluído!');
  },

  /**
   * Testa detecção de duplicidades
   */
  async testDuplicateDetection(leadId: string): Promise<void> {
    console.log(`🧪 Testando detecção de duplicidades para lead ${leadId}`);
    
    // Adicionar etiquetas duplicadas
    const etiqueta = 'TESTE_DUPLICATA';
    
    for (let i = 0; i < 3; i++) {
      await clientDataService.trackEtiquetaChange(
        leadId,
        'Sem Etiqueta',
        etiqueta,
        `Teste duplicata ${i + 1}`,
        'Sistema de Teste'
      );
      
      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Duplicatas criadas para teste!');
    
    // Verificar duplicidades
    const duplicates = clientDataService.checkAllDuplicates();
    console.log('🔍 Duplicatas encontradas:', duplicates);
  },

  /**
   * Testa limpeza de duplicidades
   */
  async testDuplicateCleanup(): Promise<void> {
    console.log('🧪 Testando limpeza de duplicidades');
    
    try {
      const result = await clientDataService.cleanAllDuplicates();
      console.log('✅ Resultado da limpeza:', result);
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
  },

  /**
   * Testa sincronização com Google Sheets
   */
  async testGoogleSheetsSync(leadId: string): Promise<void> {
    console.log(`🧪 Testando sincronização com Google Sheets para lead ${leadId}`);
    
    try {
      await clientDataService.autoSyncEtiquetaHistory(leadId);
      console.log('✅ Sincronização com Google Sheets concluída!');
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
    }
  },

  /**
   * Executa todos os testes
   */
  async runAllTests(leadId: string): Promise<void> {
    console.log('🚀 Iniciando todos os testes de etiquetas...');
    
    try {
      // Teste 1: Mudanças de etiqueta
      await this.testEtiquetaChanges(leadId, 3);
      
      // Teste 2: Detecção de duplicidades
      await this.testDuplicateDetection(leadId);
      
      // Teste 3: Limpeza de duplicidades
      await this.testDuplicateCleanup();
      
      // Teste 4: Sincronização
      await this.testGoogleSheetsSync(leadId);
      
      console.log('🎉 Todos os testes concluídos com sucesso!');
    } catch (error) {
      console.error('💥 Erro durante os testes:', error);
    }
  },

  /**
   * Gera relatório de status do sistema
   */
  generateStatusReport(): void {
    console.log('📊 Relatório de Status do Sistema de Etiquetas');
    console.log('='.repeat(50));
    
    // Verificar duplicidades
    const duplicates = clientDataService.checkAllDuplicates();
    console.log(`🔍 Leads com duplicatas: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      const totalDuplicates = duplicates.reduce((sum, item) => sum + item.duplicates, 0);
      console.log(`📈 Total de duplicatas: ${totalDuplicates}`);
      console.log('📋 Detalhes:', duplicates);
    } else {
      console.log('✅ Nenhuma duplicata encontrada!');
    }
    
    // Verificar cliente atual
    const currentClient = clientDataService.getCurrentClient();
    console.log(`👤 Cliente atual: ${currentClient?.nome || 'Nenhum'}`);
    console.log(`📊 Planilha de histórico: ${currentClient?.historicoEtiquetasSheetId ? 'Configurada' : 'Não configurada'}`);
    
    // Verificar status da sincronização
    const syncStatus = clientDataService.getSyncStatus();
    console.log(`🔄 Sincronização automática: ${syncStatus.isActive ? '🟢 Ativa' : '🔴 Parada'}`);
    if (syncStatus.isActive) {
      console.log(`⏰ Última sincronização: ${syncStatus.lastSync}`);
      console.log(`⏱️ Próxima sincronização: ${syncStatus.nextSync}`);
    }
    
    console.log('='.repeat(50));
  },

  /**
   * Testa funcionalidades de sincronização automática
   */
  async testAutoSync(): Promise<void> {
    console.log('🧪 Testando sincronização automática...');
    
    try {
      // Iniciar sincronização automática
      clientDataService.startAutoSync(5000); // 5 segundos para teste
      console.log('✅ Sincronização automática iniciada');
      
      // Aguardar um pouco
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verificar status
      const status = clientDataService.getSyncStatus();
      console.log('📊 Status da sincronização:', status);
      
      // Parar sincronização
      clientDataService.stopAutoSync();
      console.log('⏹️ Sincronização automática parada');
      
    } catch (error) {
      console.error('❌ Erro ao testar sincronização automática:', error);
    }
  },

  /**
   * Executa todos os testes incluindo sincronização
   */
  async runAllTestsWithSync(leadId: string): Promise<void> {
    console.log('🚀 Iniciando todos os testes incluindo sincronização...');
    
    try {
      // Teste 1: Mudanças de etiqueta
      await this.testEtiquetaChanges(leadId, 3);
      
      // Teste 2: Detecção de duplicidades
      await this.testDuplicateDetection(leadId);
      
      // Teste 3: Limpeza de duplicidades
      await this.testDuplicateCleanup();
      
      // Teste 4: Sincronização com Google Sheets
      await this.testGoogleSheetsSync(leadId);
      
      // Teste 5: Sincronização automática
      await this.testAutoSync();
      
      console.log('🎉 Todos os testes incluindo sincronização concluídos com sucesso!');
    } catch (error) {
      console.error('💥 Erro durante os testes:', error);
    }
  }
};

// Expor para uso global (desenvolvimento)
if (typeof window !== 'undefined') {
  (window as any).etiquetaTestUtils = etiquetaTestUtils;
  console.log('🧪 Utilitários de teste de etiquetas carregados! Use window.etiquetaTestUtils para testar.');
  console.log('🔄 Novas funcionalidades disponíveis:');
  console.log('  - testAutoSync() - Testa sincronização automática');
  console.log('  - runAllTestsWithSync(leadId) - Todos os testes + sincronização');
  console.log('  - generateStatusReport() - Inclui status da sincronização');
}

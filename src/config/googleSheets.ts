// Configurações do Google Sheets
export const GOOGLE_SHEETS_CONFIG = {
  // URL do Web App do Google Apps Script para histórico de etiquetas
  HISTORICO_ETIQUETAS_WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbzapc8keikZX5_doPU6i5tJEP8qBAfKbdpj6SFjQmjDoHtQc30HkHVeR4HKHWq7w1Ak/exec', // URL atualizada (historyId + idempotência)
  
  // IDs das planilhas
  PLANILHAS: {
    CONFIGURACAO_CLIENTES: '1o0ugH_lzj3FKFqE4Pc3zHOnrcyshFXCVKzoBpSot0uo',
    HISTORICO_ETIQUETAS: '1pCplOQ8OODAym-oi_oRuofSy-3ov7aCNAxTAAm6jeWE'
  }
};

// Função para obter a URL do Web App
export function getWebAppUrl(): string {
  const url = GOOGLE_SHEETS_CONFIG.HISTORICO_ETIQUETAS_WEBAPP_URL;
  console.log(`[Config] 🎯 URL configurada: ${url}`);
  return url;
}

// Função para obter ID da planilha de histórico
export function getHistoricoSheetId(): string {
  return GOOGLE_SHEETS_CONFIG.PLANILHAS.HISTORICO_ETIQUETAS;
}

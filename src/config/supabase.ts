import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configurações para o banco multi-cliente
export const SUPABASE_CONFIG = {
  TABLES: {
    CLIENTS: 'clients',
    CLIENT_CONFIGS: 'client_configs'
  },
  
  // Função para gerar nomes de tabelas por cliente
  getClientTableName: (clientId: string, tableType: 'leads' | 'historico_etiquetas' | 'interactions') => {
    return `${tableType}_${clientId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
  },
  
  // Função para verificar se uma tabela de cliente existe
  getClientTableExists: async (clientId: string, tableType: 'leads' | 'historico_etiquetas' | 'interactions') => {
    const tableName = SUPABASE_CONFIG.getClientTableName(clientId, tableType);
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    return !error && data && data.length > 0;
  }
};

-- =====================================================
-- CONFIGURAÇÃO MULTI-CLIENTE DO SUPABASE PARA O CRM
-- =====================================================

-- 1. CRIAR TABELAS DE CONFIGURAÇÃO
-- =====================================================

-- Tabela de configuração dos clientes
CREATE TABLE client_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  leads_table TEXT NOT NULL,
  historico_table TEXT NOT NULL,
  interactions_table TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes (para compatibilidade)
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sheet_id TEXT,
  historico_etiquetas_sheet_id TEXT,
  etiquetas_conversao TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FUNÇÕES PARA CRIAR TABELAS DE CLIENTES
-- =====================================================

-- Função para criar tabela de leads de um cliente
CREATE OR REPLACE FUNCTION create_client_leads_table(table_name TEXT, client_id TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      data TEXT NOT NULL,
      nome TEXT NOT NULL,
      telefone TEXT,
      origem TEXT,
      etapa_etiquetas TEXT,
      etapa_altas TEXT,
      cliente_local TEXT,
      campanha TEXT,
      conjunto TEXT,
      anuncio TEXT,
      media TEXT,
      ref TEXT,
      link_anuncio TEXT,
      dispositivo TEXT DEFAULT ''desktop'',
      observacoes TEXT,
      status TEXT DEFAULT ''novo'',
      ultima_interacao TEXT,
      proximo_followup TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', table_name);
    
  -- Criar índices para a tabela
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_status ON %I(status)', 
    replace(table_name, 'leads_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_origem ON %I(origem)', 
    replace(table_name, 'leads_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_data ON %I(data)', 
    replace(table_name, 'leads_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_nome ON %I(nome)', 
    replace(table_name, 'leads_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_telefone ON %I(telefone)', 
    replace(table_name, 'leads_', ''), table_name);
    
  -- Habilitar RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Criar políticas RLS
  EXECUTE format('CREATE POLICY "Leads - Select" ON %I FOR SELECT USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Leads - Insert" ON %I FOR INSERT WITH CHECK (true)', table_name);
  EXECUTE format('CREATE POLICY "Leads - Update" ON %I FOR UPDATE USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Leads - Delete" ON %I FOR DELETE USING (true)', table_name);
  
  -- Criar trigger para updated_at
  EXECUTE format('
    CREATE TRIGGER update_%s_updated_at 
    BEFORE UPDATE ON %I
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
    replace(table_name, 'leads_', ''), table_name);
    
END;
$$ LANGUAGE plpgsql;

-- Função para criar tabela de histórico de etiquetas de um cliente
CREATE OR REPLACE FUNCTION create_client_historico_table(table_name TEXT, client_id TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      history_id TEXT,
      lead_id UUID,
      nome_lead TEXT,
      etiqueta_anterior TEXT NOT NULL,
      etiqueta_nova TEXT NOT NULL,
      data TEXT NOT NULL,
      usuario TEXT NOT NULL,
      motivo TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', table_name);
    
  -- Criar índices para a tabela
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_data ON %I(data)', 
    replace(table_name, 'historico_etiquetas_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_usuario ON %I(usuario)', 
    replace(table_name, 'historico_etiquetas_', ''), table_name);
    
  -- Habilitar RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Criar políticas RLS
  EXECUTE format('CREATE POLICY "Historico - Select" ON %I FOR SELECT USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Historico - Insert" ON %I FOR INSERT WITH CHECK (true)', table_name);
  EXECUTE format('CREATE POLICY "Historico - Update" ON %I FOR UPDATE USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Historico - Delete" ON %I FOR DELETE USING (true)', table_name);
    
END;
$$ LANGUAGE plpgsql;

-- Função para criar tabela de interações de um cliente
CREATE OR REPLACE FUNCTION create_client_interactions_table(table_name TEXT, client_id TEXT)
RETURNS void AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      lead_id UUID,
      tipo TEXT NOT NULL CHECK (tipo IN (''call'', ''email'', ''meeting'', ''note'')),
      descricao TEXT NOT NULL,
      data TEXT NOT NULL,
      usuario TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )', table_name);
    
  -- Criar índices para a tabela
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_lead_id ON %I(lead_id)', 
    replace(table_name, 'interactions_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tipo ON %I(tipo)', 
    replace(table_name, 'interactions_', ''), table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_data ON %I(data)', 
    replace(table_name, 'interactions_', ''), table_name);
    
  -- Habilitar RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Criar políticas RLS
  EXECUTE format('CREATE POLICY "Interactions - Select" ON %I FOR SELECT USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Interactions - Insert" ON %I FOR INSERT WITH CHECK (true)', table_name);
  EXECUTE format('CREATE POLICY "Interactions - Update" ON %I FOR UPDATE USING (true)', table_name);
  EXECUTE format('CREATE POLICY "Interactions - Delete" ON %I FOR DELETE USING (true)', table_name);
    
END;
$$ LANGUAGE plpgsql;

-- 3. FUNÇÕES UTILITÁRIAS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para listar todas as tabelas de clientes
CREATE OR REPLACE FUNCTION list_client_tables()
RETURNS TABLE (
  client_id TEXT,
  client_name TEXT,
  leads_table TEXT,
  historico_table TEXT,
  interactions_table TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.client_id,
    cc.client_name,
    cc.leads_table,
    cc.historico_table,
    cc.interactions_table,
    cc.created_at
  FROM client_configs cc
  ORDER BY cc.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de um cliente específico
CREATE OR REPLACE FUNCTION get_client_stats(client_table_name TEXT)
RETURNS TABLE (
  total_leads BIGINT,
  novos_leads BIGINT,
  leads_qualificados BIGINT,
  leads_por_origem JSONB
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      COUNT(*)::BIGINT as total_leads,
      COUNT(*) FILTER (WHERE status = ''novo'')::BIGINT as novos_leads,
      COUNT(*) FILTER (WHERE status IN (''qualificado'', ''proposta'', ''ganho''))::BIGINT as leads_qualificados,
      jsonb_object_agg(origem, count) as leads_por_origem
    FROM (
      SELECT origem, COUNT(*) as count
      FROM %I
      GROUP BY origem
    ) origem_counts
    CROSS JOIN (SELECT COUNT(*) FROM %I) total', 
    client_table_name, client_table_name);
END;
$$ LANGUAGE plpgsql;

-- 4. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas de configuração
ALTER TABLE client_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas para tabelas de configuração
CREATE POLICY "Client Configs - Select" ON client_configs FOR SELECT USING (true);
CREATE POLICY "Client Configs - Insert" ON client_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Client Configs - Update" ON client_configs FOR UPDATE USING (true);
CREATE POLICY "Client Configs - Delete" ON client_configs FOR DELETE USING (true);

CREATE POLICY "Clients - Select" ON clients FOR SELECT USING (true);
CREATE POLICY "Clients - Insert" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Clients - Update" ON clients FOR UPDATE USING (true);
CREATE POLICY "Clients - Delete" ON clients FOR DELETE USING (true);

-- 5. DADOS DE EXEMPLO
-- =====================================================

-- Inserir cliente de exemplo (BRB)
INSERT INTO clients (nome, etiquetas_conversao) VALUES 
('BRB Agência Digital', ARRAY['FECHADO', 'GANHO', 'CONCLUIDO']);

-- 6. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas de configuração foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('client_configs', 'clients')
ORDER BY table_name;

-- Verificar se as funções foram criadas
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('create_client_leads_table', 'create_client_historico_table', 'create_client_interactions_table')
ORDER BY routine_name;

-- Verificar se as políticas RLS estão ativas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename IN ('client_configs', 'clients')
ORDER BY tablename, policyname;

-- 7. EXEMPLO DE USO
-- =====================================================

-- Para criar as tabelas de um novo cliente (exemplo):
-- SELECT create_client_leads_table('leads_brb', 'brb');
-- SELECT create_client_historico_table('historico_etiquetas_brb', 'brb');
-- SELECT create_client_interactions_table('interactions_brb', 'brb');

-- Para inserir a configuração do cliente:
-- INSERT INTO client_configs (client_id, client_name, leads_table, historico_table, interactions_table) 
-- VALUES ('brb', 'BRB Agência Digital', 'leads_brb', 'historico_etiquetas_brb', 'interactions_brb');

-- Para obter estatísticas do cliente:
-- SELECT * FROM get_client_stats('leads_brb');

-- Para listar todos os clientes configurados:
-- SELECT * FROM list_client_tables();

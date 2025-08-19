-- =====================================================
-- CONFIGURAÇÃO COMPLETA DO SUPABASE PARA O CRM
-- =====================================================

-- 1. CRIAR TABELAS PRINCIPAIS
-- =====================================================

-- Tabela de leads
CREATE TABLE leads (
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
  dispositivo TEXT DEFAULT 'desktop',
  observacoes TEXT,
  status TEXT DEFAULT 'novo',
  ultima_interacao TEXT,
  proximo_followup TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de interações
CREATE TABLE interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('call', 'email', 'meeting', 'note')),
  descricao TEXT NOT NULL,
  data TEXT NOT NULL,
  usuario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de histórico de etiquetas
CREATE TABLE etiqueta_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  history_id TEXT,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  nome_lead TEXT,
  etiqueta_anterior TEXT NOT NULL,
  etiqueta_nova TEXT NOT NULL,
  data TEXT NOT NULL,
  usuario TEXT NOT NULL,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  sheet_id TEXT,
  historico_etiquetas_sheet_id TEXT,
  etiquetas_conversao TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para leads
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_origem ON leads(origem);
CREATE INDEX idx_leads_data ON leads(data);
CREATE INDEX idx_leads_nome ON leads(nome);
CREATE INDEX idx_leads_telefone ON leads(telefone);

-- Índices para interações
CREATE INDEX idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX idx_interactions_tipo ON interactions(tipo);
CREATE INDEX idx_interactions_data ON interactions(data);

-- Índices para histórico de etiquetas
CREATE INDEX idx_etiqueta_history_lead_id ON etiqueta_history(lead_id);
CREATE INDEX idx_etiqueta_history_data ON etiqueta_history(data);
CREATE INDEX idx_etiqueta_history_usuario ON etiqueta_history(usuario);

-- Índices para clientes
CREATE INDEX idx_clients_nome ON clients(nome);

-- 3. FUNÇÕES E TRIGGERS
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_leads_updated_at 
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. FUNÇÕES ÚTEIS PARA O CRM
-- =====================================================

-- Função para buscar leads com filtros
CREATE OR REPLACE FUNCTION search_leads(
  search_term TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  origem_filter TEXT DEFAULT NULL,
  start_date TEXT DEFAULT NULL,
  end_date TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  data TEXT,
  nome TEXT,
  telefone TEXT,
  origem TEXT,
  etapa_etiquetas TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.data,
    l.nome,
    l.telefone,
    l.origem,
    l.etapa_etiquetas,
    l.status,
    l.created_at
  FROM leads l
  WHERE 
    (search_term IS NULL OR 
     l.nome ILIKE '%' || search_term || '%' OR
     l.telefone ILIKE '%' || search_term || '%' OR
     l.origem ILIKE '%' || search_term || '%')
    AND (status_filter IS NULL OR l.status = status_filter)
    AND (origem_filter IS NULL OR l.origem = origem_filter)
    AND (start_date IS NULL OR l.data >= start_date)
    AND (end_date IS NULL OR l.data <= end_date)
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do dashboard
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_leads BIGINT,
  novos_leads BIGINT,
  leads_qualificados BIGINT,
  leads_por_origem JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_leads,
    COUNT(*) FILTER (WHERE status = 'novo')::BIGINT as novos_leads,
    COUNT(*) FILTER (WHERE status IN ('qualificado', 'proposta', 'ganho'))::BIGINT as leads_qualificados,
    jsonb_object_agg(origem, count) as leads_por_origem
  FROM (
    SELECT origem, COUNT(*) as count
    FROM leads
    GROUP BY origem
  ) origem_counts
  CROSS JOIN (SELECT COUNT(*) FROM leads) total;
END;
$$ LANGUAGE plpgsql;

-- 5. CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiqueta_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Políticas para leads
CREATE POLICY "Leads - Select" ON leads
  FOR SELECT USING (true);

CREATE POLICY "Leads - Insert" ON leads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Leads - Update" ON leads
  FOR UPDATE USING (true);

CREATE POLICY "Leads - Delete" ON leads
  FOR DELETE USING (true);

-- Políticas para interações
CREATE POLICY "Interactions - Select" ON interactions
  FOR SELECT USING (true);

CREATE POLICY "Interactions - Insert" ON interactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Interactions - Update" ON interactions
  FOR UPDATE USING (true);

CREATE POLICY "Interactions - Delete" ON interactions
  FOR DELETE USING (true);

-- Políticas para histórico de etiquetas
CREATE POLICY "Etiqueta History - Select" ON etiqueta_history
  FOR SELECT USING (true);

CREATE POLICY "Etiqueta History - Insert" ON etiqueta_history
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Etiqueta History - Update" ON etiqueta_history
  FOR UPDATE USING (true);

CREATE POLICY "Etiqueta History - Delete" ON etiqueta_history
  FOR DELETE USING (true);

-- Políticas para clientes
CREATE POLICY "Clients - Select" ON clients
  FOR SELECT USING (true);

CREATE POLICY "Clients - Insert" ON clients
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Clients - Update" ON clients
  FOR UPDATE USING (true);

CREATE POLICY "Clients - Delete" ON clients
  FOR DELETE USING (true);

-- 6. DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================

-- Inserir cliente de exemplo
INSERT INTO clients (nome, etiquetas_conversao) VALUES 
('Cliente Exemplo', ARRAY['FECHADO', 'GANHO', 'CONCLUIDO']);

-- 7. COMENTÁRIOS NAS TABELAS
-- =====================================================

COMMENT ON TABLE leads IS 'Tabela principal de leads do CRM';
COMMENT ON TABLE interactions IS 'Histórico de interações com os leads';
COMMENT ON TABLE etiqueta_history IS 'Histórico de mudanças de etiquetas';
COMMENT ON TABLE clients IS 'Configurações dos clientes';

-- 8. VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se todas as tabelas foram criadas
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('leads', 'interactions', 'etiqueta_history', 'clients')
ORDER BY table_name;

-- Verificar se os índices foram criados
SELECT 
  indexname,
  tablename
FROM pg_indexes 
WHERE tablename IN ('leads', 'interactions', 'etiqueta_history', 'clients')
ORDER BY tablename, indexname;

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
ORDER BY tablename, policyname;


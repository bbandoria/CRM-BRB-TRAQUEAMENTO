# 🚀 Migração Multi-Cliente do Google Sheets para Supabase

Este guia te ajudará a migrar seu CRM multi-cliente do Google Sheets para o Supabase, mantendo a estrutura atual onde cada cliente tem suas próprias planilhas.

## 📋 Pré-requisitos

1. **Conta no Supabase**: [Crie uma conta gratuita](https://supabase.com)
2. **Projeto Supabase**: Crie um novo projeto
3. **Node.js**: Versão 16 ou superior
4. **Acesso às planilhas**: Para migrar dados existentes

## 🏗️ Estrutura Multi-Cliente

### Como funciona hoje:
- **Cliente BRB**: 
  - Planilha: "Acompanhamento Leads (BRB Agencia Digital)"
  - Histórico: "Historico Etiquetas BRB"
- **Cliente X**: 
  - Planilha: "Acompanhamento Leads (Cliente X)"
  - Histórico: "Historico Etiquetas Cliente X"

### Como será no Supabase:
- **Cliente BRB**: 
  - Tabela: `leads_brb`
  - Histórico: `historico_etiquetas_brb`
  - Interações: `interactions_brb`
- **Cliente X**: 
  - Tabela: `leads_cliente_x`
  - Histórico: `historico_etiquetas_cliente_x`
  - Interações: `interactions_cliente_x`

## 🗄️ Configuração do Banco de Dados

### 1. Executar o Script de Configuração

Execute o arquivo `supabase-multi-client-setup.sql` no Editor SQL do Supabase. Este script irá:

- Criar tabelas de configuração
- Criar funções para criar tabelas de clientes automaticamente
- Configurar políticas de segurança (RLS)
- Configurar índices e triggers

### 2. Estrutura das Tabelas

O sistema criará automaticamente para cada cliente:

```sql
-- Tabela de leads do cliente
leads_{client_id} (
  id, data, nome, telefone, origem, etapa_etiquetas,
  etapa_altas, cliente_local, campanha, conjunto,
  anuncio, media, ref, link_anuncio, dispositivo,
  observacoes, status, ultima_interacao, proximo_followup,
  created_at, updated_at
)

-- Tabela de histórico de etiquetas do cliente
historico_etiquetas_{client_id} (
  id, history_id, lead_id, nome_lead, etiqueta_anterior,
  etiqueta_nova, data, usuario, motivo, created_at
)

-- Tabela de interações do cliente
interactions_{client_id} (
  id, lead_id, tipo, descricao, data, usuario, created_at
)
```

## 🔑 Configuração das Variáveis de Ambiente

### 1. Criar arquivo .env

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
```

### 2. Obter as Credenciais

1. Vá para seu projeto no Supabase
2. Clique em **Settings** → **API**
3. Copie a **Project URL** e **anon public** key
4. Cole no arquivo `.env`

## 📦 Instalação das Dependências

```bash
npm install @supabase/supabase-js
```

## 🔄 Processo de Migração

### 1. Usar a Ferramenta de Migração Integrada

O sistema agora inclui uma ferramenta de migração multi-cliente:

1. Acesse o CRM
2. Vá em **Importar Leads** → **Migração**
3. Escolha entre **Cliente Único** ou **Múltiplos Clientes**
4. Configure cada cliente:
   - **ID do Cliente**: Identificador único (ex: `brb`, `cliente_a`)
   - **Nome do Cliente**: Nome completo (ex: `BRB Agência Digital`)
   - **ID Planilha Leads**: ID da planilha de acompanhamento
   - **ID Planilha Histórico**: ID da planilha de histórico (opcional)
5. Clique em **Verificar Duplicatas** (opcional)
6. Clique em **Iniciar Migração**

### 2. Exemplo de Configuração

Para o cliente BRB:

```typescript
const clientConfig = {
  clientId: 'brb',
  clientName: 'BRB Agência Digital',
  leadsSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  historicoSheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
};
```

### 3. Migração Manual (Alternativa)

```typescript
import { MigrationHelper } from '@/utils/migrationHelper';

// Migrar cliente único
const result = await MigrationHelper.migrateClientFromGoogleSheets({
  clientId: 'brb',
  clientName: 'BRB Agência Digital',
  leadsSheetId: 'sheet-id-aqui',
  historicoSheetId: 'historico-sheet-id-aqui'
});

// Migrar múltiplos clientes
const results = await MigrationHelper.migrateMultipleClients([
  { clientId: 'brb', clientName: 'BRB', leadsSheetId: 'sheet1' },
  { clientId: 'cliente2', clientName: 'Cliente 2', leadsSheetId: 'sheet2' }
]);
```

## 🧪 Testando a Migração

### 1. Verificar Dados Migrados por Cliente

```typescript
import { supabaseService } from '@/services/supabaseService';

// Buscar leads de um cliente específico
const brbLeads = await supabaseService.fetchLeadsByClient('brb');
console.log('Leads do BRB:', brbLeads.length);

// Buscar histórico de um cliente específico
const brbHistory = await supabaseService.readEtiquetaHistoryForClient('brb');
console.log('Histórico do BRB:', brbHistory.length);
```

### 2. Verificar Configuração dos Clientes

```typescript
// Verificar configuração de um cliente
const clientConfig = await supabaseService.getClientConfig('brb');
console.log('Configuração do BRB:', clientConfig);

// Verificar se as tabelas existem
const tablesExist = await MigrationHelper.checkClientTablesExist('brb');
console.log('Tabelas do BRB existem:', tablesExist);
```

## 🔧 Configurações Adicionais

### 1. Backup Automático

Configure backups automáticos no Supabase:
- Vá para **Settings** → **Database**
- Configure **Backups** para sua necessidade

### 2. Monitoramento

- **Logs**: Acesse **Logs** no painel do Supabase
- **Métricas**: Monitore performance em **Database** → **Performance**

## 🚨 Solução de Problemas

### Erro: "Cliente não configurado"

- Verifique se o cliente foi migrado corretamente
- Confirme se as tabelas foram criadas
- Verifique se a configuração está na tabela `client_configs`

### Erro: "Falha ao criar tabelas do cliente"

- Verifique se as funções SQL foram criadas
- Confirme se o usuário tem permissões para criar tabelas
- Verifique os logs do Supabase

### Dados não aparecem após migração

- Verifique se o cliente está selecionado no dashboard
- Confirme se as tabelas foram criadas corretamente
- Verifique se as políticas RLS permitem acesso

## 📊 Comparação: Google Sheets vs Supabase Multi-Cliente

| Recurso | Google Sheets | Supabase Multi-Cliente |
|---------|---------------|------------------------|
| **Performance** | Limitada | Alta |
| **Escalabilidade** | Limitada | Ilimitada |
| **Separação de Dados** | Planilhas separadas | Tabelas separadas por cliente |
| **Consultas** | Básicas | SQL avançado por cliente |
| **Backup** | Manual | Automático |
| **Segurança** | Básica | Avançada (RLS por tabela) |
| **API** | Limitada | REST + GraphQL |
| **Tempo Real** | Não | Sim |
| **Custo** | Gratuito | Gratuito até 500MB |

## 🎯 Próximos Passos

1. **Teste a migração** com um cliente pequeno primeiro
2. **Configure backups** automáticos
3. **Monitore performance** nas primeiras semanas
4. **Treine a equipe** no novo sistema
5. **Configure alertas** para problemas

## 📞 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs do console do navegador
2. Consulte os logs do Supabase
3. Verifique se todas as tabelas foram criadas
4. Confirme as políticas de segurança
5. Verifique se as funções SQL estão funcionando

## 🎉 Benefícios da Migração Multi-Cliente

- **Isolamento**: Dados de cada cliente ficam separados
- **Performance**: Consultas muito mais rápidas por cliente
- **Escalabilidade**: Suporte a centenas de clientes
- **Segurança**: Controle granular de acesso por tabela
- **Backup**: Proteção automática dos dados
- **API**: Integração com outros sistemas
- **Tempo Real**: Atualizações instantâneas
- **Flexibilidade**: Fácil adição de novos clientes

## 🔍 Verificação Pós-Migração

### 1. Verificar Estrutura das Tabelas

```sql
-- Listar todos os clientes configurados
SELECT * FROM list_client_tables();

-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'leads_%' 
  OR table_name LIKE 'historico_etiquetas_%'
  OR table_name LIKE 'interactions_%';
```

### 2. Verificar Dados Migrados

```sql
-- Contar leads por cliente
SELECT 
  replace(table_name, 'leads_', '') as client_id,
  (SELECT COUNT(*) FROM information_schema.tables t2 WHERE t2.table_name = t1.table_name) as lead_count
FROM information_schema.tables t1
WHERE table_schema = 'public' AND table_name LIKE 'leads_%';
```

---

**Boa sorte com a migração multi-cliente! 🚀**

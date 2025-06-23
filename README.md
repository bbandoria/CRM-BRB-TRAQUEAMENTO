# CRM BRB Agência Digital

Sistema CRM para gerenciamento de leads e clientes com sincronização automática com Google Sheets.

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- NPM ou Yarn

### Instalação e Execução

1. **Navegue para a pasta correta:**
   ```bash
   cd crm-brb-agencia-digital-main
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Execute o sistema:**
   ```bash
   npm run dev
   ```

4. **Acesse o sistema:**
   - Abra o navegador
   - Acesse: http://localhost:5173 (ou a URL que aparecer no terminal)

## 🔧 Configuração

### Planilha de Configuração de Clientes
O sistema usa automaticamente a planilha de configuração com ID: `1o0ugH_lzj3FKFqE4Pc3zHOnrcyshFXCVKzoBpSot0uo`

### Estrutura da Planilha de Clientes
A planilha deve ter as seguintes colunas:
- `id` - ID único do cliente
- `nome` - Nome do cliente
- `accessKey` - Chave de acesso (opcional)
- `sheetId` - ID da planilha de leads do cliente
- `ultimaAtualizacao` - Data da última atualização
- `etiquetasconversao` - Etiquetas que contam como conversão (separadas por vírgula)

### Exemplo de dados:
```
id,nome,accessKey,sheetId,ultimaAtualizacao,etiquetasconversao
1XAyIfQywwN9Q6yHEuDM5kSb71G7qB6EeWXYlxdeJx-g,BRB,BRB,1XAyIfQywwN9Q6yHEuDM5kSb71G7qB6EeWXYlxdeJx-g,,"FECHADO,GANHO,CONCLUIDO,fechado,ganho,concluido"
```

## 🐛 Solução de Problemas

### Erro: "Could not read package.json"
- **Causa:** Executando o comando na pasta errada
- **Solução:** Certifique-se de estar na pasta `crm-brb-agencia-digital-main`

### Etiquetas de conversão não aparecem
- **Causa:** Planilha de configuração não sincronizada
- **Solução:** 
  1. Faça login como admin
  2. Sincronize os clientes
  3. Verifique os logs no console do navegador

### Sistema não carrega
- **Causa:** Dependências não instaladas
- **Solução:** Execute `npm install` antes de `npm run dev`

## 📁 Estrutura do Projeto

```
crm-brb-agencia-digital-main/
├── src/
│   ├── components/          # Componentes React
│   ├── services/           # Serviços (API, dados)
│   └── types/              # Definições de tipos
├── public/                 # Arquivos estáticos
├── package.json           # Dependências e scripts
└── README.md              # Este arquivo
```

## 🔐 Login

- **Admin:** admin / admin123
- **Cliente:** Use a chave de acesso configurada na planilha

## 📊 Funcionalidades

- ✅ Gerenciamento de clientes
- ✅ Importação de leads do Google Sheets
- ✅ Cálculo de taxa de conversão
- ✅ Filtros e busca
- ✅ Sincronização automática
- ✅ Interface responsiva

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs no console do navegador (F12)
2. Certifique-se de estar na pasta correta
3. Execute `npm install` se necessário
4. Verifique se a planilha de configuração está acessível

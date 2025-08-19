import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Upload, CheckCircle, AlertCircle, FileText, Settings, Database } from 'lucide-react';
import { Lead } from '@/types/lead';
import { clientDataService } from '@/services/clientDataService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authService } from '@/services/authService';
import { supabaseService } from '@/services/supabaseService';
import { MigrationTool } from './MigrationTool';

interface GoogleSheetsImportProps {
  onImportSuccess: (leads: Lead[], sheetId?: string) => void;
  onClose: () => void;
  onDataImported?: (newLeads: Lead[]) => void;
}

export const GoogleSheetsImport: React.FC<GoogleSheetsImportProps> = ({ 
  onImportSuccess, 
  onClose,
  onDataImported 
}) => {
  const [activeTab, setActiveTab] = useState('import-leads');
  const [sheetUrl, setSheetUrl] = useState('');
  const [configSheetUrl, setConfigSheetUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(false);
  const [error, setError] = useState('');
  const [configError, setConfigError] = useState('');
  const [success, setSuccess] = useState(false);
  const [configSuccess, setConfigSuccess] = useState(false);
  const [sheetTitle, setSheetTitle] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<Lead[]>([]);
  const [autoUpdate, setAutoUpdate] = useState(true);
  
  const isAdmin = authService.isAdmin();

  const extractSheetId = (url: string): string | null => {
    console.log('Extraindo ID da URL:', url);
    
    let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      console.log('ID extraído:', match[1]);
      return match[1];
    }
    
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (match) {
      console.log('ID extraído (padrão 2):', match[1]);
      return match[1];
    }
    
    if (/^[a-zA-Z0-9-_]+$/.test(url.trim())) {
      console.log('URL já é um ID:', url.trim());
      return url.trim();
    }
    
    console.log('Não foi possível extrair ID da URL');
    return null;
  };

  const extractSheetTitle = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return `Planilha Google Sheets`;
    } catch {
      return 'Planilha Google Sheets';
    }
  };

  const parseCSVData = async (csvText: string): Promise<Lead[]> => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const leads: Lead[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      const lead: Lead = {
        id: `sheet-${Date.now()}-${i}`,
        data: values[headers.indexOf('Data')] || values[0] || new Date().toLocaleDateString('pt-BR'),
        nome: values[headers.indexOf('Nome')] || values[headers.indexOf('nome')] || `Lead ${i}`,
        telefone: values[headers.indexOf('Telefone')] || values[headers.indexOf('telefone')] || '',
        origem: values[headers.indexOf('Origem')] || values[headers.indexOf('origem')] || 'Google Sheets',
        etapaEtiquetas: values[headers.indexOf('Etapa Etiquetas')] || values[headers.indexOf('etapaEtiquetas')] || '',
        etapaAltas: values[headers.indexOf('Etapa Altas')] || values[headers.indexOf('etapaAltas')] || '',
        clienteLocal: values[headers.indexOf('Cliente Local')] || values[headers.indexOf('clienteLocal')] || '',
        campanha: values[headers.indexOf('Campanha')] || values[headers.indexOf('campanha')] || '',
        conjunto: values[headers.indexOf('Conjunto')] || values[headers.indexOf('conjunto')] || '',
        anuncio: values[headers.indexOf('Anuncio')] || values[headers.indexOf('anuncio')] || '',
        media: values[headers.indexOf('Media')] || values[headers.indexOf('media')] || '',
        ref: values[headers.indexOf('Ref')] || values[headers.indexOf('ref')] || '',
        linkAnuncio: values[headers.indexOf('Link Anuncio')] || values[headers.indexOf('linkAnuncio')] || '',
        dispositivo: values[headers.indexOf('Dispositivo')] || values[headers.indexOf('dispositivo')] || 'desktop',
        observacoes: values[headers.indexOf('Observacoes')] || values[headers.indexOf('observacoes')] || values[headers.indexOf('Observações')] || '',
        status: 'novo' as const,
        interactions: []
      };

      leads.push(lead);
    }

    return leads;
  };

  const parseCSVLine = (line: string): string[] => {
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
  };

  const handlePreview = async () => {
    if (!sheetUrl.trim()) {
      setError('Por favor, insira a URL da planilha ou faça upload do arquivo CSV');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let csvText: string;
      let title: string;

      // Verificar se é uma URL do Google Sheets ou um arquivo CSV
      if (sheetUrl.includes('docs.google.com') || sheetUrl.includes('spreadsheets')) {
        const sheetId = extractSheetId(sheetUrl);
        if (!sheetId) {
          throw new Error('URL da planilha inválida. Certifique-se de usar uma URL do Google Sheets válida.');
        }

        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        title = extractSheetTitle(sheetUrl);
        
        console.log('Tentando importar de:', csvUrl);

        const response = await fetch(csvUrl, {
          mode: 'cors'
        });

        if (!response.ok) {
          throw new Error('Erro ao acessar a planilha. Verifique se ela está pública e acessível.');
        }

        csvText = await response.text();
      } else {
        // Tratar como conteúdo CSV direto
        csvText = sheetUrl;
        title = 'Arquivo CSV';
      }

      console.log('Dados CSV recebidos:', csvText.substring(0, 200) + '...');

      const leads = await parseCSVData(csvText);
      
      if (leads.length === 0) {
        throw new Error('Nenhum lead foi encontrado no CSV. Verifique o formato dos dados.');
      }

      setSheetTitle(title);
      setPreviewLeads(leads);
      setShowConfirmation(true);

    } catch (err: any) {
      console.error('Erro na importação:', err);
      setError(err.message || 'Erro ao importar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    try {
      setIsLoading(true);
      
      // Importar leads para o Supabase
      const importedLeads = await supabaseService.importLeadsFromCSV(
        sheetUrl.includes('docs.google.com') || sheetUrl.includes('spreadsheets') 
          ? await fetch(`https://docs.google.com/spreadsheets/d/${extractSheetId(sheetUrl)}/export?format=csv&gid=0`).then(r => r.text())
          : sheetUrl
      );
      
      console.log('Leads importados para o Supabase:', importedLeads);
      console.log('Atualização automática habilitada:', autoUpdate);
      
      onImportSuccess(importedLeads);
      
      if (onDataImported) {
        onDataImported(importedLeads);
      }
      
      setSuccess(true);
      
      setTimeout(() => {
        setShowConfirmation(false);
        setSuccess(false);
      }, 2000);
    } catch (error: any) {
      console.error('Erro ao importar para o Supabase:', error);
      setError('Erro ao importar leads para o banco de dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelImport = () => {
    setShowConfirmation(false);
    setPreviewLeads([]);
  };

  const handleConfigureClientConfig = async () => {
    if (!configSheetUrl.trim()) {
      setConfigError('Por favor, insira a URL da planilha de configuração.');
      return;
    }
    
    setIsConfigLoading(true);
    setConfigError('');
    setConfigSuccess(false);
    
    try {
      console.log('Iniciando configuração com a planilha:', configSheetUrl);
      
      const result = await clientDataService.initializeWithConfigSheet(configSheetUrl);

      if (result.success) {
        setConfigSuccess(true);
        console.log('Configuração bem-sucedida:', result.message);
        
        setTimeout(() => {
          setConfigSuccess(false);
          onClose();
        }, 3000);
        
      } else {
        setConfigError(result.message);
        console.error('Falha na configuração:', result.message);
      }
      
    } catch (err: any) {
      console.error('Erro ao configurar planilha:', err);
      setConfigError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsConfigLoading(false);
    }
  };

  return (
    <div className="p-2 sm:p-4 md:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
          <TabsTrigger value="import-leads">
            <Upload className="mr-2 h-4 w-4" />
            Importar Leads
          </TabsTrigger>
          <TabsTrigger value="migration-tool">
            <Database className="mr-2 h-4 w-4" />
            Migração
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="configure-clients">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Clientes
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="import-leads">
          <Card>
            <CardHeader>
              <CardTitle>Importar Leads do Google Sheets</CardTitle>
            </CardHeader>
            <CardContent>
              {!showConfirmation ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sheet-url">URL da Planilha ou Conteúdo CSV</Label>
                    <Input
                      id="sheet-url"
                      placeholder="https://docs.google.com/spreadsheets/d/... ou cole o conteúdo CSV aqui"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                    />
                  </div>
                  
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button onClick={handlePreview} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Visualizar e Importar
                  </Button>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    Você pode inserir uma URL do Google Sheets ou colar diretamente o conteúdo CSV. Para planilhas, certifique-se de que esteja com permissão "Qualquer pessoa com o link" pode visualizar.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Confirme a Importação</h3>
                  <p>
                    <FileText className="inline-block mr-2" />
                    <strong>{sheetTitle}</strong>
                  </p>
                  <p>
                    <Database className="inline-block mr-2" />
                    <strong>{previewLeads.length}</strong> leads encontrados.
                  </p>

                  <div className="max-h-60 overflow-y-auto rounded-md border p-4 space-y-2">
                    {previewLeads.slice(0, 10).map((lead, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded-md">
                        <p><strong>Nome:</strong> {lead.nome}</p>
                        <p><strong>Origem:</strong> {lead.origem}</p>
                      </div>
                    ))}
                    {previewLeads.length > 10 && (
                      <p className="text-center text-xs text-muted-foreground">... e mais {previewLeads.length - 10} leads.</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="auto-update" checked={autoUpdate} onCheckedChange={(checked) => setAutoUpdate(Boolean(checked))} />
                    <Label htmlFor="auto-update" className="text-sm">
                      Manter esta planilha sincronizada automaticamente.
                    </Label>
                  </div>
                  
                  {success && (
                    <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Leads importados com sucesso!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleConfirmImport} className="flex-1">
                      Confirmar
                    </Button>
                    <Button onClick={handleCancelImport} variant="outline" className="flex-1">
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="migration-tool">
          <MigrationTool onClose={onClose} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="configure-clients">
            <Card>
              <CardHeader>
                <CardTitle>Configurar Planilha de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="config-sheet-url">URL da Planilha de Configuração</Label>
                    <Input
                      id="config-sheet-url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={configSheetUrl}
                      onChange={(e) => setConfigSheetUrl(e.target.value)}
                    />
                  </div>

                  {configError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{configError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {configSuccess && (
                    <Alert variant="default" className="bg-green-100 dark:bg-green-900">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-200">
                        Configuração salva e clientes sincronizados com sucesso!
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button 
                      onClick={handleConfigureClientConfig} 
                      disabled={isConfigLoading || !configSheetUrl.trim()}
                      className="flex-1"
                    >
                      {isConfigLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Configurando...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Salvar Configuração
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={onClose} disabled={isConfigLoading}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

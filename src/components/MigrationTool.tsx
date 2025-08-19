import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, CheckCircle, AlertCircle, Database, RefreshCw, FileText, Users, Plus, Trash2 } from 'lucide-react';
import { MigrationHelper, ClientMigrationConfig } from '@/utils/migrationHelper';

interface MigrationToolProps {
  onClose: () => void;
}

export const MigrationTool: React.FC<MigrationToolProps> = ({ onClose }) => {
  const [clients, setClients] = useState<ClientMigrationConfig[]>([
    { clientId: '', clientName: '', leadsSheetId: '', historicoSheetId: '' }
  ]);
  const [isMigrating, setIsMigrating] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationResult, setMigrationResult] = useState<{
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
  } | null>(null);
  const [duplicatesResult, setDuplicatesResult] = useState<{
    clientId: string;
    duplicates: any[];
    totalInSheet: number;
    totalInSupabase: number;
  } | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('single');

  const extractSheetId = (url: string): string | null => {
    let match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    match = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    
    if (/^[a-zA-Z0-9-_]+$/.test(url.trim())) return url.trim();
    
    return null;
  };

  const addClient = () => {
    setClients([...clients, { clientId: '', clientName: '', leadsSheetId: '', historicoSheetId: '' }]);
  };

  const removeClient = (index: number) => {
    if (clients.length > 1) {
      setClients(clients.filter((_, i) => i !== index));
    }
  };

  const updateClient = (index: number, field: keyof ClientMigrationConfig, value: string) => {
    const newClients = [...clients];
    newClients[index] = { ...newClients[index], [field]: value };
    setClients(newClients);
  };

  const validateClients = (): string | null => {
    for (const client of clients) {
      if (!client.clientId.trim()) return 'ID do cliente é obrigatório';
      if (!client.clientName.trim()) return 'Nome do cliente é obrigatório';
      if (!client.leadsSheetId.trim()) return 'ID da planilha de leads é obrigatório';
    }
    return null;
  };

  const handleMigration = async () => {
    const validationError = validateClients();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsMigrating(true);
    setError('');
    setMigrationResult(null);
    setMigrationProgress(0);

    try {
      // Simular progresso
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      let result;
      if (activeTab === 'single') {
        // Migração de cliente único
        const client = clients[0];
        const singleResult = await MigrationHelper.migrateClientFromGoogleSheets(client);
        result = {
          totalClients: 1,
          successfulClients: singleResult.success ? 1 : 0,
          failedClients: singleResult.success ? 0 : 1,
          results: [{
            clientId: client.clientId,
            clientName: client.clientName,
            ...singleResult
          }]
        };
      } else {
        // Migração de múltiplos clientes
        result = await MigrationHelper.migrateMultipleClients(clients);
      }
      
      clearInterval(progressInterval);
      setMigrationProgress(100);
      setMigrationResult(result);

      if (result.successfulClients > 0) {
        // Limpeza após migração bem-sucedida
        await MigrationHelper.cleanupAfterMigration();
      }

    } catch (err: any) {
      setError(err.message || 'Erro durante a migração');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleCheckDuplicates = async (clientIndex: number) => {
    const client = clients[clientIndex];
    if (!client.leadsSheetId.trim()) {
      setError('Por favor, insira o ID da planilha de leads');
      return;
    }

    setIsCheckingDuplicates(true);
    setError('');

    try {
      const result = await MigrationHelper.checkDuplicatesForClient(client.clientId, client.leadsSheetId);
      setDuplicatesResult({
        clientId: client.clientId,
        ...result
      });
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar duplicatas');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const handleClose = () => {
    if (isMigrating) {
      if (confirm('A migração está em andamento. Tem certeza que deseja cancelar?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const downloadReport = () => {
    if (!migrationResult) return;
    
    const report = MigrationHelper.generateMigrationReport(migrationResult.results);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-migracao-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migração Multi-Cliente para Supabase
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tabs para migração única ou múltipla */}
          <div className="flex space-x-2">
            <Button
              variant={activeTab === 'single' ? 'default' : 'outline'}
              onClick={() => setActiveTab('single')}
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Cliente Único
            </Button>
            <Button
              variant={activeTab === 'multiple' ? 'default' : 'outline'}
              onClick={() => setActiveTab('multiple')}
              size="sm"
            >
              <Users className="w-4 h-4 mr-2" />
              Múltiplos Clientes
            </Button>
          </div>

          {/* Configuração dos clientes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Configuração dos Clientes</Label>
              {activeTab === 'multiple' && (
                <Button onClick={addClient} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Cliente
                </Button>
              )}
            </div>

            {clients.map((client, index) => (
              <Card key={index} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`client-id-${index}`}>ID do Cliente *</Label>
                    <Input
                      id={`client-id-${index}`}
                      placeholder="Ex: brb, cliente_a, etc"
                      value={client.clientId}
                      onChange={(e) => updateClient(index, 'clientId', e.target.value)}
                      disabled={isMigrating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`client-name-${index}`}>Nome do Cliente *</Label>
                    <Input
                      id={`client-name-${index}`}
                      placeholder="Ex: BRB Agência Digital"
                      value={client.clientName}
                      onChange={(e) => updateClient(index, 'clientName', e.target.value)}
                      disabled={isMigrating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`leads-sheet-${index}`}>ID Planilha Leads *</Label>
                    <Input
                      id={`leads-sheet-${index}`}
                      placeholder="ID da planilha de acompanhamento"
                      value={client.leadsSheetId}
                      onChange={(e) => updateClient(index, 'leadsSheetId', e.target.value)}
                      disabled={isMigrating}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`historico-sheet-${index}`}>ID Planilha Histórico</Label>
                    <Input
                      id={`historico-sheet-${index}`}
                      placeholder="ID da planilha de histórico (opcional)"
                      value={client.historicoSheetId}
                      onChange={(e) => updateClient(index, 'historicoSheetId', e.target.value)}
                      disabled={isMigrating}
                    />
                  </div>
                </div>
                
                {activeTab === 'multiple' && clients.length > 1 && (
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={() => removeClient(index)}
                      variant="outline"
                      size="sm"
                      disabled={isMigrating}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Verificar duplicatas */}
          <div className="flex gap-2">
            <Button
              onClick={() => handleCheckDuplicates(0)}
              disabled={isCheckingDuplicates || !clients[0].leadsSheetId.trim()}
              variant="outline"
              className="flex-1"
            >
              {isCheckingDuplicates ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Duplicatas
                </>
              )}
            </Button>
          </div>

          {/* Resultado da verificação de duplicatas */}
          {duplicatesResult && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Cliente:</strong> {duplicatesResult.clientId}</p>
                  <p><strong>Planilha:</strong> {duplicatesResult.totalInSheet} leads</p>
                  <p><strong>Supabase:</strong> {duplicatesResult.totalInSupabase} leads</p>
                  <p><strong>Possíveis duplicatas:</strong> {duplicatesResult.duplicates.length} leads</p>
                  {duplicatesResult.duplicates.length > 0 && (
                    <p className="text-sm text-amber-600">
                      ⚠️ Encontramos possíveis duplicatas. Recomendamos revisar antes da migração.
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botão de migração */}
          <Button
            onClick={handleMigration}
            disabled={isMigrating || !validateClients()}
            className="w-full"
            size="lg"
          >
            {isMigrating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Migrando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {activeTab === 'single' ? 'Iniciar Migração' : `Migrar ${clients.length} Clientes`}
              </>
            )}
          </Button>

          {/* Barra de progresso */}
          {isMigrating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progresso da migração</span>
                <span>{migrationProgress}%</span>
              </div>
              <Progress value={migrationProgress} className="w-full" />
            </div>
          )}

          {/* Resultado da migração */}
          {migrationResult && (
            <Alert variant={migrationResult.failedClients === 0 ? "default" : "destructive"}>
              {migrationResult.failedClients === 0 ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">
                    Migração concluída! {migrationResult.successfulClients}/{migrationResult.totalClients} clientes migrados com sucesso.
                  </p>
                  <p>Total de leads migrados: {migrationResult.results.reduce((sum, r) => sum + r.migratedCount, 0)}</p>
                  
                  {migrationResult.failedClients > 0 && (
                    <div>
                      <p className="font-semibold">Clientes com falha:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {migrationResult.results.filter(r => !r.success).map((result, index) => (
                          <li key={index}>
                            {result.clientName}: {result.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button onClick={downloadReport} variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-2" />
                      Baixar Relatório
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Erros */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Botão de fechar */}
          <div className="flex justify-end">
            <Button onClick={handleClose} variant="outline">
              Fechar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

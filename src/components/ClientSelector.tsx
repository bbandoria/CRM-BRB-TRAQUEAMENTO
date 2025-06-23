import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Users, Building, LogOut, Shield, User, RefreshCw, Database } from 'lucide-react';
import { ClientConfig, clientDataService } from '@/services/clientDataService';
import { authService } from '@/services/authService';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ClientSelectorProps {
  currentClient: ClientConfig | null;
  onClientChange: (client: ClientConfig) => void;
  onLogout: () => void;
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({ 
  currentClient, 
  onClientChange, 
  onLogout 
}) => {
  const [clients, setClients] = useState<ClientConfig[]>([]);
  const [showNewClientDialog, setShowNewClientDialog] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientAccessKey, setNewClientAccessKey] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  
  const isAdmin = authService.isAdmin();

  // Carregar clientes iniciais
  useEffect(() => {
    setClients(clientDataService.getClients());
  }, []);

  // Filtrar clientes baseado no tipo de usuário
  const getAvailableClients = () => {
    if (isAdmin) {
      return clients; // Admin vê todos os clientes
    } else {
      // Cliente vê apenas clientes que correspondem à sua chave de acesso
      const clientAccessKey = authService.getClientAccessKey();
      return clients.filter(client => client.accessKey === clientAccessKey);
    }
  };

  const availableClients = getAvailableClients();
  
  // Sincronização automática na inicialização
  useEffect(() => {
    const performInitialSync = async () => {
      if (initialSyncDone) return;

      const configSheetId = clientDataService.getClientConfigSheetId();
      if (configSheetId) {
        try {
          setSyncing(true);
          setSyncMessage('Carregando dados dos clientes...');
          
          console.log('Iniciando sincronização automática...');
          const success = await clientDataService.syncClientsFromGoogleSheets();
          
          if (success) {
            setSyncMessage('Dados carregados com sucesso!');
            setClients(clientDataService.getClients());
            
            // Para clientes, tentar selecionar automaticamente o cliente correto
            if (!isAdmin) {
              const updatedClients = clientDataService.getClients();
              const clientAccessKey = authService.getClientAccessKey();
              const matchingClient = updatedClients.find(client => client.accessKey === clientAccessKey);
              
              if (matchingClient && !currentClient) {
                console.log('Selecionando cliente automaticamente:', matchingClient.nome);
                handleSelectClient(matchingClient);
              }
            }
            
            setTimeout(() => setSyncMessage(''), 3000);
          } else {
            setSyncMessage('');
          }
        } catch (error) {
          console.error('Erro na sincronização inicial:', error);
          setSyncMessage('');
        } finally {
          setSyncing(false);
          setInitialSyncDone(true);
        }
      } else {
        setInitialSyncDone(true);
      }
    };
    
    performInitialSync();
  }, [isAdmin, currentClient, initialSyncDone]);

  const handleCreateClient = () => {
    if (!newClientName.trim()) return;
    
    try {
      const newClient = clientDataService.createNewClient(
        newClientName.trim(), 
        newClientAccessKey.trim() || undefined
      );
      setClients(clientDataService.getClients());
      onClientChange(newClient);
      setNewClientName('');
      setNewClientAccessKey('');
      setShowNewClientDialog(false);
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
    }
  };

  const handleSelectClient = (client: ClientConfig) => {
    clientDataService.setCurrentClient(client.id);
    onClientChange(client);
  };
  
  const handleSyncClients = async () => {
    try {
      setSyncing(true);
      setSyncMessage('Sincronizando dados de clientes...');
      
      const configSheetId = clientDataService.getClientConfigSheetId();
      if (configSheetId) {
        // Tentar importar primeiro
        await clientDataService.syncClientsFromGoogleSheets();
        // Depois exportar as atualizações locais
        await clientDataService.syncClientsToGoogleSheets();
        
        setSyncMessage('Dados sincronizados com sucesso!');
        // Atualizar a lista de clientes
        setClients(clientDataService.getClients());
        
        // Limpar a mensagem após alguns segundos
        setTimeout(() => setSyncMessage(''), 3000);
      } else {
        setSyncMessage('Nenhuma planilha de configuração definida');
        setTimeout(() => setSyncMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncMessage('Erro ao sincronizar dados');
      setTimeout(() => setSyncMessage(''), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Building className="w-5 h-5" />
              Cliente Ativo
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isAdmin ? (
                  <>
                    <Shield className="w-3 h-3" />
                    Admin
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3" />
                    Cliente
                  </>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onLogout}
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sair
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentClient ? (
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">{currentClient.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  Última atualização: {currentClient.ultimaAtualizacao ? 
                    new Date(currentClient.ultimaAtualizacao).toLocaleString('pt-BR') : 
                    'Nunca'
                  }
                </p>
                {isAdmin && currentClient.accessKey && (
                  <p className="text-xs text-blue-600">
                    Chave de acesso: {currentClient.accessKey}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowNewClientDialog(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {isAdmin ? 'Trocar/Criar' : 'Trocar'}
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={handleSyncClients}
                    disabled={syncing}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {syncing ? 'Carregando clientes...' : 'Nenhum cliente selecionado'}
              </p>
              {!syncing && (
                <Button onClick={() => setShowNewClientDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {isAdmin ? 'Selecionar/Criar Cliente' : 'Selecionar Cliente'}
                </Button>
              )}
            </div>
          )}
          
          {syncMessage && (
            <Alert className={`mt-2 ${syncMessage.includes('sucesso') ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <Database className="h-4 w-4 mr-2" />
              <AlertDescription>{syncMessage}</AlertDescription>
            </Alert>
          )}
          
          {isAdmin && clientDataService.getClientConfigSheetId() && (
            <div className="mt-2 text-xs text-center text-muted-foreground">
              <p>Sincronização de clientes configurada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showNewClientDialog} onOpenChange={setShowNewClientDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Clientes</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Clientes disponíveis */}
            {availableClients.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Clientes Disponíveis</h4>
                <div className="space-y-2">
                  {availableClients.map((client) => (
                    <div 
                      key={client.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentClient?.id === client.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        handleSelectClient(client);
                        setShowNewClientDialog(false);
                      }}
                    >
                      <div className="font-medium">{client.nome}</div>
                      <div className="text-sm text-muted-foreground">
                        Última atualização: {client.ultimaAtualizacao ? 
                          new Date(client.ultimaAtualizacao).toLocaleString('pt-BR') : 
                          'Nunca'
                        }
                      </div>
                      {isAdmin && client.accessKey && (
                        <div className="text-xs text-blue-600">
                          Chave: {client.accessKey}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Criar novo cliente - apenas para admins */}
            {isAdmin && (
              <div>
                <h4 className="font-medium mb-3">Criar Novo Cliente</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="client-name">Nome do Cliente</Label>
                    <Input
                      id="client-name"
                      placeholder="Ex: Empresa ABC"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="access-key">Chave de Acesso (Senha do Cliente)</Label>
                    <Input
                      id="access-key"
                      placeholder="Ex: empresa123"
                      value={newClientAccessKey}
                      onChange={(e) => setNewClientAccessKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Esta será a senha que o cliente usará para acessar apenas seus dados
                    </p>
                  </div>
                  <Button 
                    onClick={handleCreateClient}
                    disabled={!newClientName.trim()}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Cliente
                  </Button>
                </div>
              </div>
            )}

            {/* Mensagem para clientes sem acesso */}
            {!isAdmin && availableClients.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum cliente disponível para sua chave de acesso.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Entre em contato com o administrador para verificar sua senha.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

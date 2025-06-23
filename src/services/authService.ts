
export type UserType = 'admin' | 'client';

export interface AuthState {
  isAuthenticated: boolean;
  userType: UserType | null;
  clientAccessKey?: string;
}

class AuthService {
  private readonly USER_TYPE_KEY = 'crm_user_type';
  private readonly CLIENT_ACCESS_KEY = 'crm_client_access_key';

  getAuthState(): AuthState {
    const userType = localStorage.getItem(this.USER_TYPE_KEY) as UserType | null;
    const clientAccessKey = localStorage.getItem(this.CLIENT_ACCESS_KEY);

    return {
      isAuthenticated: !!userType,
      userType,
      clientAccessKey: clientAccessKey || undefined
    };
  }

  isAdmin(): boolean {
    return this.getAuthState().userType === 'admin';
  }

  isClient(): boolean {
    return this.getAuthState().userType === 'client';
  }

  getClientAccessKey(): string | null {
    return localStorage.getItem(this.CLIENT_ACCESS_KEY);
  }

  async login(userType: UserType, clientAccessKey?: string): Promise<void> {
    localStorage.setItem(this.USER_TYPE_KEY, userType);
    if (clientAccessKey) {
      localStorage.setItem(this.CLIENT_ACCESS_KEY, clientAccessKey);
    }

    // Após o login, tentar sincronizar dados automaticamente
    await this.syncDataAfterLogin();
  }

  private async syncDataAfterLogin(): Promise<void> {
    try {
      const { clientDataService } = await import('./clientDataService');
      
      // Verificar se há uma planilha de configuração
      const configSheetId = clientDataService.getClientConfigSheetId();
      if (configSheetId) {
        console.log('Sincronizando dados após login...');
        await clientDataService.syncClientsFromGoogleSheets();
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados após login:', error);
    }
  }

  logout(): void {
    localStorage.removeItem(this.USER_TYPE_KEY);
    localStorage.removeItem(this.CLIENT_ACCESS_KEY);
    localStorage.removeItem('crm_current_client');
  }

  // Para clientes, verificar se eles têm acesso a um cliente específico
  canAccessClient(clientId: string): boolean {
    if (this.isAdmin()) {
      return true; // Admin pode acessar qualquer cliente
    }

    if (this.isClient()) {
      const accessKey = this.getClientAccessKey();
      // A senha do cliente deve corresponder ao ID do cliente ou a uma chave específica
      // Por simplicidade, vamos usar a senha como identificador
      return clientId === accessKey || `client_${accessKey}` === clientId;
    }

    return false;
  }
}

export const authService = new AuthService();

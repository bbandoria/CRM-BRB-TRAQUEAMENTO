
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authService } from '@/services/authService';

interface AdminLoginProps {
  onLoginSuccess: (isAdmin: boolean) => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Senha de administrador (em produção, isso deveria vir de uma fonte segura)
  const ADMIN_PASSWORD = 'admin123';

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      if (password === ADMIN_PASSWORD) {
        await authService.login('admin');
        onLoginSuccess(true);
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo, administrador!",
        });
      } else {
        // Se não é admin, é cliente (qualquer senha diferente da admin)
        await authService.login('client', password);
        onLoginSuccess(false);
        toast({
          title: "Acesso liberado",
          description: "Bem-vindo ao sistema!",
        });
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro ao sincronizar os dados. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl text-blue-700">CRM (BRB Agência Digital)</CardTitle>
          <p className="text-muted-foreground">Digite sua senha para acessar o sistema</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Senha de Acesso</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          
          <Button 
            onClick={handleLogin}
            disabled={!password.trim() || isLoading}
            className="w-full"
          >
            {isLoading ? 'Carregando dados...' : 'Acessar Sistema'}
          </Button>
          
          <div className="text-sm text-muted-foreground text-center space-y-1">
            <p><strong>Administradores:</strong> Use a senha de admin</p>
            <p><strong>Clientes:</strong> Use sua senha específica</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

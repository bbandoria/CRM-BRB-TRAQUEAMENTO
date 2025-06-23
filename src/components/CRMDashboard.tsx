import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { 
  Users, 
  UserPlus, 
  TrendingUp, 
  Target, 
  Search,
  Filter,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Bell,
  Upload,
  RefreshCw,
  Building,
  Megaphone,
  Layers,
  Eye,
  Link,
  ExternalLink
} from 'lucide-react';
import { Lead, DashboardStats, Interaction } from '@/types/lead';
import { LeadsList } from './LeadsList';
import { KanbanBoard } from './KanbanBoard';
import { LeadDetails } from './LeadDetails';
import { GoogleSheetsImport } from './GoogleSheetsImport';
import { DateRangeFilter } from './DateRangeFilter';
import { ClientSelector } from './ClientSelector';
import { AdminLogin } from './AdminLogin';
import { googleSheetsService } from '@/services/googleSheetsService';
import { ClientConfig, clientDataService } from '@/services/clientDataService';
import { authService } from '@/services/authService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const conversionTagsOverride = ['FECHADO', 'GANHO', 'CONCLUIDO']; // Edite aqui as etiquetas desejadas

export default function CRMDashboard() {
  const [authState, setAuthState] = useState(authService.getAuthState());
  const [currentClient, setCurrentClient] = useState<ClientConfig | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrigemFilter, setSelectedOrigemFilter] = useState<string>('');

  // Verificar autenticação na inicialização
  useEffect(() => {
    const auth = authService.getAuthState();
    setAuthState(auth);
    
    if (auth.isAuthenticated) {
      const client = clientDataService.getCurrentClient();
      if (client) {
        setCurrentClient(client);
      }
    }
  }, []);

  // Auto-refresh apenas se houver sheetId configurado
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh && currentClient?.sheetId) {
      interval = setInterval(() => {
        loadSheetsData();
      }, 30000); // 30 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, currentClient]);

  const loadSheetsData = async () => {
    if (!currentClient?.sheetId) return;
    
    setIsLoading(true);
    try {
      const sheetsLeads = await googleSheetsService.fetchLeadsFromSheet(currentClient.sheetId);
      setLeads(sheetsLeads);
      clientDataService.saveClientLeads(currentClient.id, sheetsLeads);
      console.log('Leads carregados:', sheetsLeads.map(l => ({ nome: l.nome, etapaEtiquetas: l.etapaEtiquetas })));
      console.log('Etiquetas de conversão do cliente:', currentClient?.etiquetasConversao);
    } catch (error) {
      console.error('Erro ao carregar dados da planilha:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = (isAdmin: boolean) => {
    const newAuthState = authService.getAuthState();
    setAuthState(newAuthState);
    
    // Se é cliente, tentar encontrar automaticamente o cliente correspondente
    if (!isAdmin) {
      const availableClients = clientDataService.getClients();
      if (availableClients.length === 1) {
        // Se há apenas um cliente disponível, seleciona automaticamente
        setCurrentClient(availableClients[0]);
        clientDataService.setCurrentClient(availableClients[0].id);
      }
    }
  };

  const handleLogout = () => {
    authService.logout();
    setAuthState({ isAuthenticated: false, userType: null });
    setCurrentClient(null);
    setLeads([]);
    setSelectedLead(null);
  };

  const handleClientChange = (client: ClientConfig) => {
    setCurrentClient(client);
    
    // Carregar leads do cliente selecionado
    const clientLeads = clientDataService.getClientLeads(client.id);
    setLeads(clientLeads);
    
    // Limpar lead selecionado
    setSelectedLead(null);
  };

  const handleImportSuccess = (importedLeads: Lead[], sheetId?: string) => {
    if (!currentClient) return;
    
    setLeads(importedLeads);
    clientDataService.saveClientLeads(currentClient.id, importedLeads);
    
    if (sheetId) {
      clientDataService.updateClientSheetId(currentClient.id, sheetId);
      setCurrentClient({ ...currentClient, sheetId });
    }
    
    setShowImportDialog(false);
  };

  const handleLinkClick = (link: string) => {
    if (link && link.trim()) {
      // Add protocol if missing
      const url = link.startsWith('http') ? link : `https://${link}`;
      window.open(url, '_blank');
    }
  };

  const filteredLeads = useMemo(() => {
    let filtered = leads;
    
    filtered = filtered.filter(lead => {
      const matchesSearch = lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.telefone.includes(searchTerm) ||
                           lead.origem.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        matchesStatus = lead.etapaEtiquetas?.trim() === statusFilter;
      }

      let matchesOrigem = true;
      if (selectedOrigemFilter) {
        matchesOrigem = lead.origem === selectedOrigemFilter;
      }
      
      let matchesDate = true;
      if (startDate || endDate) {
        const leadDate = lead.data.split(' ')[0];
        const [day, month, year] = leadDate.split('/');
        const leadDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        if (startDate) {
          const startDateObj = new Date(startDate + 'T00:00:00');
          matchesDate = matchesDate && leadDateObj >= startDateObj;
        }
        
        if (endDate) {
          const endDateObj = new Date(endDate + 'T23:59:59');
          matchesDate = matchesDate && leadDateObj <= endDateObj;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDate && matchesOrigem;
    });

    return filtered.sort((a, b) => {
      const dateA = a.data.split(' ')[0].split('/').reverse().join('-');
      const dateB = b.data.split(' ')[0].split('/').reverse().join('-');
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [leads, searchTerm, statusFilter, startDate, endDate, selectedOrigemFilter]);

  const stats = useMemo((): DashboardStats => {
    const totalLeads = filteredLeads.length;
    const conversionTags = (currentClient?.etiquetasConversao || conversionTagsOverride).map(tag => tag.toLowerCase());

    const novosLeads = filteredLeads.filter(lead => !lead.etapaEtiquetas || lead.etapaEtiquetas.trim() === '').length;

    const leadsQualificados = filteredLeads.filter(lead => {
      const etiqueta = lead.etapaEtiquetas?.trim().toLowerCase() || '';
      return etiqueta.includes('qualificado') || etiqueta.includes('orçamento') || etiqueta.includes('orçamentos');
    }).length;
    
    const negociosFechados = filteredLeads.filter(lead => 
      lead.etapaEtiquetas && conversionTags.includes(lead.etapaEtiquetas.trim().toLowerCase())
    ).length;
    const taxaConversao = totalLeads > 0 ? (negociosFechados / totalLeads) * 100 : 0;

    const leadsPorOrigem = filteredLeads.reduce((acc, lead) => {
      acc[lead.origem] = (acc[lead.origem] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalLeads,
      novosLeads,
      leadsQualificados,
      taxaConversao,
      leadsPorOrigem,
    };
  }, [filteredLeads, currentClient]);

  // Dados para o gráfico de origem dos leads
  const origemChartData = useMemo(() => {
    return Object.entries(stats.leadsPorOrigem).map(([origem, count]) => ({
      origem,
      count,
      percentage: stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0'
    }));
  }, [stats.leadsPorOrigem, stats.totalLeads]);

  // Dados para campanhas
  const campanhaStats = useMemo(() => {
    const campanhas = filteredLeads.reduce((acc, lead) => {
      if (lead.campanha && lead.campanha.trim()) {
        acc[lead.campanha] = (acc[lead.campanha] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(campanhas)
      .map(([campanha, count]) => ({
        campanha,
        count,
        percentage: stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 campanhas
  }, [filteredLeads, stats.totalLeads]);

  // Dados para conjuntos
  const conjuntoStats = useMemo(() => {
    const conjuntos = filteredLeads.reduce((acc, lead) => {
      if (lead.conjunto && lead.conjunto.trim()) {
        acc[lead.conjunto] = (acc[lead.conjunto] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(conjuntos)
      .map(([conjunto, count]) => ({
        conjunto,
        count,
        percentage: stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 conjuntos
  }, [filteredLeads, stats.totalLeads]);

  // Dados para anúncios
  const anuncioStats = useMemo(() => {
    const anuncios = filteredLeads.reduce((acc, lead) => {
      if (lead.anuncio && lead.anuncio.trim()) {
        acc[lead.anuncio] = (acc[lead.anuncio] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(anuncios)
      .map(([anuncio, count]) => ({
        anuncio,
        count,
        percentage: stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 anúncios
  }, [filteredLeads, stats.totalLeads]);

  // Dados para links de anúncios
  const linkAnuncioStats = useMemo(() => {
    const linksAnuncio = filteredLeads.reduce((acc, lead) => {
      if (lead.linkAnuncio && lead.linkAnuncio.trim()) {
        acc[lead.linkAnuncio] = (acc[lead.linkAnuncio] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(linksAnuncio)
      .map(([linkAnuncio, count]) => ({
        linkAnuncio,
        count,
        percentage: stats.totalLeads > 0 ? ((count / stats.totalLeads) * 100).toFixed(1) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 links de anúncios
  }, [filteredLeads, stats.totalLeads]);

  // Calcular taxa de conversão das últimas 4 semanas
  const weeklyConversionData = useMemo(() => {
    const weeks = [];
    const today = new Date();
    
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - (i * 7) - 6);
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() - (i * 7));
      
      const weekLeads = leads.filter(lead => {
        const leadDate = lead.data.split(' ')[0];
        const [day, month, year] = leadDate.split('/');
        const leadDateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return leadDateObj >= weekStart && leadDateObj <= weekEnd;
      });
      
      const totalWeekLeads = weekLeads.length;
      const conversionTags = (currentClient?.etiquetasConversao || conversionTagsOverride).map(tag => tag.toLowerCase());
      const fechadosWeek = weekLeads.filter(lead => {
        const etiqueta = lead.etapaEtiquetas?.toLowerCase() || '';
        return etiqueta.includes('fechado') || etiqueta.includes('negocio fechado');
      }).length;
      
      const taxa = totalWeekLeads > 0 ? (fechadosWeek / totalWeekLeads) * 100 : 0;
      
      weeks.push({
        semana: `Sem ${i + 1}`,
        taxa: parseFloat(taxa.toFixed(1)),
        total: totalWeekLeads,
        fechados: fechadosWeek
      });
    }
    
    return weeks;
  }, [leads, currentClient]);

  const availableEtiquetas = useMemo(() => {
    const etiquetasSet = new Set<string>();
    leads.forEach(lead => {
      if (lead.etapaEtiquetas && lead.etapaEtiquetas.trim()) {
        etiquetasSet.add(lead.etapaEtiquetas.trim());
      }
    });
    return Array.from(etiquetasSet).sort();
  }, [leads]);

  const updateLeadStatus = (leadId: string, newStatus: Lead['status']) => {
    setLeads(prevLeads =>
      prevLeads.map(lead => 
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      )
    );
    
    if (currentClient) {
      clientDataService.saveClientLeads(currentClient.id, leads);
    }
  };

  const addInteraction = (leadId: string, interaction: Omit<Interaction, 'id' | 'leadId'>) => {
    const newInteraction: Interaction = {
      ...interaction,
      id: Date.now().toString(),
      leadId
    };
    
    const updatedLeads = leads.map(lead => 
      lead.id === leadId 
        ? { ...lead, interactions: [...lead.interactions, newInteraction] }
        : lead
    );
    setLeads(updatedLeads);
    
    if (currentClient) {
      clientDataService.saveClientLeads(currentClient.id, updatedLeads);
    }
  };

  const handleDatePreset = (preset: string) => {
    const today = new Date();
    let start = new Date();
    
    switch (preset) {
      case '7days':
        start.setDate(today.getDate() - 7);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case '14days':
        start.setDate(today.getDate() - 14);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case '28days':
        start.setDate(today.getDate() - 28);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'thismonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case 'clear':
        setStartDate('');
        setEndDate('');
        break;
    }
  };

  const handleOrigemClick = (origem: string) => {
    if (selectedOrigemFilter === origem) {
      setSelectedOrigemFilter('');
    } else {
      setSelectedOrigemFilter(origem);
    }
  };

  // Se não está autenticado, mostrar tela de login
  if (!authState.isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Client Selector */}
        <ClientSelector 
          currentClient={currentClient}
          onClientChange={handleClientChange}
          onLogout={handleLogout}
        />

        {/* Mostrar conteúdo apenas se há um cliente selecionado */}
        {currentClient ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    CRM (BRB Agência Digital)
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Gerencie seus leads de forma eficiente e organizada
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {currentClient?.sheetId && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoRefresh"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="rounded"
                      />
                      <label htmlFor="autoRefresh" className="text-sm text-muted-foreground">
                        Atualização automática
                      </label>
                    </div>
                  )}
                  {currentClient?.sheetId && (
                    <Button 
                      variant="outline"
                      onClick={loadSheetsData}
                      disabled={isLoading}
                      className="border-green-200 hover:bg-green-50"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Atualizar Planilha
                    </Button>
                  )}
                  {/* Mostrar botão de importar apenas para administradores */}
                  {currentClient && authService.isAdmin() && (
                    <Button 
                      variant="outline"
                      onClick={() => setShowImportDialog(true)}
                      className="border-blue-200 hover:bg-blue-50"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Importar Google Sheets
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="leads">Lista de Leads</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard" className="space-y-6">
                {/* Filtros */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex flex-1 gap-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Buscar leads..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 border rounded-md bg-background"
                      >
                        <option value="all">Todas as etiquetas</option>
                        {availableEtiquetas.map(etiqueta => (
                          <option key={etiqueta} value={etiqueta}>
                            {etiqueta}
                          </option>
                        ))}
                      </select>
                      {selectedOrigemFilter && (
                        <Badge 
                          variant="secondary" 
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => setSelectedOrigemFilter('')}
                        >
                          Origem: {selectedOrigemFilter}
                          <span className="text-xs">✕</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                  <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onPresetSelect={handleDatePreset}
                  />
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-blue-100">
                        Total de Leads
                      </CardTitle>
                      <Users className="h-4 w-4 text-blue-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalLeads}</div>
                      <p className="text-xs text-blue-200">
                        Cliente: {currentClient.nome}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-green-100">
                        Novos Leads
                      </CardTitle>
                      <UserPlus className="h-4 w-4 text-green-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.novosLeads}</div>
                      <p className="text-xs text-green-200">
                        Leads sem contato
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-purple-100">
                        Qualificados
                      </CardTitle>
                      <Target className="h-4 w-4 text-purple-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.leadsQualificados}</div>
                      <p className="text-xs text-purple-200">
                        {stats.totalLeads > 0 ? ((stats.leadsQualificados / stats.totalLeads) * 100).toFixed(1) : 0}% do total
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-orange-100">
                        Taxa Conversão
                      </CardTitle>
                      <TrendingUp className="h-4 w-4 text-orange-200" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.taxaConversao.toFixed(1)}%</div>
                      <p className="text-xs text-orange-200">
                        Negócios Fechados
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráficos Principais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de Origem dos Leads */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Origem dos Leads</CardTitle>
                      <p className="text-sm text-muted-foreground">Clique nas fatias para filtrar</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={origemChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ origem, percentage }) => `${origem} (${percentage}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            onClick={(data) => handleOrigemClick(data.origem)}
                            style={{ cursor: 'pointer' }}
                          >
                            {origemChartData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={selectedOrigemFilter === entry.origem ? '#ff6b6b' : COLORS[index % COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Taxa de Conversão das Últimas 4 Semanas */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Taxa de Conversão - 4 Semanas</CardTitle>
                      <p className="text-sm text-muted-foreground">Baseado na etiqueta "fechado" e "negocio fechado"</p>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={weeklyConversionData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="semana" />
                          <YAxis />
                          <Tooltip 
                            formatter={(value, name) => [
                              `${value}%`, 
                              'Taxa de Conversão'
                            ]}
                            labelFormatter={(label) => `Semana: ${label}`}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="taxa" 
                            stroke="#8884d8" 
                            strokeWidth={2}
                            dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Informações de Campanhas, Anúncios e Links de Anúncios */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Top Campanhas */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Megaphone className="w-5 h-5 text-purple-600" />
                        Top Campanhas
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {campanhaStats.length} campanhas ativas
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {campanhaStats.map((item, index) => (
                          <div key={item.campanha} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm truncate max-w-32" title={item.campanha}>
                                  {item.campanha}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {item.percentage}% dos leads
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-purple-600 border-purple-200">
                              {item.count}
                            </Badge>
                          </div>
                        ))}
                        {campanhaStats.length === 0 && (
                          <p className="text-center text-gray-500 py-4 text-sm">
                            Nenhuma campanha encontrada
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Top Anúncios */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5 text-green-600" />
                        Top Anúncios
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {anuncioStats.length} anúncios ativos
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {anuncioStats.map((item, index) => (
                          <div key={item.anuncio} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm truncate max-w-32" title={item.anuncio}>
                                  {item.anuncio}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {item.percentage}% dos leads
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              {item.count}
                            </Badge>
                          </div>
                        ))}
                        {anuncioStats.length === 0 && (
                          <p className="text-center text-gray-500 py-4 text-sm">
                            Nenhum anúncio encontrado
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Links de Anúncios */}
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Link className="w-5 h-5 text-blue-600" />
                        Links de Anúncios
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {linkAnuncioStats.length} links ativos
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {linkAnuncioStats.map((item, index) => (
                          <div 
                            key={item.linkAnuncio} 
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border cursor-pointer hover:shadow-md transition-shadow group"
                            onClick={() => handleLinkClick(item.linkAnuncio)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-medium text-sm truncate max-w-32 group-hover:text-blue-600" title={item.linkAnuncio}>
                                  {item.linkAnuncio.length > 20 ? `${item.linkAnuncio.substring(0, 20)}...` : item.linkAnuncio}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {item.percentage}% dos leads
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-blue-600 border-blue-200">
                                {item.count}
                              </Badge>
                              <ExternalLink className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                        {linkAnuncioStats.length === 0 && (
                          <p className="text-center text-gray-500 py-4 text-sm">
                            Nenhum link de anúncio encontrado
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Leads */}
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-600" />
                      Leads Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredLeads.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg border">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {lead.nome.charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-semibold">{lead.nome}</h4>
                              <p className="text-sm text-muted-foreground">{lead.origem} • {lead.data}</p>
                              {lead.campanha && (
                                <p className="text-xs text-purple-600">📢 {lead.campanha}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {lead.etapaEtiquetas || 'Sem Etiqueta'}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedLead(lead)}
                            >
                              Ver detalhes
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredLeads.length === 0 && (
                        <p className="text-center text-gray-500 py-4">
                          Nenhum lead encontrado
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leads" className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex flex-1 gap-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Buscar por nome, telefone ou origem..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onPresetSelect={handleDatePreset}
                  />
                </div>
                
                <LeadsList 
                  leads={filteredLeads}
                  onSelectLead={setSelectedLead}
                  onUpdateStatus={updateLeadStatus}
                  availableEtiquetas={availableEtiquetas}
                />
              </TabsContent>

              <TabsContent value="kanban">
                <div className="flex flex-col gap-4 mb-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div className="flex flex-1 gap-4">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Buscar leads..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onPresetSelect={handleDatePreset}
                  />
                </div>
                
                <KanbanBoard 
                  leads={filteredLeads}
                  onUpdateStatus={updateLeadStatus}
                  onSelectLead={setSelectedLead}
                />
              </TabsContent>

              <TabsContent value="analytics">
                <div className="flex flex-col gap-4 mb-6">
                  <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onPresetSelect={handleDatePreset}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle>Leads por Origem</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(stats.leadsPorOrigem).map(([origem, count]) => (
                          <div key={origem} className="flex items-center justify-between">
                            <span className="text-sm font-medium">{origem}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${stats.totalLeads > 0 ? (count / stats.totalLeads) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="text-center py-12">
            <Building className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Selecione um Cliente
            </h2>
            <p className="text-muted-foreground">
              {authService.isAdmin() 
                ? 'Selecione ou crie um cliente para gerenciar seus leads'
                : 'Selecione seu cliente para acessar o sistema'
              }
            </p>
          </div>
        )}

        {/* Import Dialog */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent className="max-w-4xl">
            <GoogleSheetsImport 
              onImportSuccess={handleImportSuccess}
              onClose={() => setShowImportDialog(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Lead Details Modal */}
        {selectedLead && (
          <LeadDetails 
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdateStatus={updateLeadStatus}
            onAddInteraction={addInteraction}
            availableEtiquetas={availableEtiquetas}
          />
        )}
      </div>
    </div>
  );
}

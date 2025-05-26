import { useState, useEffect } from "react";
import { ptBR } from "date-fns/locale";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Calendar,
  AlertCircle,
  BarChart2,
  PieChart,
  LineChart,
} from "lucide-react";

interface FileData {
  id: string;
  name: string;
  type: "analise" | "relDesvio" | "vDistrib" | "vConsumo" | "perdasNegativas";
  date: Date;
  data: any[];
}

interface DashboardData {
  totalMunicipios: number;
  totalPerdaNegativa: number;
  totalVD: number;
  ipdMedio: string;
  diretoriasComProblema: string[];
  maioresDesvios: any[];
  evolucaoPerdas: any[];
}

export const Dashboard = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [activeTab, setActiveTab] = useState("resumo");
  const [diretoriaFilter, setDiretoriaFilter] = useState("");
  const [gerenciaFilter, setGerenciaFilter] = useState("");

  useEffect(() => {
    const storedFiles = localStorage.getItem("uploadedFiles");
    if (storedFiles) {
      const parsedFiles = JSON.parse(storedFiles).map((file: any) => ({
        ...file,
        date: new Date(file.date),
      }));
      setFiles(parsedFiles);
      processDashboardData(parsedFiles);
    } else {
      setLoading(false);
    }
  }, []);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleanedValue = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanedValue) || 0;
  };

  const processDashboardData = (filesData: FileData[]) => {
    setLoading(true);
    
    const perdasFiles = filesData.filter(file => file.type === "perdasNegativas");
    const desviosFiles = filesData.filter(file => file.type === "relDesvio");
    
    let totalPerdaNegativa = 0;
    let totalVD = 0;
    const municipiosUnicos = new Set<string>();
    const diretoriasComProblema = new Set<string>();
    const perdasPorData: {[key: string]: number} = {};
    
    perdasFiles.forEach(file => {
      file.data.forEach((item: any) => {
        municipiosUnicos.add(item.Municipios || "");
        
        const perda = parseNumber(item.Perda);
        const vd = parseNumber(item.VD);
        
        totalPerdaNegativa += perda;
        totalVD += vd;
        
        if (perda < 0 && item.Diretoria) {
          diretoriasComProblema.add(item.Diretoria);
        }
        
        const dateKey = format(file.date, 'yyyy-MM');
        perdasPorData[dateKey] = (perdasPorData[dateKey] || 0) + perda;
      });
    });
    
    const maioresDesvios: any[] = [];
    
    desviosFiles.forEach(file => {
      file.data.forEach((item: any) => {
        const ipdDesvio = parseNumber(item.IPDDesvio);
        
        if (ipdDesvio < 0) {
          maioresDesvios.push({
            Diretoria: item.Diretoria,
            Gerencia: item.Gerencia,
            Localidade: item.Localidade,
            IPDDesvio: item.IPDDesvio,
            Data: file.date
          });
        }
      });
    });
    
    maioresDesvios.sort((a, b) => parseNumber(a.IPDDesvio) - parseNumber(b.IPDDesvio));
    
    const evolucaoPerdas = Object.entries(perdasPorData)
      .map(([date, perda]) => ({
        date,
        perda
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    const ipdMedio = totalVD > 0 
      ? ((totalPerdaNegativa / totalVD) * 100).toFixed(2) + "%" 
      : "0%";
    
    setDashboardData({
      totalMunicipios: municipiosUnicos.size,
      totalPerdaNegativa,
      totalVD,
      ipdMedio,
      diretoriasComProblema: Array.from(diretoriasComProblema),
      maioresDesvios: maioresDesvios.slice(0, 10),
      evolucaoPerdas
    });
    
    setLoading(false);
  };

  const directoriasUnicas = [
    ...new Set(
      files
        .flatMap((file) => file.data)
        .map((item) => item.Diretoria)
        .filter(Boolean)
    ),
  ];

  const gerenciaUnicas = [
    ...new Set(
      files
        .flatMap((file) => file.data)
        .map((item) => item.Gerencia)
        .filter(Boolean)
    ),
  ];

  const resetFilters = () => {
    setDiretoriaFilter("");
    setGerenciaFilter("");
    setDateRange({ start: "", end: "" });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard">
            <img
              src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
              alt="Compesa Logo"
              className="h-12"
            />
          </a>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800">
              Dashboard de Perdas e Desvios
            </h2>
            <p className="text-sm text-muted-foreground">
              Dados consolidados das planilhas carregadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => window.location.href = '/planilha'}>
            Ir para Planilhas
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-white border-gray-300"
              >
                <Filter className="h-4 w-4" />
                {diretoriaFilter || "Filtrar por Diretoria"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {directoriasUnicas.map((diretoria) => (
                <DropdownMenuItem
                  key={diretoria}
                  onClick={() => setDiretoriaFilter(diretoria || "")}
                >
                  {diretoria}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 bg-white border-gray-300"
              >
                <Filter className="h-4 w-4" />
                {gerenciaFilter || "Filtrar por Gerência"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {gerenciaUnicas.map((gerencia) => (
                <DropdownMenuItem
                  key={gerencia}
                  onClick={() => setGerenciaFilter(gerencia || "")}
                >
                  {gerencia}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              className="border-0 w-32"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange({ ...dateRange, start: e.target.value })
              }
              placeholder="Início"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3">
            <Calendar className="h-4 w-4 text-gray-500" />
            <Input
              type="date"
              className="border-0 w-32"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange({ ...dateRange, end: e.target.value })
              }
              placeholder="Fim"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 bg-white border-gray-300"
            onClick={resetFilters}
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3 bg-gray-100">
          <TabsTrigger value="resumo" className="data-[state=active]:bg-white">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="desvios" className="data-[state=active]:bg-white">
            Maiores Desvios
          </TabsTrigger>
          <TabsTrigger value="evolucao" className="data-[state=active]:bg-white">
            Evolução
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumo">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Municípios Monitorados
                </CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.totalMunicipios || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Total de municípios com medição
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Volume Distribuído
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(dashboardData?.totalVD || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m³
                </div>
                <p className="text-xs text-muted-foreground">
                  Volume total distribuído
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Perdas Negativas
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${dashboardData?.totalPerdaNegativa && dashboardData.totalPerdaNegativa < 0 ? "text-red-600" : ""}`}>
                  {(dashboardData?.totalPerdaNegativa || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m³
                  {dashboardData?.totalPerdaNegativa && dashboardData.totalPerdaNegativa < 0 && (
                    <AlertCircle className="inline ml-1 h-4 w-4 text-red-600" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total de perdas negativas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  IPD Médio
                </CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.ipdMedio || "0%"}</div>
                <p className="text-xs text-muted-foreground">
                  Índice de Perdas de Distribuição
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 mt-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Diretorias com Problemas</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.diretoriasComProblema && dashboardData.diretoriasComProblema.length > 0 ? (
                  <ul className="space-y-2">
                    {dashboardData.diretoriasComProblema.map((diretoria, index) => (
                      <li key={index} className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        {diretoria}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nenhuma diretoria com perdas negativas</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evolução Recente</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.evolucaoPerdas && dashboardData.evolucaoPerdas.length > 0 ? (
                  <div className="h-[200px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Gráfico de evolução</p>
                      <p className="text-xs text-muted-foreground">
                        {dashboardData.evolucaoPerdas.length} períodos analisados
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Dados insuficientes para mostrar evolução</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="desvios">
          <Card>
            <CardHeader>
              <CardTitle>Maiores Desvios de IPD</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.maioresDesvios && dashboardData.maioresDesvios.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Diretoria</TableHead>
                      <TableHead>Gerência</TableHead>
                      <TableHead>Localidade</TableHead>
                      <TableHead>Desvio IPD</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.maioresDesvios.map((desvio, index) => (
                      <TableRow key={index}>
                        <TableCell>{desvio.Diretoria || "-"}</TableCell>
                        <TableCell>{desvio.Gerencia || "-"}</TableCell>
                        <TableCell>{desvio.Localidade || "-"}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {desvio.IPDDesvio}
                          <AlertCircle className="inline ml-1 h-4 w-4" />
                        </TableCell>
                        <TableCell>
                          {format(desvio.Data, "dd/MM/yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">Nenhum desvio significativo encontrado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evolucao">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Perdas</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.evolucaoPerdas && dashboardData.evolucaoPerdas.length > 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Gráfico de evolução detalhado</p>
                      <p className="text-xs text-muted-foreground">
                        Período de {dashboardData.evolucaoPerdas[0].date} a {dashboardData.evolucaoPerdas[dashboardData.evolucaoPerdas.length - 1].date}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Dados insuficientes para mostrar evolução</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Perdas</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardData?.diretoriasComProblema && dashboardData.diretoriasComProblema.length > 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Gráfico de distribuição</p>
                      <p className="text-xs text-muted-foreground">
                        {dashboardData.diretoriasComProblema.length} diretorias com problemas
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma perda negativa para distribuir</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {!dashboardData && (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">Nenhum dado disponível</p>
          <p className="text-sm text-gray-400">
            Carregue planilhas na aba "Planilhas" para visualizar o dashboard
          </p>
        </div>
      )}
    </div>
  );
};
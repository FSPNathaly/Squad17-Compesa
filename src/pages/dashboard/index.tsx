import { useState, useEffect } from "react";
import { format, subDays, subYears } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parse } from "papaparse";
import {
  LineChart,
  BarChart,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Pie,
  Line,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  RefreshCw,
  ArrowUp,
  Download,
  ChevronRight,
  Flag,
  AlertTriangle,
  CheckCircle,
  Upload,
  X,
} from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const Dashboard = () => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [tablePageSize, setTablePageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [filterText, setFilterText] = useState("");
  const [municipalData, setMunicipalData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [distributionData, setDistributionData] = useState<any[]>([]);

  useEffect(() => {
    if (municipalData.length === 0) {
      resetToMockData();
    }
  }, []);

  const resetToMockData = () => {
    const mockMunicipalData = [
      { name: "Recife", loss: 25, volume: 320000, status: "Crítico" },
      { name: "Jaboatão", loss: 18, volume: 280000, status: "Crítico" },
      { name: "Olinda", loss: 15, volume: 240000, status: "Alerta" },
      { name: "Paulista", loss: 12, volume: 180000, status: "Alerta" },
      { name: "Camaragibe", loss: 8, volume: 120000, status: "Estável" },
    ];

    const mockHeatmapData = [
      { region: "Metropolitana", month: "Jan", loss: 15 },
      { region: "Metropolitana", month: "Fev", loss: 18 },
      { region: "Agreste", month: "Jan", loss: 8 },
      { region: "Agreste", month: "Fev", loss: 10 },
    ];

    const mockTrendData = [
      { month: "Jan", actual: 1200000, target: 1000000 },
      { month: "Fev", actual: 1350000, target: 1050000 },
    ];

    const mockDistributionData = [
      { name: "0-10%", value: 35 },
      { name: "10-20%", value: 25 },
      { name: "20-30%", value: 20 },
    ];

    setMunicipalData(mockMunicipalData);
    setHeatmapData(mockHeatmapData);
    setTrendData(mockTrendData);
    setDistributionData(mockDistributionData);
  };

  const handleDateRangeSelect = (range: "30" | "60" | "90" | "custom") => {
    if (range === "custom") return;
    const days = parseInt(range);
    setDateRange({
      start: subDays(new Date(), days),
      end: new Date(),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
  };

  const processImport = () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        parse(csvData, {
          header: true,
          complete: (results) => {
            processData(results.data);
            setImportProgress(100);
            setIsImporting(false);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setIsImporting(false);
          }
        });
      } catch (error) {
        console.error("Error processing file:", error);
        setIsImporting(false);
      }
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setImportProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    reader.readAsText(importFile);
  };

  const processData = (rawData: any[]) => {
    const filteredData = rawData.filter(item => item.Municipios && item.IPD);
    
    const municipalData = filteredData.map(item => ({
      name: item.Municipios,
      loss: parseFloat(item.IPD.replace("%", "").replace(",", ".")),
      volume: item.VD ? parseInt(item.VD.replace(/\./g, "").replace(",", ".")) : 0,
      status: getStatus(parseFloat(item.IPD.replace("%", "").replace(",", ".")))
    }));

    const heatmapData = filteredData.reduce((acc, item) => {
      const region = getRegion(item.Municipios);
      if (region) {
        acc.push({
          region,
          month: "Jan",
          loss: parseFloat(item.IPD.replace("%", "").replace(",", "."))
        });
      }
      return acc;
    }, []);

    const trendData = [
      { month: "Jan", actual: municipalData.reduce((sum, m) => sum + m.loss, 0) / municipalData.length },
      { month: "Fev", actual: municipalData.reduce((sum, m) => sum + m.loss, 0) / municipalData.length * 1.1 }
    ];

    const distributionRanges = [
      { min: 0, max: 10, name: "0-10%" },
      { min: 10, max: 20, name: "10-20%" },
      { min: 20, max: 30, name: "20-30%" },
      { min: 30, max: 40, name: "30-40%" },
      { min: 40, max: 100, name: "40-50%" }
    ];

    const distributionData = distributionRanges.map(range => {
      const count = municipalData.filter(m => 
        m.loss >= range.min && m.loss < range.max
      ).length;
      return { name: range.name, value: count };
    });

    setMunicipalData(municipalData);
    setHeatmapData(heatmapData);
    setTrendData(trendData);
    setDistributionData(distributionData);
  };

  const getStatus = (loss: number) => {
    if (loss > 20) return "Crítico";
    if (loss > 10) return "Alerta";
    return "Estável";
  };

  const getRegion = (municipality: string) => {
    if (["Recife", "Jaboatão", "Olinda", "Paulista"].includes(municipality)) return "Metropolitana";
    if (["Caruaru", "Garanhuns", "Surubim"].includes(municipality)) return "Agreste";
    return null;
  };

  const cancelImport = () => {
    setImportFile(null);
    setIsImporting(false);
    setImportProgress(0);
  };

  const totalLoss = municipalData.reduce((sum, m) => sum + (m.volume * m.loss / 100), 0);
  const criticalMunicipalities = municipalData.filter(m => m.status === "Crítico").length;
  const regionalAverage = Math.round(municipalData.reduce((sum, m) => sum + m.loss, 0) / municipalData.length);
  const filteredMunicipalData = municipalData.filter(m =>
    m.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <div className="flex justify-between items-center mb-8 h-[60px]">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <img 
              src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" 
              alt="Compesa Logo" 
              className="h-10 mr-4"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Período: {format(dateRange.start, "dd/MM/yy")} - {format(dateRange.end, "dd/MM/yy")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleDateRangeSelect("30")}>
                Últimos 30 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDateRangeSelect("60")}>
                Últimos 60 dias
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDateRangeSelect("90")}>
                Últimos 90 dias
              </DropdownMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Personalizado
                  </DropdownMenuItem>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.start, to: dateRange.end }}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        setDateRange({ start: range.from, end: range.to });
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="relative">
            <Button variant="outline" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                Importar Dados
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isImporting}
                />
              </label>
            </Button>
            {isImporting && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-lg rounded-md p-4 z-10">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Importando dados...</span>
                  <span className="text-sm">{importProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-500"
                  onClick={cancelImport}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            className="gap-2"
            onClick={resetToMockData}
          >
            <RefreshCw className="h-4 w-4" />
            Usar Dados Mockados
          </Button>
        </div>
      </div>

      {importFile && !isImporting && (
        <div className="mb-4 p-4 bg-blue-50 rounded-md flex justify-between items-center">
          <div>
            <p className="font-medium">Arquivo pronto para importação</p>
            <p className="text-sm text-muted-foreground">
              {importFile.name} ({Math.round(importFile.size / 1024)} KB)
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={cancelImport}>
              Cancelar
            </Button>
            <Button size="sm" onClick={processImport}>
              Processar
            </Button>
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
        Exibindo dados para o período de {format(dateRange.start, "dd/MM/yyyy")} a {format(dateRange.end, "dd/MM/yyyy")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Perda Total</CardTitle>
            <div className="text-red-500 flex items-center">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+12%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLoss.toLocaleString("pt-BR")} m³
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Volume acumulado no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Municípios Críticos</CardTitle>
            <div className="text-sm text-muted-foreground">
              {criticalMunicipalities}/{municipalData.length}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalMunicipalities}</div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                style={{
                  width: `${(criticalMunicipalities / municipalData.length) * 100}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Média Regional</CardTitle>
            <div className="text-sm text-muted-foreground">Meta: 80%</div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="relative w-16 h-16">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={
                      regionalAverage >= 80
                        ? "#10B981"
                        : regionalAverage >= 60
                        ? "#F59E0B"
                        : "#EF4444"
                    }
                    strokeWidth="3"
                    strokeDasharray={`${regionalAverage}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                  {regionalAverage}%
                </div>
              </div>
              <div className="ml-4">
                <p className="text-xs text-muted-foreground">
                  {regionalAverage >= 80
                    ? "Acima da meta"
                    : regionalAverage >= 60
                    ? "Próximo da meta"
                    : "Abaixo da meta"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tendência Mensal</CardTitle>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="Perda Real"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Comparativo Municipal</CardTitle>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...municipalData].sort((a, b) => b.loss - a.loss).slice(0, 10)}
                layout="vertical"
                margin={{ left: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar
                  dataKey="loss"
                  fill="#3B82F6"
                  name="Perda (%)"
                  radius={[0, 4, 4, 0]}
                >
                  {municipalData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name === selectedMunicipality ? "#1D4ED8" : "#3B82F6"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Heatmap Regional</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={heatmapData}
                margin={{ top: 20, right: 30, left: 30, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis dataKey="region" />
                <Tooltip />
                <Legend />
                <Bar dataKey="loss" name="Perda (%)">
                  {heatmapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.loss < 10
                          ? "#10B981"
                          : entry.loss < 20
                          ? "#A3E635"
                          : entry.loss < 30
                          ? "#FACC15"
                          : entry.loss < 40
                          ? "#F97316"
                          : "#EF4444"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição Percentual</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {distributionData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por Município</CardTitle>
          <CardDescription>
            {municipalData.length} municípios monitorados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <Input
              placeholder="Filtrar municípios..."
              className="max-w-sm"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Itens por página:
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-8">
                    {tablePageSize} <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setTablePageSize(10)}>
                    10
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTablePageSize(25)}>
                    25
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTablePageSize(50)}>
                    50
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Município</TableHead>
                <TableHead>Perda (%)</TableHead>
                <TableHead>Volume (m³)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMunicipalData
                .slice(0, tablePageSize)
                .map((municipality) => (
                  <>
                    <TableRow
                      key={municipality.name}
                      onClick={() => setSelectedMunicipality(municipality.name)}
                      className={
                        selectedMunicipality === municipality.name
                          ? "bg-blue-50"
                          : ""
                      }
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
                          {municipality.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{municipality.loss}%</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${
                                municipality.loss < 10
                                  ? "bg-green-500"
                                  : municipality.loss < 20
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${municipality.loss}%` }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {municipality.volume.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        {municipality.status === "Crítico" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Crítico
                          </span>
                        ) : municipality.status === "Alerta" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Alerta
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Estável
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleRowExpand(municipality.name)}
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedRow === municipality.name ? "rotate-90" : ""
                            }`}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === municipality.name && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50 p-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Detalhes Técnicos
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Perda: {municipality.loss}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Volume: {municipality.volume.toLocaleString("pt-BR")} m³
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Histórico
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Última atualização: {format(new Date(), "dd/MM/yyyy")}
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Ações</h4>
                              <Button variant="outline" size="sm" className="mr-2">
                                Gerar Relatório
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
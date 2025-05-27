import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
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
  ComposedChart,
  Area,
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

interface MunicipalityData {
  name: string;
  distributed: number;
  consumed: number;
  loss: number;
  lossPercentage: number;
  status: "Crítico" | "Alerta" | "Estável";
  region: string;
  history: {
    month: string;
    distributed: number;
    consumed: number;
    loss: number;
  }[];
}

interface TrendData {
  month: string;
  distributed: number;
  consumed: number;
  loss: number;
}

interface DistributionData {
  name: string;
  value: number;
}

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
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [filterText, setFilterText] = useState("");
  const [municipalData, setMunicipalData] = useState<MunicipalityData[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);

  const handleDateRangeSelect = (range: "30" | "60" | "90" | "custom") => {
    if (range === "custom") return;
    const days = parseInt(range);
    setDateRange({
      start: subDays(new Date(), days),
      end: new Date(),
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles = Array.from(files).filter(file => 
      file.type === "text/csv" || file.name.endsWith(".csv")
    );
    
    setImportFiles(prev => [...prev, ...newFiles]);
  };

  const processImport = async () => {
    if (importFiles.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);

    let allData: MunicipalityData[] = [];
    let processedFiles = 0;

    for (const file of importFiles) {
      try {
        const data = await parseCSVFile(file);
        const processed = processData(data);
        allData = mergeData(allData, processed);
        processedFiles++;
        setImportProgress(Math.round((processedFiles / importFiles.length) * 100));
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    setMunicipalData(allData);
    updateVisualizations(allData);
    setIsImporting(false);
    setImportFiles([]);
  };

  const parseCSVFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = e.target?.result as string;
          parse(csvData, {
            header: true,
            complete: (results) => {
              resolve(results.data);
            },
            error: (error) => {
              reject(error);
            }
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  };

  const processData = (rawData: any[]): MunicipalityData[] => {
    const municipalityMap: Record<string, MunicipalityData> = {};

    rawData.forEach(item => {
      if (!item.Municipio) return;

      const municipality = item.Municipio.trim();
      const month = item.Mes || "Jan";
      const distributed = parseFloat(item["Volume Distribuído"]?.replace(",", ".") || 0);
      const consumed = parseFloat(item["Volume Consumido"]?.replace(",", ".") || 0);
      const loss = parseFloat(item["Volume Perdido"]?.replace(",", ".") || 0);
      const lossPercentage = parseFloat(item["Perda (%)"]?.replace("%", "").replace(",", ".") || 0);

      if (!municipalityMap[municipality]) {
        municipalityMap[municipality] = {
          name: municipality,
          distributed,
          consumed,
          loss,
          lossPercentage,
          status: getStatus(lossPercentage),
          region: getRegion(municipality),
          history: []
        };
      }

      municipalityMap[municipality].history.push({
        month,
        distributed,
        consumed,
        loss
      });

      municipalityMap[municipality].distributed += distributed;
      municipalityMap[municipality].consumed += consumed;
      municipalityMap[municipality].loss += loss;
      municipalityMap[municipality].lossPercentage = lossPercentage;
      municipalityMap[municipality].status = getStatus(lossPercentage);
    });

    return Object.values(municipalityMap);
  };

  const mergeData = (existingData: MunicipalityData[], newData: MunicipalityData[]): MunicipalityData[] => {
    const mergedData = [...existingData];
    
    newData.forEach(newItem => {
      const existingIndex = mergedData.findIndex(item => item.name === newItem.name);
      
      if (existingIndex >= 0) {
        mergedData[existingIndex] = {
          ...mergedData[existingIndex],
          distributed: mergedData[existingIndex].distributed + newItem.distributed,
          consumed: mergedData[existingIndex].consumed + newItem.consumed,
          loss: mergedData[existingIndex].loss + newItem.loss,
          lossPercentage: newItem.lossPercentage,
          status: getStatus(newItem.lossPercentage),
          history: [...mergedData[existingIndex].history, ...newItem.history]
        };
      } else {
        mergedData.push(newItem);
      }
    });
    
    return mergedData;
  };

  const updateVisualizations = (data: MunicipalityData[]) => {
    if (data.length === 0) return;

    const trendData = calculateTrendData(data);
    const distributionData = calculateDistributionData(data);

    setTrendData(trendData);
    setDistributionData(distributionData);
  };

  const calculateTrendData = (data: MunicipalityData[]): TrendData[] => {
    const trendMap: Record<string, TrendData> = {};

    data.forEach(municipality => {
      municipality.history.forEach(monthData => {
        if (!trendMap[monthData.month]) {
          trendMap[monthData.month] = {
            month: monthData.month,
            distributed: 0,
            consumed: 0,
            loss: 0
          };
        }

        trendMap[monthData.month].distributed += monthData.distributed;
        trendMap[monthData.month].consumed += monthData.consumed;
        trendMap[monthData.month].loss += monthData.loss;
      });
    });

    return Object.values(trendMap).sort((a, b) => {
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dec"];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  };

  const calculateDistributionData = (data: MunicipalityData[]): DistributionData[] => {
    const distributionRanges = [
      { min: 0, max: 10, name: "0-10%" },
      { min: 10, max: 20, name: "10-20%" },
      { min: 20, max: 30, name: "20-30%" },
      { min: 30, max: 40, name: "30-40%" },
      { min: 40, max: 100, name: "40-50%" }
    ];

    return distributionRanges.map(range => {
      const count = data.filter(m => 
        m.lossPercentage >= range.min && m.lossPercentage < range.max
      ).length;
      return { name: range.name, value: count };
    });
  };

  const getStatus = (loss: number): "Crítico" | "Alerta" | "Estável" => {
    if (loss > 20) return "Crítico";
    if (loss > 10) return "Alerta";
    return "Estável";
  };

  const getRegion = (municipality: string): string => {
    const metropolitan = ["Recife", "Jaboatão", "Olinda", "Paulista", "Camaragibe"];
    const agreste = ["Caruaru", "Garanhuns", "Surubim", "Belo Jardim", "Pesqueira"];
    
    if (metropolitan.includes(municipality)) return "Metropolitana";
    if (agreste.includes(municipality)) return "Agreste";
    return "Sertão";
  };

  const cancelImport = () => {
    setImportFiles([]);
    setIsImporting(false);
    setImportProgress(0);
  };

  const removeFile = (index: number) => {
    setImportFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRowExpand = (municipality: string) => {
    setExpandedRow(expandedRow === municipality ? null : municipality);
  };

  const exportToCSV = () => {
    const headers = ["Município", "Região", "Volume Distribuído (m³)", "Volume Consumido (m³)", "Volume Perdido (m³)", "Perda (%)", "Status"];
    const csvContent = [
      headers.join(","),
      ...municipalData.map(item => [
        `"${item.name}"`,
        item.region,
        item.distributed,
        item.consumed,
        item.loss,
        item.lossPercentage,
        item.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `dados_hidricos_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMunicipalityTrendData = (municipalityName: string): TrendData[] => {
    if (!municipalityName) return trendData;
    
    const municipality = municipalData.find(m => m.name === municipalityName);
    if (!municipality) return [];
    
    return municipality.history.map(month => ({
      month: month.month,
      distributed: month.distributed,
      consumed: month.consumed,
      loss: month.loss
    })).sort((a, b) => {
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dec"];
      return months.indexOf(a.month) - months.indexOf(b.month);
    });
  };

  const totalLoss = municipalData.reduce((sum, m) => sum + m.loss, 0);
  const totalDistributed = municipalData.reduce((sum, m) => sum + m.distributed, 0);
  const totalConsumed = municipalData.reduce((sum, m) => sum + m.consumed, 0);
  const criticalMunicipalities = municipalData.filter(m => m.status === "Crítico").length;
  const regionalAverageLoss = municipalData.length > 0 
    ? Math.round(municipalData.reduce((sum, m) => sum + m.lossPercentage, 0) / municipalData.length)
    : 0;
  
  const filteredMunicipalData = municipalData.filter(m =>
    m.name.toLowerCase().includes(filterText.toLowerCase()) ||
    m.region.toLowerCase().includes(filterText.toLowerCase())
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
            <h1 className="text-xl font-bold">Monitoramento de Perdas Hídricas</h1>
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
                  multiple
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
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4" />
            Exportar Dados
          </Button>
        </div>
      </div>

      {importFiles.length > 0 && !isImporting && (
        <div className="mb-4 p-4 bg-blue-50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Arquivos prontos para importação</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={cancelImport}>
                Cancelar
              </Button>
              <Button size="sm" onClick={processImport}>
                Processar {importFiles.length} arquivo{importFiles.length > 1 ? 's' : ''}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {importFiles.map((file, index) => (
              <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                <div>
                  <p className="text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(file.size / 1024)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
        Exibindo dados para o período de {format(dateRange.start, "dd/MM/yyyy")} a {format(dateRange.end, "dd/MM/yyyy")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Volume Total Distribuído</CardTitle>
            <div className="text-blue-500 flex items-center">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+5%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalDistributed / 1000).toLocaleString("pt-BR")} mil m³
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Volume acumulado no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Volume Total Consumido</CardTitle>
            <div className="text-green-500 flex items-center">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+3%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalConsumed / 1000).toLocaleString("pt-BR")} mil m³
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Volume acumulado no período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Volume Total Perdido</CardTitle>
            <div className="text-red-500 flex items-center">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+8%</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalLoss / 1000).toLocaleString("pt-BR")} mil m³
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {((totalLoss / totalDistributed) * 100).toFixed(1)}% do volume distribuído
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Balanço de Volumes por Município</CardTitle>
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...municipalData]
                  .sort((a, b) => b.distributed - a.distributed)
                  .slice(0, 10)
                  .map(m => ({
                    name: m.name,
                    Distribuído: m.distributed / 1000,
                    Consumido: m.consumed / 1000,
                    Perdido: m.loss / 1000
                  }))}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'mil m³', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} mil m³`, '']} />
                <Legend />
                <Bar dataKey="Distribuído" fill="#3B82F6" name="Distribuído" />
                <Bar dataKey="Consumido" fill="#10B981" name="Consumido" />
                <Bar dataKey="Perdido" fill="#EF4444" name="Perdido" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evolução do Volume Distribuído</CardTitle>
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getMunicipalityTrendData(selectedMunicipality)
                  .map(d => ({ ...d, distributed: d.distributed / 1000 }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'mil m³', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} mil m³`, '']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="distributed"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="Volume Distribuído"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evolução do Volume Consumido</CardTitle>
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getMunicipalityTrendData(selectedMunicipality)
                  .map(d => ({ ...d, consumed: d.consumed / 1000 }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'mil m³', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} mil m³`, '']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="consumed"
                  stroke="#10B981"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  name="Volume Consumido"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evolução do Volume Perdido</CardTitle>
            <Button variant="ghost" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={getMunicipalityTrendData(selectedMunicipality)
                  .map(d => ({ ...d, loss: d.loss / 1000 }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'mil m³', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => [`${value} mil m³`, '']} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="loss"
                  fill="#FECACA"
                  stroke="#EF4444"
                  name="Volume Perdido"
                />
                <Line
                  type="monotone"
                  dataKey="loss"
                  stroke="#EF4444"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
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
              placeholder="Filtrar municípios ou regiões..."
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
                <TableHead>Região</TableHead>
                <TableHead>Volume Distribuído (m³)</TableHead>
                <TableHead>Volume Consumido (m³)</TableHead>
                <TableHead>Volume Perdido (m³)</TableHead>
                <TableHead>Perda (%)</TableHead>
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
                      <TableCell>{municipality.region}</TableCell>
                      <TableCell>{municipality.distributed.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{municipality.consumed.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{municipality.loss.toLocaleString("pt-BR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <span className="mr-2">{municipality.lossPercentage.toFixed(1)}%</span>
                          <div className="w-20 h-2 bg-gray-200 rounded-full">
                            <div
                              className={`h-2 rounded-full ${
                                municipality.lossPercentage < 10
                                  ? "bg-green-500"
                                  : municipality.lossPercentage < 20
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(municipality.lossPercentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
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
                        <TableCell colSpan={8} className="bg-gray-50 p-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Detalhes Técnicos
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Perda: {municipality.lossPercentage.toFixed(1)}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Eficiência: {((municipality.consumed / municipality.distributed) * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Histórico Recente
                              </h4>
                              {municipality.history.slice(0, 3).map((month, i) => (
                                <p key={i} className="text-sm text-muted-foreground">
                                  {month.month}: {month.distributed.toLocaleString("pt-BR")} m³ distribuídos
                                </p>
                              ))}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-2">Ações</h4>
                              <div className="flex space-x-2">
                                <Button variant="outline" size="sm">
                                  Gerar Relatório
                                </Button>
                                <Button variant="outline" size="sm">
                                  Enviar Alerta
                                </Button>
                              </div>
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
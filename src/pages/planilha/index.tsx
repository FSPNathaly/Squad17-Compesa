import { ptBR } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Filter,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Upload,
  Calendar,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import * as Papa from "papaparse";
import { jsPDF } from "jspdf";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { format } from "date-fns";

interface CsvData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  Observacao_GPD: string;
  Volume_Disponibilizado: string;
  Rateio: string;
  Volume_Produzido: string;
  Volume_de_agua_de_Servico: string;
  Consumo_Proprio: string;
  Limpeza_de_Reservatorio: string;
  Descarga_de_Rede: string;
  Consumo_Hidrante: string;
  Carro_Pipa_Nao_Faturado: string;
  Vsocial: string;
  Ligacoes_Ativas: string;
  Volume_Consumido: string;
  Localizacao_e_Contato: string;
  Diretoria: string;
  Gerencia: string;
  Coordenacao: string;
  Contato: string;
  [key: string]: string;
}

interface ReportData {
  month: string;
  year: string;
  data: CsvData[];
}

export const Planilha = () => {
  const compesaColors = {
    primary: '#003F9C',
    secondary: '#5D8BF4',
    tertiary: '#85A6F2',
    background: '#F0F5FF',
    text: '#1A2C56'
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });
  const [dadosMunicipios, setDadosMunicipios] = useState<CsvData[]>([]);
  const [totalVD, setTotalVD] = useState("R$ 0,00");
  const [totalPerda, setTotalPerda] = useState("R$ 0,00");
  const [ipdMedio, setIpdMedio] = useState("0,00%");
  const [volumeProduzido, setVolumeProduzido] = useState("0,00 m³");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savedReports, setSavedReports] = useState<ReportData[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [editingReport, setEditingReport] = useState<string | null>(null);
  const [newMonth, setNewMonth] = useState("");
  const [newYear, setNewYear] = useState("");

  useEffect(() => {
    const loadedReports = localStorage.getItem('compesaReports');
    if (loadedReports) {
      setSavedReports(JSON.parse(loadedReports));
    }
  }, []);

  const parseBrazilianNumber = (value: string) => {
    if (!value || value.trim() === '' || value === ' - ') return 0;
    const cleanedValue = value.replace(/[^\d,-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    return parseFloat(cleanedValue) || 0;
  };

  const capitalizeFirstLetter = (str: string) => {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const transformedData = results.data.map((item: any) => {
            const transformedItem: CsvData = {
              Id: item.Id || '',
              Municipios: capitalizeFirstLetter(item.Municipios || ''),
              VD: item.VD || '',
              Perda: item.Perda || '',
              IPD: item.IPD || '',
              Observacao_GPD: item['Observacao GPD'] || '',
              Volume_Disponibilizado: item['Volume Disponibilizado'] || '',
              Rateio: item.Rateio || '',
              Volume_Produzido: item['Volume Produzido'] || '',
              Volume_de_agua_de_Servico: item['Volume de agua de Servico'] || '',
              Consumo_Proprio: item['Consumo Proprio'] || '',
              Limpeza_de_Reservatorio: item['Limpeza de Reservatorio'] || '',
              Descarga_de_Rede: item['Descarga de Rede'] || '',
              Consumo_Hidrante: item['Consumo Hidrante'] || '',
              Carro_Pipa_Nao_Faturado: item['Carro Pipa Nao Faturado'] || '',
              Vsocial: item.Vsocial || '',
              Ligacoes_Ativas: item['Ligacoes Ativas'] || '',
              Volume_Consumido: item['Volume Consumido'] || '',
              Localizacao_e_Contato: item['Localizacao e Contato'] || '',
              Diretoria: item.Diretoria || '',
              Gerencia: item.Gerencia || '',
              Coordenacao: item.Coordenacao || '',
              Contato: item.Contato || ''
            };

            Object.keys(transformedItem).forEach(key => {
              if (typeof transformedItem[key] === 'string' && key !== 'VD' && key !== 'Perda' && key !== 'IPD') {
                transformedItem[key] = capitalizeFirstLetter(transformedItem[key]);
              }
            });

            return transformedItem;
          }).filter(item => item.Id && item.Id.trim() !== '');

          setDadosMunicipios(transformedData);
          calcularTotais(transformedData);
          toast.success(`${transformedData.length} registros importados com sucesso.`);

          if (date) {
            const month = format(date, 'MM', { locale: ptBR });
            const year = format(date, 'yyyy', { locale: ptBR });
            const reportKey = `${month}-${year}`;
            
            const newReport: ReportData = {
              month,
              year,
              data: transformedData
            };

            const updatedReports = [...savedReports];
            const existingIndex = updatedReports.findIndex(r => 
              `${r.month}-${r.year}` === reportKey
            );

            if (existingIndex >= 0) {
              updatedReports[existingIndex] = newReport;
            } else {
              updatedReports.push(newReport);
            }

            setSavedReports(updatedReports);
            localStorage.setItem('compesaReports', JSON.stringify(updatedReports));
            setSelectedReport(reportKey);
          }
        }
        setUploading(false);
      },
      error: () => {
        toast.error("Falha ao processar o arquivo CSV.");
        setUploading(false);
      }
    });
  };

  const loadSavedReport = (reportKey: string) => {
    const report = savedReports.find(r => 
      `${r.month}-${r.year}` === reportKey
    );
    
    if (report) {
      setDadosMunicipios(report.data);
      calcularTotais(report.data);
      setSelectedReport(reportKey);
      toast.success(`Relatório de ${report.month}/${report.year} carregado com sucesso.`);
    }
  };

  const deleteReport = (reportKey: string) => {
    const updatedReports = savedReports.filter(r => 
      `${r.month}-${r.year}` !== reportKey
    );
    
    setSavedReports(updatedReports);
    localStorage.setItem('compesaReports', JSON.stringify(updatedReports));
    
    if (selectedReport === reportKey) {
      setDadosMunicipios([]);
      setTotalVD("R$ 0,00");
      setTotalPerda("R$ 0,00");
      setIpdMedio("0,00%");
      setVolumeProduzido("0,00 m³");
      setSelectedReport(null);
    }
    
    toast.success("Relatório excluído com sucesso.");
  };

  const startEditingReport = (reportKey: string) => {
    const report = savedReports.find(r => 
      `${r.month}-${r.year}` === reportKey
    );
    
    if (report) {
      setEditingReport(reportKey);
      setNewMonth(report.month);
      setNewYear(report.year);
    }
  };

  const saveEditedReport = () => {
    if (!editingReport || !newMonth || !newYear) return;
    
    const updatedReports = [...savedReports];
    const reportIndex = updatedReports.findIndex(r => 
      `${r.month}-${r.year}` === editingReport
    );
    
    if (reportIndex >= 0) {
      updatedReports[reportIndex].month = newMonth;
      updatedReports[reportIndex].year = newYear;
      
      setSavedReports(updatedReports);
      localStorage.setItem('compesaReports', JSON.stringify(updatedReports));
      
      if (selectedReport === editingReport) {
        setSelectedReport(`${newMonth}-${newYear}`);
      }
      
      setEditingReport(null);
      toast.success("Relatório atualizado com sucesso.");
    }
  };

  const handleCancelImport = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileName(null);
    setDadosMunicipios([]);
    setTotalVD("R$ 0,00");
    setTotalPerda("R$ 0,00");
    setIpdMedio("0,00%");
    setVolumeProduzido("0,00 m³");
    setSelectedReport(null);
  };

  const calcularTotais = (data: CsvData[]) => {
    let vdTotal = 0;
    let perdaTotal = 0;
    let ipdTotal = 0;
    let volumeTotal = 0;
    let count = 0;

    data.forEach(item => {
      const vd = parseBrazilianNumber(item.VD);
      const perda = parseBrazilianNumber(item.Perda);
      const ipd = parseBrazilianNumber(item.IPD.replace("%", ""));
      const volume = parseBrazilianNumber(item.Volume_Produzido);

      vdTotal += vd;
      perdaTotal += perda;
      ipdTotal += ipd;
      volumeTotal += volume;
      count++;
    });

    setTotalVD(vdTotal.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' }));
    setTotalPerda(perdaTotal.toLocaleString("pt-BR", { style: 'currency', currency: 'BRL' }));
    setIpdMedio((count > 0 ? ipdTotal / count : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%");
    setVolumeProduzido(volumeTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " m³");
  };

  const handleSort = (key: string) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...dadosMunicipios].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aValue = a[sortConfig.key] || "";
    const bValue = b[sortConfig.key] || "";

    if (aValue < bValue) return sortConfig.direction === "ascending" ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === "ascending" ? 1 : -1;
    return 0;
  });

  const filteredData = sortedData.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    const municipio = item.Municipios?.toLowerCase() || "";
    const diretoria = item.Diretoria?.toLowerCase() || "";
    const gerencia = item.Gerencia?.toLowerCase() || "";

    if (filter === "vdNegative") return item.VD?.startsWith("-") || false;
    if (filter === "perdaNegative") return item.Perda?.startsWith("-") || false;
    if (filter === "ipdHigh") {
      const ipd = parseBrazilianNumber(item.IPD?.replace("%", ""));
      return ipd > 100;
    }
    if (filter === "diretoria") return item.Diretoria;
    if (filter === "gerencia") return item.Gerencia;

    return (
      municipio.includes(searchLower) ||
      diretoria.includes(searchLower) ||
      gerencia.includes(searchLower)
    );
  });

  const generatePDFReport = () => {
    if (dadosMunicipios.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(compesaColors.primary);
    doc.text('Relatório COMPESA - VD e Perdas', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

    if (date) {
      doc.text(`Período: ${format(date, "MMM yyyy", { locale: ptBR })}`, 105, 35, { align: 'center' });
    }

    doc.setFontSize(14);
    doc.text('Resumo dos Dados', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total VD: ${totalVD}`, 14, 55);
    doc.text(`Total Perda: ${totalPerda}`, 14, 60);
    doc.text(`IPD Médio: ${ipdMedio}`, 14, 65);
    doc.text(`Volume Produzido: ${volumeProduzido}`, 14, 70);

    let yPosition = 85;
    doc.setFontSize(12);
    doc.text('Detalhes por Município', 14, yPosition);
    yPosition += 10;

    doc.setFontSize(8);
    const headers = [
      "Município", "VD", "Perda", "IPD", "Volume Prod.", "Diretoria", "Gerência", 
      "Coordenação", "Contato", "Ligações Ativas", "Volume Consumido", "Observação GPD"
    ];

    doc.setTextColor(compesaColors.primary);
    doc.text(headers[0], 14, yPosition);
    doc.text(headers[1], 40, yPosition);
    doc.text(headers[2], 60, yPosition);
    doc.text(headers[3], 80, yPosition);
    doc.text(headers[4], 100, yPosition);
    doc.text(headers[5], 130, yPosition);
    doc.text(headers[6], 160, yPosition);
    yPosition += 5;

    doc.setTextColor(compesaColors.text);
    dadosMunicipios.forEach((item) => {
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
        
        doc.setFontSize(8);
        doc.setTextColor(compesaColors.primary);
        doc.text(headers[7], 14, yPosition);
        doc.text(headers[8], 40, yPosition);
        doc.text(headers[9], 70, yPosition);
        doc.text(headers[10], 100, yPosition);
        doc.text(headers[11], 130, yPosition);
        yPosition += 5;
      }
      
      doc.text(item.Municipios || '', 14, yPosition);
      doc.text(item.VD || '', 40, yPosition);
      doc.text(item.Perda || '', 60, yPosition);
      doc.text(item.IPD || '', 80, yPosition);
      doc.text(item.Volume_Produzido || '', 100, yPosition);
      doc.text(item.Diretoria || '', 130, yPosition);
      doc.text(item.Gerencia || '', 160, yPosition);
      yPosition += 7;
      
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.text(item.Coordenacao || '', 14, yPosition);
      doc.text(item.Contato || '', 40, yPosition);
      doc.text(item.Ligacoes_Ativas || '', 70, yPosition);
      doc.text(item.Volume_Consumido || '', 100, yPosition);
      doc.text(item.Observacao_GPD || '', 130, yPosition);
      yPosition += 7;
    });

    const fileName = date 
      ? `relatorio_vd_perdas_${format(date, 'yyyy-MM', { locale: ptBR })}.pdf`
      : `relatorio_vd_perdas_${new Date().toISOString().slice(0,10)}.pdf`;
    
    doc.save(fileName);
    toast.success("PDF gerado com sucesso!");
  };

  const handleExport = () => {
    if (dadosMunicipios.length === 0) {
      toast.error("Nenhum dado disponível para exportar.");
      return;
    }

    const csvContent = [
      Object.keys(dadosMunicipios[0]).join(";"),
      ...dadosMunicipios.map(item => Object.values(item).join(";"))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const fileName = date 
      ? `dados_municipios_${format(date, 'yyyy-MM', { locale: ptBR })}.csv`
      : "dados_municipios.csv";
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Arquivo exportado com sucesso!");
  };

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter]);

  return (
    <div className={`min-h-screen bg-[${compesaColors.background}] p-6`}>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <a href="/dashboard">
            <img
              src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
              alt="Compesa Logo"
              className="h-12"
            />
          </a>
          <div className="space-y-1">
            <h2 className={`text-xl font-semibold text-[${compesaColors.text}]`}>
              Análise de VD e Perdas Negativas
            </h2>
            <p className="text-sm text-muted-foreground">
              Dados atualizados em {date ? format(date, "MMM yyyy", { locale: ptBR }) : "Selecione o período"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={`gap-2 border-[${compesaColors.primary}] text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10`}
              >
                <Calendar className="h-4 w-4" />
                {date ? format(date, "MMM yyyy", { locale: ptBR }) : "Selecione o período"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComp
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          {savedReports.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`gap-2 border-[${compesaColors.primary}] text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10`}
                >
                  <Calendar className="h-4 w-4" />
                  Relatórios Salvos
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Relatórios Mensais</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {savedReports.map((report) => {
                  const reportKey = `${report.month}-${report.year}`;
                  return (
                    <div key={reportKey} className="relative group">
                      <DropdownMenuItem
                        className={`cursor-pointer ${selectedReport === reportKey ? `bg-[${compesaColors.primary}]/10` : ''}`}
                        onClick={() => loadSavedReport(reportKey)}
                      >
                        {`${report.month}/${report.year} (${report.data.length} registros)`}
                      </DropdownMenuItem>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-6 w-6 text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10`}
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingReport(reportKey);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteReport(reportKey);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <input
            type="file"
            id="csvUpload"
            ref={fileInputRef}
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button 
            variant="outline" 
            className={`gap-2 border-[${compesaColors.primary}] text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10`}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>

          <DropdownMenu onOpenChange={setExportDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className={`gap-2 border-[${compesaColors.primary}] text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10`} 
                disabled={dadosMunicipios.length === 0}
              >
                <Download className="h-4 w-4" />
                Exportar
                <ChevronDown className={`h-4 w-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
              <DropdownMenuItem 
                onClick={handleExport} 
                className={`cursor-pointer focus:bg-[${compesaColors.primary}]/10`}
              >
                Exportar como CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={generatePDFReport} 
                className={`cursor-pointer focus:bg-[${compesaColors.primary}]/10`}
              >
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="w-10 h-10 border-2 border-[${compesaColors.tertiary}]">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="User Avatar"
                  />
                  <AvatarFallback className={`bg-[${compesaColors.tertiary}] text-white font-medium`}>US</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Usuário</span>
                  <span className="text-xs text-gray-500">usuario@compesa.com.br</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 focus:bg-red-50">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {editingReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">Editar Relatório</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Mês</label>
                <Input
                  value={newMonth}
                  onChange={(e) => setNewMonth(e.target.value)}
                  placeholder="MM"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ano</label>
                <Input
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="YYYY"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setEditingReport(null)}
              >
                Cancelar
              </Button>
              <Button
                className={`bg-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/90`}
                onClick={saveEditedReport}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {fileName && (
        <div className={`flex justify-between items-center mb-4 bg-[${compesaColors.tertiary}]/20 p-3 rounded-lg`}>
          <span className={`text-sm text-[${compesaColors.primary}]`}>{fileName}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelImport}
            className={`text-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/10 p-1`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className={`flex justify-center items-center mb-4 bg-[${compesaColors.tertiary}]/20 p-3 rounded-lg`}>
          <div className={`animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[${compesaColors.primary}] mr-2`}></div>
          <span className={`text-sm text-[${compesaColors.primary}]`}>Processando arquivo...</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b p-4">
            <CardTitle className={`text-sm font-medium text-[${compesaColors.primary}]`}>
              Total VD
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold text-[${compesaColors.text}]`}>{totalVD}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b p-4">
            <CardTitle className={`text-sm font-medium text-[${compesaColors.primary}]`}>
              Total Perda
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold text-[${compesaColors.text}]`}>{totalPerda}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b p-4">
            <CardTitle className={`text-sm font-medium text-[${compesaColors.primary}]`}>
              IPD Médio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold text-[${compesaColors.text}]`}>{ipdMedio}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="border-b p-4">
            <CardTitle className={`text-sm font-medium text-[${compesaColors.primary}]`}>
              Volume Produzido
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className={`text-2xl font-bold text-[${compesaColors.text}]`}>
              {volumeProduzido}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar município, diretoria ou gerência..."
            className="pl-10 bg-white border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white border-gray-300"
            >
              <Filter className="h-4 w-4" />
              {filter === "all" ? "Todas as Categorias" : 
               filter === "vdNegative" ? "VD Negativo" :
               filter === "perdaNegative" ? "Perda Negativa" :
               filter === "ipdHigh" ? "IPD Alto" :
               filter === "diretoria" ? "Diretoria" :
               "Gerência"}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border-gray-200">
            <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("vdNegative")}
            >
              <span>VD Negativo</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("perdaNegative")}
            >
              <span>Perda Negativa</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("ipdHigh")}
            >
              <span>IPD Alto</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("diretoria")}
            >
              <span>Diretoria</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("gerencia")}
            >
              <span>Gerência</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          className="gap-2 bg-white border-gray-300"
          onClick={() => {
            setFilter("all");
            setSearchTerm("");
          }}
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      {dadosMunicipios.length > 0 ? (
        <div className="rounded-md border-0 bg-white shadow-sm">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className={`w-[80px] text-[${compesaColors.primary}] font-medium`}>
                  ID
                </TableHead>
                <TableHead className={`text-[${compesaColors.primary}] font-medium`}>
                  Municípios
                </TableHead>
                <TableHead 
                  className={`text-right text-[${compesaColors.primary}] font-medium cursor-pointer`}
                  onClick={() => handleSort("VD")}
                >
                  <div className="flex items-center justify-end gap-1">
                    VD
                    {sortConfig.key === "VD" && (
                      sortConfig.direction === "ascending" ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className={`text-right text-[${compesaColors.primary}] font-medium cursor-pointer`}
                  onClick={() => handleSort("Perda")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Perda
                    {sortConfig.key === "Perda" && (
                      sortConfig.direction === "ascending" ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className={`text-right text-[${compesaColors.primary}] font-medium cursor-pointer`}
                  onClick={() => handleSort("IPD")}
                >
                  <div className="flex items-center justify-end gap-1">
                    IPD
                    {sortConfig.key === "IPD" && (
                      sortConfig.direction === "ascending" ? 
                      <ChevronUp className="h-4 w-4" /> : 
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead className={`text-right text-[${compesaColors.primary}] font-medium`}>
                  Volume Disp.
                </TableHead>
                <TableHead className={`text-right text-[${compesaColors.primary}] font-medium`}>
                  Rateio
                </TableHead>
                <TableHead className={`text-right text-[${compesaColors.primary}] font-medium`}>
                  Volume Prod.
                </TableHead>
                <TableHead className={`text-right text-[${compesaColors.primary}] font-medium`}>
                  Ligações
                </TableHead>
                <TableHead className={`text-[${compesaColors.primary}] font-medium`}>
                  Diretoria
                </TableHead>
                <TableHead className={`text-[${compesaColors.primary}] font-medium`}>
                  Gerência
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((municipio) => (
                <TableRow key={municipio.Id} className="hover:bg-gray-50">
                  <TableCell className={`font-medium text-[${compesaColors.text}]`}>
                    {municipio.Id}
                  </TableCell>
                  <TableCell className={`text-[${compesaColors.text}]`}>
                    {municipio.Municipios}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      municipio.VD?.startsWith("-")
                        ? "text-red-500 font-medium"
                        : `text-[${compesaColors.text}]`
                    }`}
                  >
                    {municipio.VD}
                  </TableCell>
                  <TableCell
                    className={`text-right ${
                      municipio.Perda?.startsWith("-")
                        ? "text-red-500 font-medium"
                        : `text-[${compesaColors.text}]`
                    }`}
                  >
                    {municipio.Perda}
                  </TableCell>
                  <TableCell className={`text-right text-[${compesaColors.text}]`}>
                    {municipio.IPD}
                  </TableCell>
                  <TableCell className={`text-right text-[${compesaColors.text}]`}>
                    {municipio.Volume_Disponibilizado}
                  </TableCell>
                  <TableCell className={`text-right text-[${compesaColors.text}]`}>
                    {municipio.Rateio}
                  </TableCell>
                  <TableCell className={`text-right text-[${compesaColors.text}]`}>
                    {municipio.Volume_Produzido}
                  </TableCell>
                  <TableCell className={`text-right text-[${compesaColors.text}]`}>
                    {municipio.Ligacoes_Ativas}
                  </TableCell>
                  <TableCell className={`text-[${compesaColors.text}]`}>
                    {municipio.Diretoria}
                  </TableCell>
                  <TableCell className={`text-[${compesaColors.text}]`}>
                    {municipio.Gerencia}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white border-0 rounded-md shadow-sm">
          <div className="text-center space-y-4">
            <p className={`text-lg text-[${compesaColors.text}]`}>Nenhum dado carregado</p>
            <p className="text-sm text-gray-500">Importe um arquivo CSV para visualizar os dados</p>
            <input
              type="file"
              id="csvUploadEmpty"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button asChild className={`bg-[${compesaColors.primary}] hover:bg-[${compesaColors.primary}]/90`}>
              <label htmlFor="csvUploadEmpty" className="cursor-pointer">
                Importar CSV
              </label>
            </Button>
          </div>
        </div>
      )}

      {dadosMunicipios.length > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between px-2 mt-4 gap-4">
          <div className="text-sm text-muted-foreground">
            Mostrando <span className={`font-medium text-[${compesaColors.text}]`}>{(currentPage - 1) * itemsPerPage + 1}</span> a{" "}
            <span className={`font-medium text-[${compesaColors.text}]`}>{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> de{" "}
            <span className={`font-medium text-[${compesaColors.text}]`}>{filteredData.length}</span> resultados
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              Anterior
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <Button
                key={page}
                variant="outline"
                size="sm"
                className={`border-gray-300 ${currentPage === page ? `bg-[${compesaColors.primary}]/10 text-[${compesaColors.primary}]` : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-gray-300"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
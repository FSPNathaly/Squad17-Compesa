import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  X,
  Upload,
  Trash2,
  Edit,
  Download,
  ChevronDown,
  Calendar,
  AlertCircle,
  Filter,
} from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface FileData {
  id: string;
  name: string;
  type: "analise" | "relDesvio" | "vDistrib" | "vConsumo" | "perdasNegativas";
  date: Date;
  data: any[];
}

interface PerdasNegativasData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  Observacao_OFD: string;
  Diretoria?: string;
  Gerencia?: string;
  Coordenacao?: string;
}

interface DesvioData {
  Diretoria: string;
  Gerencia: string;
  Coordenacao: string;
  Localidade: string;
  IndicePerdaFaturamento: string;
  MetaIPF: string;
  IPFDesvio: string;
  IndicePerdaLigacao: string;
  MetaIPL: string;
  IPLDesvio: string;
  IndicePerdaDistribuicao: string;
  MetaIPD: string;
  IPDDesvio: string;
}

const PerdasNegativasTable = ({ data }: { data: PerdasNegativasData[] }) => {
  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleanedValue = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanedValue) || 0;
  };

  const totalVD = data.reduce((sum, item) => sum + parseNumber(item.VD), 0);
  const totalPerda = data.reduce(
    (sum, item) => sum + parseNumber(item.Perda),
    0
  );
  const ipdMedio =
    totalVD > 0 ? ((totalPerda / totalVD) * 100).toFixed(2) + "%" : "0%";

  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead className="w-[80px]">ID</TableHead>
          <TableHead>Municípios</TableHead>
          <TableHead className="text-right w-[120px]">VD (m³)</TableHead>
          <TableHead className="text-right w-[120px]">Perda (m³)</TableHead>
          <TableHead className="text-right w-[100px]">IPD</TableHead>
          <TableHead>Observação OFD</TableHead>
          <TableHead>Diretoria</TableHead>
          <TableHead>Gerência</TableHead>
          <TableHead>Coordenação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => {
          const perdaValue = parseNumber(item.Perda);
          const isNegative = perdaValue < 0;
          const needsAttention =
            item.Observacao_OFD &&
            item.Observacao_OFD.toLowerCase().includes("atenção");

          return (
            <TableRow
              key={index}
              className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} ${
                needsAttention ? "border-l-4 border-yellow-500" : ""
              }`}
            >
              <TableCell className="font-medium">{item.Id || "-"}</TableCell>
              <TableCell>{item.Municipios || "-"}</TableCell>
              <TableCell className="text-right">{item.VD || "-"}</TableCell>
              <TableCell
                className={`text-right ${
                  isNegative ? "text-red-600 font-semibold" : ""
                }`}
              >
                {item.Perda || "-"}
                {isNegative && (
                  <AlertCircle className="inline ml-1 h-4 w-4 text-red-600" />
                )}
              </TableCell>
              <TableCell className="text-right">{item.IPD || "-"}</TableCell>
              <TableCell className="max-w-[200px] truncate">
                {item.Observacao_OFD || "-"}
                {needsAttention && (
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Atenção
                  </span>
                )}
              </TableCell>
              <TableCell>{item.Diretoria || "-"}</TableCell>
              <TableCell>{item.Gerencia || "-"}</TableCell>
              <TableCell>{item.Coordenacao || "-"}</TableCell>
            </TableRow>
          );
        })}
        <TableRow className="bg-blue-50 font-semibold">
          <TableCell colSpan={2}>Total</TableCell>
          <TableCell className="text-right">
            {totalVD.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </TableCell>
          <TableCell
            className={`text-right ${totalPerda < 0 ? "text-red-600" : ""}`}
          >
            {totalPerda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            {totalPerda < 0 && (
              <AlertCircle className="inline ml-1 h-4 w-4 text-red-600" />
            )}
          </TableCell>
          <TableCell className="text-right">{ipdMedio}</TableCell>
          <TableCell colSpan={4}></TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
};

const DesviosTable = ({ data }: { data: DesvioData[] }) => {
  return (
    <Table>
      <TableHeader className="bg-gray-50">
        <TableRow>
          <TableHead>Diretoria</TableHead>
          <TableHead>Gerência</TableHead>
          <TableHead>Coordenação</TableHead>
          <TableHead>Localidade</TableHead>
          <TableHead className="text-right">IPF Desvio</TableHead>
          <TableHead className="text-right">IPL Desvio</TableHead>
          <TableHead className="text-right">IPD Desvio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item, index) => (
          <TableRow
            key={index}
            className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
          >
            <TableCell>{item.Diretoria || "-"}</TableCell>
            <TableCell>{item.Gerencia || "-"}</TableCell>
            <TableCell>{item.Coordenacao || "-"}</TableCell>
            <TableCell>{item.Localidade || "-"}</TableCell>
            <TableCell className="text-right">{item.IPFDesvio || "-"}</TableCell>
            <TableCell className="text-right">{item.IPLDesvio || "-"}</TableCell>
            <TableCell className="text-right">{item.IPDDesvio || "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export const Planilha = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("analise");
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [editingFile, setEditingFile] = useState<FileData | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [dropdownSearch, setDropdownSearch] = useState("");
  const [currentDataPage, setCurrentDataPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);
  const [diretoriaFilter, setDiretoriaFilter] = useState("");
  const [gerenciaFilter, setGerenciaFilter] = useState("");
  const dataPerPage = 10;

  useEffect(() => {
    const storedFiles = localStorage.getItem("uploadedFiles");
    if (storedFiles) {
      const parsedFiles = JSON.parse(storedFiles).map((file: any) => ({
        ...file,
        date: new Date(file.date),
      }));
      setFiles(parsedFiles);
    }
  }, []);

  const saveFilesToStorage = (filesToSave: FileData[]) => {
    localStorage.setItem("uploadedFiles", JSON.stringify(filesToSave));
  };

  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const newFile: FileData = {
          id: Date.now().toString(),
          name: file.name,
          type: type as any,
          date: new Date(),
          data: results.data,
        };

        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        saveFilesToStorage(updatedFiles);
        setSelectedFile(newFile);
        setLoading(false);
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
        setLoading(false);
      },
    });
  };

  const deleteFile = (id: string) => {
    const updatedFiles = files.filter((file) => file.id !== id);
    setFiles(updatedFiles);
    saveFilesToStorage(updatedFiles);
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
  };

  const startEditing = (file: FileData) => {
    setEditingFile(file);
    setEditName(file.name);
    setEditDate(format(file.date, "yyyy-MM-dd"));
  };

  const saveEdit = () => {
    if (!editingFile) return;

    const updatedFiles = files.map((file) => {
      if (file.id === editingFile.id) {
        return {
          ...file,
          name: editName,
          date: editDate ? new Date(editDate) : file.date,
        };
      }
      return file;
    });

    setFiles(updatedFiles);
    saveFilesToStorage(updatedFiles);
    if (selectedFile?.id === editingFile.id) {
      setSelectedFile({
        ...selectedFile,
        name: editName,
        date: editDate ? new Date(editDate) : selectedFile.date,
      });
    }
    setEditingFile(null);
  };

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortData = (data: any[]) => {
    if (!sortConfig) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const direction = sortConfig.direction === "ascending" ? 1 : -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * direction;
      }

      const numA = parseFloat(
        String(aValue).replace(/\./g, "").replace(",", ".")
      );
      const numB = parseFloat(
        String(bValue).replace(/\./g, "").replace(",", ".")
      );

      if (!isNaN(numA) && !isNaN(numB)) {
        return (numA - numB) * direction;
      }

      return String(aValue).localeCompare(String(bValue)) * direction;
    });
  };

  const filterFiles = () => {
    let filteredFiles = files.filter((file) => file.type === activeTab);

    if (dateRange.start && dateRange.end) {
      const start = parseISO(dateRange.start);
      const end = parseISO(dateRange.end);
      filteredFiles = filteredFiles
        .filter((file) => isWithinInterval(file.date, { start, end }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    if (dropdownSearch) {
      const term = dropdownSearch.toLowerCase();
      filteredFiles = filteredFiles.filter(
        (file) =>
          file.name.toLowerCase().includes(term) ||
          format(file.date, "dd/MM/yyyy HH:mm").toLowerCase().includes(term)
      );
    }

    return filteredFiles;
  };

  const filteredFiles = filterFiles();

  const parseNumber = (value: string): number => {
  if (!value) return 0;
  const cleanedValue = value
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/\s/g, "");
  return parseFloat(cleanedValue) || 0;
};

  const filterData = (data: any[]) => {
    return data.filter((item) => {
      const matchesSearch =
        item.Municipios?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Localidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.Diretoria?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDiretoria =
        !diretoriaFilter || item.Diretoria === diretoriaFilter;
      const matchesGerencia = !gerenciaFilter || item.Gerencia === gerenciaFilter;

      return matchesSearch && matchesDiretoria && matchesGerencia;
    });
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

  const exportToCSV = (file: FileData) => {
    const data = file.data || [];
    const filtered = filterData(data);
    const csv = Papa.unparse(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${file.name.replace(".csv", "")}_export.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = (file: FileData) => {
    const data = file.data || [];
    const filtered = filterData(data);
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(12);
    doc.text(`Relatório: ${file.name}`, 14, 10);
    doc.text(`Data: ${format(file.date, "dd/MM/yyyy")}`, 14, 16);

    const headers =
      file.type === "perdasNegativas"
        ? ["ID", "Municípios", "VD (m³)", "Perda (m³)", "IPD", "Observação OFD"]
        : Object.keys(data[0] || {});

    const rows =
      file.type === "perdasNegativas"
        ? filtered.map((item: any) => [
            item.Id || "-",
            item.Municipios || "-",
            item.VD || "-",
            item.Perda || "-",
            item.IPD || "-",
            item.Observacao_OFD || "-",
          ])
        : filtered.map((item: any) => headers.map((header) => item[header]));

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 25,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
        valign: "middle",
      },
      headStyles: {
        fillColor: [22, 163, 74],
        textColor: [255, 255, 255],
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      margin: { top: 25 },
      columnStyles: {
        3: { cellWidth: "auto" },
      },
      didDrawCell: (data) => {
        if (data.column.index === 3 && data.cell.raw) {
          const value = parseFloat(
            data.cell.raw.toString().replace(/\./g, "").replace(",", ".")
          );
          if (value < 0) {
            doc.setTextColor(255, 0, 0);
            doc.text(
              data.cell.raw.toString(),
              data.cell.x + 2,
              data.cell.y + 5
            );
            doc.setTextColor(0, 0, 0);
          }
        }
      },
    });

    doc.save(`${file.name.replace(".csv", "")}_export.pdf`);
  };

  const renderFileContent = (file: FileData) => {
    let data = file.data || [];
    data = filterData(data);
    data = sortData(data);

    const totalDataPages = Math.ceil(data.length / dataPerPage);
    const paginatedData = data.slice(
      (currentDataPage - 1) * dataPerPage,
      currentDataPage * dataPerPage
    );

    const PaginationControls = () => (
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 bg-gray-50 p-3 rounded-md shadow-sm gap-2">
        <div className="text-sm text-gray-600 text-center sm:text-left">
          Página {currentDataPage} de {totalDataPages} | Registros{" "}
          {(currentDataPage - 1) * dataPerPage + 1} a{" "}
          {Math.min(currentDataPage * dataPerPage, data.length)} de{" "}
          {data.length}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentDataPage === 1}
            onClick={() => {
              setCurrentDataPage(currentDataPage - 1);
              window.scrollTo(0, 0);
            }}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentDataPage === totalDataPages}
            onClick={() => {
              setCurrentDataPage(currentDataPage + 1);
              window.scrollTo(0, 0);
            }}
          >
            Próximo
          </Button>
        </div>
      </div>
    );

    if (viewMode === "card") {
      return (
        <>
          <PaginationControls />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((item: any, index) => (
              <Card
                key={index}
                className="p-4 hover:shadow-md transition-shadow"
              >
                <div className="space-y-2">
                  {Object.entries(item).map(([key, value]) => {
                    const numValue = parseFloat(
                      String(value).replace(/\./g, "").replace(",", ".")
                    );
                    const isNegative =
                      !isNaN(numValue) &&
                      numValue < 0 &&
                      (key.includes("Perda") || key.includes("perda"));
                    const needsAttention =
                      key === "Observacao_OFD" &&
                      String(value).toLowerCase().includes("atenção");

                    return (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">
                          {key}:
                        </span>
                        <span
                          className={`text-sm ${
                            isNegative ? "text-red-600 font-medium" : ""
                          } ${
                            needsAttention
                              ? "bg-yellow-100 px-2 rounded-full"
                              : ""
                          }`}
                        >
                          {String(value) || "-"}
                          {isNegative && (
                            <AlertCircle className="inline ml-1 h-4 w-4 text-red-600" />
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </>
      );
    }

    if (file.type === "perdasNegativas") {
      return (
        <>
          <PaginationControls />
          <PerdasNegativasTable data={paginatedData as PerdasNegativasData[]} />
        </>
      );
    }

    if (file.type === "relDesvio") {
      return (
        <>
          <PaginationControls />
          <DesviosTable data={paginatedData as DesvioData[]} />
        </>
      );
    }

    const headers = Object.keys(data[0] || {});

    return (
      <>
        <PaginationControls />
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                {headers.slice(0, 6).map((header) => (
                  <TableHead
                    key={header}
                    className="whitespace-nowrap cursor-pointer hover:bg-gray-100"
                    onClick={() => requestSort(header)}
                  >
                    <div className="flex items-center">
                      {header}
                      {sortConfig?.key === header && (
                        <ChevronDown
                          className={`h-4 w-4 ml-1 ${
                            sortConfig.direction === "descending"
                              ? "transform rotate-180"
                              : ""
                          }`}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
                {headers.length > 6 && <TableHead>...</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item: any, index) => {
                const needsAttention = Object.entries(item).some(
                  ([key, value]) =>
                    key === "Observacao_OFD" &&
                    String(value).toLowerCase().includes("atenção")
                );

                return (
                  <TableRow
                    key={index}
                    className={`${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } ${needsAttention ? "border-l-4 border-yellow-500" : ""}`}
                  >
                    {headers.slice(0, 6).map((header) => {
                      const value = item[header];
                      const numValue = parseFloat(
                        String(value).replace(/\./g, "").replace(",", ".")
                      );
                      const isNegative =
                        !isNaN(numValue) &&
                        numValue < 0 &&
                        (header.includes("Perda") || header.includes("perda"));

                      return (
                        <TableCell
                          key={`${index}-${header}`}
                          className={`truncate max-w-[200px] ${
                            isNegative ? "text-red-600 font-medium" : ""
                          }`}
                        >
                          {value || "-"}
                          {isNegative && (
                            <AlertCircle className="inline ml-1 h-4 w-4 text-red-600" />
                          )}
                        </TableCell>
                      );
                    })}
                    {headers.length > 6 && <TableCell>...</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  const resetFilters = () => {
    setSearchTerm("");
    setDiretoriaFilter("");
    setGerenciaFilter("");
    setDateRange({ start: "", end: "" });
    setCurrentDataPage(1);
    setSortConfig(null);
  };

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
              Análise de VD e Perdas
            </h2>
            <p className="text-sm text-muted-foreground">
              Dados atualizados em{" "}
              {format(new Date(), "MMM yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.png" alt="Usuário" />
                  <AvatarFallback>US</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuItem>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setSelectedFile(null);
          setCurrentDataPage(1);
          setSortConfig(null);
        }}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-5 bg-gray-100">
          <TabsTrigger value="analise" className="data-[state=active]:bg-white">
            Análise
          </TabsTrigger>
          <TabsTrigger
            value="relDesvio"
            className="data-[state=active]:bg-white"
          >
            Rel. Desvios
          </TabsTrigger>
          <TabsTrigger
            value="vDistrib"
            className="data-[state=active]:bg-white"
          >
            V. Distribuição
          </TabsTrigger>
          <TabsTrigger
            value="vConsumo"
            className="data-[state=active]:bg-white"
          >
            V. Consumo
          </TabsTrigger>
          <TabsTrigger
            value="perdasNegativas"
            className="data-[state=active]:bg-white"
          >
            Perdas Negativas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-4 text-gray-500" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Clique para enviar</span> ou
                arraste o arquivo
              </p>
              <p className="text-xs text-gray-500">
                {activeTab === "analise"
                  ? "01. Analise.csv"
                  : activeTab === "relDesvio"
                  ? "02. RelDesvios.csv"
                  : activeTab === "vDistrib"
                  ? "03. VDistrib.csv"
                  : activeTab === "vConsumo"
                  ? "04. VCNorma.csv"
                  : "05. PerdasNegativas.csv"}
              </p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".csv"
              onChange={(e) => handleFileUpload(e, activeTab)}
            />
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}

      {editingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Editar Arquivo</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data
                </label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setEditingFile(null)}>
                Cancelar
              </Button>
              <Button onClick={saveEdit} disabled={!editName}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="flex flex-col md:flex-row gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Procurar ${
                  activeTab === "perdasNegativas"
                    ? "município"
                    : activeTab === "analise"
                    ? "município"
                    : activeTab === "relDesvio"
                    ? "localidade"
                    : activeTab === "vDistrib"
                    ? "localidade"
                    : "município"
                }...`}
                className="pl-10 bg-white border-gray-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white border-gray-300"
                  >
                    Visualização: {viewMode === "table" ? "Tabela" : "Cards"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setViewMode("table")}>
                    Modo Tabela
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode("card")}>
                    Modo Cards
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

          <div className="mb-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-white border-gray-300"
                >
                  {selectedFile ? selectedFile.name : "Selecione uma planilha"}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[400px] p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Procurar planilha..."
                    className="pl-10 bg-white border-gray-300"
                    value={dropdownSearch}
                    onChange={(e) => setDropdownSearch(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredFiles.length > 0 ? (
                    filteredFiles.map((file) => (
                      <DropdownMenuItem
                        key={file.id}
                        className="flex justify-between items-center cursor-pointer"
                        onClick={() => {
                          setSelectedFile(file);
                          setCurrentDataPage(1);
                          setSortConfig(null);
                        }}
                      >
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(file.date, "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(file);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Nenhuma planilha encontrada
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {selectedFile ? (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium">{selectedFile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedFile.date, "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => exportToCSV(selectedFile)}
                      >
                        Exportar para CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportToPDF(selectedFile)}
                      >
                        Exportar para PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-auto">
                {renderFileContent(selectedFile)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-200">
              <p className="text-gray-500 mb-4">Nenhuma planilha selecionada</p>
              {filteredFiles.length === 0 && (
                <p className="text-sm text-gray-400">
                  Nenhum arquivo encontrado para os filtros selecionados
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
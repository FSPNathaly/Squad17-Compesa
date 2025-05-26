import { useState, useEffect } from "react";
import { format } from "date-fns";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  X,
  Download,
  ChevronDown,
  Calendar,
  AlertCircle,
  ChevronRight,
  SlidersHorizontal,
  Check,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import Papa from "papaparse";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface FileData {
  id: string;
  name: string;
  type: string;
  date: Date;
  data: any[];
}

export const Planilha = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [lossRange, setLossRange] = useState([0, 100]);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>(null);

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const newFile: FileData = {
          id: Date.now().toString(),
          name: file.name,
          type: "data",
          date: new Date(),
          data: results.data,
        };

        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        localStorage.setItem("uploadedFiles", JSON.stringify(updatedFiles));
        setSelectedFile(newFile);
      },
    });
  };

  const exportToCSV = () => {
    if (!selectedFile) return;
    const csv = Papa.unparse(selectedFile.data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${selectedFile.name.replace(".csv", "")}_export.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!selectedFile) return;
    const doc = new jsPDF({ orientation: "landscape" });

    doc.text(`Relatório: ${selectedFile.name}`, 14, 10);
    doc.text(`Data: ${format(selectedFile.date, "dd/MM/yyyy")}`, 14, 16);

    const headers = Object.keys(selectedFile.data[0] || {});
    const rows = selectedFile.data.map((item: any) =>
      headers.map((header) => item[header])
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 25,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255] },
    });

    doc.save(`${selectedFile.name.replace(".csv", "")}_export.pdf`);
  };

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (sortConfig?.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = () => {
    if (!selectedFile || !sortConfig) return selectedFile?.data || [];

    return [...selectedFile.data].sort((a: any, b: any) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;

      const direction = sortConfig.direction === "ascending" ? 1 : -1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return aValue.localeCompare(bValue) * direction;
      }

      return (Number(aValue) - Number(bValue)) * direction;
    });
  };

  const filteredData = () => {
    if (!selectedFile) return [];
    let data = sortedData();

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter((item: any) =>
        Object.values(item).some((val: any) =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    if (lossRange[0] > 0 || lossRange[1] < 100) {
      data = data.filter((item: any) => {
        const loss = parseFloat(item["Perda"] || "0");
        return loss >= lossRange[0] && loss <= lossRange[1];
      });
    }

    return data;
  };

  const paginatedData = () => {
    const data = filteredData();
    const startIndex = (currentPage - 1) * rowsPerPage;
    return data.slice(startIndex, startIndex + rowsPerPage);
  };

  const totalPages = Math.ceil(filteredData().length / rowsPerPage);

  const toggleRowSelection = (id: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRows(newSelection);
  };

  const selectAllRows = () => {
    if (
      selectedRows.size === paginatedData().length &&
      paginatedData().length > 0
    ) {
      setSelectedRows(new Set());
    } else {
      const newSelection = new Set(
        paginatedData().map((_, index) =>
          ((currentPage - 1) * rowsPerPage + index).toString()
        )
      );
      setSelectedRows(newSelection);
    }
  };

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    const cleanedValue = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(cleanedValue) || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <img
            src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
            alt="Compesa Logo"
            className="h-10"
          />
          <h1 className="text-xl font-semibold">Análise Detalhada de Dados</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={exportToCSV}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex gap-6">
        {showFilters && (
          <div className="w-64 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <h3 className="font-medium mb-4 flex justify-between items-center">
              Filtros
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setLossRange([0, 100]);
                  setDateRange({ start: "", end: "" });
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2">Intervalo Temporal</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, start: e.target.value })
                      }
                      placeholder="Início"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) =>
                        setDateRange({ ...dateRange, end: e.target.value })
                      }
                      placeholder="Fim"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Faixa de Perda (%)</h4>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={lossRange[0]}
                    onChange={(e) =>
                      setLossRange([Number(e.target.value), lossRange[1]])
                    }
                    className="w-16"
                  />
                  <span>a</span>
                  <Input
                    type="number"
                    value={lossRange[1]}
                    onChange={(e) =>
                      setLossRange([lossRange[0], Number(e.target.value)])
                    }
                    className="w-16"
                  />
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Criticidade</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm border border-red-500 flex items-center justify-center">
                      {selectedRows.size > 0 && (
                        <Check className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <span>Crítico</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm border border-yellow-500 flex items-center justify-center">
                      {selectedRows.size > 0 && (
                        <Check className="h-3 w-3 text-yellow-500" />
                      )}
                    </div>
                    <span>Alerta</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-sm border border-green-500 flex items-center justify-center">
                      {selectedRows.size > 0 && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                    </div>
                    <span>Estável</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={`${showFilters ? "flex-1" : "w-full"}`}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por município, código..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="text-sm text-gray-500">
                  {filteredData().length.toLocaleString()} registros
                </div>
              </div>
            </div>

            <div className="overflow-auto max-h-[calc(100vh-200px)]">
              <Table>
                <TableHeader className="bg-gray-50 sticky top-0">
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={
                          selectedRows.size === paginatedData().length &&
                          paginatedData().length > 0
                        }
                        onChange={selectAllRows}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </TableHead>
                    {selectedFile &&
                      Object.keys(selectedFile.data[0] || {}).map((key) => (
                        <TableHead
                          key={key}
                          className="whitespace-nowrap cursor-pointer hover:bg-gray-100"
                          onClick={() => requestSort(key)}
                        >
                          <div className="flex items-center">
                            {key}
                            {sortConfig?.key === key && (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData().map((row, index) => {
                    const rowId = (
                      (currentPage - 1) * rowsPerPage +
                      index
                    ).toString();
                    const isCritical = parseNumber(row["Perda"]) > 20;
                    const isAlert =
                      parseNumber(row["Perda"]) > 10 &&
                      parseNumber(row["Perda"]) <= 20;

                    return (
                      <TableRow
                        key={rowId}
                        className={`hover:bg-blue-50 ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50"
                        } ${
                          isCritical
                            ? "border-l-4 border-red-500"
                            : isAlert
                            ? "border-l-4 border-yellow-500"
                            : ""
                        }`}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(rowId)}
                            onChange={() => toggleRowSelection(rowId)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </TableCell>
                        {Object.values(row).map((value, i) => (
                          <TableCell key={i} className="max-w-xs truncate">
                            {String(value) || "-"}
                            {i === 2 && parseNumber(String(value)) < 0 && (
                              <AlertCircle className="inline ml-1 h-4 w-4 text-red-500" />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-500">
                Página {currentPage} de {totalPages} •{" "}
                {filteredData().length.toLocaleString()} registros
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Input
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const page = Number(e.target.value);
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page);
                    }
                  }}
                  className="w-16 text-center"
                />

                <span className="text-sm text-gray-500">de {totalPages}</span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  Linhas por página:
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      {rowsPerPage} <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setRowsPerPage(25)}>
                      25
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRowsPerPage(50)}>
                      50
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRowsPerPage(100)}>
                      100
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

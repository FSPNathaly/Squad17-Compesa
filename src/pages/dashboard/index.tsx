import { ptBR } from "date-fns/locale";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Dispatch, SetStateAction, ReactElement } from "react";
import Papa, { type ParseResult, type ParseError } from "papaparse";
import { jsPDF } from "jspdf";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Download,
  Upload,
  ChevronDown,
  Calendar,
  Filter,
  X,
  Trash2,
  FileText,
  MoreVertical,
  LogOut,
  Sheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { TooltipProps } from "recharts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type {
  ImportedFileEntry,
  CsvData as AppCsvData,
  BalancoVolumeData as AppBalancoVolumeData,
} from "../../App";

type CsvData = AppCsvData;
type BalancoVolumeData = AppBalancoVolumeData;

interface EvolucaoDataPoint {
  month: string;
  value: number;
}

const MOCK_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface DashboardProps {
  importedFilesHistory: ImportedFileEntry[];
  activeFileId: string | null;
  onFileImportedOrUpdated: (fileEntry: ImportedFileEntry) => void;
  onFileSelected: (fileId: string | null) => void;
  onFileDeleted: (fileId: string) => void;
  onFileDateEdited: (fileId: string, newDate: Date) => void;
  navigateToPlanilha: () => void;
  onLogout: () => void;
}

interface CustomTooltipPayload {
  name: string;
  value: any;
  color?: string;
}

interface CustomTooltipProps extends TooltipProps<any, any> {
  payload?: CustomTooltipPayload[];
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip bg-white p-2 border border-gray-200 rounded shadow-lg text-sm">
        <p className="label font-bold text-gray-800">{`${label}`}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.color }}>
            <p className="intro">{`${pld.name}: ${Number(
              pld.value
            ).toLocaleString("pt-BR")}`}</p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

function sortData<T extends { name: string }>(
  data: T[],
  option: string,
  key: keyof T | "name"
): T[] {
  switch (option) {
    case "a-z":
      return [...data].sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      );
    case "z-a":
      return [...data].sort((a, b) =>
        String(b.name).localeCompare(String(a.name))
      );
    case "crescente":
      return [...data].sort((a, b) => (a[key] as number) - (b[key] as number));
    case "decrescente":
      return [...data].sort((a, b) => (b[key] as number) - (a[key] as number));
    default:
      return data;
  }
}

function filterByRange<T>(
  data: T[],
  range: [number, number],
  key: keyof T
): T[] {
  return data.filter((item) => {
    const value = item[key] as unknown as number;
    return value >= range[0] && value <= range[1];
  });
}

export const Dashboard = ({
  importedFilesHistory,
  activeFileId,
  onFileImportedOrUpdated,
  onFileSelected,
  onFileDeleted,
  onFileDateEdited,
  navigateToPlanilha,
  onLogout,
}: DashboardProps): ReactElement => {
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [fileToEditId, setFileToEditId] = useState<string | null>(null);

  const [perdaAnualDataLocal, setPerdaAnualDataLocal] = useState<
    { name: string; value: number }[]
  >([]);
  const [gastosMunicipiosDataLocal, setGastosMunicipiosDataLocal] = useState<
    { name: string; manutencoes: number; valor: number }[]
  >([]);
  const [perdasMunicipioDataLocal, setPerdasMunicipioDataLocal] = useState<
    { name: string; manutencao: number; faltaAgua: number; semAcesso: number }[]
  >([]);
  const [volumeTotalDataLocal, setVolumeTotalDataLocal] = useState<
    { name: string; produzido: number; consumido: number }[]
  >([]);
  const [balancoVolumesDataLocal, setBalancoVolumesDataLocal] = useState<
    BalancoVolumeData[]
  >([]);
  const [rawDataLocal, setRawDataLocal] = useState<CsvData[]>([]);
  const [activeFileNameLocal, setActiveFileNameLocal] = useState<string | null>(
    null
  );
  const [activeFileDateLocal, setActiveFileDateLocal] = useState<
    Date | undefined
  >(new Date());

  const [sortOptionBalanco, setSortOptionBalanco] =
    useState<string>("decrescente");
  const [sortKeyBalanco, setSortKeyBalanco] = useState<
    keyof BalancoVolumeData | "name"
  >("distribuido");
  const [balancoRange, setBalancoRange] = useState<[number, number]>([
    0, 10000,
  ]);
  const [maxBalanco, setMaxBalanco] = useState<number>(10000);
  const [filterKeyBalanco, setFilterKeyBalanco] =
    useState<keyof BalancoVolumeData>("distribuido");

  const [evolucaoDistribuidoData, setEvolucaoDistribuidoData] = useState<
    EvolucaoDataPoint[]
  >([]);
  const [evolucaoConsumidoData, setEvolucaoConsumidoData] = useState<
    EvolucaoDataPoint[]
  >([]);
  const [evolucaoPerdidoData, setEvolucaoPerdidoData] = useState<
    EvolucaoDataPoint[]
  >([]);
  const [municipiosListEvolucao, setMunicipiosListEvolucao] = useState<
    string[]
  >([]);
  const [selectedMunicipioEvolucao, setSelectedMunicipioEvolucao] =
    useState<string>("COMPESA");

  const [uploading, setUploading] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);

  const [sortOptionPerda, setSortOptionPerda] = useState<string>("decrescente");

  const [maxPerda, setMaxPerda] = useState<number>(10000);

  const [perdaRange, setPerdaRange] = useState<[number, number]>([0, 10000]);
  const [perdasRange, setPerdasRange] = useState<[number, number]>([0, 10000]);

  const compesaColors = {
    primary: "#003F9C",
    secondary: "#5D8BF4",
    tertiary: "#85A6F2",
    background: "#F0F5FF",
    text: "#1A2C56",
    red: "#E53E3E",
  };

  const parseBrazilianNumber = useCallback((value: string): number => {
    if (typeof value !== "string") return 0;
    const cleanedValue = value.replace(/\./g, "").replace(",", ".");
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number;
  }, []);

  const processAndStoreFileData = useCallback(
    (
      fileId: string,
      fileName: string,
      importDate: Date,
      parsedData: CsvData[]
    ) => {
      if (parsedData.length === 0) {
        console.warn(
          "CSV parsing resulted in empty data. Please check the file format."
        );
        setUploading(false);
        return;
      }

      const perdaAnualAcc: Record<string, number> = parsedData.reduce(
        (acc: Record<string, number>, item: CsvData) => {
          const municipio = item.Municipios;
          const perda = parseBrazilianNumber(item.Perda);
          if (municipio) acc[municipio] = (acc[municipio] || 0) + perda;
          return acc;
        },
        {}
      );
      const newPerdaAnualData = Object.entries(perdaAnualAcc).map(
        ([name, val]) => ({ name, value: val })
      );

      const newGastosMunicipiosData = parsedData.map((item) => ({
        name: item.Municipios,
        manutencoes: Math.floor(parseBrazilianNumber(item.Perda) / 10000),
        valor: parseBrazilianNumber(item["Volume Produzido"]),
      }));

      const newPerdasMunicipioData = parsedData.map((item) => ({
        name: item.Municipios,
        manutencao: parseBrazilianNumber(item.Perda) * 0.6,
        faltaAgua: parseBrazilianNumber(item.Perda) * 0.3,
        semAcesso: parseBrazilianNumber(item.Perda) * 0.1,
      }));

      const newVolumeTotalData = parsedData.map((item) => ({
        name: item.Municipios,
        produzido: parseBrazilianNumber(item["Volume Produzido"]),
        consumido: parseBrazilianNumber(item["Volume Consumido"]),
      }));

      const newBalancoData = parsedData.map((item) => {
        const distribuido = parseBrazilianNumber(item["Volume Produzido"]);
        const consumido = parseBrazilianNumber(item["Volume Consumido"]);
        return {
          name: item.Municipios,
          distribuido,
          consumido,
          perdaVolume: distribuido - consumido,
        };
      });

      const fileEntry: ImportedFileEntry = {
        id: fileId,
        fileName,
        importDate,
        rawData: parsedData,
        perdaAnualData: newPerdaAnualData,
        gastosMunicipiosData: newGastosMunicipiosData,
        perdasMunicipioData: newPerdasMunicipioData,
        volumeTotalData: newVolumeTotalData,
        balancoVolumesData: newBalancoData,
      };
      onFileImportedOrUpdated(fileEntry);
    },
    [parseBrazilianNumber, onFileImportedOrUpdated]
  );

  useEffect(() => {
    let isMounted = true;
    const currentFile = activeFileId
      ? importedFilesHistory.find((f) => f.id === activeFileId)
      : null;

    if (currentFile && isMounted) {
      setPerdaAnualDataLocal(currentFile.perdaAnualData);
      setGastosMunicipiosDataLocal(currentFile.gastosMunicipiosData);
      setPerdasMunicipioDataLocal(currentFile.perdasMunicipioData);
      setVolumeTotalDataLocal(currentFile.volumeTotalData);
      setBalancoVolumesDataLocal(currentFile.balancoVolumesData);
      setRawDataLocal(currentFile.rawData);
      setActiveFileNameLocal(currentFile.fileName);
      setActiveFileDateLocal(currentFile.importDate);

      const uniqueMunicipios = Array.from(
        new Set(currentFile.rawData.map((item: CsvData) => item.Municipios))
      ).sort();
      setMunicipiosListEvolucao(uniqueMunicipios);
    } else if (isMounted) {
      setPerdaAnualDataLocal([]);
      setGastosMunicipiosDataLocal([]);
      setPerdasMunicipioDataLocal([]);
      setVolumeTotalDataLocal([]);
      setBalancoVolumesDataLocal([]);
      setRawDataLocal([]);
      setActiveFileNameLocal(null);
      setActiveFileDateLocal(new Date());
      setMunicipiosListEvolucao([]);
    }
    return () => {
      isMounted = false;
    };
  }, [activeFileId, importedFilesHistory]);

  useEffect(() => {
    let isMounted = true;
    if (perdaAnualDataLocal.length > 0 && isMounted) {
      const maxVal = Math.max(...perdaAnualDataLocal.map((item) => item.value));
      const newMax = Math.ceil(maxVal / 100) * 100 || 10000;
      setMaxPerda(newMax);
      setPerdaRange((prevRange) =>
        (prevRange[1] === 10000 && newMax > 10000) ||
        prevRange[1] < newMax ||
        prevRange[0] > newMax
          ? [0, newMax]
          : prevRange
      );
    }
    if (perdasMunicipioDataLocal.length > 0 && isMounted) {
      const maxVal = Math.max(
        ...perdasMunicipioDataLocal.map((item) => item.manutencao)
      );
      const newMax = Math.ceil(maxVal / 100) * 100 || 10000;
      setPerdasRange((prevRange) =>
        (prevRange[1] === 10000 && newMax > 10000) ||
        prevRange[1] < newMax ||
        prevRange[0] > newMax
          ? [0, newMax]
          : prevRange
      );
    }

    if (balancoVolumesDataLocal.length > 0 && isMounted) {
      const maxVal = Math.max(
        ...balancoVolumesDataLocal.map((item) =>
          Math.max(item.distribuido, item.consumido, item.perdaVolume)
        )
      );
      const newMax = Math.ceil(maxVal / 100) * 100 || 10000;
      setMaxBalanco(newMax);
      setBalancoRange((prevRange) =>
        (prevRange[1] === 10000 && newMax > 10000) ||
        prevRange[1] < newMax ||
        prevRange[0] > newMax
          ? [0, newMax]
          : prevRange
      );
    }
    return () => {
      isMounted = false;
    };
  }, [perdaAnualDataLocal, perdasMunicipioDataLocal, balancoVolumesDataLocal]);

  const handleMainImportClick = () => mainFileInputRef.current?.click();

  const clearActiveFileView = useCallback(() => {
    onFileSelected(null);
  }, [onFileSelected]);

  const handleFileUploadLocal = useCallback(
    (
      event: React.ChangeEvent<HTMLInputElement>,
      editingFileId: string | null = null
    ) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      Papa.parse(file as any, {
        header: true,
        skipEmptyLines: true,
        complete: (results: ParseResult<CsvData>) => {
          if (results.errors.length > 0) {
            console.error(
              "Erros encontrados durante o parsing de linhas específicas:",
              results.errors
            );
          }

          const parsedData: CsvData[] = (results.data as CsvData[]).filter(
            (item): item is CsvData =>
              !!(
                item &&
                typeof item.Id !== "undefined" &&
                typeof item.Municipios !== "undefined"
              )
          );

          const fileIdToUse = editingFileId || crypto.randomUUID();
          const dateToUse = editingFileId
            ? importedFilesHistory.find((f) => f.id === editingFileId)
                ?.importDate || new Date()
            : new Date();

          processAndStoreFileData(
            fileIdToUse,
            file.name,
            dateToUse,
            parsedData
          );
          setUploading(false);
          if (editingFileId) setFileToEditId(null);
        },
        error: (err: ParseError) => {
          console.error("Erro fatal durante o parsing do CSV:", err.message);
          setUploading(false);
          if (editingFileId) setFileToEditId(null);
        },
      });
      if (event.target) event.target.value = "";
    },
    [importedFilesHistory, processAndStoreFileData]
  );

  useEffect(() => {
    if (!rawDataLocal.length || !activeFileId) {
      setEvolucaoDistribuidoData([]);
      setEvolucaoConsumidoData([]);
      setEvolucaoPerdidoData([]);
      return;
    }

    let dist = 0,
      cons = 0,
      lossVol = 0;

    if (selectedMunicipioEvolucao === "COMPESA") {
      rawDataLocal.forEach((item: CsvData) => {
        const p = parseBrazilianNumber(item["Volume Produzido"]);
        const c = parseBrazilianNumber(item["Volume Consumido"]);
        dist += p;
        cons += c;
      });
      lossVol = dist - cons;
    } else {
      const municipioData = rawDataLocal.find(
        (item) => item.Municipios === selectedMunicipioEvolucao
      );
      if (municipioData) {
        dist = parseBrazilianNumber(municipioData["Volume Produzido"]);
        cons = parseBrazilianNumber(municipioData["Volume Consumido"]);
        lossVol = dist - cons;
      }
    }
    setEvolucaoDistribuidoData(
      MOCK_MONTHS.map((m) => ({ month: m, value: dist }))
    );
    setEvolucaoConsumidoData(
      MOCK_MONTHS.map((m) => ({ month: m, value: cons }))
    );
    setEvolucaoPerdidoData(
      MOCK_MONTHS.map((m) => ({ month: m, value: lossVol }))
    );
  }, [
    rawDataLocal,
    selectedMunicipioEvolucao,
    parseBrazilianNumber,
    activeFileId,
  ]);

  const generatePDFReport = useCallback(() => {
    if (!rawDataLocal.length) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(compesaColors.primary);
    doc.text("Relatório COMPESA", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 30, {
      align: "center",
    });
    if (activeFileNameLocal)
      doc.text(`Arquivo: ${activeFileNameLocal}`, 105, 35, { align: "center" });

    let yPosition = 45;
    rawDataLocal.forEach((item, index) => {
      if (yPosition > 260 && index < rawDataLocal.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(10);
      doc.setTextColor(compesaColors.primary);
      doc.text(`Município: ${item.Municipios}`, 14, yPosition);
      doc.setTextColor(compesaColors.text);
      doc.text(
        `Perda Anual: ${parseBrazilianNumber(item.Perda).toLocaleString(
          "pt-BR"
        )}`,
        14,
        yPosition + 5
      );
      doc.text(
        `Volume Produzido: ${parseBrazilianNumber(
          item["Volume Produzido"]
        ).toLocaleString("pt-BR")} m³/h`,
        14,
        yPosition + 10
      );
      doc.text(
        `Volume Consumido: ${parseBrazilianNumber(
          item["Volume Consumido"]
        ).toLocaleString("pt-BR")} m³/h`,
        14,
        yPosition + 15
      );
      yPosition += 25;
    });
    doc.save(
      `relatorio_compesa_${
        activeFileNameLocal ? activeFileNameLocal.split(".")[0] : "geral"
      }_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  }, [rawDataLocal, compesaColors, parseBrazilianNumber, activeFileNameLocal]);

  const generateCSVReport = useCallback(() => {
    if (!rawDataLocal.length) return;
    const csv = Papa.unparse(rawDataLocal);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_compesa_${
      activeFileNameLocal ? activeFileNameLocal.split(".")[0] : "geral"
    }_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }, [rawDataLocal, activeFileNameLocal]);

  const handleSliderChange = useCallback(
    (setter: Dispatch<SetStateAction<[number, number]>>) => {
      return (newValue: number[]) => {
        if (newValue.length === 2) setter([newValue[0], newValue[1]]);
      };
    },
    []
  );

  const handleTriggerEditFile = (fileId: string) => {
    setFileToEditId(fileId);
    editFileInputRef.current?.click();
  };

  const processedPerdaData = filterByRange(
    sortData(perdaAnualDataLocal, sortOptionPerda, "value"),
    perdaRange,
    "value"
  );
  const processedPerdasData = filterByRange(
    sortData(perdasMunicipioDataLocal, "decrescente", "manutencao"),
    perdasRange,
    "manutencao"
  );
  const processedBalancoData = filterByRange(
    sortData(balancoVolumesDataLocal, sortOptionBalanco, sortKeyBalanco),
    balancoRange,
    filterKeyBalanco
  );

  return (
    <main className="min-h-screen bg-[#F0F5FF] p-4">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
        <img
          src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
          alt="Compesa Logo"
          className="h-12"
        />
        <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3"
                disabled={!activeFileId}
              >
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                {activeFileDateLocal
                  ? format(activeFileDateLocal, "dd/MM/yy", { locale: ptBR })
                  : "Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <CalendarComp
                mode="single"
                selected={activeFileDateLocal}
                onSelect={(newDate) => {
                  if (activeFileId && newDate) {
                    onFileDateEdited(activeFileId, newDate);
                  }
                }}
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3"
            onClick={handleMainImportClick}
          >
            <Upload className="h-3 w-3 sm:h-4 sm:w-4" /> Importar
          </Button>
          <input
            type="file"
            ref={mainFileInputRef}
            accept=".csv"
            onChange={(e) => handleFileUploadLocal(e)}
            className="hidden"
          />
          <input
            type="file"
            ref={editFileInputRef}
            accept=".csv"
            onChange={(e) => {
              if (fileToEditId) handleFileUploadLocal(e, fileToEditId);
            }}
            className="hidden"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3"
                disabled={importedFilesHistory.length === 0}
              >
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> Arquivos (
                {importedFilesHistory.length}){" "}
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 sm:w-64 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Arquivos Importados</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {importedFilesHistory.length === 0 && (
                <DropdownMenuItem disabled>
                  Nenhum arquivo importado
                </DropdownMenuItem>
              )}
              {importedFilesHistory.map((file) => (
                <DropdownMenuGroup key={file.id}>
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                    <span
                      className={`cursor-pointer truncate flex-grow ${
                        activeFileId === file.id
                          ? "font-semibold text-[#003F9C]"
                          : ""
                      }`}
                      title={file.fileName}
                      onClick={() => onFileSelected(file.id)}
                    >
                      {file.fileName} ({format(file.importDate, "dd/MM/yy")})
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 ml-1 flex-shrink-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem
                          onClick={() => onFileSelected(file.id)}
                        >
                          <FileText className="mr-2 h-4 w-4" /> Selecionar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="w-full justify-start px-2 py-1.5 text-sm font-normal relative flex cursor-default select-none items-center rounded-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                            >
                              <Calendar className="mr-2 h-4 w-4" /> Editar Data
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-auto p-0"
                            side="right"
                            align="start"
                          >
                            <CalendarComp
                              mode="single"
                              selected={file.importDate}
                              onSelect={(newDate) => {
                                if (newDate) onFileDateEdited(file.id, newDate);
                              }}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        <DropdownMenuItem
                          onClick={() => handleTriggerEditFile(file.id)}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Substituir Arquivo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onFileDeleted(file.id)}
                          className="text-red-600 focus:bg-red-50 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3"
            onClick={navigateToPlanilha}
            disabled={!activeFileId}
          >
            <Sheet className="h-3 w-3 sm:h-4 sm:w-4" /> Planilha
          </Button>
          <DropdownMenu onOpenChange={setExportDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3"
                disabled={!activeFileId}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4" /> Exportar{" "}
                <ChevronDown
                  className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${
                    exportDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 sm:w-48">
              <DropdownMenuItem
                onClick={generateCSVReport}
                className="cursor-pointer focus:bg-[#003F9C]/10"
              >
                Exportar como CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={generatePDFReport}
                className="cursor-pointer focus:bg-[#003F9C]/10"
              >
                Exportar como PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
              <span className="hidden md:block text-sm font-medium text-[#1A2C56]">
                Admin
              </span>
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-[#85A6F2]">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="bg-[#85A6F2] text-white font-medium text-xs sm:text-sm">
                  AD
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Administrador</span>
                  <span className="text-xs text-gray-500">
                    admin@compesa.com.br
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onLogout}
                className="cursor-pointer text-red-500 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {activeFileNameLocal && (
        <div className="flex justify-between items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <span className="text-sm text-[#003F9C]">
            Visualizando: {activeFileNameLocal} (Importado em:{" "}
            {activeFileDateLocal
              ? format(activeFileDateLocal, "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })
              : "N/A"}
            )
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearActiveFileView}
            className="text-[#003F9C] hover:bg-[#003F9C]/10 p-1"
          >
            <X className="h-4 w-4" /> Limpar Visualização
          </Button>
        </div>
      )}
      {uploading && (
        <div className="flex justify-center items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#003F9C] mr-2"></div>
          <span className="text-sm text-[#003F9C]">Processando arquivo...</span>
        </div>
      )}

      {!activeFileId && importedFilesHistory.length > 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm mb-6">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Nenhum arquivo selecionado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Selecione um arquivo da lista de importados para visualizar os
            dados.
          </p>
        </div>
      )}

      {!activeFileId && importedFilesHistory.length === 0 && !uploading && (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm mb-6">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            Nenhum arquivo importado
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Importe um arquivo CSV para começar a visualizar os dados.
          </p>
        </div>
      )}

      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 ${
          !activeFileId ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">Perda Anual</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!activeFileId}
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="block mb-2">Ordenar por</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                            >
                              {sortOptionPerda === "a-z" && "A-Z"}
                              {sortOptionPerda === "z-a" && "Z-A"}
                              {sortOptionPerda === "crescente" && "Crescente"}
                              {sortOptionPerda === "decrescente" &&
                                "Decrescente"}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => setSortOptionPerda("a-z")}
                            >
                              A-Z
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortOptionPerda("z-a")}
                            >
                              Z-A
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortOptionPerda("crescente")}
                            >
                              Crescente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setSortOptionPerda("decrescente")}
                            >
                              Decrescente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">Faixa de valores</Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="number"
                            value={perdaRange[0]}
                            onChange={(e) =>
                              setPerdaRange([
                                Number(e.target.value),
                                perdaRange[1],
                              ])
                            }
                            min={0}
                            max={maxPerda}
                            className="w-20"
                          />
                          <span>a</span>
                          <Input
                            type="number"
                            value={perdaRange[1]}
                            onChange={(e) =>
                              setPerdaRange([
                                perdaRange[0],
                                Number(e.target.value),
                              ])
                            }
                            min={0}
                            max={maxPerda}
                            className="w-20"
                          />
                        </div>
                        <Slider
                          defaultValue={perdaRange}
                          onValueChange={handleSliderChange(setPerdaRange)}
                          min={0}
                          max={maxPerda}
                          step={100}
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)]">
              <div
                className="w-full h-full overflow-x-auto"
                style={{ overflowY: "hidden" }}
              >
                <div
                  style={{
                    width: `${Math.max(processedPerdaData.length * 60, 300)}px`,
                    height: "400px",
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processedPerdaData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      barSize={Math.min(
                        30,
                        processedPerdaData.length > 0
                          ? (processedPerdaData.length * 60 * 0.8) /
                              processedPerdaData.length
                          : 30
                      )}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <YAxis width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Perda Anual"
                        fill={compesaColors.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">
                  Perdas por Município
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)]">
              <div
                className="w-full h-full overflow-x-auto"
                style={{ overflowY: "hidden" }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      processedPerdasData.length * 90,
                      400
                    )}px`,
                    height: "400px",
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processedPerdasData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <YAxis width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar
                        dataKey="manutencao"
                        fill={compesaColors.primary}
                        name="Manutenção"
                        radius={[4, 4, 0, 0]}
                        barSize={Math.min(
                          20,
                          processedPerdasData.length > 0 ? 20 : 15
                        )}
                      />
                      <Bar
                        dataKey="faltaAgua"
                        fill={compesaColors.secondary}
                        name="Falta de Água"
                        radius={[4, 4, 0, 0]}
                        barSize={Math.min(
                          20,
                          processedPerdasData.length > 0 ? 20 : 15
                        )}
                      />
                      <Bar
                        dataKey="semAcesso"
                        fill={compesaColors.tertiary}
                        name="Sem Acesso"
                        radius={[4, 4, 0, 0]}
                        barSize={Math.min(
                          20,
                          processedPerdasData.length > 0 ? 20 : 15
                        )}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-[#003F9C]">
                Manutenções e Volume por Município
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)] overflow-y-auto text-sm">
              {gastosMunicipiosDataLocal.length > 0 ? (
                <ul className="space-y-2">
                  {gastosMunicipiosDataLocal.map((item, index) => (
                    <li key={index} className="border-b pb-1">
                      <strong>{item.name}:</strong>
                      <div className="pl-2">
                        Manutenções: {item.manutencoes.toLocaleString("pt-BR")}
                        <br />
                        Volume Produzido: {item.valor.toLocaleString(
                          "pt-BR"
                        )}{" "}
                        m³/h
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">Nenhum dado para exibir.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <CardTitle className="text-[#003F9C]">
                Volume Produzido vs. Consumido (m³/h)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)] overflow-y-auto text-sm">
              {volumeTotalDataLocal.length > 0 ? (
                <ul className="space-y-2">
                  {volumeTotalDataLocal.map((item, index) => (
                    <li key={index} className="border-b pb-1">
                      <strong>{item.name}:</strong>
                      <div className="pl-2">
                        Produzido: {item.produzido.toLocaleString("pt-BR")} m³/h
                        <br />
                        Consumido: {item.consumido.toLocaleString("pt-BR")} m³/h
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">
                  Nenhum dado de volume para exibir.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 ${
          !activeFileId ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="lg:col-span-12">
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">
                  Balanço dos Volumes Acumulado (m³)
                </CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={!activeFileId}
                    >
                      <Filter className="h-4 w-4" />
                      Filtros
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="block mb-2">Ordenar por</Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between"
                            >
                              {sortOptionBalanco === "a-z" && "Município A-Z"}
                              {sortOptionBalanco === "z-a" && "Município Z-A"}
                              {sortOptionBalanco === "crescente" &&
                                `Valor Crescente (${sortKeyBalanco})`}
                              {sortOptionBalanco === "decrescente" &&
                                `Valor Decrescente (${sortKeyBalanco})`}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("a-z");
                                setSortKeyBalanco("name");
                              }}
                            >
                              Município A-Z
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("z-a");
                                setSortKeyBalanco("name");
                              }}
                            >
                              Município Z-A
                            </DropdownMenuItem>
                            <DropdownMenuLabel>
                              Por Volume Distribuído
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("crescente");
                                setSortKeyBalanco("distribuido");
                              }}
                            >
                              Crescente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("decrescente");
                                setSortKeyBalanco("distribuido");
                              }}
                            >
                              Decrescente
                            </DropdownMenuItem>
                            <DropdownMenuLabel>
                              Por Volume Consumido
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("crescente");
                                setSortKeyBalanco("consumido");
                              }}
                            >
                              Crescente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("decrescente");
                                setSortKeyBalanco("consumido");
                              }}
                            >
                              Decrescente
                            </DropdownMenuItem>
                            <DropdownMenuLabel>
                              Por Volume de Perda
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("crescente");
                                setSortKeyBalanco("perdaVolume");
                              }}
                            >
                              Crescente
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSortOptionBalanco("decrescente");
                                setSortKeyBalanco("perdaVolume");
                              }}
                            >
                              Decrescente
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">
                          Filtrar por valor de:
                        </Label>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between capitalize"
                            >
                              {filterKeyBalanco.replace(
                                "perdaVolume",
                                "Perda de Volume"
                              )}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => setFilterKeyBalanco("distribuido")}
                            >
                              Distribuído
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFilterKeyBalanco("consumido")}
                            >
                              Consumido
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setFilterKeyBalanco("perdaVolume")}
                            >
                              Perda de Volume
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">
                          Faixa de valores (m³)
                        </Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="number"
                            value={balancoRange[0]}
                            onChange={(e) =>
                              setBalancoRange([
                                Number(e.target.value),
                                balancoRange[1],
                              ])
                            }
                            min={0}
                            max={maxBalanco}
                            className="w-20"
                          />
                          <span>a</span>
                          <Input
                            type="number"
                            value={balancoRange[1]}
                            onChange={(e) =>
                              setBalancoRange([
                                balancoRange[0],
                                Number(e.target.value),
                              ])
                            }
                            min={0}
                            max={maxBalanco}
                            className="w-20"
                          />
                        </div>
                        <Slider
                          defaultValue={balancoRange}
                          onValueChange={handleSliderChange(setBalancoRange)}
                          min={0}
                          max={maxBalanco}
                          step={100}
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)]">
              <div
                className="w-full h-full overflow-x-auto"
                style={{ overflowY: "hidden" }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      processedBalancoData.length * 100,
                      400
                    )}px`,
                    height: "400px",
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={processedBalancoData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                        interval={0}
                      />
                      <YAxis width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ paddingTop: "20px" }} />
                      <Bar
                        dataKey="distribuido"
                        fill={compesaColors.primary}
                        name="Volume Distribuído"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="consumido"
                        fill={compesaColors.secondary}
                        name="Volume Consumido"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="perdaVolume"
                        fill={compesaColors.red}
                        name="Volume de Perda"
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={`mb-6 p-4 bg-white rounded-lg shadow-sm ${
          !activeFileId ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h3 className="text-lg font-semibold text-[#003F9C]">
            Evolução dos Volumes{" "}
            {selectedMunicipioEvolucao !== "COMPESA"
              ? `(${selectedMunicipioEvolucao})`
              : "(COMPESA)"}
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto min-w-[200px] justify-between border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10"
                disabled={!activeFileId}
              >
                {selectedMunicipioEvolucao === "COMPESA"
                  ? "COMPESA"
                  : selectedMunicipioEvolucao}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={selectedMunicipioEvolucao}
                onValueChange={setSelectedMunicipioEvolucao}
              >
                <DropdownMenuRadioItem value="COMPESA">
                  COMPESA (Agregado)
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Municípios</DropdownMenuLabel>
                {municipiosListEvolucao.map((municipio) => (
                  <DropdownMenuRadioItem key={municipio} value={municipio}>
                    {municipio}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Nota: Os gráficos de evolução abaixo mostram o valor total do período
          do CSV carregado, repetido para cada mês (simulando uma linha). Para
          uma evolução mensal real, o CSV precisa conter dados mensais.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Evolução Volume Distribuído (m³)",
              data: evolucaoDistribuidoData,
              color: compesaColors.primary,
              dataKey: "value" as const,
            },
            {
              title: "Evolução Volume Consumido (m³)",
              data: evolucaoConsumidoData,
              color: compesaColors.secondary,
              dataKey: "value" as const,
            },
            {
              title: "Evolução Volume Perdido (m³)",
              data: evolucaoPerdidoData,
              color: compesaColors.red,
              dataKey: "value" as const,
            },
          ].map((chart) => (
            <Card key={chart.title} className="border-0 shadow-sm h-[400px]">
              <CardHeader className="border-b p-4">
                <CardTitle className="text-md text-[#1A2C56]">
                  {chart.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-57px)]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chart.data}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      width={70}
                      tickFormatter={(value: number | string) =>
                        value.toLocaleString("pt-BR")
                      }
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey={chart.dataKey}
                      stroke={chart.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      name={chart.title.split("(")[0].trim()}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
};

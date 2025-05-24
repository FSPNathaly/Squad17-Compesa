import { ptBR } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Download, Upload, Users, ChevronDown, Calendar, Filter, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { format, parseISO, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CsvFile {
  id: string;
  name: string;
  data: any[];
  sheetType: string;
  referenceDate: Date;
  lastModified: number;
}

interface CsvData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  'Volume Disponibilizado': string;
  'Volume Produzido': string;
  'Volume Consumido': string;
  [key: string]: string;
}

const RangeSlider = ({ 
  value, 
  onChange,
  min, 
  max, 
  step = 100,
  className = ""
}: {
  value: [number, number];
  onChange: (value: [number, number]) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = [...value] as [number, number];
    newValue[index] = Number(e.target.value);
    onChange(newValue);
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{value[0].toLocaleString('pt-BR')}</span>
        <span className="text-sm text-gray-600">{value[1].toLocaleString('pt-BR')}</span>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => handleChange(e, 0)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => handleChange(e, 1)}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

const SelectDropdown = ({
  value,
  onChange,
  options,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {selectedLabel}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] z-50">
        {options.map((option) => (
          <DropdownMenuItem 
            key={option.value} 
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<CsvFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<CsvFile[]>([]);
  const [fileReferenceDate, setFileReferenceDate] = useState<Date>(new Date());
  const [uploading, setUploading] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | undefined>();
  const [viewMode, setViewMode] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [perdaAnualData, setPerdaAnualData] = useState<{name: string, value: number}[]>([]);
  const [gastosMunicipiosData, setGastosMunicipiosData] = useState<{name: string, manutencoes: number, valor: number}[]>([]);
  const [perdasMunicipioData, setPerdasMunicipioData] = useState<{name: string, manutencao: number, faltaAgua: number, semAcesso: number}[]>([]);
  const [volumeTotalData, setVolumeTotalData] = useState<{name: string, produzido: number, consumido: number}[]>([]);
  const [sortOptionPerda, setSortOptionPerda] = useState<string>('decrescente');
  const [sortOptionPerdas, setSortOptionPerdas] = useState<string>('decrescente');
  const [sortOptionVolume, setSortOptionVolume] = useState<string>('decrescente');
  const [currentPage, setCurrentPage] = useState(1);
  const [perdaRange, setPerdaRange] = useState<[number, number]>([0, 1000000]);
  const [perdasRange, setPerdasRange] = useState<[number, number]>([0, 1000000]);
  const [volumeRange, setVolumeRange] = useState<[number, number]>([0, 1000000]);
  const [maxPerda, setMaxPerda] = useState<number>(1000000);
  const [maxPerdas, setMaxPerdas] = useState<number>(1000000);
  const [maxVolume, setMaxVolume] = useState<number>(1000000);

  const compesaColors = {
    primary: '#003F9C',
    secondary: '#5D8BF4',
    tertiary: '#85A6F2',
    background: '#F0F5FF',
    text: '#1A2C56'
  };

  const sheetOptions = [
    'Análise VD e Perdas',
    'Perdas Acumuladas',
    'Relatório de Desvios',
    'Volume Distribuído',
    'Volume Consumido',
    'Auxílio Operacional'
  ];

  const viewModeOptions = [
    { value: 'daily', label: 'Diário' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' }
  ];

  const itemsPerPage = 10;

  const cleanAndParseNumber = (value: string): number => {
    if (!value || value.trim() === "" || value === " - ") return 0;
    const cleanedValue = value.trim().replace(/[^\d,-]/g, '').replace(/\./g, '').replace(',', '.');
    const parsedValue = parseFloat(cleanedValue);
    return isNaN(parsedValue) ? 0 : Math.abs(parsedValue);
  };

  useEffect(() => {
    const savedFiles = localStorage.getItem('compesaFiles');
    if (savedFiles) {
      const parsedFiles = JSON.parse(savedFiles);
      const filesWithDates = parsedFiles.map((file: any) => ({
        ...file,
        referenceDate: new Date(file.referenceDate)
      }));
      setFiles(filesWithDates);
      if (filesWithDates.length > 0) {
        setSelectedFiles([filesWithDates[0]]);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedFiles.length > 0) {
      const combinedData = selectedFiles.flatMap(file => file.data);
      processData(combinedData);
    } else {
      resetData();
    }
  }, [selectedFiles, viewMode]);

  const processData = (data: CsvData[]) => {
    const perdaData = data.map(item => ({
      name: item.Municipios,
      value: cleanAndParseNumber(item.Perda)
    }));
    
    const gastosData = data.map(item => ({
      name: item.Municipios,
      manutencoes: Math.floor(cleanAndParseNumber(item.Perda) / 50000),
      valor: cleanAndParseNumber(item.VD)
    }));
    
    const perdasData = data.map(item => ({
      name: item.Municipios,
      manutencao: cleanAndParseNumber(item.Perda) * 0.6,
      faltaAgua: cleanAndParseNumber(item.Perda) * 0.3,
      semAcesso: cleanAndParseNumber(item.Perda) * 0.1
    }));
    
    const volumeData = data.map(item => ({
      name: item.Municipios,
      produzido: cleanAndParseNumber(item['Volume Produzido']),
      consumido: cleanAndParseNumber(item['Volume Consumido'])
    }));

    setPerdaAnualData(perdaData);
    setGastosMunicipiosData(gastosData);
    setPerdasMunicipioData(perdasData);
    setVolumeTotalData(volumeData);

    updateMaxValues(perdaData, perdasData, volumeData);
  };

  const resetData = () => {
    setPerdaAnualData([]);
    setGastosMunicipiosData([]);
    setPerdasMunicipioData([]);
    setVolumeTotalData([]);
  };

  const updateMaxValues = (
    perdaData: {value: number}[],
    perdasData: {manutencao: number}[],
    volumeData: {produzido: number}[]
  ) => {
    const maxPerdaValue = Math.max(...perdaData.map(item => item.value), 0);
    const maxPerdasValue = Math.max(...perdasData.map(item => item.manutencao), 0);
    const maxVolumeValue = Math.max(...volumeData.map(item => item.produzido), 0);

    setMaxPerda(Math.ceil(maxPerdaValue / 100000) * 100000);
    setMaxPerdas(Math.ceil(maxPerdasValue / 100000) * 100000);
    setMaxVolume(Math.ceil(maxVolumeValue / 100000) * 100000);

    setPerdaRange([0, Math.ceil(maxPerdaValue / 100000) * 100000]);
    setPerdasRange([0, Math.ceil(maxPerdasValue / 100000) * 100000]);
    setVolumeRange([0, Math.ceil(maxVolumeValue / 100000) * 100000]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !fileReferenceDate) return;

    setUploading(true);
    
    Papa.parse<CsvData>(file, {
      header: true,
      complete: (results) => {
        const validData = results.data.filter(item => 
          item.Municipios && item.Municipios.trim() !== "" && item.Municipios !== "Check" && item.Municipios !== "Total"
        );

        const processedData = validData.map(item => ({
          ...item,
          VD: cleanAndParseNumber(item.VD).toFixed(2),
          Perda: cleanAndParseNumber(item.Perda).toFixed(2),
          'Volume Produzido': (cleanAndParseNumber(item['Volume Produzido']) * 1000).toFixed(2),
          'Volume Consumido': (cleanAndParseNumber(item['Volume Consumido']) * 1000).toFixed(2)
        }));

        const newFile: CsvFile = {
          id: Date.now().toString(),
          name: file.name,
          data: processedData,
          sheetType: 'Análise VD e Perdas',
          referenceDate: fileReferenceDate,
          lastModified: Date.now()
        };

        const updatedFiles = [...files, newFile];
        setFiles(updatedFiles);
        localStorage.setItem('compesaFiles', JSON.stringify(updatedFiles));
        setSelectedFiles([newFile]);
        setUploading(false);
        setFileReferenceDate(new Date());
      },
      error: () => {
        setUploading(false);
      }
    });
  };

  const updateFile = (id: string, updates: Partial<CsvFile>) => {
    const updatedFiles = files.map(file => 
      file.id === id ? { ...file, ...updates, lastModified: Date.now() } : file
    );
    setFiles(updatedFiles);
    localStorage.setItem('compesaFiles', JSON.stringify(updatedFiles));
    setSelectedFiles(prev => 
      prev.map(file => file.id === id ? { ...file, ...updates } : file)
    );
  };

  const deleteFile = (id: string) => {
    const updatedFiles = files.filter(file => file.id !== id);
    setFiles(updatedFiles);
    localStorage.setItem('compesaFiles', JSON.stringify(updatedFiles));
    setSelectedFiles(prev => prev.filter(file => file.id !== id));
  };

  const toggleFileSelection = (file: CsvFile) => {
    setSelectedFiles(prev => 
      prev.some(f => f.id === file.id)
        ? prev.filter(f => f.id !== file.id)
        : [...prev, file]
    );
  };

  const generatePDFReport = () => {
    if (selectedFiles.length === 0) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(compesaColors.primary);
    doc.text('Relatório COMPESA', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    const dateRange = selectedFiles.length === 1
      ? format(selectedFiles[0].referenceDate, "MMM yyyy", { locale: ptBR })
      : `${format(selectedFiles[0].referenceDate, "MMM yyyy", { locale: ptBR })} - ${format(selectedFiles[selectedFiles.length - 1].referenceDate, "MMM yyyy", { locale: ptBR })}`;
    
    doc.text(`Período de referência: ${dateRange}`, 105, 30, { align: 'center' });

    let yPosition = 40;
    selectedFiles.forEach(file => {
      file.data.slice(0, 20).forEach((item: CsvData) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.setFontSize(10);
        doc.setTextColor(compesaColors.primary);
        doc.text(`Município: ${item.Municipios}`, 14, yPosition);
        doc.setTextColor(compesaColors.text);
        doc.text(`Perda Anual: R$ ${cleanAndParseNumber(item.Perda).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, yPosition + 5);
        doc.text(`Volume Produzido: ${(cleanAndParseNumber(item['Volume Produzido']) / 1000).toLocaleString('pt-BR')} mil m³/h`, 14, yPosition + 10);
        doc.text(`Volume Consumido: ${(cleanAndParseNumber(item['Volume Consumido']) / 1000).toLocaleString('pt-BR')} mil m³/h`, 14, yPosition + 15);
        yPosition += 25;
      });
    });

    doc.save(`relatorio_compesa_${format(new Date(), "yyyy-MM")}.pdf`);
  };

  const generateCSVReport = () => {
    if (selectedFiles.length === 0) return;

    const combinedData = selectedFiles.flatMap(file => file.data);
    const csv = Papa.unparse(combinedData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_compesa_${format(new Date(), "yyyy-MM")}.csv`;
    link.click();
  };

  const sortData = (data: any[], option: string, key: string) => {
    switch (option) {
      case 'a-z': return [...data].sort((a, b) => a.name.localeCompare(b.name));
      case 'z-a': return [...data].sort((a, b) => b.name.localeCompare(a.name));
      case 'crescente': return [...data].sort((a, b) => a[key] - b[key]);
      case 'decrescente': return [...data].sort((a, b) => b[key] - a[key]);
      default: return data;
    }
  };

  const filterByRange = (data: any[], range: [number, number], key: string) => {
    return data.filter(item => item[key] >= range[0] && item[key] <= range[1]);
  };

  const filterFilesByDate = (file: CsvFile) => {
    if (!filterDate) return true;
    switch (viewMode) {
      case 'daily': return isSameDay(file.referenceDate, filterDate);
      case 'monthly': return isSameMonth(file.referenceDate, filterDate) && isSameYear(file.referenceDate, filterDate);
      case 'yearly': return isSameYear(file.referenceDate, filterDate);
      default: return true;
    }
  };

  const filteredFiles = files.filter(filterFilesByDate);
  const processedPerdaData = filterByRange(sortData(perdaAnualData, sortOptionPerda, 'value'), perdaRange, 'value');
  const processedPerdasData = filterByRange(sortData(perdasMunicipioData, sortOptionPerdas, 'manutencao'), perdasRange, 'manutencao');
  const processedVolumeData = filterByRange(sortData(volumeTotalData, sortOptionVolume, 'produzido'), volumeRange, 'produzido');

  const FileUploadStatus = () => (
    uploading && (
      <div className="flex justify-center items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#003F9C] mr-2"></div>
        <span className="text-sm text-[#003F9C]">Processando arquivo...</span>
      </div>
    )
  );

  const FileList = () => (
    <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
      <h3 className="text-sm font-medium text-[#003F9C] mb-2">Arquivos Disponíveis</h3>
      <div className="grid grid-cols-12 gap-4 font-medium text-[#003F9C] border-b pb-2">
        <div className="col-span-5">Nome do Arquivo</div>
        <div className="col-span-3">Tipo de Planilha</div>
        <div className="col-span-2">Período</div>
        <div className="col-span-2">Ações</div>
      </div>
      <div className="max-h-60 overflow-y-auto">
        {filteredFiles.map(file => (
          <div key={file.id} className="grid grid-cols-12 gap-4 items-center border-b py-2">
            <div className="col-span-5 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedFiles.some(f => f.id === file.id)}
                onChange={() => toggleFileSelection(file)}
                className="h-4 w-4 text-[#003F9C] rounded border-gray-300 focus:ring-[#003F9C]"
              />
              <span className="truncate">{file.name}</span>
            </div>
            <div className="col-span-3">
              <SelectDropdown
                value={file.sheetType}
                onChange={(value) => updateFile(file.id, { sheetType: value })}
                options={sheetOptions.map(option => ({ value: option, label: option }))}
                placeholder="Selecione"
              />
            </div>
            <div className="col-span-2 text-sm">
              {format(file.referenceDate, "dd/MM/yyyy", { locale: ptBR })}
            </div>
            <div className="col-span-2 flex justify-end space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => deleteFile(file.id)}
                className="text-red-500 border-red-500 hover:bg-red-500/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const ResponsiveChartContainer = ({ children, data }: { children: React.ReactNode, data: any[] }) => (
    <div className="w-full h-full overflow-x-auto" style={{ overflowY: 'hidden' }}>
      <div style={{ width: `${data.length * 60}px`, height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );

  const ChartFilters = ({
    sortOption,
    setSortOption,
    range,
    setRange,
    max,
    step
  }: {
    sortOption: string;
    setSortOption: (value: string) => void;
    range: [number, number];
    setRange: (value: [number, number]) => void;
    max: number;
    step: number;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 p-4 z-50">
        <div className="space-y-4">
          <div>
            <Label className="block mb-2">Ordenar por</Label>
            <SelectDropdown
              value={sortOption}
              onChange={setSortOption}
              options={[
                { value: 'a-z', label: 'A-Z' },
                { value: 'z-a', label: 'Z-A' },
                { value: 'crescente', label: 'Crescente' },
                { value: 'decrescente', label: 'Decrescente' }
              ]}
              placeholder="Ordenação"
            />
          </div>
          <div>
            <Label className="block mb-2">Faixa de valores</Label>
            <div className="flex items-center gap-2 mb-2">
              <Input 
                type="number" 
                value={range[0]} 
                onChange={(e) => setRange([Number(e.target.value), range[1]])}
                min={0}
                max={max}
                className="w-20"
              />
              <span>a</span>
              <Input 
                type="number" 
                value={range[1]} 
                onChange={(e) => setRange([range[0], Number(e.target.value)])}
                min={0}
                max={max}
                className="w-20"
              />
            </div>
            <RangeSlider 
              value={range} 
              onChange={setRange} 
              min={0} 
              max={max} 
              step={step} 
            />
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const PerdaAnualChart = () => (
    <Card className="border-0 shadow-sm h-[500px]">
      <CardHeader className="border-b p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-[#003F9C]">Perda Anual (R$)</CardTitle>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500">
                {selectedFiles.length} {selectedFiles.length > 1 ? 'períodos selecionados' : 'período selecionado'}
              </p>
            )}
          </div>
          <ChartFilters
            sortOption={sortOptionPerda}
            setSortOption={setSortOptionPerda}
            range={perdaRange}
            setRange={setPerdaRange}
            max={maxPerda}
            step={10000}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-65px)]">
        <ResponsiveChartContainer data={processedPerdaData}>
          <BarChart data={processedPerdaData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} interval={0} />
            <YAxis width={80} />
            <Tooltip 
              formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Perda Anual']}
              contentStyle={{
                backgroundColor: 'white',
                borderColor: compesaColors.tertiary,
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            <Bar dataKey="value" fill={compesaColors.primary} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveChartContainer>
      </CardContent>
    </Card>
  );

  const PerdasMunicipioChart = () => (
    <Card className="border-0 shadow-sm h-[500px]">
      <CardHeader className="border-b p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-[#003F9C]">Perdas por Município (R$)</CardTitle>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500">
                Visualização: {viewMode === 'daily' ? 'Diária' : viewMode === 'monthly' ? 'Mensal' : 'Anual'}
              </p>
            )}
          </div>
          <ChartFilters
            sortOption={sortOptionPerdas}
            setSortOption={setSortOptionPerdas}
            range={perdasRange}
            setRange={setPerdasRange}
            max={maxPerdas}
            step={10000}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-65px)]">
        <ResponsiveChartContainer data={processedPerdasData}>
          <BarChart data={processedPerdasData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} interval={0} />
            <YAxis width={80} />
            <Tooltip 
              formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Valor']}
              contentStyle={{
                backgroundColor: 'white',
                borderColor: compesaColors.tertiary,
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="manutencao" fill={compesaColors.primary} name="Manutenção" />
            <Bar dataKey="faltaAgua" fill={compesaColors.secondary} name="Falta de Água" />
            <Bar dataKey="semAcesso" fill={compesaColors.tertiary} name="Sem Acesso" />
          </BarChart>
        </ResponsiveChartContainer>
      </CardContent>
    </Card>
  );

  const GastosMunicipaisList = () => (
    <Card className="border-0 shadow-sm h-[500px]">
      <CardHeader className="border-b p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-[#003F9C]">Gastos Municipais (R$)</CardTitle>
            {selectedFiles.length > 0 && (
              <p className="text-sm text-gray-500">
                Dados combinados de {selectedFiles.length} {selectedFiles.length > 1 ? 'arquivos' : 'arquivo'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              Anterior
            </Button>
            <span className="text-sm text-gray-600">
              Página {currentPage} de {Math.ceil(gastosMunicipiosData.length / itemsPerPage)}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={currentPage * itemsPerPage >= gastosMunicipiosData.length}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-65px)] overflow-y-auto">
        {gastosMunicipiosData
          .sort((a, b) => b.valor - a.valor)
          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
          .map((item) => (
            <div key={item.name} className="py-3 border-b last:border-b-0">
              <div className="flex justify-between items-center">
                <span className="font-medium text-[#1A2C56] truncate">{item.name}</span>
                <span className="text-sm text-gray-500">{item.manutencoes.toFixed(0)} manutenções</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="font-bold text-[#003F9C]">
                  R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );

  const VolumeChart = () => (
    <Card className="border-0 shadow-sm h-[500px]">
      <CardHeader className="border-b p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div>
            <CardTitle className="text-[#003F9C]">Volume Produzido (m³/h)</CardTitle>
            {filterDate && (
              <p className="text-sm text-gray-500">
                Período: {format(filterDate, viewMode === 'yearly' ? "yyyy" : viewMode === 'monthly' ? "MMM yyyy" : "dd MMM yyyy", { locale: ptBR })}
              </p>
            )}
          </div>
          <ChartFilters
            sortOption={sortOptionVolume}
            setSortOption={setSortOptionVolume}
            range={volumeRange}
            setRange={setVolumeRange}
            max={maxVolume}
            step={10000}
          />
        </div>
      </CardHeader>
      <CardContent className="p-4 h-[calc(100%-65px)]">
        <ResponsiveChartContainer data={processedVolumeData}>
          <BarChart data={processedVolumeData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} tick={{ fontSize: 12 }} interval={0} />
            <YAxis width={80} />
            <Tooltip 
              formatter={(value) => [`${(Number(value) / 1000).toLocaleString('pt-BR')} mil m³/h`, 'Volume']}
              contentStyle={{
                backgroundColor: 'white',
                borderColor: compesaColors.tertiary,
                borderRadius: '0.5rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Bar dataKey="produzido" fill={compesaColors.primary} name="Produzido" />
            <Bar dataKey="consumido" fill={compesaColors.secondary} name="Consumido" />
          </BarChart>
        </ResponsiveChartContainer>
      </CardContent>
    </Card>
  );

  const DateFilter = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 w-full">
          <Calendar className="h-4 w-4" />
          {filterDate ? 
            format(filterDate, viewMode === 'yearly' ? "yyyy" : viewMode === 'monthly' ? "MMM yyyy" : "dd MMM yyyy", { locale: ptBR }) : 
            "Filtrar período"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50">
        <CalendarComp
          mode="single"
          selected={filterDate}
          onSelect={setFilterDate}
          initialFocus
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  );

  const ExportDropdown = () => {
    const [open, setOpen] = useState(false);
    
    return (
      <DropdownMenu onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 w-full" 
            disabled={selectedFiles.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="truncate">Exportar</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-48 z-50">
          <DropdownMenuItem onClick={generateCSVReport} className="cursor-pointer focus:bg-[#003F9C]/10">
            Exportar como CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={generatePDFReport} className="cursor-pointer focus:bg-[#003F9C]/10">
            Exportar como PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const UserDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
        <span className="hidden md:block text-sm font-medium text-[#1A2C56]">Admin</span>
        <Avatar className="w-10 h-10 border-2 border-[#85A6F2]">
          <AvatarImage src="https://github.com/shadcn.png" />
          <AvatarFallback className="bg-[#85A6F2] text-white font-medium">AD</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 z-50">
        <DropdownMenuLabel>
          <div className="flex flex-col">
            <span className="font-medium">Administrador</span>
            <span className="text-xs text-gray-500">admin@compesa.com.br</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="cursor-pointer text-red-500 focus:bg-red-50" onClick={() => navigate("/")}>
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const Header = () => (
    <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
      <img 
        src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" 
        alt="Compesa Logo" 
        className="h-12"
      />
      
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <SelectDropdown
            value={viewMode}
            onChange={(value) => setViewMode(value as 'daily' | 'monthly' | 'yearly')}
            options={viewModeOptions}
            placeholder="Visualização"
          />

          <DateFilter />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 w-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span className="truncate">Importar CSV</span>
          </Button>
          <input type="file" ref={fileInputRef} accept=".csv" onChange={handleFileUpload} className="hidden" />

          <ExportDropdown />

          <UserDropdown />
        </div>
      </div>
    </header>
  );

  return (
    <main className="min-h-screen bg-[#F0F5FF] p-4">
      <Header />
      
      <FileUploadStatus />
      
      <FileList />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <PerdaAnualChart />
          <PerdasMunicipioChart />
        </div>

        <div className="lg:col-span-5 space-y-6">
          <GastosMunicipaisList />
          <VolumeChart />
        </div>
      </div>
    </main>
  );
};
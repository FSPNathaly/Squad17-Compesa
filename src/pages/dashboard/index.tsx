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
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Slider = ({ 
  value, 
  onValueChange, 
  min, 
  max, 
  step = 100,
  className = "",
  ...props 
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  className?: string;
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = [...value];
    newValue[index] = Number(e.target.value);
    onValueChange(newValue);
  };

  return (
    <div className={`w-full ${className}`} {...props}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600">{value[0]}</span>
        <span className="text-sm text-gray-600">{value[1]}</span>
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

interface CsvData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  'Volume Produzido': string;
  'Volume Consumido': string;
  [key: string]: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [perdaAnualData, setPerdaAnualData] = useState<{name: string, value: number}[]>([]);
  const [gastosMunicipiosData, setGastosMunicipiosData] = useState<{name: string, manutencoes: number, valor: number}[]>([]);
  const [perdasMunicipioData, setPerdasMunicipioData] = useState<{name: string, manutencao: number, faltaAgua: number, semAcesso: number}[]>([]);
  const [volumeTotalData, setVolumeTotalData] = useState<{name: string, produzido: number, consumido: number}[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rawData, setRawData] = useState<CsvData[]>([]);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOptionPerda, setSortOptionPerda] = useState<string>('decrescente');
  const [sortOptionPerdas, setSortOptionPerdas] = useState<string>('decrescente');
  const [sortOptionVolume, setSortOptionVolume] = useState<string>('decrescente');
  const [maxPerda, setMaxPerda] = useState<number>(10000);
  const [maxPerdas, setMaxPerdas] = useState<number>(10000);
  const [maxVolume, setMaxVolume] = useState<number>(10000);
  const [perdaRange, setPerdaRange] = useState<[number, number]>([0, 10000]);
  const [perdasRange, setPerdasRange] = useState<[number, number]>([0, 10000]);
  const [volumeRange, setVolumeRange] = useState<[number, number]>([0, 10000]);
  const itemsPerPage = 10;

  const compesaColors = {
    primary: '#003F9C',
    secondary: '#5D8BF4',
    tertiary: '#85A6F2',
    background: '#F0F5FF',
    text: '#1A2C56'
  };

  useEffect(() => {
    if (rawData.length > 0) {
      const maxPerdaValue = Math.max(...perdaAnualData.map(item => item.value));
      setMaxPerda(Math.ceil(maxPerdaValue / 100) * 100);
      setPerdaRange([0, Math.ceil(maxPerdaValue / 100) * 100]);

      const maxPerdasValue = Math.max(...perdasMunicipioData.map(item => item.manutencao));
      setMaxPerdas(Math.ceil(maxPerdasValue / 100) * 100);
      setPerdasRange([0, Math.ceil(maxPerdasValue / 100) * 100]);

      const maxVolumeValue = Math.max(...volumeTotalData.map(item => item.produzido));
      setMaxVolume(Math.ceil(maxVolumeValue / 100) * 100);
      setVolumeRange([0, Math.ceil(maxVolumeValue / 100) * 100]);
    }
  }, [rawData]);

  const handleImport = () => fileInputRef.current?.click();

  const handleCancelImport = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileName(null);
    setRawData([]);
    setPerdaAnualData([]);
    setGastosMunicipiosData([]);
    setPerdasMunicipioData([]);
    setVolumeTotalData([]);
  };

  const parseBrazilianNumber = (value: string) => {
    return value ? parseFloat(value.replace(/\./g, '').replace(',', '.')) : 0;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    
    Papa.parse<CsvData>(file, {
      header: true,
      complete: (results) => {
        const data = results.data;
        setRawData(data);
        
        const perdaAnual = data.reduce((acc: Record<string, number>, item: CsvData) => {
          const municipio = item.Municipios;
          const perda = parseBrazilianNumber(item.Perda);
          acc[municipio] = (acc[municipio] || 0) + perda;
          return acc;
        }, {} as Record<string, number>);
        
        const perdaData = Object.entries(perdaAnual).map(([name, value]) => ({
          name,
          value
        }));
        setPerdaAnualData(perdaData);
        
        const gastosData = data.map(item => ({
          name: item.Municipios,
          manutencoes: Math.floor(parseBrazilianNumber(item.Perda) / 10000),
          valor: parseBrazilianNumber(item.VD)
        }));
        setGastosMunicipiosData(gastosData);
        
        const perdasData = data.map(item => ({
          name: item.Municipios,
          manutencao: parseBrazilianNumber(item.Perda) * 0.6,
          faltaAgua: parseBrazilianNumber(item.Perda) * 0.3,
          semAcesso: parseBrazilianNumber(item.Perda) * 0.1
        }));
        setPerdasMunicipioData(perdasData);
        
        const volumeData = data.map(item => ({
          name: item.Municipios,
          produzido: parseBrazilianNumber(item['Volume Produzido']),
          consumido: parseBrazilianNumber(item['Volume Consumido'])
        }));
        setVolumeTotalData(volumeData);

        const maxPerdaValue = Math.max(...perdaData.map(item => item.value));
        setMaxPerda(Math.ceil(maxPerdaValue / 100) * 100);
        setPerdaRange([0, Math.ceil(maxPerdaValue / 100) * 100]);

        const maxPerdasValue = Math.max(...perdasData.map(item => item.manutencao));
        setMaxPerdas(Math.ceil(maxPerdasValue / 100) * 100);
        setPerdasRange([0, Math.ceil(maxPerdasValue / 100) * 100]);

        const maxVolumeValue = Math.max(...volumeData.map(item => item.produzido));
        setMaxVolume(Math.ceil(maxVolumeValue / 100) * 100);
        setVolumeRange([0, Math.ceil(maxVolumeValue / 100) * 100]);

        setUploading(false);
      },
      error: (error) => {
        console.error("Error processing CSV:", error);
        setUploading(false);
      }
    });
  };

  const generatePDFReport = () => {
    if (!rawData.length) return;

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(compesaColors.primary);
    doc.text('Relatório COMPESA', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });

    let yPosition = 40;
    rawData.forEach((item, index) => {
      if (yPosition > 260 && index < rawData.length - 1) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(10);
      doc.setTextColor(compesaColors.primary);
      doc.text(`Município: ${item.Municipios}`, 14, yPosition);
      doc.setTextColor(compesaColors.text);
      doc.text(`Perda Anual: R$ ${parseBrazilianNumber(item.Perda).toLocaleString('pt-BR')}`, 14, yPosition + 5);
      doc.text(`Volume Produzido: ${parseBrazilianNumber(item['Volume Produzido']).toLocaleString('pt-BR')} m³/h`, 14, yPosition + 10);
      doc.text(`Volume Consumido: ${parseBrazilianNumber(item['Volume Consumido']).toLocaleString('pt-BR')} m³/h`, 14, yPosition + 15);
      yPosition += 25;
    });

    doc.save(`relatorio_compesa_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  const generateCSVReport = () => {
    if (!rawData.length) return;

    const csv = Papa.unparse(rawData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_compesa_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const sortData = (data: any[], option: string, key: string) => {
    switch (option) {
      case 'a-z':
        return [...data].sort((a, b) => a.name.localeCompare(b.name));
      case 'z-a':
        return [...data].sort((a, b) => b.name.localeCompare(a.name));
      case 'crescente':
        return [...data].sort((a, b) => a[key] - b[key]);
      case 'decrescente':
        return [...data].sort((a, b) => b[key] - a[key]);
      default:
        return data;
    }
  };

  const filterByRange = (data: any[], range: [number, number], key: string) => {
    return data.filter(item => 
      item[key] >= range[0] && 
      item[key] <= range[1]
    );
  };

  const processedPerdaData = filterByRange(sortData(perdaAnualData, sortOptionPerda, 'value'), perdaRange, 'value');
  const processedPerdasData = filterByRange(sortData(perdasMunicipioData, sortOptionPerdas, 'manutencao'), perdasRange, 'manutencao');
  const processedVolumeData = filterByRange(sortData(volumeTotalData, sortOptionVolume, 'produzido'), volumeRange, 'produzido');

  return (
    <main className="min-h-screen bg-[#F0F5FF] p-4">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm">
        <img src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" alt="Compesa Logo" className="h-12" />
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10"
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

          <Button 
            variant="outline" 
            className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10"
            onClick={handleImport}
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          
          <DropdownMenu onOpenChange={setExportDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10" 
                disabled={!rawData.length}
              >
                <Download className="h-4 w-4" />
                Exportar
                <ChevronDown className={`h-4 w-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48">
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

          <input 
            type="file" 
            ref={fileInputRef} 
            accept=".csv" 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 focus:outline-none">
              <span className="hidden md:block text-sm font-medium text-[#1A2C56]">Admin</span>
              <Avatar className="w-10 h-10 border-2 border-[#85A6F2]">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback className="bg-[#85A6F2] text-white font-medium">AD</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Administrador</span>
                  <span className="text-xs text-gray-500">admin@compesa.com.br</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-500 focus:bg-red-50">
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {fileName && (
        <div className="flex justify-between items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <span className="text-sm text-[#003F9C]">{fileName}</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleCancelImport}
            className="text-[#003F9C] hover:bg-[#003F9C]/10 p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="flex justify-center items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#003F9C] mr-2"></div>
          <span className="text-sm text-[#003F9C]">Processando arquivo...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">Perda Anual (R$)</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
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
                            <Button variant="outline" className="w-full justify-between">
                              {sortOptionPerda === 'a-z' && 'A-Z'}
                              {sortOptionPerda === 'z-a' && 'Z-A'}
                              {sortOptionPerda === 'crescente' && 'Crescente'}
                              {sortOptionPerda === 'decrescente' && 'Decrescente'}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSortOptionPerda('a-z')}>A-Z</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerda('z-a')}>Z-A</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerda('crescente')}>Crescente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerda('decrescente')}>Decrescente</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">Faixa de valores (R$)</Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input 
                            type="number" 
                            value={perdaRange[0]} 
                            onChange={(e) => setPerdaRange([Number(e.target.value), perdaRange[1]])}
                            min={0}
                            max={maxPerda}
                            className="w-20"
                          />
                          <span>a</span>
                          <Input 
                            type="number" 
                            value={perdaRange[1]} 
                            onChange={(e) => setPerdaRange([perdaRange[0], Number(e.target.value)])}
                            min={0}
                            max={maxPerda}
                            className="w-20"
                          />
                        </div>
                        <Slider
                          value={perdaRange}
                          onValueChange={setPerdaRange}
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
              <div className="w-full h-full overflow-x-auto" style={{ overflowY: 'hidden' }}>
                <div style={{ width: `${processedPerdaData.length * 60}px`, height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={processedPerdaData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      barSize={30}
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
                      <Tooltip 
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Perda Anual']}
                        contentStyle={{
                          backgroundColor: 'white',
                          borderColor: compesaColors.tertiary,
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Bar 
                        dataKey="value" 
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
                <CardTitle className="text-[#003F9C]">Perdas por Município (R$)</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
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
                            <Button variant="outline" className="w-full justify-between">
                              {sortOptionPerdas === 'a-z' && 'A-Z'}
                              {sortOptionPerdas === 'z-a' && 'Z-A'}
                              {sortOptionPerdas === 'crescente' && 'Crescente'}
                              {sortOptionPerdas === 'decrescente' && 'Decrescente'}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSortOptionPerdas('a-z')}>A-Z</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerdas('z-a')}>Z-A</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerdas('crescente')}>Crescente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionPerdas('decrescente')}>Decrescente</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">Faixa de valores (R$)</Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input 
                            type="number" 
                            value={perdasRange[0]} 
                            onChange={(e) => setPerdasRange([Number(e.target.value), perdasRange[1]])}
                            min={0}
                            max={maxPerdas}
                            className="w-20"
                          />
                          <span>a</span>
                          <Input 
                            type="number" 
                            value={perdasRange[1]} 
                            onChange={(e) => setPerdasRange([perdasRange[0], Number(e.target.value)])}
                            min={0}
                            max={maxPerdas}
                            className="w-20"
                          />
                        </div>
                        <Slider
                          value={perdasRange}
                          onValueChange={setPerdasRange}
                          min={0}
                          max={maxPerdas}
                          step={100}
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)]">
              <div className="w-full h-full overflow-x-auto" style={{ overflowY: 'hidden' }}>
                <div style={{ width: `${processedPerdasData.length * 60}px`, height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={processedPerdasData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      barSize={30}
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
                      <Tooltip 
                        formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Valor']}
                        contentStyle={{
                          backgroundColor: 'white',
                          borderColor: compesaColors.tertiary,
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '20px'
                        }} 
                      />
                      <Bar 
                        dataKey="manutencao" 
                        fill={compesaColors.primary} 
                        name="Manutenção" 
                      />
                      <Bar 
                        dataKey="faltaAgua" 
                        fill={compesaColors.secondary} 
                        name="Falta de Água" 
                      />
                      <Bar 
                        dataKey="semAcesso" 
                        fill={compesaColors.tertiary} 
                        name="Sem Acesso" 
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
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">Gastos Municipais (R$)</CardTitle>
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
                        R$ {item.valor.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm h-[500px]">
            <CardHeader className="border-b p-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#003F9C]">Volume Produzido (m³/h)</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
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
                            <Button variant="outline" className="w-full justify-between">
                              {sortOptionVolume === 'a-z' && 'A-Z'}
                              {sortOptionVolume === 'z-a' && 'Z-A'}
                              {sortOptionVolume === 'crescente' && 'Crescente'}
                              {sortOptionVolume === 'decrescente' && 'Decrescente'}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setSortOptionVolume('a-z')}>A-Z</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionVolume('z-a')}>Z-A</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionVolume('crescente')}>Crescente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortOptionVolume('decrescente')}>Decrescente</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div>
                        <Label className="block mb-2">Faixa de m³/h</Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input 
                            type="number" 
                            value={volumeRange[0]} 
                            onChange={(e) => setVolumeRange([Number(e.target.value), volumeRange[1]])}
                            min={0}
                            max={maxVolume}
                            className="w-20"
                          />
                          <span>a</span>
                          <Input 
                            type="number" 
                            value={volumeRange[1]} 
                            onChange={(e) => setVolumeRange([volumeRange[0], Number(e.target.value)])}
                            min={0}
                            max={maxVolume}
                            className="w-20"
                          />
                        </div>
                        <Slider
                          value={volumeRange}
                          onValueChange={setVolumeRange}
                          min={0}
                          max={maxVolume}
                          step={100}
                        />
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-4 h-[calc(100%-65px)]">
              <div className="w-full h-full overflow-x-auto" style={{ overflowY: 'hidden' }}>
                <div style={{ width: `${processedVolumeData.length * 60}px`, height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={processedVolumeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                      barSize={30}
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
                      <Tooltip 
                        formatter={(value) => [`${Number(value).toLocaleString('pt-BR')} m³/h`, 'Volume']}
                        contentStyle={{
                          backgroundColor: 'white',
                          borderColor: compesaColors.tertiary,
                          borderRadius: '0.5rem',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '20px'
                        }} 
                      />
                      <Bar 
                        dataKey="produzido" 
                        fill={compesaColors.primary} 
                        name="Produzido" 
                      />
                      <Bar 
                        dataKey="consumido" 
                        fill={compesaColors.secondary} 
                        name="Consumido" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};
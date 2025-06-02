import React, { useState, useMemo, useRef, useCallback } from 'react';
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
  DropdownMenuGroup
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  ChevronDown,
  LogOut, 
  ArrowLeft,
  FileText,
  Upload,
  MoreVertical,
  Trash2,
  Calendar as CalendarIcon
} from "lucide-react";
import { format } from 'date-fns';
import Papa, { type ParseResult, type ParseError as PapaParseErrorAliased } from 'papaparse';
import type { ImportedFileEntry, CsvData as AppCsvData, BalancoVolumeData as AppBalancoVolumeData } from '../../App';
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type CsvData = AppCsvData;
type BalancoVolumeData = AppBalancoVolumeData;

interface PlanilhaProps {
  importedFilesHistory: ImportedFileEntry[];
  activeFileId: string | null;
  onFileSelected: (fileId: string | null) => void;
  onFileImportedOrUpdated: (fileEntry: ImportedFileEntry) => void;
  onFileDeleted: (fileId: string) => void;
  onFileDateEdited: (fileId: string, newDate: Date) => void;
  activeFileRawData: CsvData[] | null;
  activeFileName: string | null;
  activeFileDate: Date | undefined;
  navigateToDashboard: () => void;
  onLogout: () => void;
}

const getTableHeaders = (data: CsvData[]): string[] => {
  if (!data || data.length === 0) return [];
  const preferredOrder: (keyof CsvData)[] = [
    'Id', 'Municipios', 'VD', 'Perda', 'IPD', 
    'Volume Produzido', 'Volume Consumido'
  ];
  const allKeys = new Set<string>();
  preferredOrder.forEach(key => {
    if (data.length > 0 && data[0].hasOwnProperty(key)) {
        allKeys.add(key);
    }
  });
  data.forEach(row => {
    Object.keys(row).forEach(key => allKeys.add(key));
  });
  
  return Array.from(allKeys);
};


export const Planilha = ({ 
  importedFilesHistory,
  activeFileId,
  onFileSelected,
  onFileImportedOrUpdated,
  onFileDeleted,
  onFileDateEdited,
  activeFileRawData,
  activeFileName,
  activeFileDate,
  navigateToDashboard, 
  onLogout 
}: PlanilhaProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [uploading, setUploading] = useState(false);
  const [fileToEditId, setFileToEditId] = useState<string | null>(null);

  const mainFileInputRefPlanilha = useRef<HTMLInputElement>(null);
  const editFileInputRefPlanilha = useRef<HTMLInputElement>(null);

  const parseBrazilianNumber = useCallback((value: string): number => {
    if (typeof value !== 'string') return 0;
    const cleanedValue = value.replace(/\./g, '').replace(',', '.');
    const number = parseFloat(cleanedValue);
    return isNaN(number) ? 0 : number;
  }, []);

  const processAndStoreFileDataInPlanilha = useCallback((fileId: string, fileName: string, importDate: Date, parsedData: CsvData[]) => {
    const perdaAnualAcc: Record<string, number> = parsedData.reduce((acc: Record<string, number>, item: CsvData) => {
      const municipio = item.Municipios;
      const perda = parseBrazilianNumber(item.Perda);
      if (municipio) acc[municipio] = (acc[municipio] || 0) + perda;
      return acc;
    }, {});
    const newPerdaAnualData = Object.entries(perdaAnualAcc).map(([name, val]) => ({ name, value: val }));

    const newGastosMunicipiosData = parsedData.map(item => ({
      name: item.Municipios,
      manutencoes: Math.floor(parseBrazilianNumber(item.Perda) / 10000),
      valor: parseBrazilianNumber(item.VD)
    }));

    const newPerdasMunicipioData = parsedData.map(item => ({
      name: item.Municipios,
      manutencao: parseBrazilianNumber(item.Perda) * 0.6,
      faltaAgua: parseBrazilianNumber(item.Perda) * 0.3,
      semAcesso: parseBrazilianNumber(item.Perda) * 0.1
    }));

    const newVolumeTotalData = parsedData.map(item => ({
      name: item.Municipios,
      produzido: parseBrazilianNumber(item['Volume Produzido']),
      consumido: parseBrazilianNumber(item['Volume Consumido'])
    }));

    const newBalancoData = parsedData.map(item => {
      const distribuido = parseBrazilianNumber(item['Volume Produzido']);
      const consumido = parseBrazilianNumber(item['Volume Consumido']);
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
  }, [parseBrazilianNumber, onFileImportedOrUpdated]);


  const handleFileUploadInPlanilha = useCallback((event: React.ChangeEvent<HTMLInputElement>, editingFileId: string | null = null) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    (Papa as any).parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: ParseResult<CsvData>) => {
        const parsedData: CsvData[] = (results.data as CsvData[]).filter(
            (item): item is CsvData => !!(item && item.Id && item.Municipios)
        );
        
        const fileIdToUse = editingFileId || crypto.randomUUID();
        const dateToUse = editingFileId 
          ? importedFilesHistory.find(f => f.id === editingFileId)?.importDate || new Date()
          : new Date();

        processAndStoreFileDataInPlanilha(fileIdToUse, file.name, dateToUse, parsedData);
        setUploading(false);
        if (editingFileId) setFileToEditId(null);
      },
      error: (error: PapaParseErrorAliased) => {
        console.error("Error processing CSV:", error.message, error.errors);
        setUploading(false);
        if (editingFileId) setFileToEditId(null);
      }
    });
    if (event.target) event.target.value = '';
  }, [importedFilesHistory, processAndStoreFileDataInPlanilha]);

  const handleMainImportClickPlanilha = () => mainFileInputRefPlanilha.current?.click();
  const handleTriggerEditFilePlanilha = (fileId: string) => {
    setFileToEditId(fileId);
    editFileInputRefPlanilha.current?.click();
  };


  const filteredData = useMemo(() => {
    if (!activeFileRawData) return [];
    let dataToFilter = [...activeFileRawData];
    if (searchTerm) {
      dataToFilter = dataToFilter.filter(item =>
        Object.values(item).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    return dataToFilter;
  }, [activeFileRawData, searchTerm]);

  const sortedData = useMemo(() => {
    let sortableData = [...filteredData];
    if (sortConfig !== null) {
      sortableData.sort((a, b) => {
        const valA = a[sortConfig.key as keyof CsvData];
        const valB = b[sortConfig.key as keyof CsvData];
        
        const numA = parseFloat(String(valA).replace(/\./g, '').replace(',', '.'));
        const numB = parseFloat(String(valB).replace(/\./g, '').replace(',', '.'));

        let comparison = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = String(valA).localeCompare(String(valB));
        }
        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }
    return sortableData;
  }, [filteredData, sortConfig]);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const tableHeaders = useMemo(() => getTableHeaders(activeFileRawData || []), [activeFileRawData]);


  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    if (!activeFileRawData) return;
    const csv = Papa.unparse(activeFileRawData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeFileName ? activeFileName.split('.')[0] : 'planilha'}_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };


  if (!activeFileId || !activeFileRawData || activeFileRawData.length === 0) {
    return (
      <div className="min-h-screen bg-[#F0F5FF] p-6 flex flex-col items-center justify-center text-center">
        <header className="w-full flex justify-between items-center mb-8 bg-white p-4 rounded-lg shadow-sm absolute top-6 left-6 right-6">
            <Button variant="outline" onClick={navigateToDashboard} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
            </Button>
            <h2 className="text-xl font-semibold text-[#1A2C56]">Planilha</h2>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full focus:outline-none">
                    <Avatar className="w-10 h-10 border-2 border-[#85A6F2]">
                    <AvatarImage src="https://github.com/shadcn.png" alt="User Avatar"/>
                    <AvatarFallback className="bg-[#85A6F2] text-white font-medium">AD</AvatarFallback>
                    </Avatar>
                </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                <DropdownMenuLabel>
                    <div className="flex flex-col">
                    <span className="font-medium text-[#1A2C56]">Administrador</span>
                    <span className="text-xs text-gray-500">admin@compesa.com.br</span>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-500 hover:bg-red-50 focus:bg-red-50">
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </header>
        <FileText className="h-16 w-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          {importedFilesHistory.length === 0 ? "Nenhum arquivo importado" : "Nenhum arquivo selecionado"}
        </h2>
        <p className="text-gray-500 mb-4">
          {importedFilesHistory.length === 0 ? "Importe um arquivo CSV no Dashboard ou aqui para começar." : "Selecione um arquivo na lista abaixo para visualizar na planilha."}
        </p>
        { (importedFilesHistory.length > 0 || uploading) &&
             <DropdownMenu>
             <DropdownMenuTrigger asChild>
               <Button variant="outline" className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3">
                 <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> Selecionar Arquivo ({importedFilesHistory.length}) <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
               </Button>
             </DropdownMenuTrigger>
             <DropdownMenuContent className="w-56 sm:w-64 max-h-80 overflow-y-auto">
               <DropdownMenuLabel>Arquivos Importados</DropdownMenuLabel>
               <DropdownMenuSeparator />
               {importedFilesHistory.map(file => (
                 <DropdownMenuGroup key={file.id}>
                   <div className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                     <span 
                       className={`cursor-pointer truncate flex-grow ${activeFileId === file.id ? 'font-semibold text-primary' : ''}`}
                       title={file.fileName}
                       onClick={() => onFileSelected(file.id)}
                     >
                       {file.fileName} ({format(file.importDate, "dd/MM/yy")})
                     </span>
                   </div>
                 </DropdownMenuGroup>
               ))}
             </DropdownMenuContent>
           </DropdownMenu>
        }
         <Button variant="outline" className="mt-4 gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3" onClick={handleMainImportClickPlanilha}>
            <Upload className="h-3 w-3 sm:h-4 sm:w-4" /> Importar Novo Arquivo
        </Button>
        <input type="file" ref={mainFileInputRefPlanilha} accept=".csv" onChange={(e) => handleFileUploadInPlanilha(e)} className="hidden" />
        <input type="file" ref={editFileInputRefPlanilha} accept=".csv" onChange={(e) => { if(fileToEditId) handleFileUploadInPlanilha(e, fileToEditId)}} className="hidden" />
         {uploading && (
        <div className="flex justify-center items-center mt-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#003F9C] mr-2"></div>
          <span className="text-sm text-[#003F9C]">Processando arquivo...</span>
        </div>
      )}
      </div>
    );
  }
  

  return (
    <div className="min-h-screen bg-[#F0F5FF] p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
           <Button variant="outline" onClick={navigateToDashboard} className="gap-2 text-xs sm:text-sm px-2 sm:px-3">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="space-y-1 flex-grow min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-[#1A2C56] truncate" title={activeFileName || "Arquivo Desconhecido"}>
              Planilha: {activeFileName || "Arquivo Desconhecido"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Dados de: {activeFileDate ? format(activeFileDate, "dd/MM/yyyy HH:mm") : "Data Desconhecida"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0 flex-shrink-0">
            <Button variant="outline" className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3" onClick={handleMainImportClickPlanilha}>
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" /> Importar Novo
            </Button>
            
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1 sm:gap-2 border-[#003F9C] text-[#003F9C] hover:bg-[#003F9C]/10 text-xs sm:text-sm px-2 sm:px-3">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" /> Arquivos ({importedFilesHistory.length}) <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 sm:w-64 max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Selecionar Arquivo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {importedFilesHistory.map(file => (
                <DropdownMenuGroup key={file.id}>
                  <div className="flex items-center justify-between px-2 py-1.5 text-sm hover:bg-accent rounded-sm">
                    <span 
                      className={`cursor-pointer truncate flex-grow ${activeFileId === file.id ? 'font-semibold text-primary' : ''}`}
                      title={file.fileName}
                      onClick={() => onFileSelected(file.id)}
                    >
                      {file.fileName} ({format(file.importDate, "dd/MM/yy")})
                    </span>
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-1 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        <DropdownMenuItem onClick={() => onFileSelected(file.id)}>
                          <FileText className="mr-2 h-4 w-4" /> Selecionar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start px-2 py-1.5 text-sm font-normal relative flex cursor-default select-none items-center rounded-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                                    <CalendarIcon className="mr-2 h-4 w-4" /> Editar Data
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" side="right" align="start">
                                <CalendarComp
                                    mode="single"
                                    selected={file.importDate}
                                    onSelect={(newDate) => {if(newDate) onFileDateEdited(file.id, newDate)}}
                                />
                            </PopoverContent>
                        </Popover>
                        <DropdownMenuItem onClick={() => handleTriggerEditFilePlanilha(file.id)}>
                          <Upload className="mr-2 h-4 w-4" /> Substituir Arquivo
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onFileDeleted(file.id)} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </DropdownMenuGroup>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>


          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full focus:outline-none"
              >
                <Avatar className="w-10 h-10 border-2 border-[#85A6F2]">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="User Avatar"
                  />
                  <AvatarFallback className="bg-[#85A6F2] text-white font-medium">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium text-[#1A2C56]">Administrador</span>
                  <span className="text-xs text-gray-500">admin@compesa.com.br</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-500 hover:bg-red-50 focus:bg-red-50">
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
        {uploading && (
        <div className="flex justify-center items-center mb-4 bg-[#85A6F2]/20 p-3 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-[#003F9C] mr-2"></div>
          <span className="text-sm text-[#003F9C]">Processando arquivo...</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Procurar em todas as colunas..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1);}}
            className="pl-10 bg-white border-gray-300 focus:border-[#003F9C] focus:ring-1 focus:ring-[#003F9C] placeholder:text-gray-500"
          />
        </div>

        <Button onClick={handleExportCSV} className="gap-2 bg-[#003F9C] text-white hover:bg-[#00337A]">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50 sticky top-0 z-10">
            <TableRow>
              {tableHeaders.map((header) => (
                <TableHead 
                  key={header} 
                  className="text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap px-3 py-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => requestSort(header)}
                  title={`Ordenar por ${header}`}
                >
                  {header.replace(/([A-Z])/g, ' $1').trim()}
                  {sortConfig?.key === header && (
                    <ChevronDown className={`inline-block ml-1 h-4 w-4 transition-transform ${sortConfig.direction === 'descending' ? 'rotate-180' : ''}`} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow key={row.Id || `row-${rowIndex}`} className="hover:bg-gray-50">
                {tableHeaders.map((header, cellIndex) => (
                  <TableCell 
                    key={`${row.Id || `row-${rowIndex}`}-${header}-${cellIndex}`} 
                    className="text-sm text-[#1A2C56] whitespace-nowrap px-3 py-2"
                  >
                    {row[header] !== undefined && row[header] !== null ? String(row[header]) : '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
             {paginatedData.length === 0 && (
                <TableRow>
                    <TableCell colSpan={tableHeaders.length} className="text-center text-gray-500 py-10">
                        Nenhum dado encontrado {searchTerm && 'para o termo buscado.'}
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row items-center justify-between px-2 mt-6 gap-4">
            <div className="text-sm text-gray-600">
            Mostrando <span className="font-semibold text-[#1A2C56]">{sortedData.length > 0 ? Math.min((currentPage - 1) * itemsPerPage + 1, sortedData.length) : 0}</span> a{" "}
            <span className="font-semibold text-[#1A2C56]">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> de{" "}
            <span className="font-semibold text-[#1A2C56]">{sortedData.length}</span> resultados
            </div>
            <div className="flex gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
            >
                Anterior
            </Button>
            <span className="text-sm p-2">Página {currentPage} de {totalPages}</span>
            <Button 
                variant="outline" 
                size="sm" 
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
            >
                Próximo
            </Button>
            </div>
        </div>
      )}
    </div>
  );
};

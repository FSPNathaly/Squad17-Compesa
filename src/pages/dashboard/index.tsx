import React, { useState, useContext, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import * as Papa from 'papaparse';
import {
    ParseError as PapaParseErrorType,
    ParseResult,
    ParseMeta,
    LocalFile
} from 'papaparse';
import { ptBR } from 'date-fns/locale';
import { Bar, Line, XAxis, YAxis, CartesianGrid, BarChart as RechartsBarChart, LineChart as RechartsLineChart } from 'recharts';
import { CalendarDays, Upload as UploadIcon, Download as DownloadIcon, RefreshCw as RefreshCwIcon, Settings as SettingsIcon, LogOut as LogOutIcon, Mail as MailIconComponent, FileText, Trash2, FileCheck2, ListChecks, Eye, XCircle, Info, Clock, BarChart as BarChartIcon, ExternalLink } from 'lucide-react';
import { AppContext, type ImportedFileDetail, type TransformedCsvRow } from '../../App';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';

interface ChartDataBase {
  [key: string]: any;
}
interface AnaliseAcumChartItem extends ChartDataBase {
  municipios: string;
  volume_distribuido?: number | null;
  volume_consumido?: number | null;
  volume_de_perda?: number | null;
  ipd?: number | null;
  status?: string;
}
interface TemporalChartItem extends ChartDataBase {
  month: string;
  volume: number | null;
  municipios?: string;
}

type TimePeriodOption = 'day' | 'week' | 'month' | 'year';

const timePeriodLabels: Record<TimePeriodOption, string> = {
  day: "Diário",
  week: "Semanal",
  month: "Mensal",
  year: "Anual",
};

const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: string, disabled?: boolean}) => {
    let baseStyle = 'px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center';
    if (variant === 'default') baseStyle += ' bg-blue-600 text-white hover:bg-blue-700';
    else if (variant === 'outline') baseStyle += ' border border-gray-300 text-gray-700 hover:bg-gray-100';
    else if (variant === 'destructive') baseStyle += ' bg-red-600 text-white hover:bg-red-700';
    else if (variant === 'ghost') baseStyle += ' text-gray-700 hover:bg-gray-100';
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return (<button onClick={onClick} className={`${baseStyle} ${className}`} disabled={disabled}>{children}</button>);
};

const Card = ({ children, title, className = '', titleClassName = '' }: { children: React.ReactNode, title?: string, className?: string, titleClassName?: string}) => (<div className={`rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm p-6 ${className}`}>{title && <h3 className={`text-lg font-semibold mb-4 ${titleClassName}`}>{title}</h3>}{children}</div>);

const DropdownMenu = ({ children, trigger, className = '' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (<div className={`relative ${className}`} ref={dropdownRef}><div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>{isOpen && (<div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"><div className="py-1" role="menu" aria-orientation="vertical">{children}</div></div>)}</div>);
};

const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string}) => (<div onClick={onClick} className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`} role="menuitem">{children}</div>);

const Popover = ({ children, trigger, className = '' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (<div className={`relative ${className}`} ref={popoverRef}><div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>{isOpen && (<div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-4 right-0 lg:right-auto">{children}</div>)}</div>);
};

const Calendar = ({ selectedDate, onSelectDate }: { selectedDate: Date | null, onSelectDate: (date: Date) => void }) => {
    const today = new Date();
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
    const [currentMonth, setCurrentMonth] = useState(selectedDate ? selectedDate.getMonth() : today.getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDate ? selectedDate.getFullYear() : today.getFullYear());
    const handlePrevMonth = () => {
        setCurrentMonth(prev => { const newMonth = prev === 0 ? 11 : prev - 1; if (prev === 0) setCurrentYear(cy => cy - 1); return newMonth; });
    };
    const handleNextMonth = () => {
        setCurrentMonth(prev => { const newMonth = prev === 11 ? 0 : prev + 1; if (prev === 11) setCurrentYear(cy => cy + 1); return newMonth; });
    };
    const renderDays = () => {
        const days = []; const numDays = daysInMonth(currentYear, currentMonth); const startDay = firstDayOfMonth(currentYear, currentMonth);
        for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        for (let i = 1; i <= numDays; i++) {
            const date = new Date(currentYear, currentMonth, i);
            const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
            const isTodayDate = format(today, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
            days.push(<div key={i} className={`w-8 h-8 flex items-center justify-center rounded-full cursor-pointer text-sm ${isSelected ? 'bg-blue-500 text-white' : ''} ${isTodayDate && !isSelected ? 'border border-blue-500' : ''} hover:bg-gray-200`} onClick={() => onSelectDate(date)}>{i}</div>);
        } return days;
    };
    return (<div className="p-4 bg-white rounded-md shadow-md"><div className="flex justify-between items-center mb-4"><Button variant="ghost" onClick={handlePrevMonth}>{'<'}</Button><h4 className="font-semibold">{format(new Date(currentYear, currentMonth, 1), 'MMMM<y_bin_46>', { locale: ptBR })}</h4><Button variant="ghost" onClick={handleNextMonth}>{'>'}</Button></div><div className="grid grid-cols-7 text-center text-xs font-medium text-gray-500 mb-2">{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (<div key={day}>{day}</div>))}</div><div className="grid grid-cols-7 gap-1">{renderDays()}</div></div>);
};

const Avatar = ({ initials, className = '' }: { initials: string, className?: string}) => (<div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold ${className}`}>{initials}</div>);

const ViewDataModal = ({ file, onClose }: { file: ImportedFileDetail | null, onClose: () => void }) => {
    if (!file) return null;
    const dataToPreview = file.data || [];
    const previewData = dataToPreview.slice(0, 50);
    const headers = previewData.length > 0 ? Object.keys(previewData[0]) : [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[150] p-4">
            <Card className="p-6 w-full max-w-3xl mx-auto my-8 max-h-[90vh] flex flex-col" titleClassName="text-center">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Visualizar Arquivo: {file.name || 'Desconhecido'}</h3>
                    <Button onClick={onClose} variant="ghost" className="p-1">
                        <XCircle size={24} />
                    </Button>
                </div>
                <p className="text-sm text-gray-600 mb-1">Mostrando as primeiras {previewData.length} linhas de {dataToPreview.length} totais.</p>
                {file.importDate && file.generationDate && (
                    <p className="text-sm text-gray-600 mb-3">
                        Importado em: {format(file.importDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })} (Ref. Data Arquivo: {format(file.generationDate, 'dd/MM/yyyy', { locale: ptBR })})
                    </p>
                )}
                <div className="overflow-auto flex-grow border rounded-md">
                    {previewData.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200 text-xs">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {previewData.map((row: TransformedCsvRow, rowIndex: number) => (
                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                        {headers.map(header => (
                                            <td key={`${header}-${rowIndex}`} className="px-3 py-2 whitespace-nowrap">
                                                {String(row[header] === null || row[header] === undefined ? '' : row[header])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="p-4 text-center text-gray-500">Nenhum dado para exibir ou arquivo vazio.</p>
                    )}
                </div>
                <div className="mt-6 flex justify-end">
                    <Button onClick={onClose} variant="outline">Fechar Visualização</Button>
                </div>
            </Card>
        </div>
    );
};

const sortMonthData = (data: TemporalChartItem[], monthKey: keyof TemporalChartItem = 'month'): TemporalChartItem[] => {
    if (!data || data.length === 0) return [];
    const dataCopy = [...data];
    const monthOrder = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    dataCopy.sort((a, b) => {
        const aMonthStr = String(a[monthKey] ?? '').toUpperCase();
        const bMonthStr = String(b[monthKey] ?? '').toUpperCase();
        let aYear = 0, bYear = 0;
        let aMonIndex = -1, bMonIndex = -1;

        const extractYearMonth = (monthString: string) => {
            const parts = monthString.split(/[\/-]/);
            if (parts.length === 2) {
                const part1IsMonth = monthOrder.includes(parts[0]);
                const part2IsMonth = monthOrder.includes(parts[1]);
                const part1IsNumericMonth = !isNaN(parseInt(parts[0])) && parseInt(parts[0]) >= 1 && parseInt(parts[0]) <= 12;
                const part2IsNumericMonth = !isNaN(parseInt(parts[1])) && parseInt(parts[1]) >= 1 && parseInt(parts[1]) <= 12;

                if (part1IsMonth) return { monthIndex: monthOrder.indexOf(parts[0]), year: parseInt(parts[1].length === 2 ? "20" + parts[1] : parts[1], 10) };
                if (part2IsMonth) return { monthIndex: monthOrder.indexOf(parts[1]), year: parseInt(parts[0].length === 2 ? "20" + parts[0] : parts[0], 10) };
                if (parts[0].length === 4 && part2IsNumericMonth) return { monthIndex: parseInt(parts[1], 10) - 1, year: parseInt(parts[0], 10) };
                if (parts[1].length === 4 && part1IsNumericMonth) return { monthIndex: parseInt(parts[0], 10) - 1, year: parseInt(parts[1], 10) };
                if (part1IsNumericMonth) return { monthIndex: parseInt(parts[0], 10) - 1, year: parseInt(parts[1].length === 2 ? "20" + parts[1] : parts[1], 10) };
                if (part2IsNumericMonth) return { monthIndex: parseInt(parts[1], 10) - 1, year: parseInt(parts[0].length === 2 ? "20" + parts[0] : parts[0], 10) };
            } else if (monthOrder.includes(monthString)) {
                return { monthIndex: monthOrder.indexOf(monthString), year: new Date().getFullYear() };
            }
            return { monthIndex: -1, year: 0 };
        };
        const aDateInfo = extractYearMonth(aMonthStr);
        const bDateInfo = extractYearMonth(bMonthStr);
        aMonIndex = aDateInfo.monthIndex; aYear = aDateInfo.year;
        bMonIndex = bDateInfo.monthIndex; bYear = bDateInfo.year;

        if (aYear !== 0 && bYear !== 0 && aYear !== bYear) {
            return aYear - bYear;
        }
        if (aMonIndex !== -1 && bMonIndex !== -1) {
            return aMonIndex - bMonIndex;
        }
        return aMonthStr.localeCompare(bMonthStr);
    });
    return dataCopy;
};


const analiseAcumChartConfig = {
  volume_distribuido: { label: "V. Distribuído", color: "hsl(var(--chart-1))" },
  volume_consumido: { label: "V. Consumido", color: "hsl(var(--chart-2))" },
  volume_de_perda: { label: "V. de Perda", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const distribuidoChartConfig = {
  volume: { label: "Volume Distribuído", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const consumidoChartConfig = {
  volume: { label: "Volume Consumido", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const genericLineChartConfig = (label: string, colorVar: string = "hsl(var(--chart-1))") => ({
  volume: { label: label, color: colorVar },
}) satisfies ChartConfig;

const getStatusFromPerda = (perda: number | null): string => {
    if (perda === null) return "N/D";
    if (perda > 40) return "Crítico";
    if (perda > 25) return "Alerta";
    return "Ok";
};

const DashboardPage = () => {
    const appContext = useContext(AppContext);
    if (!appContext) throw new Error("AppContext not found");

    const {
        selectedMunicipality: globalSelectedMunicipality,
        setSelectedMunicipality: setGlobalSelectedMunicipality,
        showLogoutConfirm, setShowLogoutConfirm,
        showImportModal, setShowImportModal,
        processImportedData: processImportedDataToContext,
        globalFileGenerationDate,
        importedFilesDetails: contextImportedFilesDetails = [],
        setFileIdForPlanilhaView,
        removeImportedFile: removeFileFromContext,
    } = appContext;
    const navigate = useNavigate();

    const [analiseAcumChartData, setAnaliseAcumChartData] = useState<AnaliseAcumChartItem[]>([]);
    const [analiseExportChartData, setAnaliseExportChartData] = useState<TemporalChartItem[]>([]);
    const [vDistribChartData, setVDistribChartData] = useState<TemporalChartItem[]>([]);
    const [vcNormaChartData, setVCNormaChartData] = useState<TemporalChartItem[]>([]);
    const [relDesviosChartData, setRelDesviosChartData] = useState<TemporalChartItem[]>([]);
    const [auxChartData, setAuxChartData] = useState<TemporalChartItem[]>([]);

    const [kpiPerdaTotal, setKpiPerdaTotal] = useState(0);
    const [kpiMunicipiosCriticos, setKpiMunicipiosCriticos] = useState(0);
    const [kpiVolumeDistribuidoTotal, setKpiVolumeDistribuidoTotal] = useState(0);

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [localFileGenerationDate, setLocalFileGenerationDate] = useState<Date>(globalFileGenerationDate || new Date());
    const [stagedFiles, setStagedFiles] = useState<File[]>([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);
    const [fileForDashboardPreview, setFileForDashboardPreview] = useState<ImportedFileDetail | null>(null);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriodOption>('month');

    const cleanAndParseNumber = (value: string | undefined | null): number | null => {
        if (value === null || value === undefined) return null;
        const stringValue = String(value).trim();
        if (stringValue === '-' || stringValue === '') return null;
        const cleanedValue = stringValue.replace(/\./g, '').replace(/,/g, '.');
        const num = Number(cleanedValue);
        return isNaN(num) ? null : num;
    };

    const transformToAnaliseAcumFormat = (data: TransformedCsvRow[]): AnaliseAcumChartItem[] => {
        return data.map(row => {
            const perda = cleanAndParseNumber(String(row.perda_percentual || row.ipd || row.perda));
            return {
                municipios: String(row.municipios || row.municipio || 'N/D'),
                volume_distribuido: cleanAndParseNumber(String(row.volume_distribuido || row.vd)),
                volume_consumido: cleanAndParseNumber(String(row.volume_consumido)),
                volume_de_perda: cleanAndParseNumber(String(row.volume_de_perda || row.perda_valor || row.perda_fisica)),
                ipd: perda,
                status: getStatusFromPerda(perda),
            };
        }).filter(item => item.municipios !== 'N/D');
    };

    const transformToAnaliseExportFormat = (data: TransformedCsvRow[]): TemporalChartItem[] => {
        return data.map(row => ({
            month: String(row.mes_ano || row.competencia || 'N/D'),
            volume: cleanAndParseNumber(String(row.ipd || row.perda_percentual)),
            municipios: String(row.municipios || row.municipio || 'N/D'),
        })).filter(item => item.month !== 'N/D' && item.volume !== null);
    };

    const transformToVDistribFormat = (data: TransformedCsvRow[]): TemporalChartItem[] => {
         return data.map(row => ({
            month: String(row.mes_ano || row.competencia || 'N/D'),
            volume: cleanAndParseNumber(String(row.volumedistribuido || row.volume_distribuido)),
            municipios: String(row.municipios || row.localidade || row.municipio || 'N/D'),
        })).filter(item => item.month !== 'N/D' && item.volume !== null);
    };

    const transformToVCNormaFormat = (data: TransformedCsvRow[]): TemporalChartItem[] => {
        return data.map(row => {
            const medido = cleanAndParseNumber(String(row.medido_m3));
            const estimado = cleanAndParseNumber(String(row.estimado_m3));
            let totalConsumido = 0;
            if(medido !== null) totalConsumido += medido;
            if(estimado !== null) totalConsumido += estimado;

            return {
                month: String(row.mes_ano || row.competencia || 'N/D'),
                volume: totalConsumido > 0 ? totalConsumido : null,
                municipios: String(row.municipios || row.municipio || 'N/D'),
            };
        }).filter(item => item.month !== 'N/D' && item.volume !== null);
    };

    const transformToRelDesviosFormat = (data: TransformedCsvRow[]): TemporalChartItem[] => {
         return data.map(row => ({
            month: String(row.mes_ano || row.competencia || 'N/D'),
            volume: cleanAndParseNumber(String(row.indiceperdadistribuicao || row.indice_de_perda_na_distribuicao)),
            municipios: String(row.diretoria || row.gerencia || row.coordenacao || row.localidade || 'N/D'),
        })).filter(item => item.month !== 'N/D' && item.volume !== null);
    };

    const transformToAuxFormat = (data: TransformedCsvRow[]): TemporalChartItem[] => {
        return data.map(row => ({
            month: String(row.mes_ano || row.competencia || 'N/D'),
            volume: cleanAndParseNumber(String(row.volume_produzido)),
            municipios: String(row.localidade || 'N/D'),
        })).filter(item => item.month !== 'N/D' && item.volume !== null);
    };

    useEffect(() => {
        const allFiles = contextImportedFilesDetails || [];
        
        let aggregatedAnaliseAcum: AnaliseAcumChartItem[] = [];
        let aggregatedAnaliseExport: TemporalChartItem[] = [];
        let aggregatedVDistrib: TemporalChartItem[] = [];
        let aggregatedVCNorma: TemporalChartItem[] = [];
        let aggregatedRelDesvios: TemporalChartItem[] = [];
        let aggregatedAux: TemporalChartItem[] = [];

        allFiles.forEach(fileDetail => {
            const data = fileDetail.data;
            const fileName = fileDetail.name.toLowerCase();
            const headers = data.length > 0 ? Object.keys(data[0]) : [];

            if (fileName.includes("analiseacum")) {
                aggregatedAnaliseAcum.push(...transformToAnaliseAcumFormat(data));
            } else if (fileName.includes("analise_export") || (fileName.includes("analise.") && !fileName.includes("acum"))) {
                aggregatedAnaliseExport.push(...transformToAnaliseExportFormat(data));
                if (headers.includes('volume_distribuido') && headers.includes('volume_consumido')) {
                   // Decide if analiseacum should be populated as fallback or additive
                   // For now, assume primary source is "analiseacum" files.
                }
            } else if (fileName.includes("vdistrib")) {
                aggregatedVDistrib.push(...transformToVDistribFormat(data));
            } else if (fileName.includes("vcnorma")) {
                aggregatedVCNorma.push(...transformToVCNormaFormat(data));
            } else if (fileName.includes("reldesvios")) {
                aggregatedRelDesvios.push(...transformToRelDesviosFormat(data));
            } else if (fileName.includes("aux")) {
                aggregatedAux.push(...transformToAuxFormat(data));
            } else if (fileName.includes("dados_ficticios_compesa") || fileName.includes("dados_municipios")) {
                if (headers.includes('volume_distribuido') && headers.includes('volume_consumido')) {
                    aggregatedAnaliseAcum.push(...transformToAnaliseAcumFormat(data));
                }
                if (headers.includes('ipd') || headers.includes('perda_percentual')) {
                    aggregatedAnaliseExport.push(...transformToAnaliseExportFormat(data));
                }
            }
        });
        
        const finalizeAnaliseAcum = (items: AnaliseAcumChartItem[]): AnaliseAcumChartItem[] => {
            const map = new Map<string, AnaliseAcumChartItem>();
            items.forEach(item => {
                const existing = map.get(item.municipios);
                if (existing) {
                    existing.volume_distribuido = (existing.volume_distribuido || 0) + (item.volume_distribuido || 0);
                    existing.volume_consumido = (existing.volume_consumido || 0) + (item.volume_consumido || 0);
                    existing.volume_de_perda = (existing.volume_de_perda || 0) + (item.volume_de_perda || 0);
                    // IPD aggregation needs careful consideration (e.g., weighted average or recalculate).
                    // For simplicity, let's say the last one or a sum if meaningful. Here, sum is not usually right for percentages.
                    // Using the item's IPD if it's newer or a primary source might be better.
                    // This example just sums, which is likely incorrect for IPD.
                    existing.ipd = ((existing.ipd || 0) * (existing.volume_distribuido || 1) + (item.ipd || 0) * (item.volume_distribuido || 1)) / ((existing.volume_distribuido || 1) + (item.volume_distribuido || 1));
                    existing.status = getStatusFromPerda(existing.ipd ?? null);
                } else {
                    map.set(item.municipios, { ...item });
                }
            });
            return Array.from(map.values());
        };
        setAnaliseAcumChartData(finalizeAnaliseAcum(aggregatedAnaliseAcum));

        const finalizeTemporalData = (items: TemporalChartItem[]): TemporalChartItem[] => {
            const map = new Map<string, TemporalChartItem>(); 
            items.forEach(item => {
                const key = `${item.month}-${item.municipios ?? 'geral'}`; // Ensure key is unique
                const existing = map.get(key);
                if (existing) {
                    existing.volume = (existing.volume || 0) + (item.volume || 0);
                } else {
                    map.set(key, { ...item });
                }
            });
            return Array.from(map.values());
        };

        setAnaliseExportChartData(finalizeTemporalData(aggregatedAnaliseExport));
        setVDistribChartData(finalizeTemporalData(aggregatedVDistrib));
        setVCNormaChartData(finalizeTemporalData(aggregatedVCNorma));
        setRelDesviosChartData(finalizeTemporalData(aggregatedRelDesvios));
        setAuxChartData(finalizeTemporalData(aggregatedAux));

    }, [contextImportedFilesDetails]);


    useEffect(() => {
        let totalPerdaVol = 0;
        let criticos = 0;
        let totalVolDistKPI = 0;

        if (analiseAcumChartData.length > 0) {
            analiseAcumChartData.forEach(item => {
                const perdaVal = item.ipd ?? null;
                const volDist = item.volume_distribuido;

                if (typeof perdaVal === 'number' && typeof volDist === 'number' && volDist > 0) {
                    totalPerdaVol += (volDist * (perdaVal / 100));
                }
                if (item.status === 'Crítico') {
                    criticos++;
                }
            });
        }
        setKpiPerdaTotal(totalPerdaVol);
        setKpiMunicipiosCriticos(criticos);

        // Sum volume from all relevant chart data for a comprehensive total
        const allDistVolumes = [
            ...vDistribChartData.map(item => item.volume || 0),
            ...analiseAcumChartData.map(item => item.volume_distribuido || 0) // Fallback or additional
        ];
        totalVolDistKPI = allDistVolumes.reduce((sum, vol) => sum + vol, 0);
        // Deduplicate if analiseAcumChartData is already covered by vDistribChartData for certain municipalities/periods
        // For simplicity, this sums them up. A more precise KPI might need to pick one source or de-duplicate.
        setKpiVolumeDistribuidoTotal(totalVolDistKPI);


    }, [analiseAcumChartData, vDistribChartData]);

    const csvErrorStrings = ["#DIV/0!", "#N/A", "#VALUE!", "#REF!", "#NAME?", "#NULL!", "#NUM!"];

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target?.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file, 'ISO-8859-1');
        });
    };

    const handleFileSelectionForStaging = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            const newFiles = Array.from(files);
            setStagedFiles(prevStagedFiles => [...prevStagedFiles, ...newFiles]);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveStagedFile = (fileNameToRemove: string) => {
        setStagedFiles(prevStagedFiles => prevStagedFiles.filter(file => file.name !== fileNameToRemove));
    };

    const handleConfirmAndProcessImport = async () => {
        if (stagedFiles.length === 0) { alert("Nenhum arquivo selecionado."); return; }
        setIsProcessingImport(true);

        const parsedFileContentsDetails: { name: string, size: number, type: string, data: TransformedCsvRow[], generationDate: Date }[] = [];
        let batchFileNamesList: string[] = [];

        for (const file of stagedFiles) {
            let fileContentString = await readFileAsText(file);
            const lowerFileName = file.name.toLowerCase();
            if (lowerFileName.includes("analiseacum") || lowerFileName.includes("analise.") || lowerFileName.includes("analise_export")) {
                const lines = fileContentString.split('\n');
                if (lines.length > 2) {
                    fileContentString = lines.slice(2).join('\n');
                }
            }

            try {
                const results: ParseResult<TransformedCsvRow> = await new Promise((resolve, reject) => {
                    Papa.parse<TransformedCsvRow>(fileContentString, {
                        header: true,
                        skipEmptyLines: 'greedy',
                        dynamicTyping: false,
                        transformHeader: (header: string): string => {
                            let newHeader = header.trim().toLowerCase();
                            newHeader = newHeader.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                            newHeader = newHeader.replace(/[^a-z0-9_ç]/g, '_');
                            newHeader = newHeader.replace(/_+/g, '_');
                            newHeader = newHeader.replace(/^_+|_+$/g, '');
                            return newHeader || `_coluna_vazia_${Math.random().toString(36).substring(7)}`;
                        },
                        transform: (value: string, headerField: string | number): string | number | null => {
                            const originalHeaderStr = String(headerField).trim().toLowerCase();
                            const trimmedValue = value ? String(value).trim() : "";

                            if (csvErrorStrings.includes(trimmedValue.toUpperCase())) return null;
                            if (trimmedValue === "" || trimmedValue === "-") return null;

                            const numericHeaders: string[] = ['id','vd','perda','volume','ligacoes','medido','estimado','qtd','rateio','macro','micro','volumedisponibilizado', 'volumeproduzido','consumoproprio','limpeza','descarga','hidrante','carropipanaofaturado','vsocial','ligacoesativas','volumeconsumido','m3','matriculas','volumedistribuido','voldescargarede','extrederetotalagua','descargaredefator','vollimpezareservatorio','volabastecimentosocial','estimativadomiciliossubnormais','consumosubnormal','volconsumohidrante','volconsumoproprio','volcarropipanaofaturado','macromedidores','micromedidores'];
                            const percentageHeaders: string[] = ['ipd', 'desconto', 'indiceperda'];

                            if (numericHeaders.some(nh => originalHeaderStr.replace(/[\s\(\)\-\.]/g, '').includes(nh)) ||
                                percentageHeaders.some(ph => originalHeaderStr.replace(/[\s\(\)\-\.]/g, '').includes(ph))) {
                                const cleanedForPercent = percentageHeaders.some(ph => originalHeaderStr.replace(/[\s\(\)\-\.]/g, '').includes(ph)) ? trimmedValue.replace('%', '') : trimmedValue;
                                return cleanAndParseNumber(cleanedForPercent);
                            }
                            return trimmedValue;
                        },
                        complete: (res: ParseResult<TransformedCsvRow>) => {
                             const meta = res.meta as ParseMeta & { encoding?: string };
                             if (meta?.encoding && meta.encoding.toLowerCase() !== 'utf-8' && meta.encoding.toLowerCase() !== 'iso-8859-1') {
                                 // Potential encoding issue warning or handling
                             }
                             resolve(res);
                        },
                        error: (err: PapaParseErrorType, _file?: File | LocalFile) => reject(err)
                    });
                });

                if (results.data && results.data.length > 0) {
                    parsedFileContentsDetails.push({
                        name: file.name, size: file.size, type: file.type,
                        data: results.data, generationDate: localFileGenerationDate
                    });
                    batchFileNamesList.push(file.name);
                } else { alert(`Arquivo CSV "${file.name}" vazio ou sem dados utilizáveis.`); }
            } catch (error: any) { alert(`Erro crítico ao processar CSV "${file.name}": ${error.message}.`); }
        }

        if (parsedFileContentsDetails.length > 0 && processImportedDataToContext) {
            processImportedDataToContext(
                batchFileNamesList.join(', '),
                localFileGenerationDate,
                parsedFileContentsDetails
            );
            alert(`${parsedFileContentsDetails.length} arquivo(s) processado(s) e adicionado(s) ao contexto.`);
        } else if (stagedFiles.length > 0) { alert("Nenhum arquivo pôde ser processado e adicionado."); }

        setIsProcessingImport(false);
        setStagedFiles([]);
        if(setShowImportModal) setShowImportModal(false);
    };

    const viewFileInModal = (file: ImportedFileDetail) => setFileForDashboardPreview(file);
    const openFileInPlanilha = (fileId: string) => {
        if (setFileIdForPlanilhaView) {
            setFileIdForPlanilhaView(fileId);
            navigate('/planilha');
        }
    };
    const deleteFileAndUpdate = (fileId: string) => {
        if (removeFileFromContext) removeFileFromContext(fileId);
    };

    const exportToCSV = () => { alert('Exportar CSV a implementar');};
    const exportToPDF = () => { alert('Exportar PDF a implementar');};
    const handleRefreshData = () => { setIsUpdating(true); setTimeout(() => setIsUpdating(false), 1500); alert('Dados atualizados (simulação)'); };

    const currentViewLabelForLineCharts = globalSelectedMunicipality || "Geral";
    const currentTimePeriodLabel = timePeriodLabels[selectedTimePeriod];
    
    const filteredAnaliseExportData = useMemo(() => {
        return sortMonthData(analiseExportChartData.filter(d => !globalSelectedMunicipality || d.municipios === globalSelectedMunicipality), 'month');
    }, [analiseExportChartData, globalSelectedMunicipality]);

    const filteredVDistribData = useMemo(() => {
        return sortMonthData(vDistribChartData.filter(d => !globalSelectedMunicipality || d.municipios === globalSelectedMunicipality), 'month');
    }, [vDistribChartData, globalSelectedMunicipality]);

    const filteredVCNormaData = useMemo(() => {
        return sortMonthData(vcNormaChartData.filter(d => !globalSelectedMunicipality || d.municipios === globalSelectedMunicipality), 'month');
    }, [vcNormaChartData, globalSelectedMunicipality]);
    
    const filteredRelDesviosData = useMemo(() => {
        return sortMonthData(relDesviosChartData.filter(d => !globalSelectedMunicipality || d.municipios === globalSelectedMunicipality), 'month');
    }, [relDesviosChartData, globalSelectedMunicipality]);

    const filteredAuxData = useMemo(() => {
        return sortMonthData(auxChartData.filter(d => !globalSelectedMunicipality || d.municipios === globalSelectedMunicipality), 'month');
    }, [auxChartData, globalSelectedMunicipality]);


    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
           <header className="bg-white shadow-sm h-auto md:h-16 flex flex-col md:flex-row items-center justify-between px-6 py-3 md:py-0">
                <div className="flex items-center mb-3 md:mb-0">
                    <img src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" alt="Compesa Logo" className="h-10" />
                    <nav className="ml-6 space-x-4 flex items-center">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                            <BarChartIcon size={16} className="mr-1.5" /> Dashboard
                        </Link>
                        <Link to="/planilha" className="text-blue-600 hover:text-blue-800 flex items-center">
                            <FileText size={16} className="mr-1.5" /> Planilha
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-2 justify-center md:justify-end">
                    <Popover trigger={ <Button variant="outline" className="text-xs px-2 py-1 md:px-3 md:py-2"> <CalendarDays size={14} className="mr-1 md:mr-2" /> {selectedDate ? format(selectedDate, 'dd/MM/yy') : 'Data Filtro'} </Button> }> <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} /> </Popover>
                    <Button onClick={handleRefreshData} variant="outline" disabled={isUpdating}  className="text-xs px-2 py-1 md:px-3 md:py-2"> <RefreshCwIcon size={14} className={`mr-1 md:mr-2 ${isUpdating ? 'animate-spin' : ''}`} /> {isUpdating ? '...' : 'Atualizar'} </Button>
                    <Button onClick={() => { setStagedFiles([]); if(setShowImportModal) setShowImportModal(true);}} variant="default"  className="text-xs px-2 py-1 md:px-3 md:py-2"> <UploadIcon size={14} className="mr-1 md:mr-2" /> Importar CSV </Button>
                    <DropdownMenu trigger={ <Button variant="outline" className="text-xs px-2 py-1 md:px-3 md:py-2"> <DownloadIcon size={14} className="mr-1 md:mr-2" /> Exportar </Button> }>
                        <DropdownMenuItem onClick={exportToCSV}> <DownloadIcon size={14} className="mr-2" /> CSV (Análise) </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF}> <DownloadIcon size={14} className="mr-2" /> PDF (Relatório) </DropdownMenuItem>
                    </DropdownMenu>
                    <DropdownMenu trigger={<Avatar initials="U" className="cursor-pointer w-8 h-8 md:w-10 md:h-10" />}>
                        <div className="px-4 py-3 border-b border-gray-200"> <p className="text-sm font-medium text-gray-900 truncate">Usuário Compesa</p> <p className="text-xs text-gray-500 truncate flex items-center"> <MailIconComponent size={14} className="mr-1.5 text-gray-400"/> usuario@compesa.com.br </p> </div>
                        <DropdownMenuItem onClick={() => alert('Configurações não implementada.')}> <SettingsIcon size={14} className="mr-2" /> Configurações </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {if(setShowLogoutConfirm) setShowLogoutConfirm(true)}} className="text-red-600 hover:bg-red-50 hover:text-red-700"> <LogOutIcon size={14} className="mr-2" /> Sair </DropdownMenuItem>
                    </DropdownMenu>
                </div>
            </header>

            {showLogoutConfirm && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"><Card className="p-6 w-full max-w-xs mx-auto text-center"><h3 className="text-lg font-semibold mb-4">Confirmar Saída</h3><p className="mb-6">Tem certeza que deseja sair?</p><div className="flex justify-center space-x-4"><Button onClick={() => { if(appContext.setIsLoggedIn) appContext.setIsLoggedIn(false); navigate('/login'); if(setShowLogoutConfirm) setShowLogoutConfirm(false); }} variant="destructive">Sim</Button><Button onClick={() => {if(setShowLogoutConfirm) setShowLogoutConfirm(false)}} variant="outline">Não</Button></div></Card></div>)}
            {showImportModal && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4"><Card className="p-6 w-full max-w-lg mx-auto my-4 max-h-[95vh] flex flex-col"><h3 className="text-xl font-semibold mb-4 text-center">Importar Arquivos CSV</h3><div className="overflow-y-auto px-1 py-2 flex-grow"><div className="mb-4"><label htmlFor="generationDate" className="block text-sm font-medium text-gray-700 mb-1">Data de Referência dos Arquivos:</label><input type="date" id="generationDate" value={localFileGenerationDate ? format(localFileGenerationDate, 'yyyy-MM-dd') : ''} onChange={(e) => {const dateValue = e.target.value; if (dateValue) {const [year, month, day] = dateValue.split('-').map(Number); setLocalFileGenerationDate(new Date(year, month - 1, day));} else {setLocalFileGenerationDate(new Date());}}} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"/></div><p className="mb-1 text-sm">Selecione um ou mais arquivos CSV.</p><input type="file" multiple accept=".csv,text/csv,application/csv,application/vnd.ms-excel,text/plain" ref={fileInputRef} onChange={handleFileSelectionForStaging} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-4"/>{stagedFiles.length > 0 && (<div className="mb-4"><h4 className="text-md font-semibold mb-2 flex items-center"><ListChecks size={18} className="mr-2 text-blue-600"/>Arquivos Selecionados ({stagedFiles.length}):</h4><ul className="max-h-48 overflow-y-auto border rounded-md p-2 bg-gray-50 space-y-1">{stagedFiles.map(file => (<li key={file.name} className="flex justify-between items-center text-sm p-1.5 rounded hover:bg-gray-200"><span className="truncate" title={file.name}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span><Button onClick={() => handleRemoveStagedFile(file.name)} variant="ghost" className="p-1 h-auto text-red-500 hover:text-red-700"><Trash2 size={16}/></Button></li>))}</ul></div>)}</div><div className="mt-6 pt-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3"><Button onClick={handleConfirmAndProcessImport} variant="default" disabled={stagedFiles.length === 0 || isProcessingImport} className="w-full sm:w-auto"><FileCheck2 size={16} className={`mr-2 ${isProcessingImport ? 'animate-spin' : ''}`}/>{isProcessingImport?'Processando...':`Confirmar Importação`}</Button><Button onClick={() => {if(setShowImportModal) setShowImportModal(false);setStagedFiles([]);if(fileInputRef.current)fileInputRef.current.value = "";}} variant="outline" className="w-full sm:w-auto">Fechar</Button></div></Card></div>)}

            {fileForDashboardPreview && ( <ViewDataModal file={fileForDashboardPreview} onClose={() => setFileForDashboardPreview(null)} /> )}

            <main className="flex-1 p-4 md:p-6 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <h1 className="text-xl md:text-2xl font-semibold text-gray-700">Dashboard de Análise Hídrica</h1>
                    <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-gray-600" />
                        <label htmlFor="timePeriod" className="text-sm font-medium text-gray-700 sr-only md:not-sr-only">Período:</label>
                        <select
                            id="timePeriod"
                            value={selectedTimePeriod}
                            onChange={(e) => setSelectedTimePeriod(e.target.value as TimePeriodOption)}
                            className="block w-auto pl-2 pr-8 py-1 md:pl-3 md:pr-10 md:py-2 text-xs md:text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                        >
                            <option value="month">Mensal</option>
                            <option value="year">Anual</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                       <Card title="Perda Total Estimada">
                            <p className="text-2xl md:text-3xl font-bold text-red-600">{kpiPerdaTotal.toLocaleString('pt-BR', {maximumFractionDigits:0})} m³</p>
                        </Card>
                    <Card title="Municípios Críticos">
                        <p className="text-2xl md:text-3xl font-bold text-orange-500">{kpiMunicipiosCriticos}</p>
                    </Card>
                    <Card title="V. Distribuído Total">
                        <p className="text-2xl md:text-3xl font-bold text-blue-600">{kpiVolumeDistribuidoTotal.toLocaleString('pt-BR', {maximumFractionDigits:0})} m³</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card title="Balanço Acumulado" className="h-[350px] md:h-[400px] flex flex-col">
                        {analiseAcumChartData.length > 0 ? (
                            <ChartContainer config={analiseAcumChartConfig} className="w-full h-full">
                                <RechartsBarChart data={analiseAcumChartData} margin={{ top: 5, right: 5, left: 0, bottom: 60 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="municipios" angle={-35} textAnchor="end" height={80} interval={0} tick={{fontSize: 8}}
                                        onClick={(data: { payload?: AnaliseAcumChartItem }) => { if(data?.payload?.municipios && setGlobalSelectedMunicipality) { setGlobalSelectedMunicipality(globalSelectedMunicipality === data.payload.municipios ? null : data.payload.municipios)} }}
                                        cursor="pointer"
                                    />
                                    <YAxis tickFormatter={(val) => `${(Number(val)/1000).toFixed(0)}k`} tick={{fontSize: 10}}/>
                                    <ChartTooltip content={<ChartTooltipContent formatter={(val, _name, item: any) => `${item.payload.municipios}: ${Number(val).toLocaleString('pt-BR')}`}/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center pt-2"/>} />
                                    <Bar dataKey="volume_distribuido" fill="var(--color-volume_distribuido)" radius={2} name="Distr."/>
                                    <Bar dataKey="volume_consumido" fill="var(--color-volume_consumido)" radius={2} name="Cons."/>
                                    <Bar dataKey="volume_de_perda" fill="var(--color-volume_de_perda)" radius={2} name="Perda"/>
                                </RechartsBarChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'AnaliseAcum.csv' ou similar</p>}
                    </Card>

                    <Card title={`IPD - ${currentViewLabelForLineCharts} (${currentTimePeriodLabel})`} className="h-[350px] md:h-[400px] flex flex-col">
                        {filteredAnaliseExportData.length > 0 ? (
                            <ChartContainer config={genericLineChartConfig('IPD (%)', 'hsl(var(--chart-4))')} className="w-full h-full">
                                <RechartsLineChart data={filteredAnaliseExportData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid horizontal={true} vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 10}} />
                                    <YAxis tickFormatter={(val) => `${Number(val).toFixed(0)}%`} domain={[0,100]} tick={{fontSize: 10}}/>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(val) => `${Number(val).toFixed(2)}%`} indicator="line"/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center"/>} />
                                    <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" name="IPD" unit="%" strokeWidth={2} dot={{r:3}} activeDot={{r:6}}/>
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'Analise_export.csv' ou similar</p>}
                    </Card>

                    <Card title={`V. Distribuído - ${currentViewLabelForLineCharts} (${currentTimePeriodLabel})`} className="h-[350px] md:h-[400px] flex flex-col">
                        {filteredVDistribData.length > 0 ? (
                            <ChartContainer config={distribuidoChartConfig} className="w-full h-full">
                                <RechartsLineChart data={filteredVDistribData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid horizontal={true} vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 10}}/>
                                    <YAxis tickFormatter={(val) => `${(Number(val)/1000000).toFixed(1)}M`} tick={{fontSize: 10}}/>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(val) => `${Number(val).toLocaleString('pt-BR')} m³`} indicator="line"/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center"/>} />
                                    <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" name="V. Distribuído" unit="m³" strokeWidth={2} dot={{r:3}} activeDot={{r:6}}/>
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'VDistrib.csv' ou similar</p>}
                    </Card>

                    <Card title={`V. Consumido - ${currentViewLabelForLineCharts} (${currentTimePeriodLabel})`} className="h-[350px] md:h-[400px] flex flex-col">
                         {filteredVCNormaData.length > 0 ? (
                            <ChartContainer config={consumidoChartConfig} className="w-full h-full">
                                <RechartsLineChart data={filteredVCNormaData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid horizontal={true} vertical={false}/>
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 10}}/>
                                    <YAxis tickFormatter={(val) => `${(Number(val)/1000000).toFixed(1)}M`} tick={{fontSize: 10}}/>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(val) => `${Number(val).toLocaleString('pt-BR')} m³`} indicator="line"/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center"/>} />
                                    <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" name="V. Consumido" unit="m³" strokeWidth={2} dot={{r:3}} activeDot={{r:6}}/>
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'VCNorma.csv' ou similar</p>}
                    </Card>

                    <Card title={`Rel. Desvios (Índ. Perda) - ${currentViewLabelForLineCharts} (${currentTimePeriodLabel})`} className="h-[350px] md:h-[400px] flex flex-col">
                         {filteredRelDesviosData.length > 0 ? (
                            <ChartContainer config={genericLineChartConfig('Índice Perda', 'hsl(var(--chart-5))')} className="w-full h-full">
                                <RechartsLineChart data={filteredRelDesviosData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid horizontal={true} vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 10}}/>
                                    <YAxis tickFormatter={(val) => `${Number(val).toFixed(1)}%`} tick={{fontSize: 10}}/>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(val) => `${Number(val).toFixed(2)}%`} indicator="line"/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center"/>} />
                                    <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" name="Índice Perda" unit="%" strokeWidth={2} dot={{r:3}} activeDot={{r:6}}/>
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'RelDesvios.csv' ou similar</p>}
                    </Card>

                    <Card title={`V. Produzido (Aux) - ${currentViewLabelForLineCharts} (${currentTimePeriodLabel})`} className="h-[350px] md:h-[400px] flex flex-col">
                        {filteredAuxData.length > 0 ? (
                            <ChartContainer config={genericLineChartConfig('Volume Produzido', 'hsl(var(--chart-2))')} className="w-full h-full">
                                <RechartsLineChart data={filteredAuxData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                                    <CartesianGrid horizontal={true} vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{fontSize: 10}}/>
                                    <YAxis tickFormatter={(val) => `${(Number(val)/1000).toFixed(0)}k`} tick={{fontSize: 10}}/>
                                    <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(val) => `${Number(val).toLocaleString('pt-BR')} m³`} indicator="line"/>} />
                                    <ChartLegend content={<ChartLegendContent className="flex justify-center"/>} />
                                    <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" name="V. Produzido" unit="m³" strokeWidth={2} dot={{r:3}} activeDot={{r:6}}/>
                                </RechartsLineChart>
                            </ChartContainer>
                        ) : <p className="m-auto text-center text-gray-500 text-sm">Importe 'Aux.csv' ou similar</p>}
                    </Card>
                </div>

                <Card title="Arquivos Importados nesta Sessão">
                    {contextImportedFilesDetails.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {contextImportedFilesDetails.map((file: ImportedFileDetail) => (
                                <div key={file.id} className="p-3 border rounded-md bg-gray-50 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                        <div className="flex items-center mb-2 sm:mb-0">
                                            <FileText size={20} className="mr-3 text-blue-600" />
                                            <div>
                                                <p className="font-semibold text-gray-800 truncate max-w-xs md:max-w-md" title={file.name}>{file.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {(file.size / 1024).toFixed(1)} KB |
                                                    Tipo: {file.type || 'desconhecido'} |
                                                    Ref. Arquivo: {file.generationDate ? format(file.generationDate, 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    Importado em: {file.importDate ? format(file.importDate, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2 mt-2 sm:mt-0 self-end sm:self-center flex-wrap gap-1">
                                            <Button onClick={() => viewFileInModal(file)} variant="outline" className="px-2 py-1 text-xs">
                                                <Eye size={14} className="mr-1" /> Pré-visualizar
                                            </Button>
                                            <Button onClick={() => openFileInPlanilha(file.id)} variant="outline" className="px-2 py-1 text-xs">
                                                <ExternalLink size={14} className="mr-1" /> Ver na Planilha
                                            </Button>
                                            <Button onClick={() => deleteFileAndUpdate(file.id)} variant="destructive" className="px-2 py-1 text-xs">
                                                <Trash2 size={14} className="mr-1" /> Remover
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Info size={40} className="mx-auto text-gray-400 mb-2" />
                             <p className="text-gray-500">Nenhum arquivo CSV foi importado nesta sessão ainda.</p>
                             <p className="text-xs text-gray-400 mt-1">Clique em "Importar CSV" para adicionar arquivos.</p>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default DashboardPage;
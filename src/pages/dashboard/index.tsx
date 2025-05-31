import React, { useState, useMemo, useRef, type ReactNode, type ElementType, type ComponentPropsWithoutRef, useEffect, useContext } from 'react';
import {
    useAppContext,
    Modal,
    type ImportedFile,
    MenuContext as GlobalMenuContext,
    globalCleanAndParseNumber,
    globalTransformHeader,
    type FileTypeCategory,
    fileTypeCategories
} from '../../App';
import { parse, unparse, type ParseResult, type ParseError } from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Cell } from 'recharts';
import { 
    UploadCloud, FileText, Trash2, Eye, Table, Download, AlertCircle, TrendingDown, 
    Droplets, BarChart3 as BarChart3Icon, LineChart as LineChartIconLucide, 
    ChevronDown, BarChartHorizontal as BarChartHorizontalIcon, HelpCircle, 
    CalendarDays, LayoutDashboard, CheckSquare, Square
} from 'lucide-react';

export type PeriodAggregation = 'Diário' | 'Semanal' | 'Mensal' | 'Anual';

const defaultKpis = {
    perdaTotalEstimada: 0,
    municipiosCriticos: 0,
    volumeDistribuidoTotal: 0,
    variacaoPerdaMesAnterior: 0,
    eficienciaArrecadacao: 0,
};

const defaultBalançoVolumes = [
    { municipio: 'N/A', 'Volume Distribuído': 0, 'Volume Consumido': 0, 'Perda Total': 0, 'Mês/Ano Referência': 'N/A' },
];

const defaultEvolucaoData = [{ 'periodo': 'N/A', 'volume_distribuido': 0, 'volume_consumido': 0, 'perda_total': 0, count:0 }];


const KPICard: React.FC<{ title: string; value: string | number; unit?: string; icon: React.ReactNode; trend?: number; helpText?: string }> = ({ title, value, unit, icon, trend, helpText }) => {
    const trendValueColor = trend ? (trend > 0 ? 'text-red-500' : 'text-green-500') : '';
    const trendIcon = trend && trend !== 0 ? (trend > 0 ? <TrendingDown size={16} className="ml-1" /> : <TrendingDown size={16} className="ml-1 transform rotate-180"/>) : null;
    const valueStr = typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: trend === undefined ? 2 : 1, maximumFractionDigits: trend === undefined ? 2 : 1 }) : value;
    
    return (
        <div className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div className="p-3 bg-gray-100 rounded-full mr-3">{icon}</div>
                {helpText && (
                    <div className="relative group">
                        <HelpCircle size={16} className="text-gray-400 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 p-2 text-xs text-white bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                            {helpText}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700"></div>
                        </div>
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-sm font-medium text-gray-500 truncate" title={title}>{title}</h3>
                <div className="flex items-baseline">
                    <p className={`text-2xl font-semibold text-gray-800 ${trendValueColor}`}>{valueStr}</p>
                    {unit && <span className={`text-sm text-gray-600 ml-1 ${trendValueColor}`}>{unit}</span>}
                    {trendIcon && <span className={trendValueColor}>{trendIcon}</span>}
                </div>
            </div>
        </div>
    );
};


const EvolutionChartComponent: React.FC<{ title: string; data: any[]; dataKey: string; color: string; yAxisLabel?: string }> = ({ title, data, dataKey, color, yAxisLabel }) => (
    <div className="h-80 bg-white p-4 rounded-lg shadow">
        <h3 className="text-md font-semibold text-gray-600 mb-2 text-center">{title}</h3>
        <ResponsiveContainer width="100%" height="calc(100% - 30px)">
            <LineChart data={data} margin={{ top: 5, right: 20, left: yAxisLabel ? 10 : -25, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="periodo" stroke="#6b7280" fontSize={10} tick={{dy: 5}} />
                <YAxis stroke="#6b7280" fontSize={10} tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {notation: 'compact'}) : String(value)} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', offset: yAxisLabel ? 0 : 5, fontSize: 10, fill:"#6b7280"}}/>
                <Tooltip formatter={(value: number, name: string) => [`${typeof value === 'number' ? value.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}) : String(value)}`, name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())]} />
                <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={dataKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
            </LineChart>
        </ResponsiveContainer>
    </div>
);

const ImportCSVModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { addImportedFile, showToast, setIsLoading } = useAppContext();
    const [selectedFilesList, setSelectedFilesList] = useState<File[]>([]);
    const [referenceDate, setReferenceDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [fileCategories, setFileCategories] = useState<Record<string, FileTypeCategory>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const guessCategory = (fileName: string): FileTypeCategory => {
        const lowerName = fileName.toLowerCase();
        if (lowerName.includes('vcnorma')) return 'VCNorma';
        if (lowerName.includes('vdistrib') || lowerName.includes('vol_dist')) return 'VDistrib';
        if (lowerName.includes('reldesvios') || lowerName.includes('desvio')) return 'RelDesvios';
        if (lowerName.includes('analiseacum') || lowerName.includes('acumulada')) return 'AnaliseAcum';
        if (lowerName.includes('analise')) return 'Analise';
        return 'Outros';
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            const newFiles = Array.from(event.target.files);
            const csvFiles = newFiles.filter(file => file.name.toLowerCase().endsWith('.csv'));
            if (csvFiles.length !== newFiles.length) showToast("Apenas arquivos .csv são permitidos.", 'error');
            
            const newCategoriesState: Record<string, FileTypeCategory> = {};
            csvFiles.forEach(file => {
                if (!Object.values(fileCategories).includes(file.name as any)) {
                    newCategoriesState[file.name] = guessCategory(file.name);
                }
            });
            setFileCategories(prev => ({...prev, ...newCategoriesState}));
            setSelectedFilesList(prevFiles => {
                const currentFileNames = new Set(prevFiles.map(f => f.name));
                const newAndUniqueFiles = csvFiles.filter(nf => !currentFileNames.has(nf.name));
                return [...prevFiles, ...newAndUniqueFiles];
            });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCategoryChange = (fileName: string, category: FileTypeCategory) => {
        setFileCategories(prev => ({ ...prev, [fileName]: category }));
    };

    const removeFileFromSelection = (fileName: string) => {
        setSelectedFilesList(prev => prev.filter(file => file.name !== fileName));
        setFileCategories(prev => {
            const updated = {...prev};
            delete updated[fileName];
            return updated;
        });
    };

    const handleImport = async () => {
        if (selectedFilesList.length === 0) { showToast("Selecione ao menos um arquivo CSV.", 'error'); return; }
        if (!referenceDate) { showToast("Selecione uma data de referência.", 'error'); return; }
        setIsLoading(true);
        showToast(`Importando ${selectedFilesList.length} arquivo(s)...`, 'info');
        let importSuccessCount = 0;

        for (const file of selectedFilesList) {
            const fileCategory = fileCategories[file.name] || guessCategory(file.name);
            try {
                const parsedData = await new Promise<Record<string, any>[]>((resolve, reject) => {
                    parse<Record<string, any>>(file, {
                        header: true, skipEmptyLines: true, transformHeader: globalTransformHeader, dynamicTyping: false,
                        complete: (results: ParseResult<Record<string, any>>) => {
                            const transformedData = results.data.map((row: Record<string, any>) => {
                                const newRow: Record<string, any> = {};
                                for (const key in row) {
                                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                                        const lowerKey = key.toLowerCase();
                                        if (lowerKey.includes('volume') || lowerKey.includes('perda') || lowerKey.includes('desvio') || lowerKey.includes('limite') || lowerKey.includes('valor') || lowerKey.includes('indice') || lowerKey.includes('quantidade') || lowerKey.includes('faturamento') || lowerKey.includes('consumo') || lowerKey.includes('medido') || lowerKey.includes('ead') || lowerKey.includes('vazao') || lowerKey.includes('pressao') || lowerKey.includes('nivel')) {
                                            newRow[key] = globalCleanAndParseNumber(row[key] as string);
                                        } else {
                                            newRow[key] = row[key];
                                        }
                                    }
                                }
                                return newRow;
                            });
                            resolve(transformedData);
                        },
                        error: (error: ParseError) => reject(error),
                    });
                });
                const headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
                const newFile: ImportedFile = {
                    id: `${file.name}-${referenceDate}-${fileCategory}-${Date.now()}`, name: file.name, size: file.size, type: file.type,
                    fileCategory, referenceDate, importDate: new Date(), data: parsedData, headers: headers,
                };
                addImportedFile(newFile);
                importSuccessCount++;
            } catch (error) {
                console.error(`Erro ao importar ${file.name}:`, error);
                showToast(`Erro ao processar o arquivo "${file.name}".`, 'error');
            }
        }
        if (importSuccessCount > 0) {
            showToast(`${importSuccessCount} arquivo(s) importado(s) com sucesso!`, 'success');
        }
        setSelectedFilesList([]);
        setFileCategories({});
        if (fileInputRef.current) fileInputRef.current.value = "";
        setIsLoading(false);
        if (importSuccessCount > 0) onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Importar Arquivos CSV" size="xl"
            footer={
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button type="button" onClick={handleImport} disabled={selectedFilesList.length === 0} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center">
                        <UploadCloud size={18} className="mr-2" /> Importar ({selectedFilesList.length})
                    </button>
                </div>
            }
        >
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <label htmlFor="referenceDateModal" className="block text-sm font-medium text-gray-700 mb-1">Data de Referência dos Arquivos</label>
                    <input type="date" id="referenceDateModal" value={referenceDate} onChange={(e) => setReferenceDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar Arquivos CSV</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-500 transition-colors">
                        <div className="space-y-1 text-center">
                            <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload-modal" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                    <span>Carregar arquivos</span>
                                    <input id="file-upload-modal" name="file-upload-modal" type="file" className="sr-only" multiple onChange={handleFileChange} accept=".csv" ref={fileInputRef} />
                                </label>
                                <p className="pl-1">ou arraste e solte</p>
                            </div>
                            <p className="text-xs text-gray-500">Apenas arquivos CSV</p>
                        </div>
                    </div>
                </div>
                {selectedFilesList.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Arquivos Selecionados:</h3>
                        <ul className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
                            {selectedFilesList.map((f: File) => (
                                <li key={f.name} className="flex flex-col sm:flex-row justify-between sm:items-center p-2 bg-gray-50 rounded-md gap-2">
                                    <div className="flex items-center space-x-2 flex-grow min-w-0">
                                        <FileText size={18} className="text-green-600 flex-shrink-0" />
                                        <span className="text-sm text-gray-700 truncate" title={f.name}>{f.name}</span>
                                        <span className="text-xs text-gray-500 whitespace-nowrap">({(f.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-2 sm:mt-0 flex-shrink-0">
                                        <select
                                            value={fileCategories[f.name] || 'Outros'}
                                            onChange={(e) => handleCategoryChange(f.name, e.target.value as FileTypeCategory)}
                                            className="p-1 border border-gray-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500 bg-white"
                                        >
                                            {fileTypeCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                        </select>
                                        <button onClick={() => removeFileFromSelection(f.name)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={16} /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const ImportedFilesListRemoved: React.FC = () => { 
    return null;
};


interface MenuItemRenderProps {
    active: boolean;
    disabled: boolean;
}

interface MenuItemProps {
    children: (props: MenuItemRenderProps) => ReactNode;
    disabled?: boolean;
    className?: string;
    onClick?: () => void;
}

const Menu: React.FC<{ children: ReactNode, as?: ElementType, className?: string }> & {
    Button: React.FC<Omit<ComponentPropsWithoutRef<'button'>, 'children'> & { children: ReactNode, onClick?: (e: React.MouseEvent) => void }>;
    Items: React.FC<Omit<ComponentPropsWithoutRef<'div'>, 'children'> & { children: ReactNode }>;
    Item: React.FC<MenuItemProps>;
} = ({ children, as: Component = 'div', ...props }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(o => !o);
    };

    const childrenWithToggle = React.Children.map(children, (child) => {
        if (React.isValidElement(child) && (child.type as any).displayName === 'MenuButton') {
            return React.cloneElement(child as React.ReactElement<any>, { onClick: toggleMenu });
        }
        return child;
    });

    return (
        <GlobalMenuContext.Provider value={{ open: isOpen }}>
            <Component ref={menuRef} {...props} >{childrenWithToggle}</Component>
        </GlobalMenuContext.Provider>
    );
};

const MenuButton: React.FC<Omit<ComponentPropsWithoutRef<'button'>, 'children'> & { children: ReactNode, onClick?: (e: React.MouseEvent) => void }> = ({ children, onClick, ...props }) => <button onClick={onClick} {...props}>{children}</button>;
MenuButton.displayName = 'MenuButton';
Menu.Button = MenuButton;

Menu.Items = ({ children, ...props }) => {
    const { open } = useContext(GlobalMenuContext);
    if (!open) return null;
    return <div {...props}>{children}</div>;
};
Menu.Items.displayName = 'MenuItems';

Menu.Item = ({ children, disabled = false, className = '', onClick, ...rest }) => {
    return (
        <div
            {...rest}
            className={`${className || ''} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={disabled ? undefined : onClick}
        >
            {children({ active: false, disabled })}
        </div>
    );
};
Menu.Item.displayName = 'MenuItem';

const getWeekNumber = (d: Date): number => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const DashboardPage: React.FC = () => {
    const { 
        showToast, setIsLoading, selectedFileForDashboard, importedFiles, 
        setSelectedFileForDashboard: globalSetSelectedFileForDashboard,
        setSelectedFileForPlanilha 
    } = useAppContext();
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [kpis, setKpis] = useState(defaultKpis);
    const [balancoVolumesData, setBalancoVolumesData] = useState(defaultBalançoVolumes);
    const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
    const [uniqueMunicipalities, setUniqueMunicipalities] = useState<string[]>([]);
    const [periodAggregation, setPeriodAggregation] = useState<PeriodAggregation>('Mensal');

    const getColumnKey = (headers: string[], keywords: string[], defaultKey: string): string => {
        const originalHeaders = headers; 
        const lowerTransformedHeaders = headers.map(h => globalTransformHeader(h)); 
    
        for (const keyword of keywords) {
            const transformedKeyword = globalTransformHeader(keyword);
            const foundIndex = lowerTransformedHeaders.findIndex(h => h.includes(transformedKeyword));
            if (foundIndex > -1) return originalHeaders[foundIndex]; 
        }
        
        const transformedDefaultKey = globalTransformHeader(defaultKey);
        const defaultIndex = lowerTransformedHeaders.findIndex(h => h === transformedDefaultKey);
        if (defaultIndex > -1) return originalHeaders[defaultIndex];
        
        for (const keyword of keywords) {
            const foundIndex = originalHeaders.findIndex(h => h.toLowerCase().includes(keyword.toLowerCase()));
            if (foundIndex > -1) return originalHeaders[foundIndex];
        }
        const originalDefaultIndex = originalHeaders.findIndex(h => h.toLowerCase() === defaultKey.toLowerCase());
        if (originalDefaultIndex > -1) return originalHeaders[originalDefaultIndex];

        return defaultKey; 
    };
    
    const parseDateRobust = (dateStr: string | number | null | undefined): Date | null => {
        if (dateStr === null || dateStr === undefined || String(dateStr).trim() === '' || String(dateStr).toLowerCase() === 'n/a') {
            return null;
        }
        const sDateStr = String(dateStr).trim();
        let parts: RegExpMatchArray | string[] | null; 
            
        parts = sDateStr.match(/^(\d{1,2})[/-](\d{4})$/); 
        if (parts && parts.length === 3) {
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            if (!isNaN(month) && !isNaN(year) && month >= 0 && month < 12 && year > 1900 && year < 2100) {
                return new Date(year, month, 1);
            }
        }
        
        parts = sDateStr.match(/^(\d{4})[/-](\d{1,2})$/); 
        if (parts && parts.length === 3) {
            const year = parseInt(parts[1], 10);
            const month = parseInt(parts[2], 10) - 1;
            if (!isNaN(year) && !isNaN(month) && month >= 0 && month < 12 && year > 1900 && year < 2100) {
                return new Date(year, month, 1);
            }
        }
    
        let splitParts = sDateStr.split(/[/-]/);
        if (splitParts.length === 3) {
            const p1 = parseInt(splitParts[0], 10);
            const p2 = parseInt(splitParts[1], 10);
            const p3 = parseInt(splitParts[2], 10);
    
            if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
                if (splitParts[0].length === 4 && p2 >= 1 && p2 <= 12 && p1 > 1900 && p1 < 2100) return new Date(p1, p2 - 1, p3);
                if (splitParts[2].length === 4 && p2 >= 1 && p2 <= 12 && p3 > 1900 && p3 < 2100) return new Date(p3, p2 - 1, p1);
                if (splitParts[2].length === 4 && p1 >= 1 && p1 <= 12 && p3 > 1900 && p3 < 2100) return new Date(p3, p1 - 1, p2);
            }
        }
            
        const parsed = new Date(sDateStr); 
        if (!isNaN(parsed.getTime())) {
            const year = parsed.getFullYear();
            if (year > 1900 && year < 2100) return parsed;
        }
        return null;
    };
    

    const evolucaoData = useMemo(() => {
        if (!selectedFileForDashboard || !selectedFileForDashboard.data.length) return defaultEvolucaoData;
    
        const dataToProcess = selectedFileForDashboard.data;
        const headers = selectedFileForDashboard.headers;
    
        const municipioKey = getColumnKey(headers, ['municipio', 'município', 'localidade', 'cidade'], 'municipio');
        const periodoKeyOriginal = getColumnKey(headers, ['mes_ano_referencia', 'data', 'periodo', 'competencia', 'mês', 'mesano', 'data_ref'], 'mes_ano_referencia');
        const volDistKey = getColumnKey(headers, ['volume_distribuido', 'vol_dist', 'distribuido', 'vol_distribuido_m3'], 'volume_distribuido');
        const volConsKey = getColumnKey(headers, ['volume_consumido', 'vol_cons', 'consumido', 'faturado', 'vol_consumido_m3', 'vol_faturado_m3'], 'volume_consumido');
        const perdaKey = getColumnKey(headers, ['perda_total', 'perdas', 'perda', 'perda_m3'], 'perda_total');
    
        const filteredByMunicipality = selectedMunicipality
            ? dataToProcess.filter(d => String(d[municipioKey]).trim().toLowerCase() === selectedMunicipality.trim().toLowerCase())
            : dataToProcess;
    
        const aggregated: Record<string, {
            periodo: string;
            volume_distribuido: number;
            volume_consumido: number;
            perda_total: number;
            count: number;
            dateObject?: Date;
        }> = {};
    
        filteredByMunicipality.forEach(d => {
            const dateValue = parseDateRobust(d[periodoKeyOriginal]);
            if (!dateValue) return;

            let aggKey: string; 
            let displayPeriodo: string; 

            switch (periodAggregation) {
                case 'Diário':
                    aggKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}-${String(dateValue.getDate()).padStart(2, '0')}`;
                    displayPeriodo = dateValue.toLocaleDateString('pt-BR', {day: '2-digit', month: 'short', year: 'numeric'});
                    break;
                case 'Semanal':
                    const yearW = dateValue.getFullYear();
                    const week = getWeekNumber(dateValue);
                    aggKey = `${yearW}-S${String(week).padStart(2, '0')}`;
                    displayPeriodo = aggKey;
                    break;
                case 'Anual':
                    aggKey = `${dateValue.getFullYear()}`;
                    displayPeriodo = aggKey;
                    break;
                case 'Mensal':
                default:
                    aggKey = `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, '0')}`;
                    displayPeriodo = `${String(dateValue.getMonth() + 1).padStart(2, '0')}/${dateValue.getFullYear()}`;
                    break;
            }
            
            if (!aggregated[aggKey]) {
                aggregated[aggKey] = { periodo: displayPeriodo, volume_distribuido: 0, volume_consumido: 0, perda_total: 0, count: 0, dateObject: dateValue };
            }
            aggregated[aggKey].volume_distribuido += Number(d[volDistKey] || 0);
            aggregated[aggKey].volume_consumido += Number(d[volConsKey] || 0);
            aggregated[aggKey].perda_total += Number(d[perdaKey] || 0);
            aggregated[aggKey].count++;
        });
        
        return Object.values(aggregated)
        .map(item => ({...item, mes_ano_referencia: item.periodo })) 
        .sort((a, b) => {
            const dateA = a.dateObject || parseDateRobust(a.periodo) || new Date(0); 
            const dateB = b.dateObject || parseDateRobust(b.periodo) || new Date(0);
            return dateA.getTime() - dateB.getTime();
        });
    
    }, [selectedFileForDashboard, selectedMunicipality, periodAggregation]);


    useEffect(() => {
        if (selectedFileForDashboard && selectedFileForDashboard.data.length > 0) {
            const data = selectedFileForDashboard.data;
            const headers = selectedFileForDashboard.headers;

            const municipioKey = getColumnKey(headers, ['municipio', 'município', 'localidade', 'cidade'], 'municipio');
            const periodoKeyOriginal = getColumnKey(headers, ['mes_ano_referencia', 'data', 'periodo', 'competencia', 'mês', 'mesano', 'data_ref'], 'mes_ano_referencia');
            const volDistKey = getColumnKey(headers, ['volume_distribuido', 'vol_dist', 'distribuido', 'vol_distribuido_m3'], 'volume_distribuido');
            const volConsKey = getColumnKey(headers, ['volume_consumido', 'vol_cons', 'consumido', 'faturado', 'vol_consumido_m3', 'vol_faturado_m3'], 'volume_consumido');
            const perdaKey = getColumnKey(headers, ['perda_total', 'perdas', 'perda', 'perda_m3'], 'perda_total');
            const statusKey = getColumnKey(headers, ['status_perda', 'status', 'classificacao', 'situação', 'risco'], 'status_perda');
            const eadKey = getColumnKey(headers, ['ead', 'eficiencia_arrecadacao', 'arrecadacao_eficiencia', 'índice_arrecadação', 'eficiencia'], 'ead');


            let totalDistAcumulado = 0;
            let totalPerdaUltimoMes = 0;
            let totalEadUltimoMes = 0;
            let countEadUltimoMes = 0;

            const municipiosCriticosSet = new Set<string>();
            const balancoPorMunicipio: Record<string, { municipio: string, 'Mês/Ano Referência': string, 'Volume Distribuído': number, 'Volume Consumido': number, 'Perda Total': number }> = {};
            
            const muniList = [...new Set(data.map(d => String(d[municipioKey]).trim()).filter(m => m && m.toLowerCase() !== 'null' && m.toLowerCase() !== 'undefined' && m.trim() !== ''))].sort();
            setUniqueMunicipalities(muniList);

            const datasUnicas = [...new Set(data.map(d => parseDateRobust(d[periodoKeyOriginal])).filter(d => d !== null) as Date[])]
                .sort((a, b) => b.getTime() - a.getTime());
                
            const ultimoPeriodoDate = datasUnicas.length > 0 ? datasUnicas[0] : null;
            const penultimoPeriodoDate = datasUnicas.length > 1 ? datasUnicas[1] : null;
            let perdaPenultimoMes = 0;
            
            data.forEach(d => {
                totalDistAcumulado += Number(d[volDistKey] || 0);
                const currentDataDate = parseDateRobust(d[periodoKeyOriginal]);

                if (ultimoPeriodoDate && currentDataDate && currentDataDate.getTime() === ultimoPeriodoDate.getTime()) {
                    totalPerdaUltimoMes += Number(d[perdaKey] || 0);
                    const eadValue = d[eadKey];
                    if (typeof eadValue === 'number' && !isNaN(eadValue)) {
                        totalEadUltimoMes += eadValue;
                        countEadUltimoMes++;
                    }
                    const statusValue = String(d[statusKey]).toLowerCase();
                    if (d[statusKey] && statusValue !== 'normal' && statusValue !== 'bom' && statusValue !== 'regular' && d[municipioKey]) {
                        municipiosCriticosSet.add(String(d[municipioKey]));
                    }
                    if (d[municipioKey]) {
                        balancoPorMunicipio[String(d[municipioKey])] = {
                            municipio: String(d[municipioKey]),
                            'Mês/Ano Referência': String(d[periodoKeyOriginal]),
                            'Volume Distribuído': Number(d[volDistKey] || 0),
                            'Volume Consumido': Number(d[volConsKey] || 0),
                            'Perda Total': Number(d[perdaKey] || 0),
                        };
                    }
                } else if (penultimoPeriodoDate && currentDataDate && currentDataDate.getTime() === penultimoPeriodoDate.getTime()) {
                    perdaPenultimoMes += Number(d[perdaKey] || 0);
                }
            });
            
            const variacaoPerda = penultimoPeriodoDate && perdaPenultimoMes !== 0 ? ((totalPerdaUltimoMes - perdaPenultimoMes) / perdaPenultimoMes) * 100 : (totalPerdaUltimoMes !==0 ? Infinity : 0);
            const eficienciaMediaArrecadacao = countEadUltimoMes > 0 ? (totalEadUltimoMes / countEadUltimoMes) : 0;


            setKpis({
                perdaTotalEstimada: totalPerdaUltimoMes,
                municipiosCriticos: municipiosCriticosSet.size,
                volumeDistribuidoTotal: totalDistAcumulado,
                variacaoPerdaMesAnterior: variacaoPerda === Infinity ? 100 : variacaoPerda,
                eficienciaArrecadacao: eficienciaMediaArrecadacao
            });

            const balancoArray = Object.values(balancoPorMunicipio);
            setBalancoVolumesData(balancoArray.length > 0 ? balancoArray.sort((a,b) => a.municipio.localeCompare(b.municipio)) : defaultBalançoVolumes);

            if (balancoArray.length === 0 && data.length > 0 && ultimoPeriodoDate) {
                showToast("Balanço por município não gerado para o último período. Verifique colunas do arquivo.", "info");
            }

        } else {
            setKpis(defaultKpis);
            setBalancoVolumesData(defaultBalançoVolumes);
            setSelectedMunicipality(null);
            setUniqueMunicipalities([]);
        }
    }, [selectedFileForDashboard, showToast]);


    const handleBarClick = (data: any) => {
        if (data && data.activePayload && data.activePayload.length > 0) {
            const municipioClicado = data.activePayload[0].payload.municipio;
            setSelectedMunicipality(prev => prev === municipioClicado ? null : municipioClicado);
        } else {
            if (data && data.activeLabel && balancoVolumesData.some(item => item.municipio === data.activeLabel)) {
                setSelectedMunicipality(prev => prev === data.activeLabel ? null : data.activeLabel);
            } else {
                setSelectedMunicipality(null);
            }
        }
    };

    const exportAggregatedDataToCSV = () => {
        if (!selectedFileForDashboard) {
            showToast("Nenhum arquivo selecionado para exportar.", "error");
            return;
        }
        setIsLoading(true); showToast("Gerando CSV dos dados agregados...", "info");
        try {
            const dataToExport: (string | number | null)[][] = [
                ["KPI", "Valor", "Unidade/Observação"],
                ["Perda Total Estimada (Último Período)", kpis.perdaTotalEstimada, "m³"],
                ["Variação da Perda vs Mês Anterior", kpis.variacaoPerdaMesAnterior.toFixed(2), "%"],
                ["Eficiência de Arrecadação Média (Último Período)", kpis.eficienciaArrecadacao.toFixed(2), "%"],
                ["Municípios Críticos (Último Período)", kpis.municipiosCriticos, ""],
                ["Volume Distribuído Acumulado (Total do Arquivo)", kpis.volumeDistribuidoTotal, "m³"],
                [],
                ["Balanço de Volumes por Município (Último Período Disponível no Arquivo Selecionado)"],
                ["Município", "Mês/Ano Referência", "Volume Distribuído (m³)", "Volume Consumido (m³)", "Perda Total (m³)"],
                ...balancoVolumesData.map(item => [item.municipio, item['Mês/Ano Referência'], item['Volume Distribuído'], item['Volume Consumido'], item['Perda Total']]),
                [],
                [`Evolução Temporal (${periodAggregation}) ${selectedMunicipality ? `- ${selectedMunicipality}` : '- Geral do Arquivo'}`],
                ["Período", "Volume Distribuído (m³)", "Volume Consumido (m³)", "Perda Total (m³)"],
            ];

            evolucaoData.forEach(item => {
                dataToExport.push([
                    item['periodo'],
                    item['volume_distribuido'],
                    item['volume_consumido'],
                    item['perda_total']
                ]);
            });

            const csv = unparse(dataToExport as any[]);
            const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `dados_agregados_compesa_${selectedFileForDashboard.name.replace(".csv","")}_${new Date().toISOString().split('T')[0]}.csv`;
            link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
            showToast("CSV gerado com sucesso!", "success");
        } catch (error) { console.error("Erro ao gerar CSV:", error); showToast("Erro ao gerar CSV.", "error"); }
        finally { setIsLoading(false); }
    };
    const exportReportToPDF = () => {
        if (!selectedFileForDashboard) {
            showToast("Nenhum arquivo selecionado para gerar relatório.", "error");
            return;
        }
        setIsLoading(true); showToast("Gerando PDF do relatório...", "info");
        try {
            const doc = new jsPDF({ orientation: 'landscape' }); 
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;

            doc.setFontSize(18); doc.text("Relatório de Análise Hídrica - Compesa", pageWidth / 2, margin, { align: 'center' });
            doc.setFontSize(10); doc.text(`Arquivo: ${selectedFileForDashboard.name} (${selectedFileForDashboard.fileCategory})`, margin, margin + 10);
            doc.text(`Data de Referência do Arquivo: ${new Date(selectedFileForDashboard.referenceDate + 'T00:00:00').toLocaleDateString()}`, margin, margin + 15);
            doc.text(`Relatório Gerado em: ${new Date().toLocaleDateString()}`, pageWidth - margin, margin + 10, { align: 'right' });
            if (selectedMunicipality) doc.text(`Filtro Município (Evolução): ${selectedMunicipality}`, pageWidth - margin, margin + 15, { align: 'right' });


            let currentY = margin + 30;
            doc.setFontSize(14); doc.text("Indicadores Chave de Desempenho (KPIs)", margin, currentY); currentY += 7;
            (jsPDF as any).autoTable(doc, {
                startY: currentY,
                head: [['Indicador', 'Valor', 'Obs/Unidade']],
                body: [
                    ["Perda Total Estimada (Último Período)", kpis.perdaTotalEstimada.toLocaleString('pt-BR', {maximumFractionDigits:2}) , "m³"],
                    ["Variação da Perda vs Mês Anterior", `${kpis.variacaoPerdaMesAnterior.toFixed(2)}%` , kpis.variacaoPerdaMesAnterior > 0 ? "Aumento" : (kpis.variacaoPerdaMesAnterior < 0 ? "Redução" : "Estável") ],
                    ["Eficiência de Arrecadação Média (Último Período)", `${kpis.eficienciaArrecadacao.toFixed(2)}%` , ""],
                    ["Municípios Críticos (Último Período)", kpis.municipiosCriticos, ""],
                    ["Volume Distribuído Acumulado (Total do Arquivo)", kpis.volumeDistribuidoTotal.toLocaleString('pt-BR', {maximumFractionDigits:2}), "m³"]
                ],
                theme: 'striped', headStyles: { fillColor: [22, 160, 133] }, margin: { left: margin, right: margin }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;

            if (currentY > pageHeight - 40) { doc.addPage(); currentY = margin; }
            doc.setFontSize(14); doc.text("Balanço dos Volumes por Município (Último Período Disponível)", margin, currentY); currentY += 7;
            (jsPDF as any).autoTable(doc, {
                startY: currentY,
                head: [['Município', 'Mês/Ano Ref.', 'Vol. Dist. (m³)', 'Vol. Cons. (m³)', 'Perda Total (m³)']],
                body: balancoVolumesData.map(item => [
                    item.municipio,
                    item['Mês/Ano Referência'],
                    item['Volume Distribuído'].toLocaleString('pt-BR', {maximumFractionDigits:2}),
                    item['Volume Consumido'].toLocaleString('pt-BR', {maximumFractionDigits:2}),
                    item['Perda Total'].toLocaleString('pt-BR', {maximumFractionDigits:2})
                ]),
                theme: 'grid', headStyles: { fillColor: [41, 128, 185] }, margin: { left: margin, right: margin },
                tableWidth: 'auto'
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;
            
            if (currentY > pageHeight - 40) { doc.addPage(); currentY = margin; }
            doc.setFontSize(14); doc.text(`Evolução Temporal (${periodAggregation}) ${selectedMunicipality ? `- ${selectedMunicipality}` : '- Geral do Arquivo'}`, margin, currentY); currentY += 7;
            (jsPDF as any).autoTable(doc, {
                startY: currentY,
                head: [['Período', 'Vol. Dist. (m³)', 'Vol. Cons. (m³)', 'Perda Total (m³)']],
                body: evolucaoData.map(item => [
                    item['periodo'],
                    item['volume_distribuido'].toLocaleString('pt-BR', {maximumFractionDigits:2}),
                    item['volume_consumido'].toLocaleString('pt-BR', {maximumFractionDigits:2}),
                    item['perda_total'].toLocaleString('pt-BR', {maximumFractionDigits:2})
                ]),
                theme: 'grid', headStyles: { fillColor: [243, 156, 18] }, margin: { left: margin, right: margin }
            });

            doc.save(`relatorio_compesa_${selectedFileForDashboard.name.replace(".csv","")}_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast("PDF gerado com sucesso!", "success");
        } catch (error) { console.error("Erro ao gerar PDF:", error); showToast("Erro ao gerar PDF.", "error"); }
        finally { setIsLoading(false); }
    };
    const chartColorsConfig = { distribuido: "#3b82f6", consumido: "#10b981", perda: "#ef4444", defaultText: "#4b5563" };

    const barChartCustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
            <div className="bg-white p-2 shadow-lg rounded-md border border-gray-200">
                <p className="label text-sm font-semibold text-gray-700">{`${label}`}</p>
                {payload.map((pld: any, index: number) => (
                <div key={index} style={{ color: pld.fill }}>
                    <span className="text-xs">{pld.name}: </span>
                    <span className="text-xs font-medium">{typeof pld.value === 'number' ? pld.value.toLocaleString('pt-BR', {minimumFractionDigits:0, maximumFractionDigits:0}) : pld.value} m³</span>
                </div>
                ))}
            </div>
            );
        }
        return null;
    };

    const handleDashboardFileSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const fileId = event.target.value;
        if (fileId) {
            const file = importedFiles.find(f => f.id === fileId);
            if (file) {
                globalSetSelectedFileForDashboard(file);
                setSelectedFileForPlanilha(file);
                showToast(`Arquivo "${file.name}" selecionado para análise.`, 'info');
            }
        } else {
            globalSetSelectedFileForDashboard(null);
            setSelectedFileForPlanilha(null);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-[calc(100vh-64px)]">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Dashboard de Análise Hídrica</h1>
                <div className="flex gap-2 flex-wrap justify-center sm:justify-end items-center">
                    {importedFiles.length > 0 && (
                            <div className="flex items-center">
                                <label htmlFor="dashboard-file-select" className="text-sm mr-2 text-gray-700 whitespace-nowrap">Analisar Arquivo:</label>
                                <select
                                    id="dashboard-file-select"
                                    value={selectedFileForDashboard?.id || ""}
                                    onChange={handleDashboardFileSelect}
                                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm bg-white max-w-[200px] sm:max-w-xs"
                                >
                                    <option value="">-- Selecione um Arquivo --</option>
                                    {importedFiles.map(file => (
                                        <option key={file.id} value={file.id}>
                                            {file.name} ({file.fileCategory})
                                        </option>
                                    ))}
                                </select>
                            </div>
                    )}
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition duration-150 ease-in-out flex items-center">
                        <UploadCloud size={20} className="mr-2" /> Importar CSV
                    </button>
                    <Menu as="div" className="relative inline-block text-left">
                        <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500 disabled:opacity-50" disabled={!selectedFileForDashboard}>
                            <Download size={20} className="mr-2" /> Exportar
                            <ChevronDown className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
                        </Menu.Button>
                        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                                <Menu.Item onClick={exportAggregatedDataToCSV} disabled={!selectedFileForDashboard} className="group flex rounded-md items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-400">{({ active, disabled }) => (<button className={`${active && !disabled ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} w-full text-left flex items-center disabled:text-gray-400 disabled:cursor-not-allowed`} disabled={disabled}><FileText size={18} className="mr-3 text-green-500" />Dados Agregados (CSV)</button>)}</Menu.Item>
                                <Menu.Item onClick={exportReportToPDF} disabled={!selectedFileForDashboard} className="group flex rounded-md items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 disabled:text-gray-400">{({ active, disabled }) => (<button className={`${active && !disabled ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} w-full text-left flex items-center disabled:text-gray-400 disabled:cursor-not-allowed`} disabled={disabled}><FileText size={18} className="mr-3 text-red-500" />Relatório (PDF)</button>)}</Menu.Item>
                            </div>
                        </Menu.Items>
                    </Menu>
                </div>
            </div>
            {selectedFileForDashboard && (
                <div className="p-3 bg-blue-100 border border-blue-300 rounded-md text-sm text-blue-700 flex flex-col sm:flex-row justify-between items-center gap-2">
                    <span>Analisando: <strong>{selectedFileForDashboard.name}</strong> ({selectedFileForDashboard.fileCategory}) - Ref: {new Date(selectedFileForDashboard.referenceDate + 'T00:00:00').toLocaleDateString()}</span>
                    <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                        {uniqueMunicipalities.length > 0 && (
                            <div className="flex items-center">
                                <label htmlFor="municipio-filter" className="text-xs mr-1 sm:mr-2 whitespace-nowrap">Filtrar Município:</label>
                                <select 
                                    id="municipio-filter"
                                    value={selectedMunicipality || ""} 
                                    onChange={(e) => setSelectedMunicipality(e.target.value || null)}
                                    className="p-1 border border-blue-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500 bg-white max-w-[150px]"
                                >
                                    <option value="">Todos</option>
                                    {uniqueMunicipalities.map(muni => <option key={muni} value={muni}>{muni}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center">
                            <label htmlFor="period-aggregation" className="text-xs mr-1 sm:mr-2 whitespace-nowrap">Agregar Evolução por:</label>
                            <select
                                id="period-aggregation"
                                value={periodAggregation}
                                onChange={(e) => setPeriodAggregation(e.target.value as PeriodAggregation)}
                                className="p-1 border border-blue-300 rounded-md text-xs focus:ring-blue-500 focus:border-blue-500 bg-white"
                            >
                                <option value="Diário">Diário</option>
                                <option value="Semanal">Semanal</option>
                                <option value="Mensal">Mensal</option>
                                <option value="Anual">Anual</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard title="Perda Total (Últ. Período)" value={kpis.perdaTotalEstimada} unit="m³" icon={<TrendingDown size={24} className="text-red-500" />} helpText="Soma das perdas totais do último período de referência no arquivo."/>
                <KPICard title="Variação Perda" value={kpis.variacaoPerdaMesAnterior} unit="%" icon={<CalendarDays size={24} className={kpis.variacaoPerdaMesAnterior > 0 ? "text-red-500" : (kpis.variacaoPerdaMesAnterior < 0 ? "text-green-500 transform rotate-180" : "text-gray-500")}/>} helpText="Variação percentual da perda total do último período em relação ao penúltimo."/>
                <KPICard title="Efic. Arrecadação (Últ. Período)" value={kpis.eficienciaArrecadacao} unit="%" icon={<Droplets size={24} className="text-teal-500" />} helpText="Média da Eficiência de Arrecadação (EAD) do último período. Requer coluna 'ead'."/>
                <KPICard title="Municípios Críticos (Últ. Período)" value={kpis.municipiosCriticos} icon={<AlertCircle size={24} className="text-yellow-500" />} helpText="Número de municípios com status de perda diferente de 'Normal', 'Bom' ou 'Regular' no último período. Requer coluna 'status_perda'."/>
                <KPICard title="Vol. Distribuído (Total Arquivo)" value={kpis.volumeDistribuidoTotal} unit="m³" icon={<LayoutDashboard size={24} className="text-blue-500" />} helpText="Soma de todo o volume distribuído presente no arquivo."/>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
                <h2 className="text-xl font-semibold text-gray-700 mb-1 flex items-center"><BarChart3Icon size={22} className="mr-2 text-blue-600" />Balanço dos Volumes por Município (Último Período do Arquivo)</h2>
                <p className="text-sm text-gray-500 mb-4">Clique em uma barra de município para filtrar os gráficos de evolução abaixo. Clique novamente para limpar o filtro.</p>
                {balancoVolumesData.length > 0 && balancoVolumesData[0].municipio !== 'N/A' ? (
                    <div className="h-96 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balancoVolumesData} onClick={handleBarClick} margin={{ top: 5, right: 20, left: 0, bottom: uniqueMunicipalities.length > 10 ? 100 : 60 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="municipio" angle={uniqueMunicipalities.length > 10 ? -60 : -45} textAnchor="end" height={uniqueMunicipalities.length > 10 ? 110 : 80} interval={0} stroke={chartColorsConfig.defaultText} fontSize={10}/>
                                <YAxis stroke={chartColorsConfig.defaultText} fontSize={10} tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString('pt-BR', {notation:'compact'}) : String(value)} />
                                <Tooltip content={barChartCustomTooltip} />
                                <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} iconSize={10}/>
                                <Bar dataKey="Volume Distribuído" radius={[4, 4, 0, 0]} minPointSize={2} name="Vol. Dist.">
                                    {balancoVolumesData.map((entry, index) => (
                                        <Cell key={`cell-dist-${index}`} cursor="pointer" fill={entry.municipio === selectedMunicipality ? '#1e40af' : chartColorsConfig.distribuido} />
                                    ))}
                                </Bar>
                                <Bar dataKey="Volume Consumido" fill={chartColorsConfig.consumido} radius={[4, 4, 0, 0]} minPointSize={2} name="Vol. Cons." />
                                <Bar dataKey="Perda Total" fill={chartColorsConfig.perda} radius={[4, 4, 0, 0]} minPointSize={2} name="Perda" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                        <div className="text-center py-8 text-gray-500 h-96 flex flex-col justify-center items-center">
                            <BarChart3Icon size={48} className="mx-auto mb-2" />
                            {selectedFileForDashboard ? "Não há dados de balanço para o último período ou colunas não encontradas." : "Selecione um arquivo."}
                        </div>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                { evolucaoData.length > 1 || (evolucaoData.length > 0 && evolucaoData[0].periodo !== 'N/A') ? (
                    <>
                        <EvolutionChartComponent title={`Volume Distribuído (${periodAggregation})`} data={evolucaoData} dataKey="volume_distribuido" color={chartColorsConfig.distribuido} yAxisLabel="Volume (m³)" />
                        <EvolutionChartComponent title={`Volume Consumido (${periodAggregation})`} data={evolucaoData} dataKey="volume_consumido" color={chartColorsConfig.consumido} yAxisLabel="Volume (m³)" />
                        <EvolutionChartComponent title={`Perda Total (${periodAggregation})`} data={evolucaoData} dataKey="perda_total" color={chartColorsConfig.perda} yAxisLabel="Volume (m³)" />
                    </>
                ) : (
                        <div className="lg:col-span-3 text-center py-8 text-gray-500 bg-white p-4 rounded-lg shadow h-80 flex flex-col justify-center items-center">
                            <LineChartIconLucide size={48} className="mx-auto mb-2" />
                            {selectedFileForDashboard ? "Dados insuficientes ou não encontrados para exibir a evolução temporal com os filtros atuais." : "Selecione um arquivo para ver a evolução."}
                        </div>
                )}
            </div>
            <ImportCSVModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
        </div>
    );
};
export default DashboardPage;
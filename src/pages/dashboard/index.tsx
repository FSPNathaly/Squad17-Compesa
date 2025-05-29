import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { AppContext } from '../../App'; // Path to App.tsx from src/pages/Dashboard/index.tsx

// @ts-nocheck - To suppress TypeScript errors for global Papa and jsPDF for this example

// Inline Component Definitions
const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: string, disabled?: boolean}) => {
    let baseStyle = 'px-4 py-2 rounded-md transition-colors duration-200';
    if (variant === 'default') baseStyle += ' bg-blue-600 text-white hover:bg-blue-700';
    else if (variant === 'outline') baseStyle += ' border border-gray-300 text-gray-700 hover:bg-gray-100';
    else if (variant === 'destructive') baseStyle += ' bg-red-600 text-white hover:bg-red-700';
    else if (variant === 'ghost') baseStyle += ' text-gray-700 hover:bg-gray-100';
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return (<button onClick={onClick} className={`${baseStyle} ${className}`} disabled={disabled}>{children}</button>);
};
const Card = ({ children, title, className = '' }: { children: React.ReactNode, title?: string, className?: string}) => (<div className={`rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm p-6 ${className}`}>{title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}{children}</div>);
const DropdownMenu = ({ children, trigger, className = '' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (<div className={`relative ${className}`} ref={dropdownRef}><div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>{isOpen && (<div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"><div className="py-1" role="menu" aria-orientation="vertical">{children}</div></div>)}</div>);
};
const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string}) => (<div onClick={onClick} className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`} role="menuitem">{children}</div>);
const Popover = ({ children, trigger, className = '' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string}) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => { if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) setIsOpen(false); };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (<div className={`relative ${className}`} ref={popoverRef}><div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>{isOpen && (<div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-4">{children}</div>)}</div>);
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
const Upload = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>);
const Download = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>);
const RefreshCw = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 12a9 9 0 0 0-9-9c-2.52 0-4.93 1-6.7 2.7l-2.4-2.4" /><path d="M3 12a9 9 0 0 0 9 9c2.52 0 4.93 1-6.7-2.7l2.4 2.4" /><path d="M15 16v-4h4" /><path d="M9 8v4H5" /></svg>);


const DashboardPage = () => {
    const {
        setIsLoggedIn,
        selectedMunicipality,
        setSelectedMunicipality,
        showLogoutConfirm,
        setShowLogoutConfirm,
        showImportModal,
        setShowImportModal,
        processImportedData,
        analiseData,
        distribuidoData,
        consumidoData,
        perdidoData,
        balanceData,
        importedFileName,
    } = useContext(AppContext);
    const navigate = useNavigate();

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            (window as any).Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results: { data: any[] }) => {
                    processImportedData(results.data, file.name);
                    setShowImportModal(false); 
                    if (fileInputRef.current) fileInputRef.current.value = "";
                },
                error: (error: any) => {
                    alert('Erro ao processar o CSV: ' + error.message);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                }
            });
        } else {
            alert('Por favor, selecione um arquivo CSV válido.');
             if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const exportToCSV = () => {
        if (analiseData.length === 0) {
            alert('Não há dados (analiseData) para exportar.');
            return;
        }
        const csv = (window as any).Papa.unparse(analiseData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'dados_dashboard_export.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        alert('Dados exportados para CSV!');
    };

    const exportToPDF = () => {
        if (analiseData.length === 0) {
            alert('Não há dados (analiseData) para gerar PDF.');
            return;
        }
        const doc = new (window as any).jsPDF();
        doc.setFontSize(20);
        doc.text("Relatório de Dashboard - Compesa", 10, 20);

        const totalPerdaVolume = analiseData.reduce((sum, item) => sum + (item.volume * (item.perda / 100)), 0);
        const municipiosCriticosCount = analiseData.filter(item => item.status === 'Crítico').length;
        
        doc.setFontSize(12);
        doc.text(`Perda Total (estimada): ${totalPerdaVolume.toLocaleString('pt-BR', {maximumFractionDigits:0})} m³`, 10, 35);
        doc.text(`Municípios Críticos: ${municipiosCriticosCount}`, 10, 45);

        doc.setFontSize(16);
        doc.text("Tabela Resumo (Dados Importados)", 10, 60);
        const tableColumn = ["Município", "Perda (%)", "Volume (m³)", "Status"];
        const tableRows = analiseData.map(item => [
            item.municipio,
            `${item.perda.toFixed(2)}%`,
            item.volume.toLocaleString('pt-BR'),
            item.status
        ]);

        doc.autoTable({
            head: [tableColumn], body: tableRows, startY: 65,
            theme: 'striped', headStyles: { fillColor: [44, 62, 80] },
            styles: { fontSize: 10, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 25 }, 2: { cellWidth: 35 }, 3: { cellWidth: 30 } }
        });
        
        let finalY = doc.autoTable.previous.finalY + 10;
        doc.setFontSize(10);
        if (importedFileName) {
             doc.text(`Fonte dos dados da tabela: ${importedFileName}`, 10, finalY);
             finalY += 10;
        }
        doc.text("Análise gráfica e outros dados podem vir de diferentes arquivos CSV importados.", 10, finalY);

        doc.save('relatorio_dashboard.pdf');
        alert('Relatório PDF gerado!');
    };
    
    const kpiPerdaTotal = analiseData.reduce((sum, item) => sum + (item.volume * (item.perda / 100) || 0), 0);
    const kpiMunicipiosCriticos = analiseData.filter(item => item.status === 'Crítico').length;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
                <div className="flex items-center">
                    <img src="https://placehold.co/120x40/CCCCCC/333333?text=COMPESA+LOGO" alt="Compesa Logo" className="h-10" />
                     <nav className="ml-6 space-x-4">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 font-semibold">Dashboard</Link>
                        <Link to="/planilha" className="text-blue-600 hover:text-blue-800">Planilha</Link>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                    <Popover trigger={<Button variant="outline">{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecionar Data'}</Button>}>
                        <Calendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                    </Popover>
                    <Button onClick={() => alert('Funcionalidade de Atualizar Dados a ser implementada!')} variant="outline">
                        <RefreshCw size={16} className="mr-2" /> Atualizar
                    </Button>
                    <Button onClick={() => setShowImportModal(true)} variant="outline">
                        <Upload size={16} className="mr-2" /> Importar CSV
                    </Button>
                    <DropdownMenu trigger={<Button variant="outline"><Download size={16} className="mr-2" /> Exportar</Button>}>
                        <DropdownMenuItem onClick={exportToCSV}>Exportar CSV (Planilha)</DropdownMenuItem>
                        <DropdownMenuItem onClick={exportToPDF}>Exportar PDF (Relatório)</DropdownMenuItem>
                    </DropdownMenu>
                    <DropdownMenu trigger={<Avatar initials="U" className="cursor-pointer" />}>
                        <DropdownMenuItem onClick={() => setShowLogoutConfirm(true)} className="text-red-600 hover:bg-red-50">Sair</DropdownMenuItem>
                    </DropdownMenu>
                </div>
            </header>

            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="p-6 w-80 text-center">
                        <h3 className="text-lg font-semibold mb-4">Confirmar Saída</h3>
                        <p className="mb-6">Tem certeza que deseja sair?</p>
                        <div className="flex justify-center space-x-4">
                            <Button onClick={() => { setIsLoggedIn(false); navigate('/login'); setShowLogoutConfirm(false); }} variant="destructive">Sim</Button>
                            <Button onClick={() => setShowLogoutConfirm(false)} variant="outline">Não</Button>
                        </div>
                    </Card>
                </div>
            )}

            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="p-6 w-96">
                        <h3 className="text-lg font-semibold mb-4 text-center">Importar Dados CSV</h3>
                        <p className="mb-1 text-sm">Selecione um arquivo CSV para importar.</p>
                        <p className="mb-4 text-xs text-gray-500">Os dados serão processados e exibidos na Planilha e/ou Gráficos conforme a estrutura do arquivo.</p>
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setShowImportModal(false)} variant="outline">Fechar</Button>
                        </div>
                    </Card>
                </div>
            )}

            <main className="flex-1 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card title="Perda Total (Estimada)">
                        <p className="text-3xl font-bold text-red-600">{kpiPerdaTotal.toLocaleString('pt-BR', {maximumFractionDigits:0})} m³</p>
                        <p className="text-sm text-gray-500">Baseado nos dados de '{importedFileName || "N/A"}'</p>
                    </Card>
                    <Card title="Municípios Críticos">
                        <p className="text-3xl font-bold text-orange-500">{kpiMunicipiosCriticos}</p>
                         <p className="text-sm text-gray-500">Com status 'Crítico' em '{importedFileName || "N/A"}'</p>
                    </Card>
                    <Card title="Volume Distribuído (Total)">
                        <p className="text-3xl font-bold text-blue-600">{distribuidoData.reduce((acc, item) => acc + item.volume, 0).toLocaleString('pt-BR')} m³</p>
                        <p className="text-sm text-gray-500">Soma do VDistrib importado</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card title="Balanço dos Volumes por Município" className="h-[400px] flex flex-col">
                        {balanceData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={balanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="municipio" angle={-20} textAnchor="end" height={50} interval={0} onClick={(data: any) => setSelectedMunicipality(data.value)} cursor="pointer" />
                                <YAxis />
                                <Tooltip formatter={(value: number) => `${Number(value).toLocaleString('pt-BR')} m³`} />
                                <Legend />
                                <Bar dataKey="Volume Distribuído" fill="#4A90E2" />
                                <Bar dataKey="Volume Consumido" fill="#50E3C2" />
                                <Bar dataKey="Volume de Perda" fill="#FF4B5C" />
                            </BarChart>
                        </ResponsiveContainer>
                        ) : <p className="m-auto text-center text-gray-500">Importe um CSV (ex: AnaliseAcum.csv) para ver este gráfico.</p>}
                        {selectedMunicipality && (
                            <div className="text-center mt-4">
                                <Button onClick={() => setSelectedMunicipality(null)} variant="outline">
                                    Limpar Seleção: {selectedMunicipality}
                                </Button>
                            </div>
                        )}
                    </Card>

                    <Card title={`Evolução Volume Distribuído (${selectedMunicipality || 'Geral'})`} className="h-[400px] flex flex-col">
                         {distribuidoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={distribuidoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(value: number) => `${Number(value).toLocaleString('pt-BR')} m³`} />
                                <Legend />
                                <Line type="monotone" dataKey="volume" name="Volume Distribuído" stroke="#4A90E2" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        ) : <p className="m-auto text-center text-gray-500">Importe um CSV (ex: VDistrib.csv) para ver este gráfico.</p>}
                    </Card>

                    <Card title={`Evolução Volume Consumido (${selectedMunicipality || 'Geral'})`} className="h-[400px] flex flex-col">
                        {consumidoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={consumidoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `${(Number(value) / 1000000).toFixed(1)}M`} />
                                <Tooltip formatter={(value: number) => `${Number(value).toLocaleString('pt-BR')} m³`} />
                                <Legend />
                                <Line type="monotone" dataKey="volume" name="Volume Consumido" stroke="#50E3C2" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        ) : <p className="m-auto text-center text-gray-500">Importe dados de consumo (ex: VCNorma.csv) para ver este gráfico.</p>}
                    </Card>

                    <Card title={`Evolução Volume Perdido (${selectedMunicipality || 'Geral'})`} className="h-[400px] flex flex-col">
                        {perdidoData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={perdidoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis tickFormatter={(value) => `${(Number(value) / 1000).toFixed(1)}K`} />
                                <Tooltip formatter={(value: number) => `${Number(value).toLocaleString('pt-BR')} m³`} />
                                <Legend />
                                <Line type="monotone" dataKey="volume" name="Volume Perdido" stroke="#FF4B5C" activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                        ) : <p className="m-auto text-center text-gray-500">Dados de perda são derivados de outros CSVs (ex: VDistrib.csv).</p>}
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
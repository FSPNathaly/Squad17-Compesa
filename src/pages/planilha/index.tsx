import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext, type ImportedFileDetail } from '../../App';
import { BarChart as BarChartIcon, FileText, Settings as SettingsIcon, LogOut as LogOutIcon, Mail as MailIconComponent, Info } from 'lucide-react';

const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: string, disabled?: boolean}) => {
    let baseStyle = 'px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center';
    if (variant === 'default') baseStyle += ' bg-blue-600 text-white hover:bg-blue-700';
    else if (variant === 'outline') baseStyle += ' border border-gray-300 text-gray-700 hover:bg-gray-100';
    else if (variant === 'destructive') baseStyle += ' bg-red-600 text-white hover:bg-red-700';
    else if (variant === 'ghost') baseStyle += ' text-gray-700 hover:bg-gray-100';
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return (<button onClick={onClick} className={`${baseStyle} ${className}`} disabled={disabled}>{children}</button>);
};
const Card = ({ children, title, className = '' }: { children: React.ReactNode, title?: string, className?: string}) => (<div className={`rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm p-6 ${className}`}>{title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}{children}</div>);
const Table = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<div className={`w-full overflow-x-auto rounded-md border border-gray-200 ${className}`}><table className="w-full caption-bottom text-sm min-w-[800px]">{children}</table></div>);
const TableHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<thead className={`bg-gray-100 [&_tr]:border-b [&_tr]:border-gray-200 sticky top-0 z-10 ${className}`}><tr className="border-b-2 border-gray-300">{children}</tr></thead>);
const TableBody = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<tbody className={`divide-y divide-gray-200 ${className}`}>{children}</tbody>);
const TableRow = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<tr className={`transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 ${className}`}>{children}</tr>);

const TableHead = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<th className={`h-12 px-4 text-left align-middle font-medium text-gray-600 whitespace-nowrap ${className}`}>{children}</th>);

const TableCell = ({ children, className = '', ...props }: { children: React.ReactNode, className?: string } & React.TdHTMLAttributes<HTMLTableCellElement>) => (<td className={`p-3 align-middle text-gray-700 ${className}`} {...props}>{children}</td>);

const Avatar = ({ initials, className = '' }: { initials: string, className?: string}) => (<div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold ${className}`}>{initials}</div>);

const DropdownMenu = ({ children, trigger, className = '', menuWidth = 'w-56' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string, menuWidth?: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>
            {isOpen && (
                <div className={`absolute right-0 mt-2 ${menuWidth} rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50`}>
                    <div className="py-1" role="menu" aria-orientation="vertical">
                        {children}
                    </div>
                </div>
            )}
        </div>
    );
};
const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string}) => (<div onClick={onClick} className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`} role="menuitem">{children}</div>);

const PlanilhaPage = () => {
    const appContext = useContext(AppContext);
    if (!appContext) throw new Error("AppContext not found");

    const {
        importedFilesDetails = [],
        fileIdForPlanilhaView,
        setIsLoggedIn,
        setShowLogoutConfirm,
        showLogoutConfirm,
        importedFileNames
    } = appContext;
    const navigate = useNavigate();

    const [selectedFileData, setSelectedFileData] = useState<Array<{[key: string]: any}>>([]);
    const [selectedFileNameToDisplay, setSelectedFileNameToDisplay] = useState<string | null>(null);
    const [tableHeaders, setTableHeaders] = useState<string[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        if (fileIdForPlanilhaView && importedFilesDetails.length > 0) {
            const fileToView = importedFilesDetails.find((f: ImportedFileDetail) => f.id === fileIdForPlanilhaView);
            if (fileToView && fileToView.data && fileToView.data.length > 0) {
                setSelectedFileData(fileToView.data);
                setSelectedFileNameToDisplay(fileToView.name);
                setTableHeaders(Object.keys(fileToView.data[0]));
                setCurrentPage(1);
            } else {
                setSelectedFileData([]);
                setSelectedFileNameToDisplay(fileToView ? fileToView.name : "Arquivo não encontrado ou vazio");
                setTableHeaders([]);
            }
        } else if (importedFilesDetails.length > 0 && !fileIdForPlanilhaView) {
            // If no specific file is selected for planilha view, but files are imported,
            // consider showing a default view or a message to select a file from dashboard.
            // For now, clear the view if no specific fileId.
            setSelectedFileData([]);
            setSelectedFileNameToDisplay(null);
            setTableHeaders([]);
        } else {
            setSelectedFileData([]);
            setSelectedFileNameToDisplay(null);
            setTableHeaders([]);
        }
    }, [fileIdForPlanilhaView, importedFilesDetails]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentTableItems = selectedFileData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(selectedFileData.length / itemsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };
    
    const pageNumbers = [];
    const maxPageButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
    if (totalPages >= maxPageButtons && endPage - startPage + 1 < maxPageButtons) {
        startPage = Math.max(1, endPage - maxPageButtons + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    
    const cardTitle = selectedFileNameToDisplay
        ? `Visualizando Dados: ${selectedFileNameToDisplay}`
        : (importedFileNames
            ? `Dados importados: ${importedFileNames}. Selecione um arquivo no Dashboard para visualização detalhada.`
            : "Planilha de Dados");

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            <header className="bg-white shadow-sm h-auto md:h-16 flex flex-col md:flex-row items-center justify-between px-6 py-3 md:py-0">
                <div className="flex items-center mb-3 md:mb-0">
                    <img src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" alt="Compesa Logo" className="h-10" />
                    <nav className="ml-6 space-x-4 flex items-center">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800 flex items-center">
                            <BarChartIcon size={16} className="mr-1.5" /> Dashboard
                        </Link>
                        <Link to="/planilha" className="text-blue-600 hover:text-blue-800 font-semibold flex items-center">
                            <FileText size={16} className="mr-1.5" /> Planilha
                        </Link>
                    </nav>
                </div>
                <div className="flex items-center space-x-4">
                       <DropdownMenu trigger={<Avatar initials="U" className="cursor-pointer" />} menuWidth="w-56">
                            <div className="px-4 py-3 border-b border-gray-200">
                                <p className="text-sm font-medium text-gray-900 truncate">Usuário Compesa</p>
                                <p className="text-xs text-gray-500 truncate flex items-center">
                                    <MailIconComponent size={14} className="mr-1.5 text-gray-400"/>
                                    usuario@compesa.com.br
                                </p>
                            </div>
                            <DropdownMenuItem onClick={() => alert('Funcionalidade de Configurações não implementada.')}>
                               <SettingsIcon size={14} className="mr-2" /> Configurações
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {if(setShowLogoutConfirm) setShowLogoutConfirm(true);}} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                               <LogOutIcon size={14} className="mr-2" /> Sair
                            </DropdownMenuItem>
                        </DropdownMenu>
                </div>
            </header>
            
            {showLogoutConfirm && ( <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"> <Card className="p-6 w-full max-w-xs mx-auto text-center"> <h3 className="text-lg font-semibold mb-4">Confirmar Saída</h3> <p className="mb-6">Tem certeza que deseja sair?</p> <div className="flex justify-center space-x-4"> <Button onClick={() => { if(setIsLoggedIn) setIsLoggedIn(false); navigate('/login'); if(setShowLogoutConfirm) setShowLogoutConfirm(false); }} variant="destructive">Sim</Button> <Button onClick={() => {if(setShowLogoutConfirm) setShowLogoutConfirm(false)}} variant="outline">Não</Button> </div> </Card> </div> )}

            <main className="flex-1 p-6 space-y-6">
                <Card title={cardTitle}>
                    {currentTableItems.length > 0 && tableHeaders.length > 0 ? (
                        <>
                        <div className="overflow-y-auto" style={{maxHeight: 'calc(100vh - 280px)'}}>
                            <Table>
                                <TableHeader>
                                    {tableHeaders.map(header => (
                                        <TableHead key={header}>{header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableHead>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {currentTableItems.map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>
                                            {tableHeaders.map(header => (
                                                <TableCell key={`${header}-${rowIndex}`} className="whitespace-nowrap max-w-xs truncate" title={String(row[header])}>
                                                    {row[header] === null || row[header] === undefined ? '-' : String(row[header])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center mt-6 space-x-2 flex-wrap">
                                <Button onClick={() => paginate(1)} disabled={currentPage === 1} variant="outline" className="px-3 py-1 text-xs">
                                    Primeira
                                </Button>
                                <Button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} variant="outline" className="px-3 py-1">
                                    &lt;
                                </Button>
                                {pageNumbers.map(number => (
                                    <Button key={number} onClick={() => paginate(number)} variant={currentPage === number ? 'default' : 'outline'} className="px-3 py-1">
                                        {number}
                                    </Button>
                                ))}
                                <Button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} variant="outline" className="px-3 py-1">
                                    &gt;
                                </Button>
                                 <Button onClick={() => paginate(totalPages)} disabled={currentPage === totalPages} variant="outline" className="px-3 py-1 text-xs">
                                    Última
                                </Button>
                            </div>
                        )}
                        </>
                    ) : (
                         <div className="text-center py-12">
                            <Info size={48} className="mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-500 text-lg">
                                {fileIdForPlanilhaView && selectedFileNameToDisplay ? `O arquivo "${selectedFileNameToDisplay}" está vazio ou não pôde ser carregado.` :
                                 fileIdForPlanilhaView && !selectedFileNameToDisplay ? "Carregando dados do arquivo selecionado..." :
                                 "Nenhuma planilha selecionada ou dados disponíveis."}
                            </p>
                            <p className="text-gray-400 text-sm mt-1">
                                {fileIdForPlanilhaView ? "Tente selecionar outro arquivo no Dashboard." : "Por favor, importe e selecione um arquivo na página Dashboard para visualizar aqui."}
                            </p>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default PlanilhaPage;
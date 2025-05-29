import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext } from '../../App'; // Path to App.tsx from src/pages/Planilha/index.tsx

// Inline Component Definitions
const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: string, disabled?: boolean}) => {
    let baseStyle = 'px-4 py-2 rounded-md transition-colors duration-200';
    if (variant === 'default') baseStyle += ' bg-blue-600 text-white hover:bg-blue-700';
    else if (variant === 'outline') baseStyle += ' border border-gray-300 text-gray-700 hover:bg-gray-100';
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return (<button onClick={onClick} className={`${baseStyle} ${className}`} disabled={disabled}>{children}</button>);
};
const Card = ({ children, title, className = '' }: { children: React.ReactNode, title?: string, className?: string}) => (<div className={`rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm p-6 ${className}`}>{title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}{children}</div>);
const Table = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<div className={`w-full overflow-x-auto rounded-md border border-gray-200 ${className}`}><table className="w-full caption-bottom text-sm min-w-[600px]">{children}</table></div>);
const TableHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<thead className={`bg-gray-50 [&_tr]:border-b [&_tr]:border-gray-200 ${className}`}><tr className="border-b border-gray-200 transition-colors hover:bg-gray-100/50 data-[state=selected]:bg-gray-100">{children}</tr></thead>);
const TableBody = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>);
const TableRow = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<tr className={`border-b border-gray-200 transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 ${className}`}>{children}</tr>);
const TableHead = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<th className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</th>);
const TableCell = ({ children, className = '' }: { children: React.ReactNode, className?: string}) => (<td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>{children}</td>);
const ChevronRight = (props: React.SVGProps<SVGSVGElement>) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6" /></svg>);
const Avatar = ({ initials, className = '' }: { initials: string, className?: string}) => (<div className={`w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold ${className}`}>{initials}</div>);
const DropdownMenu = ({ children, trigger, className = '' }: { children: React.ReactNode, trigger: React.ReactNode, className?: string}) => { const [isOpen, setIsOpen] = useState(false); const dropdownRef = useRef<HTMLDivElement>(null); useEffect(() => { const handleClickOutside = (event: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false); }; document.addEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, []); return (<div className={`relative ${className}`} ref={dropdownRef}><div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">{trigger}</div>{isOpen && (<div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"><div className="py-1" role="menu" aria-orientation="vertical">{children}</div></div>)}</div>);};
const DropdownMenuItem = ({ children, onClick, className = '' }: { children: React.ReactNode, onClick?: () => void, className?: string}) => (<div onClick={onClick} className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer ${className}`} role="menuitem">{children}</div>);


const PlanilhaPage = () => {
    const { analiseData, importedFileName, setIsLoggedIn, setShowLogoutConfirm, showLogoutConfirm } = useContext(AppContext);
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = analiseData.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(analiseData.length / itemsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber >= 1 && pageNumber <= totalPages) {
            setCurrentPage(pageNumber);
        }
    };
    
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
             <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
                <div className="flex items-center">
                    <img src="https://placehold.co/120x40/CCCCCC/333333?text=COMPESA+LOGO" alt="Compesa Logo" className="h-10" />
                    <nav className="ml-6 space-x-4">
                        <Link to="/dashboard" className="text-blue-600 hover:text-blue-800">Dashboard</Link>
                        <Link to="/planilha" className="text-blue-600 hover:text-blue-800 font-semibold">Planilha</Link>
                    </nav>
                </div>
                 <div className="flex items-center space-x-4">
                    <DropdownMenu trigger={<Avatar initials="U" className="cursor-pointer" />}>
                        <DropdownMenuItem onClick={() => {setShowLogoutConfirm(true);}} className="text-red-600 hover:bg-red-50">Sair</DropdownMenuItem>
                    </DropdownMenu>
                 </div>
            </header>
            
            {showLogoutConfirm && ( // Duplicated modal for simplicity, could be a global modal triggered by context
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

            <main className="flex-1 p-6 space-y-6">
                <Card title={`Tabela Resumo dos Municípios (Dados de: ${importedFileName || 'Nenhum arquivo importado'})`}>
                    {currentItems.length > 0 ? (
                        <>
                        <Table>
                            <TableHeader>
                                <TableHead>Município</TableHead>
                                <TableHead>Perda (%)</TableHead>
                                <TableHead>Volume (m³)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Detalhes</TableHead>
                            </TableHeader>
                            <TableBody>
                                {currentItems.map((row, index) => (
                                    <TableRow key={`${row.municipio}-${index}`}>
                                        <TableCell>{row.municipio}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center">
                                                <div className="w-24 bg-gray-200 rounded-full h-2.5 mr-2">
                                                    <div
                                                        className={`h-2.5 rounded-full ${row.perda > 20 ? 'bg-red-500' : row.perda > 10 ? 'bg-orange-500' : 'bg-green-500'}`}
                                                        style={{ width: `${ Math.min(100, Math.max(0,row.perda))}%` }}
                                                    ></div>
                                                </div>
                                                {typeof row.perda === 'number' ? row.perda.toFixed(2) : row.perda}%
                                            </div>
                                        </TableCell>
                                        <TableCell>{typeof row.volume === 'number' ? row.volume.toLocaleString('pt-BR') : row.volume}</TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                ${row.status === 'Crítico' ? 'bg-red-100 text-red-800' :
                                                row.status === 'Alerta' ? 'bg-orange-100 text-orange-800' :
                                                (row.status === 'Ok' || row.status === 'OK') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {row.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" onClick={() => alert(`Detalhes de ${row.municipio} não implementado.`)}>
                                                <ChevronRight size={20} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {totalPages > 1 && (
                            <div className="flex justify-end items-center mt-4 space-x-1">
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
                            </div>
                        )}
                        </>
                    ) : (
                        <p className="text-center text-gray-500 py-8">Nenhum dado para exibir. Importe um arquivo CSV na página Dashboard (ex: Analise.csv ou AnaliseAcum.csv).</p>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default PlanilhaPage;
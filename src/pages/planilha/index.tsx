import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext, globalCleanAndParseNumber, globalTransformHeader } from '../../App';
import { 
    FileSpreadsheet, Table as TableIcon, AlertTriangle, 
    Trash2, PlusCircle, Edit3, CheckSquare, Square, Filter, X as XIcon, Check, Save, Settings2
} from 'lucide-react';

type FilterConditionText = 'contem' | 'igual_a' | 'comeca_com' | 'termina_com' | 'nao_contem' | 'diferente_de';
type FilterConditionNumber = 'igual_a_num' | 'diferente_de_num' | 'maior_que' | 'menor_que' | 'maior_igual_a' | 'menor_igual_a';
type FilterCondition = FilterConditionText | FilterConditionNumber;

interface AdvancedFilter {
    type: 'text' | 'number';
    condition: FilterCondition;
    value: string | number;
    value2?: string | number;
}

const SpreadsheetPage: React.FC = () => {
    const { 
        selectedFileForPlanilha, 
        isLoading, setIsLoading, 
        navigateTo, showToast,
        updateImportedFileName,
        renameImportedFileColumn,
        addColumnToImportedFile,
        removeColumnFromImportedFile,
        updateImportedFileData,
        setSelectedFileForPlanilha,
        importedFiles 
    } = useAppContext();
    
    const [editableData, setEditableData] = useState<Record<string, any>[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' } | null>(null);
    const [filters, setFilters] = useState<Record<string, AdvancedFilter | null>>({});
    const [activeFilterPopover, setActiveFilterPopover] = useState<string | null>(null);

    const [currentPageNum, setCurrentPageNum] = useState(1);
    const rowsPerPage = 20;

    const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string; originalDataIndex: number } | null>(null);
    const [editingCellValue, setEditingCellValue] = useState<string>("");
    const [selectedRowOriginalIndices, setSelectedRowOriginalIndices] = useState<Set<number>>(new Set());

    const [isEditingFileName, setIsEditingFileName] = useState<boolean>(false);
    const [currentFileName, setCurrentFileName] = useState<string>("");

    const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
    const [currentHeaderNameValue, setCurrentHeaderNameValue] = useState<string>("");
    
    const [newColumnNameInput, setNewColumnNameInput] = useState<string>("");
    const [showAddColumnPopover, setShowAddColumnPopover] = useState<boolean>(false);

    const filterPopoverRef = useRef<HTMLDivElement>(null);
    const addColumnPopoverRef = useRef<HTMLDivElement>(null);
    const fileNameInputRef = useRef<HTMLInputElement>(null);
    const headerInputRef = useRef<HTMLInputElement>(null);

    const [hasUnsavedDataChanges, setHasUnsavedDataChanges] = useState(false);

    const syncDataFromContext = useCallback(() => {
        if (selectedFileForPlanilha) {
            setIsLoading(true);
            setEditableData(JSON.parse(JSON.stringify(selectedFileForPlanilha.data))); 
            const transformedHeaders = selectedFileForPlanilha.headers.map(h => globalTransformHeader(h));
            setHeaders(transformedHeaders);
            setOriginalHeaders([...selectedFileForPlanilha.headers]);
            setCurrentFileName(selectedFileForPlanilha.name);
            setSortConfig(null);
            setFilters({});
            setCurrentPageNum(1);
            setEditingCell(null);
            setSelectedRowOriginalIndices(new Set());
            setHasUnsavedDataChanges(false);
            setIsEditingFileName(false);
            setEditingHeaderKey(null);
            setShowAddColumnPopover(false);
            setNewColumnNameInput("");
            setTimeout(() => setIsLoading(false), 0);
        } else {
            setEditableData([]); setHeaders([]); setOriginalHeaders([]); setCurrentFileName("");
            if (window.location.hash === '#planilha' && !isLoading) {
                navigateTo('dashboard', true);
            }
        }
    }, [selectedFileForPlanilha, setIsLoading, isLoading, navigateTo]);

    useEffect(() => {
        syncDataFromContext();
    }, [selectedFileForPlanilha, syncDataFromContext]);


    const handleSaveChangesToContext = () => {
        if (selectedFileForPlanilha && hasUnsavedDataChanges) {
            updateImportedFileData(selectedFileForPlanilha.id, editableData);
            
            const currentSelectedId = selectedFileForPlanilha.id;
            const updatedFile = importedFiles.find(f => f.id === currentSelectedId);
            if (updatedFile) { 
                setSelectedFileForPlanilha({...updatedFile, data: editableData}); 
            }

            setHasUnsavedDataChanges(false);
            showToast("Alterações nos dados da planilha salvas na sessão!", "success");
        }
    };
    
    const markDataChanges = useCallback(() => setHasUnsavedDataChanges(true), []);

    const handleCellDoubleClick = (paginatedRowIndex: number, headerKey: string) => {
        const dataRow = paginatedData[paginatedRowIndex];
        const originalDataIndex = editableData.findIndex(edRow => edRow === dataRow); 
        if (originalDataIndex !== -1) {
            setEditingCell({ rowIndex: paginatedRowIndex, columnKey: headerKey, originalDataIndex });
            setEditingCellValue(String(editableData[originalDataIndex][headerKey] ?? ''));
        }
    };

    const handleCellInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingCellValue(e.target.value);
    };

    const saveCellEdit = useCallback(() => {
        if (editingCell) {
            const { originalDataIndex, columnKey } = editingCell;
            setEditableData(prevData => {
                const newData = [...prevData];
                const originalValue = newData[originalDataIndex][columnKey];
                let processedNewValue: string | number | null = editingCellValue;

                if (typeof originalValue === 'number' || (editingCellValue.trim() !== "" && !isNaN(Number(editingCellValue.replace(",", "."))))) {
                    processedNewValue = globalCleanAndParseNumber(editingCellValue);
                }
                
                newData[originalDataIndex] = { ...newData[originalDataIndex], [columnKey]: processedNewValue };
                return newData;
            });
            setEditingCell(null);
            markDataChanges();
        }
    }, [editingCell, editingCellValue, markDataChanges]);

    const handleCellEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            saveCellEdit();
        } else if (event.key === 'Escape') {
            setEditingCell(null);
            setEditingCellValue("");
        }
    };
    
    const toggleRowSelection = (originalDataIndex: number) => {
        setSelectedRowOriginalIndices(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(originalDataIndex)) {
                newSelection.delete(originalDataIndex);
            } else {
                newSelection.add(originalDataIndex);
            }
            return newSelection;
        });
    };

    const toggleSelectAllVisibleRows = () => {
        const visibleOriginalIndices = new Set(paginatedData.map(row => editableData.indexOf(row)).filter(index => index !== -1));
        const allVisibleSelected = paginatedData.length > 0 && [...visibleOriginalIndices].every(index => selectedRowOriginalIndices.has(index));

        if (allVisibleSelected) {
            setSelectedRowOriginalIndices(prev => {
                const newSelection = new Set(prev);
                visibleOriginalIndices.forEach(index => newSelection.delete(index));
                return newSelection;
            });
        } else {
            setSelectedRowOriginalIndices(prev => new Set([...prev, ...visibleOriginalIndices]));
        }
    };
    
    const handleDeleteSelectedRows = () => {
        if (selectedRowOriginalIndices.size === 0) {
            showToast("Nenhuma linha selecionada para excluir.", "info");
            return;
        }
        setEditableData(prevData => prevData.filter((_, index) => !selectedRowOriginalIndices.has(index)));
        setSelectedRowOriginalIndices(new Set());
        setCurrentPageNum(1);
        markDataChanges();
        showToast(`${selectedRowOriginalIndices.size} linha(s) excluída(s) localmente.`, "info");
    };

    const handleAddNewRow = () => {
        const newRow: Record<string, any> = {};
        headers.forEach(headerKey => { 
            newRow[headerKey] = null; 
        });
        setEditableData(prevData => [...prevData, newRow]);
        const newTotalPages = Math.ceil((editableData.length + 1) / rowsPerPage);
        setCurrentPageNum(newTotalPages);
        markDataChanges();
    };

    const handleFileNameSave = () => {
        if (selectedFileForPlanilha && currentFileName.trim() !== "" && currentFileName.trim() !== selectedFileForPlanilha.name) {
            updateImportedFileName(selectedFileForPlanilha.id, currentFileName.trim());
        }
        setIsEditingFileName(false);
    };
    
    const handleHeaderDoubleClick = (headerKey: string, originalDisplayName: string) => {
        setEditingHeaderKey(headerKey); 
        setCurrentHeaderNameValue(originalDisplayName); 
        setTimeout(() => headerInputRef.current?.focus(), 0);
    };

    const handleHeaderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentHeaderNameValue(e.target.value);
    };
    
    const saveHeaderNameEdit = () => {
        if (selectedFileForPlanilha && editingHeaderKey && currentHeaderNameValue.trim() !== "") {
            const originalHeaderDisplayName = originalHeaders[headers.indexOf(editingHeaderKey)];
            if (originalHeaderDisplayName !== currentHeaderNameValue.trim()) {
                renameImportedFileColumn(selectedFileForPlanilha.id, originalHeaderDisplayName, currentHeaderNameValue.trim());
            }
        }
        setEditingHeaderKey(null);
    };
    
    const handleHeaderEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') saveHeaderNameEdit();
        if (event.key === 'Escape') setEditingHeaderKey(null);
    };


    const handleAddColumnConfirm = () => {
        if (newColumnNameInput.trim() && selectedFileForPlanilha) {
            addColumnToImportedFile(selectedFileForPlanilha.id, newColumnNameInput.trim());
            setNewColumnNameInput("");
            setShowAddColumnPopover(false);
        } else if (!newColumnNameInput.trim()){
            showToast("Nome da nova coluna não pode ser vazio.", "error");
        }
    };
    
    const handleRemoveColumnConfirm = (originalHeaderNameToRemove: string) => {
        if (selectedFileForPlanilha) {
            if (window.confirm(`Tem certeza que deseja remover a coluna "${originalHeaderNameToRemove}" e todos os seus dados? Esta ação não pode ser desfeita na sessão atual.`)) {
                removeColumnFromImportedFile(selectedFileForPlanilha.id, originalHeaderNameToRemove);
            }
        }
    };

    const applyAdvancedFilter = (headerKey: string, condition: FilterCondition, value: string | number) => {
        const columnIsNumeric = editableData.length > 0 && headers.includes(headerKey) && 
                                editableData.some(row => typeof row[headerKey] === 'number' && row[headerKey] !== null);
        const type = columnIsNumeric ? 'number' : 'text';
        
        if (type === 'number' && value !== '' && isNaN(Number(value))) {
            showToast("Valor do filtro para coluna numérica deve ser um número.", "error");
            return;
        }

        setFilters(prev => ({
            ...prev,
            [headerKey]: value === '' ? null : { type, condition, value: type === 'number' && value !== '' ? Number(value) : String(value) }
        }));
        setActiveFilterPopover(null);
        setCurrentPageNum(1);
    };

    const clearFilter = (headerKey: string) => {
        setFilters(prev => ({ ...prev, [headerKey]: null }));
        setActiveFilterPopover(null);
        setCurrentPageNum(1);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest(`[data-filter-button-for="${activeFilterPopover}"]`)) {
                setActiveFilterPopover(null);
            }
            if (addColumnPopoverRef.current && !addColumnPopoverRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('#add-column-button')) {
                setShowAddColumnPopover(false);
            }
        };
        if (activeFilterPopover || showAddColumnPopover) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [activeFilterPopover, showAddColumnPopover]);

    const sortedLocalData = useMemo(() => {
        let items = [...editableData];
        if (sortConfig) {
            items.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;

                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();

                if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [editableData, sortConfig]);

    const filteredLocalData = useMemo(() => {
        const activeFiltersList = Object.entries(filters).filter(([, filter]) => filter !== null);

        if (activeFiltersList.length === 0) {
            return sortedLocalData;
        }

        return sortedLocalData.filter(item => {
            return activeFiltersList.every(([headerKey, filter]) => {
                if (!filter) return true;
                const itemValue = item[headerKey];
                const filterValue = filter.value;

                if (itemValue === null || itemValue === undefined) return false;

                const sItemValue = String(itemValue).toLowerCase();
                const sFilterValue = String(filterValue).toLowerCase().trim();

                if(filter.type === 'text'){
                    switch(filter.condition as FilterConditionText) {
                        case 'contem': return sItemValue.includes(sFilterValue);
                        case 'igual_a': return sItemValue === sFilterValue;
                        case 'comeca_com': return sItemValue.startsWith(sFilterValue);
                        case 'termina_com': return sItemValue.endsWith(sFilterValue);
                        case 'nao_contem': return !sItemValue.includes(sFilterValue);
                        case 'diferente_de': return sItemValue !== sFilterValue;
                        default: return true;
                    }
                } else if (filter.type === 'number') {
                    const numItemValue = globalCleanAndParseNumber(itemValue);
                    const numFilterValue = globalCleanAndParseNumber(filterValue);
                    if(numItemValue === null || numFilterValue === null) {
                        if (filter.condition === 'igual_a_num' && typeof itemValue === 'string' && itemValue === String(filterValue)) return true;
                        return false;
                    }

                    switch(filter.condition as FilterConditionNumber) {
                        case 'igual_a_num': return numItemValue === numFilterValue;
                        case 'diferente_de_num': return numItemValue !== numFilterValue;
                        case 'maior_que': return numItemValue > numFilterValue;
                        case 'menor_que': return numItemValue < numFilterValue; 
                        case 'maior_igual_a': return numItemValue >= numFilterValue;
                        case 'menor_igual_a': return numItemValue <= numFilterValue;
                        default: return true;
                    }
                }
                return true;
            });
        });
    }, [sortedLocalData, filters]);

    const paginatedData = useMemo(() => {
        const start = (currentPageNum - 1) * rowsPerPage;
        return filteredLocalData.slice(start, start + rowsPerPage);
    }, [filteredLocalData, currentPageNum, rowsPerPage]);

    const totalPages = Math.ceil(filteredLocalData.length / rowsPerPage);
    
    const requestSort = (headerKey: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig?.key === headerKey && sortConfig.direction === 'ascending') direction = 'descending';
        setSortConfig({ key: headerKey, direction });
        setCurrentPageNum(1);
    };


    if (isLoading && !selectedFileForPlanilha && window.location.hash === '#planilha') {
        return ( <div className="min-h-[calc(100vh-100px)] flex items-center justify-center bg-gray-50 p-4"><div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div></div> );
    }
    if (!selectedFileForPlanilha && window.location.hash === '#planilha') {
        return ( <div className="p-6 text-center min-h-[calc(100vh-100px)] flex flex-col items-center justify-center bg-gray-50"><AlertTriangle size={64} className="text-yellow-500 mb-4" /><h2 className="text-2xl font-semibold mb-2">Nenhum arquivo selecionado.</h2><p className="text-md text-gray-600 mb-6">Por favor, selecione um arquivo no Dashboard para visualizá-lo aqui.</p><button onClick={() => navigateTo('dashboard')} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Ir para Dashboard</button></div> );
    }
    if (!selectedFileForPlanilha && window.location.hash !== '#planilha') return null;


    const renderFilterPopover = (headerKey: string, originalHeaderDisplayName: string) => {
        const currentFilter = filters[headerKey];
        const columnDataSample = editableData.slice(0, 100).map(row => row[headerKey]).filter(val => val !== null && val !== undefined);
        const isLikelyNumeric = columnDataSample.length > 0 && columnDataSample.every(val => typeof val === 'number' || (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(String(val).replace(',','.')))));

        const defaultTextCondition: FilterConditionText = 'contem';
        const defaultNumericCondition: FilterConditionNumber = 'igual_a_num';
        
        const [condition, setCondition] = useState<FilterCondition>(currentFilter?.condition || (isLikelyNumeric ? defaultNumericCondition : defaultTextCondition));
        const [value, setValue] = useState<string>(currentFilter?.value !== undefined ? String(currentFilter.value) : '');

        useEffect(() => { 
            if (activeFilterPopover === headerKey) { 
                const currentF = filters[headerKey];
                const isNum = editableData.length > 0 && headers.includes(headerKey) && 
                                editableData.some(row => typeof row[headerKey] === 'number' && row[headerKey] !== null);
                setCondition(currentF?.condition || (isNum ? defaultNumericCondition : defaultTextCondition));
                setValue(currentF?.value !== undefined ? String(currentF.value) : '');
            }
        }, [activeFilterPopover, headerKey, filters, editableData, headers]);

        const textConditions: { value: FilterConditionText, label: string }[] = [
            { value: 'contem', label: 'Contém' }, { value: 'igual_a', label: 'Igual a' },
            { value: 'comeca_com', label: 'Começa com' }, { value: 'termina_com', label: 'Termina com' },
            { value: 'nao_contem', label: 'Não Contém' }, { value: 'diferente_de', label: 'Diferente de' }
        ];
        const numConditions: { value: FilterConditionNumber, label: string }[] = [
            { value: 'igual_a_num', label: '=' }, { value: 'diferente_de_num', label: '≠' },
            { value: 'maior_que', label: '>' }, { value: 'menor_que', label: '<' }, 
            { value: 'maior_igual_a', label: '>=' }, { value: 'menor_igual_a', label: '<=' }
        ];
        const availableConditions = isLikelyNumeric ? numConditions : textConditions;
        
        const handleApply = () => {
            applyAdvancedFilter(headerKey, condition, value);
        };

        return (
            <div ref={filterPopoverRef} className="absolute top-full mt-1 left-0 bg-white p-3 shadow-xl rounded-md border z-20 w-64 space-y-2">
                <p className="text-xs font-semibold text-gray-700">Filtrar "{originalHeaderDisplayName}"</p>
                <select 
                    value={condition} 
                    onChange={(e) => setCondition(e.target.value as FilterCondition)}
                    className="w-full p-1.5 border border-gray-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                    {availableConditions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <input 
                    type={isLikelyNumeric && !['contem', 'nao_contem'].includes(condition) ? "number" : "text"} 
                    value={value} 
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full p-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Valor do filtro"
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                />
                <div className="flex justify-end space-x-2 pt-1">
                    <button onClick={() => clearFilter(headerKey)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">Limpar</button>
                    <button onClick={handleApply} className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">Aplicar</button>
                </div>
            </div>
        );
    };


    return (
        <div className="p-4 md:p-6 space-y-6 bg-gray-50 min-h-[calc(100vh-100px)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div className="flex items-center mb-2 sm:mb-0">
                    {!isEditingFileName && selectedFileForPlanilha ? (
                        <>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center group">
                                <FileSpreadsheet size={30} className="inline mr-2 text-blue-600" />
                                <span className="mr-1">{currentFileName || selectedFileForPlanilha.name}</span>
                                <button onClick={() => {setCurrentFileName(selectedFileForPlanilha.name); setIsEditingFileName(true); useEffect(() => fileNameInputRef.current?.focus(), [isEditingFileName]);}} className="p-1 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar nome do arquivo">
                                    <Edit3 size={16} />
                                </button>
                            </h1>
                        </>
                    ) : selectedFileForPlanilha ? (
                        <div className="flex items-center">
                            <input
                                ref={fileNameInputRef}
                                type="text"
                                value={currentFileName}
                                onChange={(e) => setCurrentFileName(e.target.value)}
                                onBlur={handleFileNameSave}
                                onKeyDown={(e) => {if(e.key === 'Enter') handleFileNameSave(); if(e.key === 'Escape') {setIsEditingFileName(false); setCurrentFileName(selectedFileForPlanilha.name)}}}
                                autoFocus
                                className="text-2xl sm:text-3xl font-bold text-gray-800 border-b-2 border-blue-500 focus:outline-none bg-transparent"
                            />
                            <button onClick={handleFileNameSave} className="ml-2 p-1 text-green-500 hover:text-green-700"><Check size={20}/></button>
                            <button onClick={() => {setIsEditingFileName(false); setCurrentFileName(selectedFileForPlanilha.name)}} className="ml-1 p-1 text-red-500 hover:text-red-700"><XIcon size={20}/></button>
                        </div>
                    ) : <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Planilha</h1> }
                </div>
                {selectedFileForPlanilha && <p className="text-sm text-gray-500 self-start sm:self-center">Data de Referência: {new Date(selectedFileForPlanilha.referenceDate + 'T00:00:00').toLocaleDateString()} ({selectedFileForPlanilha.fileCategory})</p>}
            </div>
            
            <div className="my-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <button
                    onClick={handleAddNewRow}
                    className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center text-sm"
                >
                    <PlusCircle size={16} className="mr-1.5" /> Adicionar Linha
                </button>
                {selectedRowOriginalIndices.size > 0 && (
                    <button
                        onClick={handleDeleteSelectedRows}
                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center text-sm"
                    >
                        <Trash2 size={16} className="mr-1.5" /> Excluir Selecionadas ({selectedRowOriginalIndices.size})
                    </button>
                )}
                <div className="relative" ref={addColumnPopoverRef}>
                    <button id="add-column-button" onClick={() => setShowAddColumnPopover(prev => !prev)}  className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center text-sm">
                        <Settings2 size={16} className="mr-1.5" /> Gerenciar Colunas
                    </button>
                    {showAddColumnPopover && (
                        <div className="absolute top-full mt-1 left-0 bg-white p-3 shadow-xl rounded-md border z-20 w-64 space-y-2">
                            <label htmlFor="newColName" className="text-xs font-medium">Nome da Nova Coluna:</label>
                            <input 
                                id="newColName"
                                type="text" 
                                value={newColumnNameInput} 
                                onChange={e => setNewColumnNameInput(e.target.value)} 
                                placeholder="Ex: Nova Observação"
                                className="w-full p-1.5 border border-gray-300 rounded-md text-xs"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddColumnConfirm()}
                            />
                            <button onClick={handleAddColumnConfirm} className="w-full text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600">Adicionar Coluna</button>
                        </div>
                    )}
                </div>
                {hasUnsavedDataChanges && (
                    <button
                        onClick={handleSaveChangesToContext}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-3 rounded-md shadow-sm flex items-center text-sm ml-auto"
                    >
                        <Save size={16} className="mr-1.5" /> Salvar Alterações nos Dados
                    </button>
                )}
            </div>


            {headers.length > 0 && selectedFileForPlanilha ? (
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-100 z-20">
                                        <button onClick={toggleSelectAllVisibleRows} title={paginatedData.length > 0 && paginatedData.every(r => selectedRowOriginalIndices.has(editableData.indexOf(r))) ? "Desmarcar Visíveis" : "Marcar Visíveis"}>
                                            {paginatedData.length > 0 && paginatedData.every(r => selectedRowOriginalIndices.has(editableData.indexOf(r))) ? <CheckSquare size={16} className="text-blue-600"/> : <Square size={16} className="text-gray-400"/>}
                                        </button>
                                    </th>
                                    {originalHeaders.map((originalHeader, index) => {
                                        const headerKey = headers[index];
                                        return (
                                        <th key={headerKey} className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-nowrap group relative">
                                            <div className="flex items-center">
                                                {editingHeaderKey === headerKey ? (
                                                    <input
                                                        ref={headerInputRef}
                                                        type="text"
                                                        value={currentHeaderNameValue}
                                                        onChange={handleHeaderNameChange}
                                                        onBlur={saveHeaderNameEdit}
                                                        onKeyDown={handleHeaderEditKeyDown}
                                                        autoFocus
                                                        className="p-1 border border-blue-500 rounded-sm text-xs w-32 bg-white"
                                                    />
                                                ) : (
                                                    <span onClick={() => requestSort(headerKey)} className="cursor-pointer hover:text-blue-600">{originalHeader}</span>
                                                )}
                                                {sortConfig?.key === headerKey && (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼')}
                                                <button data-filter-button-for={headerKey} onClick={() => setActiveFilterPopover(activeFilterPopover === headerKey ? null : headerKey)} className={`ml-1 p-0.5 rounded hover:bg-gray-300 ${filters[headerKey] ? 'text-blue-600' : 'text-gray-400'}`} title="Filtrar Coluna">
                                                    <Filter size={12}/>
                                                </button>
                                                <button onDoubleClick={() => handleHeaderDoubleClick(headerKey, originalHeader)} title="Duplo clique para renomear" className="ml-1 p-0.5 rounded hover:bg-yellow-100 text-yellow-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <Edit3 size={12}/>
                                                </button>
                                                <button onClick={() => handleRemoveColumnConfirm(originalHeader)} title="Remover Coluna" className="ml-1 p-0.5 rounded hover:bg-red-100 text-red-500 opacity-20 group-hover:opacity-100 transition-opacity">
                                                    <XIcon size={12}/>
                                                </button>
                                            </div>
                                            {activeFilterPopover === headerKey && renderFilterPopover(headerKey, originalHeader)}
                                        </th>
                                    )})}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {paginatedData.map((row, paginatedRowIndex) => {
                                    const originalDataIndex = editableData.indexOf(row);
                                    const isSelected = selectedRowOriginalIndices.has(originalDataIndex);
                                    return (
                                        <tr key={`row-${originalDataIndex}-${row[headers[0]]}`} className={`hover:bg-gray-50 transition-colors duration-150 ${isSelected ? 'bg-orange-100' : ''}`}>
                                            <td className={`px-4 py-3 whitespace-nowrap sticky left-0 z-[5] ${isSelected ? 'bg-orange-100' : 'bg-white group-hover:bg-gray-50'}`}>
                                                <button onClick={() => toggleRowSelection(originalDataIndex)} className="p-1">
                                                    {isSelected ? <CheckSquare size={16} className="text-orange-600"/> : <Square size={16} className="text-gray-300"/>}
                                                </button>
                                            </td>
                                            {headers.map(headerKey => (
                                                <td 
                                                    key={`${originalDataIndex}-${headerKey}`} 
                                                    className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 max-w-xs truncate" 
                                                    title={String(row[headerKey])}
                                                    onDoubleClick={() => handleCellDoubleClick(paginatedRowIndex, headerKey)}
                                                >
                                                    {editingCell?.originalDataIndex === originalDataIndex && editingCell.columnKey === headerKey ? (
                                                        <input
                                                            type="text"
                                                            value={editingCellValue}
                                                            onChange={handleCellInputChange}
                                                            onBlur={saveCellEdit}
                                                            onKeyDown={handleCellEditKeyDown}
                                                            autoFocus
                                                            className="w-full p-1 border border-blue-500 rounded-sm text-sm bg-yellow-50"
                                                        />
                                                    ) : (
                                                        row[headerKey] === null || row[headerKey] === undefined ? '-' :
                                                        (typeof row[headerKey] === 'number' ?
                                                            (row[headerKey] as number).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) :
                                                            String(row[headerKey]))
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                                {paginatedData.length === 0 && <tr><td colSpan={headers.length + 1} className="text-center py-10 text-gray-500">Nenhum dado encontrado com os filtros aplicados.</td></tr>}
                                {filteredLocalData.length > 0 && paginatedData.length === 0 && <tr><td colSpan={headers.length + 1} className="text-center py-10 text-gray-500">Nenhum dado nesta página. Tente uma página anterior.</td></tr>}

                            </tbody>
                        </table>
                    </div>
                    {totalPages > 0 && <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                        <span className="text-sm text-gray-600">Página {currentPageNum} de {totalPages} (Total de {filteredLocalData.length} linhas)</span>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPageNum(1)} disabled={currentPageNum === 1 || totalPages === 0} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50">Primeira</button>
                            <button onClick={() => setCurrentPageNum(p => Math.max(1, p - 1))} disabled={currentPageNum === 1 || totalPages === 0} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50">Anterior</button>
                            <button onClick={() => setCurrentPageNum(p => Math.min(totalPages, p + 1))} disabled={currentPageNum === totalPages || totalPages === 0} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50">Próxima</button>
                            <button onClick={() => setCurrentPageNum(totalPages)} disabled={currentPageNum === totalPages || totalPages === 0} className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-md disabled:opacity-50">Última</button>
                        </div>
                    </div>}
                </div>
            ) : (selectedFileForPlanilha && <div className="p-6 text-center text-gray-600 min-h-[calc(100vh-250px)] flex flex-col items-center justify-center"><TableIcon size={64} className="text-gray-400 mb-4" /><h2 className="text-xl font-semibold mb-2">Dados não disponíveis.</h2><p className="text-md">O arquivo selecionado pode estar vazio ou os cabeçalhos não puderam ser lidos.</p></div>)}
        </div>
    );
};
export default SpreadsheetPage;
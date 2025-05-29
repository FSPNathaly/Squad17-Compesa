import React, { useState, createContext, useContext, ReactNode, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; // useNavigate removed as it's not directly used in this file now
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Page component imports based on your structure
import HomePage from './pages/Home'; // Resolves to pages/Home/index.tsx
import DashboardPage from './pages/Dashboard'; // Resolves to pages/Dashboard/index.tsx
import PlanilhaPage from './pages/Planilha'; // Resolves to pages/Planilha/index.tsx

// Assume Papaparse, jsPDF, and jsPDF-AutoTable are global (window.Papa, window.jsPDF)
// In a real app with types: declare global { interface Window { Papa: any; jsPDF: any; } }

export const AppContext = createContext<any>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    
    const [analiseData, setAnaliseData] = useState<any[]>([]);
    const [distribuidoData, setDistribuidoData] = useState<any[]>([]);
    const [consumidoData, setConsumidoData] = useState<any[]>([]);
    const [perdidoData, setPerdidoData] = useState<any[]>([]);
    const [balanceData, setBalanceData] = useState<any[]>([]);
    const [importedFileName, setImportedFileName] = useState<string>('');

    const processImportedData = (parsedData: any[], fileName: string) => {
        setImportedFileName(fileName);
        
        if (fileName.includes('Analise') || fileName.includes('AnaliseAcum')) {
            const transformedAnaliseData = parsedData.map(row => {
                const perdaValue = String(row['Índice de Perda (%)'] || row['Perda'] || '0').replace(',', '.');
                const volumeValue = String(row['Volume Distribuído (m³)'] || row['Volume'] || '0').replace(/[^0-9,-]/g, '').replace(',', '.');
                
                let status = row['Status'] || 'N/A';
                const perdaNum = parseFloat(perdaValue);
                if (status === 'N/A' && !isNaN(perdaNum)) {
                    if (perdaNum > 20) status = 'Crítico';
                    else if (perdaNum > 10) status = 'Alerta';
                    else status = 'Ok';
                }

                return {
                    municipio: row['Município'] || row['Nome do Município'] || 'Desconhecido',
                    perda: !isNaN(perdaNum) ? perdaNum : 0,
                    volume: !isNaN(parseFloat(volumeValue)) ? parseFloat(volumeValue) : 0,
                    status: status,
                };
            });
            setAnaliseData(transformedAnaliseData);
            
            if (fileName.includes('AnaliseAcum')) {
                const transformedBalanceData = parsedData.map(row => ({
                    municipio: row['Município'] || row['Nome do Município'] || 'Desconhecido',
                    'Volume Distribuído': parseInt(String(row['Volume Distribuído (m³)'] || '0').replace(/[^0-9]/g, ''), 10) || 0,
                    'Volume Consumido': parseInt(String(row['Volume Consumido (m³)'] || '0').replace(/[^0-9]/g, ''), 10) || 0,
                    'Volume de Perda': parseInt(String(row['Volume de Perda (m³)'] || '0').replace(/[^0-9]/g, ''), 10) || 0,
                }));
                setBalanceData(transformedBalanceData);
            }

        } else if (fileName.includes('VDistrib')) {
            const transformedDistData = parsedData.map(row => {
                 let month = row['Mês'] || row['MESANO'] || row['Mês/Ano'];
                 try {
                    if (month && !/^[A-Za-z]{3}$/.test(month)) { 
                        const dateStr = String(month);
                        if (dateStr.match(/^\d{1,2}\/\d{4}$/)) { 
                            const [m, y] = dateStr.split('/');
                            month = format(new Date(Number(y), Number(m) - 1, 1), 'MMM', { locale: ptBR });
                        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/) || dateStr.match(/^\d{2}\/\d{2}\/\d{4}/) ) { 
                             month = format(parseISO(dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr), 'MMM', { locale: ptBR });
                        } else {
                            month = String(month).substring(0,3);
                        }
                    } else if (!month) {
                        month = "N/A"
                    }
                 } catch (e) {
                    month = String(month).substring(0,3); 
                 }
                return {
                    month: month,
                    volume: parseInt(String(row['Volume (m³) Base'] || row['Volume'] || '0').replace(/[^0-9]/g, ''), 10) || 0
                };
            });
            setDistribuidoData(transformedDistData);
            setConsumidoData(transformedDistData.map(d => ({...d, volume: Math.floor(d.volume * 0.8)})));
            setPerdidoData(transformedDistData.map(d => ({...d, volume: Math.floor(d.volume * 0.2)})));

        }  else if (fileName.includes('VCNorma')) {
             const transformedConsData = parsedData.map(row => {
                let month = row['Mês'] || row['MESANO'] || row['Mês/Ano'];
                try {
                   if (month && !/^[A-Za-z]{3}$/.test(month)) { 
                       const dateStr = String(month);
                       if (dateStr.match(/^\d{1,2}\/\d{4}$/)) {
                           const [m, y] = dateStr.split('/');
                           month = format(new Date(Number(y), Number(m) - 1, 1), 'MMM', { locale: ptBR });
                       } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}/) || dateStr.match(/^\d{2}\/\d{2}\/\d{4}/) ) {
                            month = format(parseISO(dateStr.includes('/') ? dateStr.split('/').reverse().join('-') : dateStr), 'MMM', { locale: ptBR });
                       } else {
                           month = String(month).substring(0,3);
                       }
                   } else if (!month) {
                       month = "N/A"
                   }
                } catch (e) {
                   month = String(month).substring(0,3);
                }
               return {
                   month: month,
                   volume: parseInt(String(row['Volume (m³) Base'] || row['Volume'] || '0').replace(/[^0-9]/g, ''), 10) || 0
               };
           });
           setConsumidoData(transformedConsData);
        }
        alert(`${fileName} importado e processado! Dados atualizados.`);
    };

    const contextValue = {
        isLoggedIn,
        setIsLoggedIn,
        selectedMunicipality,
        setSelectedMunicipality,
        showLogoutConfirm,
        setShowLogoutConfirm,
        showImportModal,
        setShowImportModal,
        analiseData,
        distribuidoData,
        consumidoData,
        perdidoData,
        balanceData,
        processImportedData,
        importedFileName,
        setImportedFileName,
        setAnaliseData,
    };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const { isLoggedIn } = useContext(AppContext);
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

const AppRoutes = () => {
    const { isLoggedIn } = useContext(AppContext);
    return (
        <Routes>
            <Route path="/login" element={<HomePage />} />
            <Route 
                path="/dashboard" 
                element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} 
            />
            <Route 
                path="/planilha" 
                element={<ProtectedRoute><PlanilhaPage /></ProtectedRoute>} 
            />
            <Route 
                path="*" 
                element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />} 
            />
        </Routes>
    );
};

const App = () => (
    <AppProvider>
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    </AppProvider>
);

export default App;
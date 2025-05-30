import React, { createContext, useState, type ReactNode, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/home';
import DashboardPage from './pages/dashboard';
import PlanilhaPage from './pages/planilha';

export interface TransformedCsvRow {
  [key: string]: string | number | null | undefined;
}

export interface ImportedFileDetail {
  id: string;
  name: string;
  size: number;
  type: string;
  importDate: Date;
  data: TransformedCsvRow[];
  generationDate: Date;
}

export interface AnaliseDataItem {
  municipios: string;
  perda: number | null;
  volume: number | null;
  status: string;
  ipd?: number | null;
  [key: string]: any;
}

export interface ChartDataItem {
  month: string;
  volume: number | null;
  municipios?: string;
  volume_distribuido?: number | null;
  volume_consumido?: number | null;
  volume_de_perda?: number | null;
}

export interface AppContextValues {
  isLoggedIn: boolean;
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  showImportModal: boolean;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedMunicipality: string | null;
  setSelectedMunicipality: React.Dispatch<React.SetStateAction<string | null>>;
  importedFileNames: string;
  globalFileGenerationDate: Date | null;
  importedFilesDetails: ImportedFileDetail[];
  setImportedFilesDetails: React.Dispatch<React.SetStateAction<ImportedFileDetail[]>>;
  fileIdForPlanilhaView: string | null;
  setFileIdForPlanilhaView: React.Dispatch<React.SetStateAction<string | null>>;
  processImportedData: (
    fileBatchName: string,
    generationDate: Date,
    parsedFileContentsDetails: { name: string, size: number, type: string, data: TransformedCsvRow[], generationDate: Date }[]
  ) => void;
  removeImportedFile: (fileId: string) => void;
}

export const AppContext = createContext<AppContextValues>({} as AppContextValues);

export const cleanAndParseNumberGlobal = (value: string | undefined | null): number | null => {
    if (value === null || value === undefined) return null;
    const stringValue = String(value).trim();
    if (stringValue === '-' || stringValue === '') return null;
    const cleanedValue = stringValue.replace(/\./g, '').replace(/,/g, '.');
    const num = Number(cleanedValue);
    return isNaN(num) ? null : num;
};

export const getStatusFromPerdaGlobal = (perda: number | null): string => {
    if (perda === null) return "N/D";
    if (perda > 40) return "Crítico";
    if (perda > 25) return "Alerta";
    return "Ok";
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [importedFileNames, setImportedFileNames] = useState<string>('');
  const [globalFileGenerationDate, setGlobalFileGenerationDate] = useState<Date | null>(null);
  const [importedFilesDetails, setImportedFilesDetails] = useState<ImportedFileDetail[]>([]);
  const [fileIdForPlanilhaView, setFileIdForPlanilhaView] = useState<string | null>(null);

  const processImportedData = (
    _fileBatchName: string,
    generationDate: Date,
    parsedFileContentsDetails: { name: string, size: number, type: string, data: TransformedCsvRow[], generationDate: Date }[]
  ) => {
    setGlobalFileGenerationDate(generationDate);

    const newFileDetails: ImportedFileDetail[] = parsedFileContentsDetails.map((parsedFile, index) => ({
      id: `${Date.now()}-ctx-${index}-${parsedFile.name}-${parsedFile.generationDate.toISOString()}`,
      name: parsedFile.name,
      size: parsedFile.size,
      type: parsedFile.type,
      importDate: new Date(),
      data: parsedFile.data,
      generationDate: parsedFile.generationDate,
    }));

    setImportedFilesDetails(prevDetails => {
        const existingMap = new Map(prevDetails.map(d => [`${d.name}-${d.generationDate.toISOString()}`, d]));
        newFileDetails.forEach(nd => {
            existingMap.set(`${nd.name}-${nd.generationDate.toISOString()}`, nd);
        });
        return Array.from(existingMap.values());
    });
  };

  useEffect(() => {
    if (importedFilesDetails.length === 0) {
        setImportedFileNames('');
    } else {
        const currentImportedFileNames = importedFilesDetails.map(f => f.name).join(', ');
        setImportedFileNames(currentImportedFileNames);
        
        const latestDate = importedFilesDetails.reduce((latest, file) => {
            return !latest || file.generationDate > latest ? file.generationDate : latest;
        }, null as Date | null);
        setGlobalFileGenerationDate(latestDate);
    }
  }, [importedFilesDetails]);

  const removeImportedFile = (fileIdToRemove: string) => {
    setImportedFilesDetails(prevDetails => prevDetails.filter(file => file.id !== fileIdToRemove));
    if (fileIdForPlanilhaView === fileIdToRemove) {
        setFileIdForPlanilhaView(null);
    }
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn, setIsLoggedIn,
      showLogoutConfirm, setShowLogoutConfirm,
      showImportModal, setShowImportModal,
      selectedMunicipality, setSelectedMunicipality,
      importedFileNames,
      globalFileGenerationDate,
      importedFilesDetails, setImportedFilesDetails,
      fileIdForPlanilhaView, setFileIdForPlanilhaView,
      processImportedData,
      removeImportedFile
    }}>
      {children}
    </AppContext.Provider>
  );
};

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<HomePage />} />
          <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
          <Route path="/planilha" element={<AuthGuard><PlanilhaPage /></AuthGuard>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

const AuthGuard: React.FC<{children: ReactNode}> = ({ children }) => {
  const { isLoggedIn } = useContext(AppContext);
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  return children as React.ReactElement;
};

export default App;
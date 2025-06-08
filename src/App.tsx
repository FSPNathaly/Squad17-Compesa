import React, { useState, useCallback, useEffect } from "react";
import { Home } from "./pages/home";
import { Dashboard } from "./pages/dashboard";
import { Planilha } from "./pages/planilha";

export interface CsvData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  "Volume Produzido": string;
  "Volume Consumido": string;
  [key: string]: string;
}

export interface BalancoVolumeData {
  name: string;
  distribuido: number;
  consumido: number;
  perdaVolume: number;
}

export interface ImportedFileEntry {
  id: string;
  fileName: string;
  importDate: Date;
  rawData: CsvData[];
  perdaAnualData: { name: string; value: number }[];
  gastosMunicipiosData: { name: string; manutencoes: number; valor: number }[];
  perdasMunicipioData: {
    name: string;
    manutencao: number;
    faltaAgua: number;
    semAcesso: number;
  }[];
  volumeTotalData: { name: string; produzido: number; consumido: number }[];
  balancoVolumesData: BalancoVolumeData[];
}

export type Page = "home" | "dashboard" | "planilha";

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [importedFilesHistory, setImportedFilesHistory] = useState<
    ImportedFileEntry[]
  >([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  const activeFileEntry = activeFileId
    ? importedFilesHistory.find((f) => f.id === activeFileId)
    : null;

  const handleLogin = useCallback(() => {
    setIsAuthenticated(true);
    setCurrentPage("dashboard");
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setActiveFileId(null);
    setCurrentPage("home");
  }, []);

  const navigateTo = useCallback(
    (page: Page) => {
      if (page === "home") {
        handleLogout();
      } else if (isAuthenticated) {
        if (
          page === "planilha" &&
          !activeFileId &&
          importedFilesHistory.length > 0
        ) {
        }
        setCurrentPage(page);
      } else {
        setCurrentPage("home");
      }
    },
    [isAuthenticated, handleLogout, activeFileId, importedFilesHistory.length]
  );

  const handleFileImportedOrUpdated = useCallback(
    (fileEntry: ImportedFileEntry) => {
      setImportedFilesHistory((prev) => {
        const existingIndex = prev.findIndex((f) => f.id === fileEntry.id);
        if (existingIndex > -1) {
          const updatedHistory = [...prev];
          updatedHistory[existingIndex] = fileEntry;
          return updatedHistory;
        }
        return [...prev, fileEntry];
      });
      setActiveFileId(fileEntry.id);
    },
    []
  );

  const handleFileDeleted = useCallback(
    (fileIdToDelete: string) => {
      setImportedFilesHistory((prev) =>
        prev.filter((f) => f.id !== fileIdToDelete)
      );
      if (activeFileId === fileIdToDelete) {
        setActiveFileId(null);
      }
    },
    [activeFileId]
  );

  const handleFileDateEdited = useCallback(
    (fileIdToEdit: string, newDate: Date) => {
      setImportedFilesHistory((prev) =>
        prev.map((f) =>
          f.id === fileIdToEdit ? { ...f, importDate: newDate } : f
        )
      );
    },
    []
  );

  useEffect(() => {
    const storedFiles = localStorage.getItem("compesaDashboardFiles");
    if (storedFiles) {
      try {
        const parsedFiles: ImportedFileEntry[] = JSON.parse(storedFiles).map(
          (file: any) => ({
            ...file,
            importDate: new Date(file.importDate),
          })
        );
        setImportedFilesHistory(parsedFiles);
      } catch (error) {
        console.error("Falha ao analisar arquivos armazenados:", error);
        localStorage.removeItem("compesaDashboardFiles");
      }
    }
  }, []);

  useEffect(() => {
    if (importedFilesHistory.length > 0) {
      localStorage.setItem(
        "compesaDashboardFiles",
        JSON.stringify(importedFilesHistory)
      );
    } else {
      localStorage.removeItem("compesaDashboardFiles");
    }
  }, [importedFilesHistory]);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return isAuthenticated ? (
          <Dashboard
            importedFilesHistory={importedFilesHistory}
            activeFileId={activeFileId}
            onFileImportedOrUpdated={handleFileImportedOrUpdated}
            onFileSelected={setActiveFileId}
            onFileDeleted={handleFileDeleted}
            onFileDateEdited={handleFileDateEdited}
            navigateToPlanilha={() => navigateTo("planilha")}
            onLogout={handleLogout}
          />
        ) : (
          <Home onLogin={handleLogin} />
        );
      case "planilha":
        return isAuthenticated ? (
          <Planilha
            importedFilesHistory={importedFilesHistory}
            activeFileId={activeFileId}
            onFileSelected={setActiveFileId}
            onFileImportedOrUpdated={handleFileImportedOrUpdated}
            onFileDeleted={handleFileDeleted}
            onFileDateEdited={handleFileDateEdited}
            activeFileRawData={activeFileEntry?.rawData || null}
            activeFileName={activeFileEntry?.fileName || null}
            activeFileDate={activeFileEntry?.importDate}
            navigateToDashboard={() => navigateTo("dashboard")}
            onLogout={handleLogout}
          />
        ) : (
          <Home onLogin={handleLogin} />
        );
      case "home":
      default:
        return <Home onLogin={handleLogin} />;
    }
  };

  return <div className="app-container">{renderPage()}</div>;
};

export default App;

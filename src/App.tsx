import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ChevronDown,
  LogOut,
  Settings,
  User as UserIcon,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  LayoutDashboard,
  Menu as MenuIconLucide,
  X as XIcon,
  FolderArchive,
} from "lucide-react";

import LoginPage from "./pages/home";
import DashboardPage from "./pages/dashboard";
import SpreadsheetPage from "./pages/planilha";

export type Page = "login" | "dashboard" | "planilha";

export interface UserProfile {
  email: string | null;
  displayName?: string | null;
}

export const globalCleanAndParseNumber = (
  value: string | number | undefined | null
): number | null => {
  if (value === null || value === undefined) return null;
  const stringValue = String(value).trim();
  if (stringValue === "-" || stringValue === "") return null;
  const cleanedValue = stringValue
    .replace(/\.(?=.*\.)/g, "")
    .replace(/,/g, ".");
  const num = parseFloat(cleanedValue);
  return isNaN(num) ? null : num;
};

export const globalTransformHeader = (header: string): string => {
  if (typeof header !== "string")
    return `column_${Math.random().toString(36).substring(2, 7)}`;
  let newHeader = header.trim().toLowerCase();
  newHeader = newHeader.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  newHeader = newHeader.replace(/\s+/g, "_");
  newHeader = newHeader.replace(/[^a-z0-9_]/g, "");
  newHeader = newHeader.replace(/_+/g, "_");
  newHeader = newHeader.replace(/^_+|_+$/g, "");
  return newHeader || `column_${Math.random().toString(36).substring(2, 7)}`;
};

export const fileTypeCategories = [
  "VCNorma",
  "VDistrib",
  "RelDesvios",
  "AnaliseAcum",
  "Analise",
  "Outros",
] as const;
export type FileTypeCategory = (typeof fileTypeCategories)[number];

export interface ImportedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  fileCategory: FileTypeCategory;
  referenceDate: string;
  importDate: Date;
  data: Array<Record<string, any>>;
  headers: string[];
}

export interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  currentPage: Page;
  navigateTo: (page: Page, replace?: boolean) => void;
  importedFiles: ImportedFile[];
  addImportedFile: (file: ImportedFile) => void;
  removeImportedFile: (fileId: string) => void;
  selectedFileForPlanilha: ImportedFile | null;
  setSelectedFileForPlanilha: Dispatch<SetStateAction<ImportedFile | null>>;
  selectedFileForDashboard: ImportedFile | null;
  setSelectedFileForDashboard: Dispatch<SetStateAction<ImportedFile | null>>;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  appId: string;
  userId: string | null;
  updateImportedFileName: (fileId: string, newName: string) => void;
  renameImportedFileColumn: (
    fileId: string,
    oldHeader: string,
    newHeader: string
  ) => void;
  addColumnToImportedFile: (fileId: string, newColumnName: string) => void;
  removeColumnFromImportedFile: (fileId: string, columnHeader: string) => void;
  updateImportedFileData: (
    fileId: string,
    newData: Array<Record<string, any>>
  ) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext deve ser usado dentro de um AppProvider");
  }
  return context;
};

export const MenuContext = createContext<{ open: boolean }>({ open: false });

const Toast: React.FC<{
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose, message, type]);

  const bgColor =
    type === "success"
      ? "bg-green-500"
      : type === "error"
      ? "bg-red-500"
      : "bg-blue-500";
  const IconComponent =
    type === "success" ? CheckCircle : type === "error" ? XCircle : AlertCircle;

  return (
    <div
      className={`fixed top-5 right-5 ${bgColor} text-white p-4 rounded-lg shadow-lg flex items-center z-[200]`}
    >
      <IconComponent size={24} className="mr-3" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-xl font-bold">
        &times;
      </button>
    </div>
  );
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?:
    | "sm"
    | "md"
    | "lg"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "6xl"
    | "7xl"
    | "full";
  footer?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  footer,
}) => {
  if (!isOpen) return null;
  const sizeClasses: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
    full: "max-w-full",
  };
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[150] p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl ${sizeClasses[size]} w-full max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon size={24} />
          </button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-grow">{children}</div>
        {footer && (
          <div className="p-4 md:p-6 border-t flex justify-end space-x-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const AppHeader: React.FC = () => {
  const {
    currentUser,
    navigateTo,
    showToast,
    setIsLoading,
    currentPage,
    setCurrentUser,
    selectedFileForDashboard,
    setSelectedFileForPlanilha,
  } = useAppContext();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    setIsLoading(true);
    setCurrentUser(null);
    setSelectedFileForDashboard(null);
    setSelectedFileForPlanilha(null);
    showToast("Logout realizado com sucesso!", "success");
    navigateTo("login", true);
    setIsLoading(false);
    setIsLogoutModalOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleRefreshDashboard = () => {
    if (currentPage === "dashboard") {
      setIsLoading(true);
      showToast("Atualizando dados do dashboard...", "info");
      setTimeout(() => {
        showToast(
          `Dashboard atualizado! ${
            selectedFileForDashboard
              ? `Analisando ${selectedFileForDashboard.name}`
              : "Considere selecionar um arquivo."
          }`,
          "success"
        );
        setIsLoading(false);
      }, 1500);
    } else {
      showToast("Ação de atualizar é específica para o Dashboard.", "info");
    }
  };

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      userMenuRef.current &&
      !userMenuRef.current.contains(event.target as Node)
    ) {
      setIsUserMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  const navLinkClass = (page: Page) =>
    `hover:bg-blue-600 px-3 py-2 rounded-md text-sm font-medium flex items-center ${
      currentPage === page ? "bg-blue-800" : ""
    }`;

  const navigateToPlanilha = () => {
    if (selectedFileForDashboard) {
      setSelectedFileForPlanilha(selectedFileForDashboard);
      navigateTo("planilha");
    } else {
      showToast(
        "Primeiro, selecione um arquivo no Dashboard para visualizar na planilha.",
        "info"
      );
      if (currentPage !== "dashboard") navigateTo("dashboard");
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-blue-700 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center">
          <img
            src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
            alt="Compesa Logo"
            className="h-10 mr-6 cursor-pointer"
            onClick={() => navigateTo(currentUser ? "dashboard" : "login")}
            style={{ filter: "brightness(0) invert(1)" }}
          />
          {currentUser && (
            <nav className="hidden md:flex space-x-2">
              <button
                onClick={() => navigateTo("dashboard")}
                className={navLinkClass("dashboard")}
              >
                <LayoutDashboard size={18} className="mr-2" /> Dashboard
              </button>
              <button
                onClick={navigateToPlanilha}
                className={navLinkClass("planilha")}
              >
                <FileSpreadsheet size={18} className="mr-2" /> Planilha
              </button>
            </nav>
          )}
        </div>
        <div className="flex items-center space-x-3">
          {currentUser && currentPage === "dashboard" && (
            <button
              onClick={handleRefreshDashboard}
              title="Atualizar Dados do Dashboard"
              className="p-2 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <RefreshCw size={20} />
            </button>
          )}
          {currentUser && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-blue-600"
              >
                <UserIcon
                  size={24}
                  className="bg-gray-300 text-blue-700 p-1 rounded-full"
                />
                <span className="hidden sm:inline text-sm">
                  {currentUser.displayName || currentUser.email?.split("@")[0]}
                </span>
                <ChevronDown size={16} />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 text-gray-700 py-1">
                  <div className="px-4 py-3 border-b">
                    <p className="text-sm font-semibold truncate">
                      {currentUser.displayName || "Usuário"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      showToast(
                        "Funcionalidade de Configurações ainda não implementada.",
                        "info"
                      );
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center"
                  >
                    <Settings size={16} className="mr-2" /> Configurações
                  </button>
                  <button
                    onClick={() => {
                      setIsLogoutModalOpen(true);
                      setIsUserMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 hover:text-red-700 flex items-center"
                  >
                    <LogOut size={16} className="mr-2" /> Sair
                  </button>
                </div>
              )}
            </div>
          )}
          {currentUser && (
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md hover:bg-blue-600"
              >
                {isMobileMenuOpen ? (
                  <XIcon size={24} />
                ) : (
                  <MenuIconLucide size={24} />
                )}
              </button>
            </div>
          )}
        </div>
      </header>
      {currentUser && isMobileMenuOpen && (
        <div className="md:hidden bg-blue-700 text-white absolute top-16 left-0 right-0 z-20 shadow-lg border-t border-blue-600">
          <nav className="flex flex-col space-y-1 px-2 py-3">
            <button
              onClick={() => {
                navigateTo("dashboard");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full text-left ${navLinkClass("dashboard")}`}
            >
              <LayoutDashboard size={18} className="mr-2" /> Dashboard
            </button>
            <button
              onClick={navigateToPlanilha}
              className={`w-full text-left ${navLinkClass("planilha")}`}
            >
              <FileSpreadsheet size={18} className="mr-2" /> Planilha
            </button>
          </nav>
        </div>
      )}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirmar Saída"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Sair
            </button>
          </>
        }
      >
        <p className="text-gray-600">
          Você tem certeza que deseja sair do sistema?
        </p>
      </Modal>
    </>
  );
};

const MainApp: React.FC = () => {
  const [currentUser, setCurrentUserInternal] = useState<UserProfile | null>(
    () => {
      try {
        const storedUser = localStorage.getItem("compesaAppUserV2");
        return storedUser ? JSON.parse(storedUser) : null;
      } catch {
        localStorage.removeItem("compesaAppUserV2");
        return null;
      }
    }
  );
  const [currentPage, setCurrentPageInternal] = useState<Page>("login");
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [selectedFileForPlanilha, setSelectedFileForPlanilha] =
    useState<ImportedFile | null>(null);
  const [selectedFileForDashboard, setSelectedFileForDashboard] =
    useState<ImportedFile | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    id: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const appIdGlobal = "compesa-analise-hidrica-app-v5-flow";

  const setCurrentUser = useCallback((user: UserProfile | null) => {
    setCurrentUserInternal(user);
    if (user) {
      localStorage.setItem("compesaAppUserV2", JSON.stringify(user));
    } else {
      localStorage.removeItem("compesaAppUserV2");
      setImportedFiles([]);
      setSelectedFileForDashboard(null);
      setSelectedFileForPlanilha(null);
    }
  }, []);

  const navigateTo = useCallback(
    (page: Page, replace = false) => {
      const newHash = `#${page}`;
      if (window.location.hash !== newHash) {
        if (replace) {
          window.location.replace(newHash);
        } else {
          window.location.hash = newHash;
        }
      } else {
        if (currentPage !== page) setCurrentPageInternal(page);
      }
    },
    [currentPage]
  );

  useEffect(() => {
    const handleHashChange = () => {
      setIsLoading(true);
      const hash = window.location.hash.replace(/^#/, "");
      let targetPage = (hash || (currentUser ? "dashboard" : "login")) as Page;
      const validPages: Page[] = ["login", "dashboard", "planilha"];

      if (!validPages.includes(targetPage)) {
        targetPage = currentUser ? "dashboard" : "login";
      }

      if (!currentUser && targetPage !== "login") {
        targetPage = "login";
        if (window.location.hash !== `#${targetPage}`)
          window.location.replace(`#${targetPage}`);
      } else if (currentUser && targetPage === "login") {
        targetPage = "dashboard";
        if (window.location.hash !== `#${targetPage}`)
          window.location.replace(`#${targetPage}`);
      }

      if (currentPage !== targetPage) {
        setCurrentPageInternal(targetPage);
      }
      setIsLoading(false);
    };

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();

    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [currentUser, navigateTo, currentPage]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setToast({ message, type, id: Date.now() });
    },
    []
  );

  const addImportedFile = useCallback(
    (file: ImportedFile) => {
      setImportedFiles((prev) => {
        const existingIndex = prev.findIndex(
          (f) =>
            f.name === file.name &&
            f.referenceDate === file.referenceDate &&
            f.fileCategory === file.fileCategory
        );
        if (existingIndex > -1) {
          const updatedFiles = [...prev];
          updatedFiles[existingIndex] = file;
          showToast(
            `Arquivo "${file.name}" (${file.fileCategory}, Ref: ${new Date(
              file.referenceDate + "T00:00:00"
            ).toLocaleDateString()}) foi atualizado.`,
            "info"
          );
          return updatedFiles;
        }
        showToast(
          `Arquivo "${file.name}" (${file.fileCategory}, Ref: ${new Date(
            file.referenceDate + "T00:00:00"
          ).toLocaleDateString()}) importado.`,
          "success"
        );
        return [...prev, file];
      });
    },
    [showToast]
  );

  const removeImportedFile = useCallback(
    (fileId: string) => {
      let removedFileName = "";
      setImportedFiles((prev) => {
        const fileToRemove = prev.find((f) => f.id === fileId);
        if (fileToRemove) removedFileName = fileToRemove.name;

        const newFiles = prev.filter((f) => f.id !== fileId);
        if (selectedFileForPlanilha?.id === fileId)
          setSelectedFileForPlanilha(null);
        if (selectedFileForDashboard?.id === fileId)
          setSelectedFileForDashboard(null);
        return newFiles;
      });
      if (removedFileName)
        showToast(`Arquivo "${removedFileName}" removido da sessão.`, "info");
    },
    [selectedFileForDashboard, selectedFileForPlanilha, showToast]
  );

  const updateImportedFileName = useCallback(
    (fileId: string, newName: string) => {
      let updatedFileInstance: ImportedFile | undefined;
      setImportedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileId) {
            updatedFileInstance = { ...file, name: newName };
            return updatedFileInstance;
          }
          return file;
        })
      );
      if (updatedFileInstance) {
        if (selectedFileForDashboard?.id === fileId) {
          setSelectedFileForDashboard(updatedFileInstance);
        }
        if (selectedFileForPlanilha?.id === fileId) {
          setSelectedFileForPlanilha(updatedFileInstance);
        }
      }
      showToast("Nome do arquivo atualizado.", "success");
    },
    [showToast, selectedFileForDashboard, selectedFileForPlanilha]
  );

  const renameImportedFileColumn = useCallback(
    (fileId: string, oldHeaderOriginal: string, newHeaderOriginal: string) => {
      if (
        !newHeaderOriginal ||
        newHeaderOriginal.trim() === "" ||
        newHeaderOriginal === oldHeaderOriginal
      ) {
        showToast(
          "Novo nome da coluna é inválido ou igual ao anterior.",
          "error"
        );
        return;
      }

      let fileWasUpdated = false;
      let updatedFileForSelection: ImportedFile | null = null;

      setImportedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileId) {
            const headerIndex = file.headers.indexOf(oldHeaderOriginal);
            if (headerIndex === -1) {
              showToast(
                `Coluna original "${oldHeaderOriginal}" não encontrada.`,
                "error"
              );
              return file;
            }

            const currentTransformedHeaders = file.headers.map((h) =>
              globalTransformHeader(h)
            );
            const newTransformedHeaderAttempt =
              globalTransformHeader(newHeaderOriginal);

            const oldTransformedHeader = currentTransformedHeaders[headerIndex];

            const isDuplicateTransformedName = currentTransformedHeaders.some(
              (th, i) => i !== headerIndex && th === newTransformedHeaderAttempt
            );
            if (isDuplicateTransformedName) {
              showToast(
                `Uma coluna com nome transformado similar a "${newHeaderOriginal}" já existe.`,
                "error"
              );
              return file;
            }

            const updatedHeadersOriginal = [...file.headers];
            updatedHeadersOriginal[headerIndex] = newHeaderOriginal;

            const updatedData = file.data.map((row) => {
              const newRow = { ...row };
              if (
                Object.prototype.hasOwnProperty.call(
                  newRow,
                  oldTransformedHeader
                )
              ) {
                newRow[newTransformedHeaderAttempt] =
                  newRow[oldTransformedHeader];
                if (oldTransformedHeader !== newTransformedHeaderAttempt) {
                  delete newRow[oldTransformedHeader];
                }
              }
              return newRow;
            });
            fileWasUpdated = true;
            showToast(
              `Coluna "${oldHeaderOriginal}" renomeada para "${newHeaderOriginal}".`,
              "success"
            );
            updatedFileForSelection = {
              ...file,
              headers: updatedHeadersOriginal,
              data: updatedData,
            };
            return updatedFileForSelection;
          }
          return file;
        })
      );

      if (fileWasUpdated && updatedFileForSelection) {
        if (selectedFileForDashboard?.id === fileId)
          setSelectedFileForDashboard(updatedFileForSelection);
        if (selectedFileForPlanilha?.id === fileId)
          setSelectedFileForPlanilha(updatedFileForSelection);
      }
    },
    [showToast, selectedFileForDashboard, selectedFileForPlanilha]
  );

  const addColumnToImportedFile = useCallback(
    (fileId: string, newColumnName: string) => {
      if (!newColumnName || newColumnName.trim() === "") {
        showToast("Nome da nova coluna não pode ser vazio.", "error");
        return;
      }
      const trimmedNewColumnName = newColumnName.trim();
      const transformedNewColumnName =
        globalTransformHeader(trimmedNewColumnName);
      let fileWasUpdated = false;
      let updatedFileForSelection: ImportedFile | null = null;

      setImportedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileId) {
            if (
              file.headers
                .map((h) => globalTransformHeader(h))
                .includes(transformedNewColumnName)
            ) {
              showToast(
                `Coluna com nome transformado similar a "${trimmedNewColumnName}" já existe.`,
                "error"
              );
              return file;
            }
            const updatedHeaders = [...file.headers, trimmedNewColumnName];
            const updatedData = file.data.map((row) => ({
              ...row,
              [transformedNewColumnName]: null,
            }));
            fileWasUpdated = true;
            showToast(
              `Coluna "${trimmedNewColumnName}" adicionada.`,
              "success"
            );
            updatedFileForSelection = {
              ...file,
              headers: updatedHeaders,
              data: updatedData,
            };
            return updatedFileForSelection;
          }
          return file;
        })
      );
      if (fileWasUpdated && updatedFileForSelection) {
        if (selectedFileForDashboard?.id === fileId)
          setSelectedFileForDashboard(updatedFileForSelection);
        if (selectedFileForPlanilha?.id === fileId)
          setSelectedFileForPlanilha(updatedFileForSelection);
      }
    },
    [showToast, selectedFileForDashboard, selectedFileForPlanilha]
  );

  const removeColumnFromImportedFile = useCallback(
    (fileId: string, columnHeaderToRemoveOriginal: string) => {
      let fileWasUpdated = false;
      let updatedFileForSelection: ImportedFile | null = null;
      setImportedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileId) {
            const transformedColumnHeader = globalTransformHeader(
              columnHeaderToRemoveOriginal
            );
            const updatedHeaders = file.headers.filter(
              (h) => h !== columnHeaderToRemoveOriginal
            );
            if (file.headers.length === updatedHeaders.length) {
              showToast(
                `Coluna "${columnHeaderToRemoveOriginal}" não encontrada para remoção.`,
                "error"
              );
              return file;
            }
            const updatedData = file.data.map((row) => {
              const newRow = { ...row };
              delete newRow[transformedColumnHeader];
              return newRow;
            });
            fileWasUpdated = true;
            showToast(
              `Coluna "${columnHeaderToRemoveOriginal}" removida.`,
              "success"
            );
            updatedFileForSelection = {
              ...file,
              headers: updatedHeaders,
              data: updatedData,
            };
            return updatedFileForSelection;
          }
          return file;
        })
      );
      if (fileWasUpdated && updatedFileForSelection) {
        if (selectedFileForDashboard?.id === fileId)
          setSelectedFileForDashboard(updatedFileForSelection);
        if (selectedFileForPlanilha?.id === fileId)
          setSelectedFileForPlanilha(updatedFileForSelection);
      }
    },
    [showToast, selectedFileForDashboard, selectedFileForPlanilha]
  );

  const updateImportedFileData = useCallback(
    (fileId: string, newData: Array<Record<string, any>>) => {
      let updatedFileInstance: ImportedFile | undefined;
      setImportedFiles((prevFiles) =>
        prevFiles.map((file) => {
          if (file.id === fileId) {
            updatedFileInstance = { ...file, data: newData };
            return updatedFileInstance;
          }
          return file;
        })
      );
      if (updatedFileInstance) {
        if (selectedFileForDashboard?.id === fileId) {
          setSelectedFileForDashboard(updatedFileInstance);
        }
        if (selectedFileForPlanilha?.id === fileId) {
          setSelectedFileForPlanilha(updatedFileInstance);
        }
      }
    },
    [selectedFileForDashboard, selectedFileForPlanilha]
  );

  const renderPage = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-600"></div>
        </div>
      );
    }

    switch (currentPage) {
      case "login":
        return <LoginPage />;
      case "dashboard":
        return currentUser ? <DashboardPage /> : <LoginPage />;
      case "planilha":
        return currentUser ? <SpreadsheetPage /> : <LoginPage />;
      default:
        return currentUser ? <DashboardPage /> : <LoginPage />;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentPage,
        navigateTo,
        importedFiles,
        addImportedFile,
        removeImportedFile,
        selectedFileForPlanilha,
        setSelectedFileForPlanilha,
        selectedFileForDashboard,
        setSelectedFileForDashboard,
        showToast,
        isLoading,
        setIsLoading,
        userId: currentUser?.email || null,
        appId: appIdGlobal,
        updateImportedFileName,
        renameImportedFileColumn,
        addColumnToImportedFile,
        removeColumnFromImportedFile,
        updateImportedFileData,
      }}
    >
      <div className="font-inter antialiased text-gray-900 bg-gray-100 min-h-screen flex flex-col">
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        {currentUser && currentPage !== "login" && <AppHeader />}
        <main
          className={`flex-grow ${
            currentUser && currentPage !== "login" ? "" : ""
          }`}
        >
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default MainApp;
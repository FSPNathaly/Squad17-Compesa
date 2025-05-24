import { ptBR } from 'date-fns/locale';
import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Filter,
  X,
  Download,
  ChevronDown,
  ChevronUp,
  Upload,
  Calendar,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import * as Papa from "papaparse";
import { jsPDF } from "jspdf";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { format } from "date-fns";

interface CsvData {
  Id: string;
  Municipios: string;
  VD: string;
  Perda: string;
  IPD: string;
  Observacao_GPD: string;
  Volume_Disponibilizado: string;
  Rateio: string;
  Volume_Produzido: string;
  Volume_de_agua_de_Servico: string;
  Consumo_Proprio: string;
  Limpeza_de_Reservatorio: string;
  Descarga_de_Rede: string;
  Consumo_Hidrante: string;
  Carro_Pipa_Nao_Faturado: string;
  Vsocial: string;
  Ligacoes_Ativas: string;
  Volume_Consumido: string;
  Localizacao_e_Contato: string;
  Diretoria: string;
  Gerencia: string;
  Coordenacao: string;
  Contato: string;
  [key: string]: string;
}

interface ReportData {
  month: string;
  year: string;
  data: CsvData[];
}

export const Planilha = () => {
  const dadosMunicipios = [
    {
      id: 1,
      municipio: "Abreu e Lima",
      vd: "-107.519,04",
      perda: "-383.953,04",
      ipd: "357,10%",
      volumeDisponibilizado: "-",
      rateio: "-",
      volumeProduzido: "-",
      consumoProprio: "334,32",
      limpezaReservatorio: "334,32",
      descargaRede: "13.504,50",
      consumoHidrante: "417,90",
      carroPipa: "-",
      vSocial: "92.928,00",
      ligacoesAtivas: "-",
      volumeConsumido: "276.434,00",
      diretoria: "DRM",
      gerencia: "GNM NORTE",
      coordenacao: "CRE IGARASSU",
      contato: "",
    },
    {
      id: 2,
      municipio: "Afogados da Ingazeira",
      vd: "-7.980,00",
      perda: "-152.203,00",
      ipd: "1907,31%",
      volumeDisponibilizado: "-",
      rateio: "-",
      volumeProduzido: "-",
      consumoProprio: "-",
      limpezaReservatorio: "-",
      descargaRede: "-",
      consumoHidrante: "-",
      carroPipa: "-",
      vSocial: "7.980,00",
      ligacoesAtivas: "-",
      volumeConsumido: "144.223,00",
      diretoria: "DRS",
      gerencia: "GNR ALTO DO PAJEU",
      coordenacao: "CRE AFOGADOS DA INGAZEIRA",
      contato: "",
    },
    {
      id: 57,
      municipio: "Fernando de Noronha",
      vd: "75.102,81",
      perda: "75.102,81",
      ipd: "100,00%",
      volumeDisponibilizado: "75.102,81",
      rateio: "-",
      volumeProduzido: "75.102,81",
      consumoProprio: "-",
      limpezaReservatorio: "-",
      descargaRede: "-",
      consumoHidrante: "-",
      carroPipa: "-",
      vSocial: "-",
      ligacoesAtivas: "1.114",
      volumeConsumido: "-",
      diretoria: "DRM",
      gerencia: "GNM NORONHA",
      coordenacao: "CRE GNR NORONHA",
      contato: "",
    },
    {
      id: 80,
      municipio: "Jaboatao dos Guararapes",
      vd: "1.462.307,15",
      perda: "1.462.307,15",
      ipd: "100,00%",
      volumeDisponibilizado: "1.323.281,81",
      rateio: "139.025,34",
      volumeProduzido: "1.462.307,15",
      consumoProprio: "-",
      limpezaReservatorio: "-",
      descargaRede: "-",
      consumoHidrante: "-",
      carroPipa: "-",
      vSocial: "-",
      ligacoesAtivas: "38.965",
      volumeConsumido: "-",
      diretoria: "DRM",
      gerencia: "GNM CENTRO SUL",
      coordenacao: "CRE JABOATAO",
      contato: "",
    },
    {
      id: 123,
      municipio: "Recife",
      vd: "2.018.768,66",
      perda: "2.018.768,66",
      ipd: "100,00%",
      volumeDisponibilizado: "1.744.838,32",
      rateio: "273.930,34",
      volumeProduzido: "2.018.768,66",
      consumoProprio: "-",
      limpezaReservatorio: "-",
      descargaRede: "-",
      consumoHidrante: "-",
      carroPipa: "-",
      vSocial: "-",
      ligacoesAtivas: "29.274",
      volumeConsumido: "-",
      diretoria: "DRM",
      gerencia: "",
      coordenacao: "",
      contato: "",
    },
  ];

  const totalVD = "3.438.878,48";
  const totalPerda = "3.018.221,48";
  const ipdMedio = "87,77%";
  const volumeProduzido = "3.556.178,62";

  return (
    <div className="min-h-screen bg-muted/40 p-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-4">
          <a href="/dashboard">
            <img
              src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
              alt="Compesa Logo"
              className="h-12"
            />
          </a>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-800">
              Análise de VD e Perdas Negativas
            </h2>
            <p className="text-sm text-muted-foreground">
              Dados atualizados em {date ? format(date, "MMM yyyy", { locale: ptBR }) : "Selecione o período"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage
                    src="https://github.com/shadcn.png"
                    alt="User Avatar"
                  />
                  <AvatarFallback>US</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">Usuário</span>
                  <span className="text-xs text-gray-500">usuario@compesa.com.br</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Configurações</DropdownMenuItem>
              <DropdownMenuItem className="text-red-500 focus:bg-red-50">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total VD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{totalVD}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Perda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{totalPerda}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              IPD Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">{ipdMedio}</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Volume Produzido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-800">
              {volumeProduzido}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Procurar município, diretoria ou gerência..."
            className="pl-10 bg-white border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="gap-2 bg-white border-gray-300"
            >
              <Filter className="h-4 w-4" />
              {filter === "all" ? "Todas as Categorias" : 
               filter === "vdNegative" ? "VD Negativo" :
               filter === "perdaNegative" ? "Perda Negativa" :
               filter === "ipdHigh" ? "IPD Alto" :
               filter === "diretoria" ? "Diretoria" :
               "Gerência"}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border-gray-200">
            <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("vdNegative")}
            >
              <span>VD Negativo</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("perdaNegative")}
            >
              <span>Perda Negativa</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("ipdHigh")}
            >
              <span>IPD Alto</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("diretoria")}
            >
              <span>Diretoria</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="flex items-center gap-2 hover:bg-gray-100"
              onClick={() => setFilter("gerencia")}
            >
              <span>Gerência</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          className="gap-2 bg-white border-gray-300"
          onClick={() => {
            setFilter("all");
            setSearchTerm("");
          }}
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>

      <div className="rounded-md border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px] text-gray-600 font-medium">
                ID
              </TableHead>
              <TableHead className="text-gray-600 font-medium">
                Município
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                VD
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                Perda
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                IPD
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                Volume Disp.
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                Rateio
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                Volume Prod.
              </TableHead>
              <TableHead className="text-right text-gray-600 font-medium">
                Ligações
              </TableHead>
              <TableHead className="text-gray-600 font-medium">
                Diretoria
              </TableHead>
              <TableHead className="text-gray-600 font-medium">
                Gerência
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dadosMunicipios.map((municipio) => (
              <TableRow key={municipio.id} className="hover:bg-gray-50">
                <TableCell className="font-medium text-gray-700">
                  {municipio.id}
                </TableCell>
                <TableCell className="text-gray-700">
                  {municipio.municipio}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    municipio.vd.startsWith("-")
                      ? "text-red-500 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {municipio.vd}
                </TableCell>
                <TableCell
                  className={`text-right ${
                    municipio.perda.startsWith("-")
                      ? "text-red-500 font-medium"
                      : "text-gray-700"
                  }`}
                >
                  {municipio.perda}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {municipio.ipd}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {municipio.volumeDisponibilizado}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {municipio.rateio}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {municipio.volumeProduzido}
                </TableCell>
                <TableCell className="text-right text-gray-700">
                  {municipio.ligacoesAtivas}
                </TableCell>
                <TableCell className="text-gray-700">
                  {municipio.diretoria}
                </TableCell>
                <TableCell className="text-gray-700">
                  {municipio.gerencia}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between px-2 mt-4 gap-4">
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium text-gray-700">1</span> a{" "}
          <span className="font-medium text-gray-700">6</span> de{" "}
          <span className="font-medium text-gray-700">174</span> resultados
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="border-gray-300">
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-300 bg-blue-50 text-blue-600"
          >
            1
          </Button>
          <Button variant="outline" size="sm" className="border-gray-300">
            2
          </Button>
          <Button variant="outline" size="sm" className="border-gray-300">
            3
          </Button>
          <Button variant="outline" size="sm" className="border-gray-300">
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};
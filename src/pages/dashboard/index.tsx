import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Download,
  Droplet,
  Map,
  Users,
  TrendingUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Dashboard = () => {
  const perdaAnualData = [
    { name: "2017", value: 0.5 },
    { name: "2018", value: 0.4 },
    { name: "2019", value: 0.3 },
    { name: "2020", value: 0.2 },
    { name: "2021", value: 0.2 },
    { name: "2022", value: 0.1 },
  ];

  const gastosMunicipiosData = [
    { name: "Jaboatão", manutencoes: 5, valor: 100000 },
    { name: "Recife", manutencoes: 10, valor: 200000 },
    { name: "Paulista", manutencoes: 34, valor: 650000 },
    { name: "Olinda", manutencoes: 21, valor: 340000 },
    { name: "Camaragibe", manutencoes: 2, valor: 80000 },
  ];

  const perdasMunicipioData = [
    {
      name: "Jaboatão",
      "Gerência de manutenção": 400,
      "Falta de água": 800,
      "Sem acesso a água": 1200,
    },
    {
      name: "Olinda",
      "Gerência de manutenção": 300,
      "Falta de água": 900,
      "Sem acesso a água": 600,
    },
    {
      name: "Recife",
      "Gerência de manutenção": 500,
      "Falta de água": 1000,
      "Sem acesso a água": 1500,
    },
    {
      name: "Paulista",
      "Gerência de manutenção": 200,
      "Falta de água": 700,
      "Sem acesso a água": 1100,
    },
  ];

  const volumeTotalData = [
    { name: "Volume total d'água", value: 60 },
    { name: "Gastos totais d'água", value: 10 },
    { name: "Outros", value: 30 },
  ];

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <header className="flex justify-between items-center mb-8">
        <img
          src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
          alt="Compesa Logo"
          className="h-15"
        />
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none">
            <Avatar className="w-12 h-12">
              <AvatarImage
                src="https://github.com/shadcn.png"
                alt="User Avatar"
              />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Perfil</DropdownMenuItem>
            <DropdownMenuItem>Configurações</DropdownMenuItem>
            <DropdownMenuItem>Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button className="h-16 gap-2 text-lg bg-[#003F9C] hover:bg-[#002b6d] text-white">
          <Download className="size-6" />
          Download Relatório
        </Button>

        <Button className="h-16 gap-2 text-lg bg-[#003F9C] hover:bg-[#002b6d] text-white">
          <Droplet className="size-6" />
          Gastos Totais
        </Button>

        <Button className="h-16 gap-2 text-lg bg-[#003F9C] hover:bg-[#002b6d] text-white">
          <Users className="size-6" />
          Água de Serviço
        </Button>

        <Button className="h-16 gap-2 text-lg bg-[#003F9C] hover:bg-[#002b6d] text-white">
          <Map className="size-6" />
          Municípios
        </Button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perda Anual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perdaAnualData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis unit="Mh" stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f9fafb",
                      borderColor: "#e5e7eb",
                      borderRadius: "0.5rem",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="value" fill="#003F9C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-4">
              {perdaAnualData.slice(0, 4).map((item) => (
                <div key={item.name} className="text-center">
                  <p className="font-bold text-[#003F9C]">{item.value}Mh</p>
                  <p className="text-sm text-gray-500">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gastos por municípios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {gastosMunicipiosData.map((municipio) => (
                <div
                  key={municipio.name}
                  className="border-b border-gray-200 pb-2 last:border-b-0"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {municipio.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {municipio.manutencoes} Manutenções
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-bold text-[#003F9C]">
                      R$ {municipio.valor.toLocaleString()}
                    </span>
                    {municipio.valor > 200000 ? (
                      <span className="text-red-500 text-sm flex items-center">
                        <ArrowUp className="h-4 w-4" /> Alto
                      </span>
                    ) : (
                      <span className="text-green-500 text-sm flex items-center">
                        <ArrowDown className="h-4 w-4" /> Baixo
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Perdas por município</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perdasMunicipioData} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f9fafb",
                      borderColor: "#e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: "20px",
                    }}
                  />
                  <Bar
                    dataKey="Gerência de manutenção"
                    stackId="a"
                    fill="#003F9C"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Falta de água"
                    stackId="a"
                    fill="#5D8BF4"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Sem acesso a água"
                    stackId="a"
                    fill="#85A6F2"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Volume Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={volumeTotalData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    <Cell fill="#003F9C" />
                    <Cell fill="#5D8BF4" />
                    <Cell fill="#85A6F2" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#f9fafb",
                      borderColor: "#e5e7eb",
                      borderRadius: "0.5rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-2 bg-[#003F9C]" />
                <span className="text-sm">Volume total d'água: 60%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-2 bg-[#5D8BF4]" />
                <span className="text-sm">Gastos totais d'água: 10%</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full mr-2 bg-[#85A6F2]" />
                <span className="text-sm">Outros: 30%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

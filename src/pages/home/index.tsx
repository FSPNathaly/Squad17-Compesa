import { useState } from 'react';

export const Home = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [keepConnected, setKeepConnected] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ username, password, keepConnected });
  };

  return (
    <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-md">
        <div className="bg-[#003F9C] py-4 px-6 flex justify-center">
          <img 
            src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" 
            alt="COMPESA Logo" 
            className="h-12 object-contain"
          />
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#1A2C56] mb-1">
                Usuário
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-[#85A6F2] rounded-md text-[#1A2C56] focus:outline-none focus:ring-2 focus:ring-[#003F9C] focus:border-transparent"
                placeholder="Digite seu usuário"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1A2C56] mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-[#85A6F2] rounded-md text-[#1A2C56] focus:outline-none focus:ring-2 focus:ring-[#003F9C] focus:border-transparent"
                placeholder="Digite sua senha"
                required
              />
            </div>

            <div className="flex items-center">
              <input
                id="keepConnected"
                type="checkbox"
                checked={keepConnected}
                onChange={(e) => setKeepConnected(e.target.checked)}
                className="h-4 w-4 text-[#003F9C] focus:ring-[#003F9C] border-[#85A6F2] rounded"
              />
              <label htmlFor="keepConnected" className="ml-2 block text-sm text-[#1A2C56]">
                Manter-me conectado
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#003F9C] hover:bg-[#002b6d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003F9C] transition-colors"
          >
            Entrar
          </button>

          <div className="text-center">
            <a href="#" className="text-sm text-[#003F9C] hover:text-[#002b6d]">
              Esqueceu sua senha?
            </a>
          </div>
        </form>

        <div className="bg-[#F0F5FF] px-6 py-4 text-center">
          <p className="text-xs text-[#5D8BF4]">
            © {new Date().getFullYear()} COMPESA - Companhia Pernambucana de Saneamento
          </p>
        </div>
      </div>
    </div>
  );
};
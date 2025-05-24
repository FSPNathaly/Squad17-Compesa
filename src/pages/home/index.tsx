import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    keepConnected: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F0F5FF] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden w-full max-w-md">
        <Header />
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <InputField
              id="username"
              label="Usuário"
              type="text"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Digite seu usuário"
              required
            />
            
            <InputField
              id="password"
              label="Senha"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Digite sua senha"
              required
            />
            
            <CheckboxField
              id="keepConnected"
              label="Manter-me conectado"
              checked={formData.keepConnected}
              onChange={handleInputChange}
            />
          </div>

          <SubmitButton />
          
          <ForgotPasswordLink />
        </form>

        <Footer />
      </div>
    </div>
  );
};

const Header = () => (
  <div className="bg-white py-4 px-6 flex justify-center border-b border-[#85A6F2]">
    <img 
      src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" 
      alt="COMPESA Logo" 
      className="h-12 object-contain"
    />
  </div>
);

const InputField = ({ id, label, type, value, onChange, placeholder, required }: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  required?: boolean;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[#1A2C56] mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2 border border-[#85A6F2] rounded-md text-[#1A2C56] focus:outline-none focus:ring-2 focus:ring-[#003F9C] focus:border-transparent"
      placeholder={placeholder}
      required={required}
    />
  </div>
);

const CheckboxField = ({ id, label, checked, onChange }: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) => (
  <div className="flex items-center">
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="h-4 w-4 text-[#003F9C] focus:ring-[#003F9C] border-[#85A6F2] rounded"
    />
    <label htmlFor={id} className="ml-2 block text-sm text-[#1A2C56]">
      {label}
    </label>
  </div>
);

const SubmitButton = () => (
  <button
    type="submit"
    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#003F9C] hover:bg-[#002b6d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003F9C] transition-colors"
  >
    Entrar
  </button>
);

const ForgotPasswordLink = () => (
  <div className="text-center">
    <a href="#" className="text-sm text-[#003F9C] hover:text-[#002b6d]">
      Esqueceu sua senha?
    </a>
  </div>
);

const Footer = () => (
  <div className="bg-[#F0F5FF] px-6 py-4 text-center">
    <p className="text-xs text-[#5D8BF4]">
      © {new Date().getFullYear()} COMPESA - Companhia Pernambucana de Saneamento
    </p>
  </div>
);
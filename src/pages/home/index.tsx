import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HomeProps {
  onLogin: () => void;
}

export const Home = ({ onLogin }: HomeProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username && password) {
      onLogin();
    } else {
      alert("Por favor, preencha usuário e senha.");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#F0F5FF] p-4">
      <form 
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md flex flex-col items-center gap-6"
      >
        <img
          src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
          alt="Logo da Compesa"
          className="h-16 mb-4"
        />

        <Input
          type="text"
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border-gray-300 focus:border-[#003F9C] focus:ring-1 focus:ring-[#003F9C] placeholder:text-gray-500"
          autoComplete="username"
        />

        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-gray-300 focus:border-[#003F9C] focus:ring-1 focus:ring-[#003F9C] placeholder:text-gray-500"
          autoComplete="current-password"
        />

        <div className="flex items-center w-full text-sm text-[#1A2C56] justify-start">
          <input
            type="checkbox"
            id="conectado"
            className="accent-[#003F9C] mr-2 h-4 w-4"
          />
          <label htmlFor="conectado">Manter-me conectado</label>
        </div>

        <Button
          type="submit"
          className="mt-4 w-full bg-[#003F9C] text-white hover:bg-[#00337A] transition"
        >
          Entrar
        </Button>
      </form>
    </main>
  );
};
import React, { useState } from 'react';
import { useAppContext } from '../../App';

const LoginPage: React.FC = () => {
    const { setCurrentUser, showToast, setIsLoading, navigateTo } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (!email.includes('@compesa.com.br')) {
            showToast("O e-mail deve pertencer ao domínio @compesa.com.br.", 'error');
            setIsLoading(false);
            return;
        }

        if (password.length <= 8) {
            showToast("A senha deve ter mais de 8 caracteres.", 'error');
            setIsLoading(false);
            return;
        }

        setTimeout(() => {
            const userName = email.split('@')[0];
            setCurrentUser({
                email: email,
                displayName: userName.charAt(0).toUpperCase() + userName.slice(1)
            });
            showToast("Login bem-sucedido!", 'success');
            navigateTo('dashboard', true);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <img src={`https://placehold.co/150x60/007BFF/FFFFFF?text=COMPESA&font=Inter`} alt="Logo Compesa" className="h-12 rounded" />
                </div>
                <h2 className="text-2xl font-bold text-center text-gray-700 mb-8">
                    Plataforma de Análise Hídrica
                </h2>

                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor="email">E-mail</label>
                        <input
                            type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required placeholder="seu.email@compesa.com.br"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-600 mb-1" htmlFor="password">Senha</label>
                        <input
                            type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            required placeholder="********"
                        />
                        <p className="text-xs text-gray-500 mt-1">Deve ter mais de 8 caracteres.</p>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                        Entrar
                    </button>
                </form>
                <p className="text-xs text-gray-500 mt-6 text-center">
                    Acesso restrito a usuários autorizados.
                </p>
            </div>
        </div>
    );
};
export default LoginPage;
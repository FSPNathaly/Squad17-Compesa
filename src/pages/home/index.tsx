import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../App';

const Button = ({ children, onClick, className = '', variant = 'default', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, variant?: string, disabled?: boolean}) => {
    let baseStyle = 'px-4 py-2 rounded-md transition-colors duration-200 flex items-center justify-center';
    if (variant === 'default') baseStyle += ' bg-blue-600 text-white hover:bg-blue-700';
    else if (variant === 'outline') baseStyle += ' border border-gray-300 text-gray-700 hover:bg-gray-100';
    else if (variant === 'destructive') baseStyle += ' bg-red-600 text-white hover:bg-red-700';
    else if (variant === 'ghost') baseStyle += ' text-gray-700 hover:bg-gray-100';
    if (disabled) baseStyle += ' opacity-50 cursor-not-allowed';
    return (<button onClick={onClick} className={`${baseStyle} ${className}`} disabled={disabled}>{children}</button>);
};

const Input = ({ placeholder, type = 'text', value, onChange, className = '', icon: IconComponent }: { placeholder?: string, type?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string, icon?: React.ElementType }) => (
    <div className="relative flex items-center w-full">
        {IconComponent && <IconComponent className="absolute left-3 text-gray-400" width={20} height={20} />}
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={`flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${IconComponent ? 'pl-10' : ''} ${className}`}
        />
    </div>
);

const Checkbox = ({ id, label, checked, onChange, className = '' }: { id: string, label: string, checked: boolean, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, className?: string }) => (
    <div className={`flex items-center ${className}`}>
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor={id} className="ml-2 block text-sm text-gray-900">
            {label}
        </label>
    </div>
);

const Mail = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
);

const Lock = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.06 18.06 0 0 1 5.36-5.06M19.72 19.72A10 10 0 0 0 22 12c0-7-3-7-10-7a18.06 18.06 0 0 0-5.06 5.36" />
        <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
);


const HomePage = () => {
    const appContext = useContext(AppContext);
    if (!appContext) throw new Error("AppContext not found");
    const { setIsLoggedIn } = appContext;

    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const emailRegex = new RegExp(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (e.target.value && !emailRegex.test(e.target.value)) {
            setEmailError('Por favor, insira um email válido.');
        } else {
            setEmailError('');
        }
    };

    const handleLogin = () => {
        if (!email || !password) {
            alert('Por favor, preencha todos os campos.');
            return;
        }
        if (emailError) {
            alert('Por favor, corrija os erros do formulário.');
            return;
        }
        setIsLoading(true);
        setTimeout(() => {
            if (setIsLoggedIn) setIsLoggedIn(true);
            setIsLoading(false);
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#2C3E50] to-[#3498DB] p-4">
            <div className="flex w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="w-full md:w-1/2 p-8 flex flex-col items-center justify-center">
                    <img src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png" alt="Compesa Logo" className="mb-8 h-[70px] md:h-[80px]" />
                    <div className="w-full max-w-sm space-y-4">
                        <div>
                            <Input
                                placeholder="email@compesa.com.br"
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                icon={Mail}
                            />
                            {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                        </div>
                        <div className="relative">
                            <Input
                                placeholder="••••••••"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={Lock}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOffIcon width={20} height={20} /> : <EyeIcon width={20} height={20} />}
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <Checkbox
                                id="remember-me"
                                label="Lembrar acesso"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <a href="#" className="text-sm text-blue-600 hover:underline">Esqueci minha senha</a>
                        </div>
                        <Button onClick={handleLogin} className="w-full" disabled={isLoading || !!emailError}>
                            {isLoading ? 'Acessando...' : 'Acessar'}
                        </Button>
                    </div>
                </div>
                <div className="hidden md:flex w-1/2 bg-blue-600 items-center justify-center p-8">
                    <div className="text-white text-center">
                        <h3 className="text-3xl font-bold mb-4">Bem-vindo ao Sistema Hídrico</h3>
                        <p className="text-lg">Monitore e analise os dados de distribuição e perda de água com precisão.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
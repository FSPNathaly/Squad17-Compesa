import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export const Home = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(email)) {
      setEmailError("Formato de email inválido");
      return false;
    }
    if (!email.endsWith('@compesa.com.br')) {
      setEmailError("Use seu email corporativo");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      setPasswordError("Mínimo 8 caracteres");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (attempts < 2) {
      navigate("/dashboard");
    } else {
      setAttempts(attempts + 1);
      setIsBlocked(true);
      setTimeout(() => setIsBlocked(false), 30000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#2C3E50] to-[#3498DB] relative overflow-hidden">
      <div className="absolute inset-0 opacity-5" />
      
      <Card className="w-full max-w-md mx-4 p-8 bg-white shadow-xl rounded-xl">
        <div className="flex flex-col items-center mb-10">
          <img
            src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
            alt="Compesa Logo"
            className="h-28 object-contain"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <div>
              <div className={`relative ${emailError ? "mb-1" : ""}`}>
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${emailError ? "text-destructive" : "text-muted-foreground"}`} />
                <Input
                  ref={emailRef}
                  type="email"
                  placeholder="email@compesa.com.br"
                  className={`pl-10 pr-4 py-5 text-base ${emailError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) validateEmail(e.target.value);
                  }}
                  onBlur={() => validateEmail(email)}
                />
              </div>
              {emailError && (
                <p className="text-sm text-destructive flex items-start gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{emailError}</span>
                </p>
              )}
            </div>

            <div>
              <div className={`relative ${passwordError ? "mb-1" : ""}`}>
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${passwordError ? "text-destructive" : "text-muted-foreground"}`} />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className={`pl-10 pr-10 py-5 text-base ${passwordError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${passwordError ? "text-destructive" : "text-muted-foreground"} hover:text-primary`}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive flex items-start gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              className="text-xs text-[#7F8C8D] hover:text-[#3498DB] hover:underline transition-colors"
            >
              Esqueci minha senha
            </button>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#3498DB] hover:bg-[#2980B9] text-white font-medium transition-all hover:scale-[1.01] active:scale-95"
            disabled={loading || isBlocked || !!emailError || !!passwordError || !email || !password}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Acessando...</span>
              </div>
            ) : isBlocked ? (
              "Tente novamente em 30s"
            ) : (
              "Acessar"
            )}
          </Button>
        </form>

        {isBlocked && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">Muitas tentativas falhas. Por favor, aguarde 30 segundos.</span>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-[#7F8C8D]">
          © {new Date().getFullYear()} Compesa. Todos os direitos reservados.
        </div>
      </Card>
    </div>
  );
};
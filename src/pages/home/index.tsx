import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export const Home = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validateField = (name: string, value: string) => {
    let error = "";
    
    if (name === "email") {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(value)) {
        error = "Formato de email inválido";
      } else if (!value.endsWith('@compesa.com.br')) {
        error = "Use seu email corporativo";
      }
    }

    if (name === "password" && value.length < 8) {
      error = "Mínimo 8 caracteres";
    }

    setErrors(prev => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) return;

    const isEmailValid = validateField("email", formData.email);
    const isPasswordValid = validateField("password", formData.password);
    if (!isEmailValid || !isPasswordValid) return;

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        navigate("/dashboard");
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts >= 3) {
          setIsBlocked(true);
          setTimeout(() => setIsBlocked(false), 30000);
        }
      }
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      !loading &&
      !isBlocked &&
      formData.email &&
      formData.password &&
      !errors.email &&
      !errors.password
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#2C3E50] to-[#3498DB]">
      <Card className="w-full max-w-md mx-4 p-8 bg-white shadow-xl rounded-xl">
        <div className="flex flex-col items-center mb-10">
          <img
            src="https://servicos.compesa.com.br/wp-content/uploads/2022/07/compesa-h.png"
            alt="Compesa Logo"
            className="h-28 object-contain"
            loading="lazy"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-4">
            <div>
              <div className={`relative ${errors.email ? "mb-1" : ""}`}>
                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${errors.email ? "text-destructive" : "text-muted-foreground"}`} />
                <Input
                  ref={emailRef}
                  type="email"
                  name="email"
                  placeholder="email@compesa.com.br"
                  className={`pl-10 pr-4 py-5 text-base ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading || isBlocked}
                  aria-invalid={!!errors.email}
                  aria-describedby="email-error"
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive flex items-start gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            <div>
              <div className={`relative ${errors.password ? "mb-1" : ""}`}>
                <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${errors.password ? "text-destructive" : "text-muted-foreground"}`} />
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  className={`pl-10 pr-10 py-5 text-base ${errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  disabled={loading || isBlocked}
                  aria-invalid={!!errors.password}
                  aria-describedby="password-error"
                />
                <button
                  type="button"
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${errors.password ? "text-destructive" : "text-muted-foreground"} hover:text-primary`}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading || isBlocked}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive flex items-start gap-1 mt-1">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <a
              href="/forgot-password"
              className="text-xs text-[#7F8C8D] hover:text-[#3498DB] hover:underline transition-colors"
            >
              Esqueci minha senha
            </a>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#3498DB] hover:bg-[#2980B9] text-white font-medium transition-all hover:scale-[1.01] active:scale-95"
            disabled={!isFormValid()}
            aria-busy={loading}
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
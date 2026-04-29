import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Shield, ArrowRight, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const ok = await login(email, password);
    if (!ok) {
      setError("Invalid email or password");
      return;
    }

    const saved = JSON.parse(localStorage.getItem("fedmed-auth") || "{}");
    if (saved?.user?.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-accent/10" />
        <div className="absolute -bottom-48 -right-24 w-[500px] h-[500px] rounded-full bg-primary/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
                <path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary-foreground">FedMed AI</h2>
              <p className="text-sm text-primary-foreground/60">Federated Learning Platform</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground leading-tight mb-6">
            Collaborative Rare Disease
            <br />
            Diagnosis
          </h1>
          <p className="text-primary-foreground/70 text-lg mb-10 max-w-md">
            Securely share insights across hospitals using federated learning — patient data never leaves your institution.
          </p>
          <ul className="space-y-4">
            {["Privacy-preserving AI", "Cross-institutional learning", "Rare disease specialization", "Training analytics & admin controls"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <span className="text-primary-foreground/80">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 bg-background">
        <Card className="w-full max-w-md shadow-elevated border-0">
          <CardContent className="pt-8 pb-6 px-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Hospital Login</h2>
            <p className="text-sm text-muted-foreground mb-6">Sign in with your institutional credentials</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Hospital Email</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="hospital mail" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input id="password" type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full gradient-primary text-primary-foreground h-11 text-base" disabled={isLoading}>
                {isLoading ? "Connecting…" : <>Sign In <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

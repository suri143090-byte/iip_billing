import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const INDUSTRIAL_BG =
  "https://images.unsplash.com/photo-1496247749665-49cf5b1022e9?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden lg:flex relative bg-[#0F172A] text-white flex-col justify-between p-12 overflow-hidden">
        <img
          src={INDUSTRIAL_BG}
          alt="industrial"
          className="absolute inset-0 w-full h-full object-cover opacity-25"
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-iip-blue flex items-center justify-center font-heading font-bold text-xl">
            IIP
          </div>
          <div>
            <p className="font-heading font-bold text-lg leading-tight">IIP Billing Pro</p>
            <p className="text-xs tracking-widest text-iip-orange font-semibold uppercase">
              Indian Industrial Products
            </p>
          </div>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-heading text-4xl font-bold leading-tight">
            GST Billing &amp; Invoicing, <span className="text-iip-orange">simplified.</span>
          </h1>
          <p className="mt-4 text-slate-300">
            Create professional GST invoices, manage customers and products, track payments,
            and download print-ready PDFs — built for Indian businesses.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-400">
          www.indianindustrialproducts.com
        </p>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-background">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-10 w-10 rounded-xl bg-iip-blue flex items-center justify-center font-heading font-bold text-white">
              IIP
            </div>
            <span className="font-heading font-bold text-lg text-[#0F172A]">Billing Pro</span>
          </div>
          <h2 className="font-heading text-3xl font-bold text-[#0F172A]">Sign in</h2>
          <p className="text-muted-foreground mt-1 text-sm">Welcome back. Enter your details.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                data-testid="login-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                data-testid="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p data-testid="login-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              data-testid="login-submit"
              disabled={loading}
              className="w-full bg-iip-blue hover:bg-[#1E3A8A] h-11"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Sign in <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>
          </form>

          <p className="mt-6 text-sm text-center text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="text-iip-blue font-semibold hover:underline" data-testid="goto-register">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

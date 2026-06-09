import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { formatApiErrorDetail } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", company_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      toast.success("Account created!");
      navigate("/");
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="h-11 w-11 rounded-xl bg-iip-blue flex items-center justify-center font-heading font-bold text-white text-lg">
            IIP
          </div>
          <span className="font-heading font-bold text-xl text-[#0F172A]">Billing Pro</span>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-7">
          <h2 className="font-heading text-2xl font-bold text-[#0F172A]">Create your account</h2>
          <p className="text-muted-foreground mt-1 text-sm">Start billing in minutes — free plan included.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" data-testid="register-name" value={form.name} onChange={set("name")} placeholder="Ramesh Kumar" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Company name</Label>
              <Input id="company" data-testid="register-company" value={form.company_name} onChange={set("company_name")} placeholder="Indian Industrial Products" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" data-testid="register-email" value={form.email} onChange={set("email")} placeholder="you@company.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" data-testid="register-password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" required minLength={6} />
            </div>
            {error && <p data-testid="register-error" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" data-testid="register-submit" disabled={loading} className="w-full bg-iip-blue hover:bg-[#1E3A8A] h-11">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Create account <ArrowRight className="ml-1 h-4 w-4" /></>)}
            </Button>
          </form>
          <p className="mt-6 text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-iip-blue font-semibold hover:underline" data-testid="goto-login">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import Products from "@/pages/Products";
import DocumentsPage from "@/pages/DocumentsPage";
import DocumentForm from "@/pages/DocumentForm";
import DocumentView from "@/pages/DocumentView";
import Settings from "@/pages/Settings";
import Plans from "@/pages/Plans";
import More from "@/pages/More";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<DocumentsPage docType="invoice" />} />
                <Route path="/quotations" element={<DocumentsPage docType="quotation" />} />
                <Route path="/proforma" element={<DocumentsPage docType="proforma" />} />
                <Route path="/documents/:docType/new" element={<DocumentForm />} />
                <Route path="/documents/:docType/:id/edit" element={<DocumentForm />} />
                <Route path="/documents/:id" element={<DocumentView />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/more" element={<More />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;

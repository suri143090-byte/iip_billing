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
import Expenses from "@/pages/Expenses";
import Inventory from "@/pages/Inventory";
import Suppliers from "@/pages/Suppliers";
import Admin from "@/pages/Admin";

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
                <Route path="/purchase-orders" element={<DocumentsPage docType="purchase_order" />} />
                <Route path="/delivery-challans" element={<DocumentsPage docType="delivery_challan" />} />
                <Route path="/credit-notes" element={<DocumentsPage docType="credit_note" />} />
                <Route path="/documents/:docType/new" element={<DocumentForm />} />
                <Route path="/documents/:docType/:id/edit" element={<DocumentForm />} />
                <Route path="/documents/:id" element={<DocumentView />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/admin" element={<Admin />} />
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

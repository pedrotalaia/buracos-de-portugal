import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Stats from "./pages/Stats";
import Sobre from "./pages/Sobre";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <nav className="w-full flex justify-center gap-4 py-4 border-b mb-4 bg-background/80 sticky top-0 z-20">
            <NavLink to="/" className="font-semibold" activeClassName="underline">Início</NavLink>
            <NavLink to="/stats" className="font-semibold" activeClassName="underline">Estatísticas</NavLink>
            <NavLink to="/sobre" className="font-semibold" activeClassName="underline">Sobre</NavLink>
          </nav>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/verify" element={<Auth />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

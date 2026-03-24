import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./components/admin/AdminLayout";
import { useAuth } from "./context/AuthContext";

// User Views
import Dashboard from "./routes/Dashboard";
import Discovery from "./routes/Discovery";
import EventDetails from "./routes/EventDetails";
import Checkout from "./routes/Checkout";
import MyTickets from "./routes/MyTickets";
import TicketPass from "./routes/TicketPass";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import NotFound from "./routes/NotFound";

// Admin Views
import DashboardAdmin from "./routes/admin/DashboardAdmin";
import EventsAdmin from "./routes/admin/EventsAdmin";
import PurchasesAdmin from "./routes/admin/PurchasesAdmin";
import UsersAdmin from "./routes/admin/UsersAdmin";

function ProtectedRoute({ children, allowRole }: { children: React.ReactNode, allowRole?: "root" }) {
  const { isAuthed, isLoading, user } = useAuth();

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Cargando...</div>;
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (allowRole === "root" && user?.role !== "root") return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      
      {/* Consumer Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="discovery" element={<Discovery />} />
        <Route path="event/:id" element={<EventDetails />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="my-tickets" element={<MyTickets />} />
        <Route path="my-tickets/:ticketId" element={<TicketPass />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRole="root">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardAdmin />} />
        <Route path="events" element={<EventsAdmin />} />
        <Route path="purchases" element={<PurchasesAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;

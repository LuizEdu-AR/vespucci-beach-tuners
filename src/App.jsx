import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import ProtectedRoute from './components/ProtectedRoute'
import AccessRoute from './components/AccessRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import HomePage from './pages/HomePage'
import HierarchyPage from './pages/HierarchyPage'
import PricesPage from './pages/PricesPage'
import CalculatorPage from './pages/CalculatorPage'
import HistoryPage from './pages/HistoryPage'
import NoticesPage from './pages/NoticesPage'
import ProfilePage from './pages/ProfilePage'
import ClientsPage from './pages/ClientsPage'
import './App.css'

export default function App(){return <BrowserRouter><UIProvider><AuthProvider><Routes>
  <Route path="/login" element={<LoginPage/>}/>
  <Route path="/cadastro" element={<RegisterPage/>}/>
  <Route element={<ProtectedRoute/>}><Route element={<Layout/>}>
    <Route path="/hierarquia" element={<HierarchyPage/>}/>
    <Route path="/precos" element={<PricesPage/>}/>
    <Route path="/perfil" element={<ProfilePage/>}/>
    <Route element={<AccessRoute minimumRole="Jovem Aprendiz"/>}>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/calculadora" element={<CalculatorPage/>}/>
      <Route path="/historico" element={<HistoryPage/>}/>
      <Route path="/avisos" element={<NoticesPage/>}/>
    </Route>
    <Route element={<AccessRoute minimumRole="Gerente"/>}><Route path="/clientes" element={<ClientsPage/>}/></Route>
  </Route></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
</Routes></AuthProvider></UIProvider></BrowserRouter>}

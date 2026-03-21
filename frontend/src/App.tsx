import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Login from './pages/Login'
import Mfa from './pages/Mfa'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import AIHelpAssistant from './components/AIHelpAssistant'
import Dashboard from './pages/Dashboard'
import PatientDashboard from './pages/PatientDashboard'
import RegisterPatient from './pages/RegisterPatient'
import Encounters from './pages/Encounters'
import Laboratory from './pages/Laboratory'
import Pharmacy from './pages/Pharmacy'
import Wards from './pages/Wards';
import WardDetails from './pages/WardDetails';
import ICUMonitoring from './pages/ICU'; 
import UserManagement from './pages/UserManagement'
import Settings from './pages/Settings'
import PatientDetail from './pages/PatientDetail'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import ConsultationForm from './pages/ConsultationForm'
import NurseDashboard from './pages/NurseDashboard'
import Billing from './pages/Billing'
import Admissions from './pages/Admissions'
import PriceManagement from './pages/PriceManagement'
import FundsStatistics from './pages/FundsStatistics'
import Insurance from './pages/Insurance'
import EmbeddedResource from './pages/EmbeddedResource'
import AuditLogs from './pages/AuditLogs'

const AdmissionWrapper = () => {
    const { id } = useParams();
    return id ? <ICUMonitoring /> : <Admissions />;
};

const WardWrapper = () => {
    const { id } = useParams();
    return id ? <WardDetails /> : <Wards />;
};

function App() {
    return (
        <Router>
            <AIHelpAssistant />
            <Routes>
                {/* Public Routes */}
                <Route path="/login" element={
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
                        <Login />
                    </div>
                } />
                <Route path="/mfa" element={
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
                        <Mfa />
                    </div>
                } />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/patients" element={<PatientDashboard />} />
                        <Route path="/patients/register" element={<RegisterPatient />} />
                        <Route path="/patients/edit/:id" element={<RegisterPatient />} />
                        <Route path="/patients/:id" element={<PatientDetail />} />
                        <Route path="/encounters" element={<Encounters />} />
                        <Route path="/appointments" element={<Appointments />} />
                        <Route path="/consultations" element={<Consultations />} />
                        <Route path="/consultations/:id" element={<ConsultationForm />} />
                        
                        {/* Admissions & Monitoring */}
                        <Route path="/admissions" element={<AdmissionWrapper />} />
                        <Route path="/admissions/:id" element={<AdmissionWrapper />} />
                        
                        {/* Wards & Bed Management */}
                        <Route path="/wards" element={<WardWrapper />} />
                        <Route path="/wards/:id" element={<WardWrapper />} />

                        <Route path="/nursing" element={<NurseDashboard />} />
                        <Route path="/labs" element={<Laboratory />} />
                        <Route path="/pharmacy" element={<Pharmacy />} />
                        
                        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'billing_officer', 'receptionist']} />}>
                            <Route path="/billing" element={<Billing />} />
                        </Route>

                        <Route path="/icu" element={<ICUMonitoring />} />
                        
                        <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
                            <Route path="/admin/prices" element={<PriceManagement />} />
                            <Route path="/admin/funds" element={<FundsStatistics />} />
                            <Route path="/admin/users" element={<UserManagement />} />
                            <Route path="/admin/logs" element={<AuditLogs />} />
                        </Route>

                        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'billing_officer']} />}>
                            <Route path="/insurance" element={<Insurance />} />
                        </Route>

                        {/* External Resources embedded */}
                        <Route element={<ProtectedRoute allowedRoles={['super_admin', 'doctor', 'pharmacist']} />}>
                            <Route path="/resources/calc" element={<EmbeddedResource />} />
                            <Route path="/resources/emdex" element={<EmbeddedResource />} />
                        </Route>

                        <Route path="/settings" element={<Settings />} />
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Route>
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </Router>
    )
}

export default App

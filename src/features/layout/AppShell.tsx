import './layout.css'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useUiStore } from '../../store/useUiStore'
import { HomePage } from '../home/HomePage'
import { DashboardPage } from '../dashboard/DashboardPage'
import { EntryPage } from '../entry/EntryPage'
import { SheetsPage } from '../sheets/SheetsPage'
import { ProjectsPage } from '../projects/ProjectsPage'
import { MastersPage } from '../masters/MastersPage'
import { ReportsPage } from '../reports/ReportsPage'
import { AdminPage } from '../admin/AdminPage'

export function AppShell() {
  const route = useUiStore((s) => s.route)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <main className="content">
          {route === 'home' && <HomePage />}
          {route === 'dashboard' && <DashboardPage />}
          {route === 'entry' && <EntryPage />}
          {route === 'sheets' && <SheetsPage />}
          {route === 'projects' && <ProjectsPage />}
          {route === 'masters' && <MastersPage />}
          {route === 'reports' && <ReportsPage />}
          {route === 'admin' && <AdminPage />}
        </main>
      </div>
    </div>
  )
}

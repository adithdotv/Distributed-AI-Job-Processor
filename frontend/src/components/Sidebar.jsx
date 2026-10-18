import { Layers, LayoutDashboard, ListChecks, Settings, Workflow } from 'lucide-react'

const NAVIGATION_ITEMS = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard },
  { page: 'jobs', label: 'Jobs', icon: ListChecks },
  { page: 'batches', label: 'Batches', icon: Layers },
  { page: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar({ currentPage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <Workflow aria-hidden="true" />
        <span>Distributed AI Job Processor</span>
      </div>
      <nav aria-label="Main navigation">
        <ul>
          {NAVIGATION_ITEMS.map(({ page, label, icon: Icon }) => (
            <li key={page}>
              <a
                href={`#/${page}`}
                className={page === currentPage ? 'nav-link nav-link-active' : 'nav-link'}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

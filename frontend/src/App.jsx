import { useEffect, useRef } from 'react'
import { Sidebar } from './components/Sidebar'
import { ToastProvider } from './components/toast/ToastProvider'
import { useHashRoute } from './hooks/useHashRoute'
import { BatchesPage } from './pages/BatchesPage'
import { JobsPage } from './pages/JobsPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'

const APP_TITLE = 'Distributed AI Job Processor'

const PAGE_TITLES = {
  overview: 'Overview',
  jobs: 'Jobs',
  batches: 'Batches',
  settings: 'Settings',
}

function CurrentPage({ page, param }) {
  switch (page) {
    case 'jobs':
      return <JobsPage />
    case 'batches':
      return <BatchesPage selectedBatchId={param} />
    case 'settings':
      return <SettingsPage />
    default:
      return <OverviewPage />
  }
}

export default function App() {
  const { page, param } = useHashRoute()
  const mainRef = useRef(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    document.title = `${PAGE_TITLES[page] ?? PAGE_TITLES.overview} · ${APP_TITLE}`

    // Move focus to the content on navigation so keyboard and screen reader users start at the top.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [page])

  return (
    <ToastProvider>
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault()
        mainRef.current?.focus()
      }}>
        Skip to main content
      </a>
      <div className="app-shell">
        <Sidebar currentPage={page} />
        <main id="main-content" ref={mainRef} className="main-content" tabIndex={-1}>
          <CurrentPage page={page} param={param} />
        </main>
      </div>
    </ToastProvider>
  )
}

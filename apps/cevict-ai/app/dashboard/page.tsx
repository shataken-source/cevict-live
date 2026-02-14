import { redirect } from 'next/navigation'

/**
 * /dashboard - No separate dashboard page; the hub home (/) is the main dashboard.
 * Redirect so bookmarks or links to /dashboard work.
 */
export default function DashboardPage() {
  redirect('/')
}

import { Outlet } from 'react-router-dom'
import Header from './Header'
import AnnouncementMarquee from './AnnouncementMarquee'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementMarquee />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

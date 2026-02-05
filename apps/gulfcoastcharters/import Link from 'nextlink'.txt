import Link from 'next/link'
import Layout from '@/components/Layout'

export default function Home({ session }) {
  return (
    <Layout session={session}>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-24 text-center">
        <h1 className="text-6xl font-bold mb-6">Gulf Coast Charters</h1>
        <Link href="/captains" className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold inline-block">
          Find a Captain
        </Link>
      </div>
    </Layout>
  )
}
import Link from 'next/link'
import { Briefcase, Home, Scale, AlertTriangle } from 'lucide-react'

export default function WorkplacePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Workplace & Housing Rights
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Understand your legal rights as an employee and tenant regarding smoking and vaping policies.
          </p>
        </div>

        {/* Workplace Rights */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <h2 className="text-3xl font-bold text-gray-900">Employee Rights</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Your rights regarding smoking and vaping in the workplace vary by state. Know what your employer can and cannot do.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">What Employers Can Do</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Prohibit smoking/vaping in the workplace</li>
                <li>• Create smoke-free campus policies</li>
                <li>• Restrict smoking breaks</li>
                <li>• Test for nicotine (in some states)</li>
              </ul>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-2">What Employers Cannot Do</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Discriminate based on legal off-duty use (some states)</li>
                <li>• Fire you for smoking outside work (protected states)</li>
                <li>• Refuse to hire smokers (some states)</li>
                <li>• Violate state-specific protections</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              State-by-State Breakdown
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Workplace smoking rights vary significantly by state. Some states protect legal off-duty tobacco use, while others allow employers broad discretion.
            </p>
            <Link
              href="/workplace/states"
              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
            >
              View State-by-State Guide →
            </Link>
          </div>
        </div>

        {/* Housing Rights */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Home className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold text-gray-900">Housing & Tenant Rights</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Landlord-tenant laws regarding smoking and vaping. Know your rights and responsibilities.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Landlord Rights</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Prohibit smoking in rental units</li>
                <li>• Create smoke-free building policies</li>
                <li>• Include smoking clauses in leases</li>
                <li>• Charge cleaning fees for smoke damage</li>
              </ul>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Tenant Rights</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Grandfathered rights (existing leases)</li>
                <li>• Privacy in your own unit (varies)</li>
                <li>• Protection from discrimination</li>
                <li>• Reasonable notice for policy changes</li>
              </ul>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">State-Specific Laws</h3>
            <p className="text-sm text-gray-600 mb-4">
              Housing smoking laws vary by state and municipality. Check your local ordinances and lease agreement.
            </p>
            <Link
              href="/workplace/housing"
              className="text-purple-600 hover:text-purple-700 font-semibold text-sm"
            >
              View Housing Guide →
            </Link>
          </div>
        </div>

        {/* Legal Resources */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Scale className="w-8 h-8 text-green-600" />
            <h2 className="text-3xl font-bold text-gray-900">Legal Resources</h2>
          </div>
          <p className="text-gray-600 mb-6">
            If you believe your rights have been violated, these resources can help.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">State Labor Departments</h3>
              <p className="text-sm text-gray-600 mb-4">
                File complaints about workplace discrimination or violations.
              </p>
              <Link
                href="/workplace/resources/labor"
                className="text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                View Resources →
              </Link>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Housing Authorities</h3>
              <p className="text-sm text-gray-600 mb-4">
                Report landlord violations and discrimination.
              </p>
              <Link
                href="/workplace/resources/housing"
                className="text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                View Resources →
              </Link>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Legal Aid</h3>
              <p className="text-sm text-gray-600 mb-4">
                Find free or low-cost legal assistance in your area.
              </p>
              <Link
                href="/workplace/resources/legal-aid"
                className="text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                Find Help →
              </Link>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Legal Disclaimer</h3>
              <p className="text-sm text-gray-700">
                This information is for educational purposes only and does not constitute legal advice. Laws vary by state and municipality, and this information may not reflect the most current legal developments. Consult with a qualified attorney for advice specific to your situation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

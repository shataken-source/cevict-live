'use client'

import Link from 'next/link'
import { Mail, CheckCircle } from 'lucide-react'

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <Mail className="w-16 h-16 text-blue-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-600 mb-6">
          We've sent a verification link to your email address. Please click the link to verify your account.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Note:</strong> Check your spam folder if you don't see the email.
          </p>
        </div>
        <Link
          href="/auth/login"
          className="text-blue-600 hover:underline inline-flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Already verified? Sign in
        </Link>
      </div>
    </div>
  )
}

import { AlertCircle, ArrowRight, HelpCircle, Mail, MessageSquare } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Contact Us - PetReunion',
  description: 'Get in touch with PetReunion - We\'re here to help reunite pets with their families.',
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Contact Us
          </h1>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
            Have questions? Need help? We're here to assist you in reuniting pets with their families.
            Reach out and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
          <div
            className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6">
              <Mail size={32} color="white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Email
            </h3>
            <div className="mb-5">
              <p className="text-sm text-slate-600 mb-2 font-medium">
                General Inquiries:
              </p>
              <a
                className="hover:underline text-blue-600 font-semibold"
                href="mailto:info@petreunion.org"
              >
                info@petreunion.org
              </a>
            </div>
            <div>
              <p className="text-sm text-slate-600 mb-2 font-medium">
                Privacy & Data:
              </p>
              <a
                className="hover:underline text-blue-600 font-semibold"
                href="mailto:privacy@petreunion.org"
              >
                privacy@petreunion.org
              </a>
            </div>
          </div>

          <div
            className="glass-card rounded-2xl p-8 hover:-translate-y-1 transition-transform"
          >
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-6">
              <MessageSquare size={32} color="white" />
            </div>
            <h3 style={{ fontSize: "22px", fontWeight: "bold", color: "#333", marginBottom: "16px" }}>
              Support
            </h3>
            <p style={{ color: "#666", fontSize: "15px", marginBottom: "16px" }}>
              Need help with:
            </p>
            <ul style={{ color: "#666", fontSize: "14px", lineHeight: "1.8", marginBottom: "20px", paddingLeft: "20px" }}>
              <li>Reporting a lost/found pet</li>
              <li>Using the AI matching system</li>
              <li>Account issues</li>
              <li>Technical problems</li>
            </ul>
            <a
              className="hover:underline"
              href="mailto:support@petreunion.org"
              style={{
                color: "#10b981",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "600",
                display: "inline-block"
              }}
            >
              support@petreunion.org →
            </a>
          </div>
        </div>

        {/* Emergency Notice */}
        <div style={{
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          border: "2px solid #f59e0b",
          borderRadius: "20px",
          padding: "30px",
          marginBottom: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "start", gap: "20px" }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0
            }}>
              <AlertCircle size={24} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#92400e", marginBottom: "12px" }}>
                ⚠️ Emergency Pet Situations
              </h3>
              <p style={{ color: "#78350f", fontSize: "16px", lineHeight: "1.6", marginBottom: "16px" }}>
                If you have found a pet in immediate danger or need urgent help:
              </p>
              <ul style={{ color: "#78350f", fontSize: "15px", lineHeight: "1.8", marginBottom: "16px", paddingLeft: "20px" }}>
                <li>Contact your local animal control or police</li>
                <li>Visit the nearest animal shelter or veterinary clinic</li>
                <li>Use our Panic Mode feature on the homepage</li>
              </ul>
              <p style={{ color: "#92400e", fontSize: "14px", fontWeight: "500", margin: 0 }}>
                PetReunion is not an emergency service. For immediate threats to animal welfare, contact local authorities.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          marginBottom: "40px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <HelpCircle size={28} color="#667eea" />
            <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#333", margin: 0 }}>
              Frequently Asked Questions
            </h2>
          </div>
          <div style={{ display: "grid", gap: "24px" }}>
            <div>
              <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                How do I report a lost pet?
              </h4>
              <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.7" }}>
                Click "I Lost My Pet" on the homepage, upload a photo, and provide location details.
                Our AI will start searching immediately.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                Is PetReunion free?
              </h4>
              <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.7" }}>
                Yes! PetReunion is 100% free forever. We never charge for reuniting pets.
              </p>
            </div>
            <div>
              <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#333", marginBottom: "8px" }}>
                How accurate is the AI matching?
              </h4>
              <p style={{ color: "#666", fontSize: "16px", lineHeight: "1.7" }}>
                Our AI provides confidence scores for each match. Always verify matches independently.
                See our <Link href="/terms" style={{ color: "#667eea", textDecoration: "none", fontWeight: "600" }}>Terms of Service</Link> for details.
              </p>
            </div>
          </div>
          <div style={{ marginTop: "30px", paddingTop: "30px", borderTop: "2px solid #e5e7eb" }}>
            <Link href="/faq">
              <button
                className="transition-colors hover:bg-[#667eea] hover:text-white"
                style={{
                  padding: "14px 28px",
                  background: "white",
                  color: "#667eea",
                  border: "2px solid #667eea",
                  borderRadius: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s"
                }}
              >
                View Full FAQ
                <ArrowRight size={18} />
              </button>
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div style={{ textAlign: "center" }}>
          <Link href="/" style={{
            color: "#667eea",
            textDecoration: "none",
            fontSize: "16px",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <ArrowRight size={16} style={{ transform: "rotate(180deg)" }} />
            Back to Home
          </Link>
        </div>
      </section>
    </div>
  );
}

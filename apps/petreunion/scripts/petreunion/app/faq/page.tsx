'use client';

import Link from 'next/link';
import { HelpCircle, ArrowRight, CheckCircle, Heart, Search } from 'lucide-react';

export default function FaqPage() {
  const faqs = [
    {
      question: "Is PetReunion free?",
      answer: "Yes! PetReunion is 100% free forever. We never charge for reuniting pets. No fees, no subscriptions, no hidden costs."
    },
    {
      question: "How do I report a lost pet?",
      answer: "Go to the report page, click 'I Lost a Pet', add details and a photo if you have one, and submit. Our AI will start searching immediately. Then share the link with friends and family."
    },
    {
      question: "I found a pet. What should I do?",
      answer: "First, search our database to see if there's a matching lost pet report. If you can't find a match, create a 'Found Pet' report and include where and when you found them. Our AI will match it with lost pet reports automatically."
    },
    {
      question: "Do I need an account?",
      answer: "No account is required to search or report pets. You can use PetReunion completely anonymously. Shelters can optionally log in to manage intake and run advanced searches."
    },
    {
      question: "How accurate is the AI matching?",
      answer: "Our AI provides confidence scores (0-100%) for each match, along with explainable reasoning. Always verify matches independently. High-confidence matches are more likely to be correct, but you should always confirm with the pet owner."
    },
    {
      question: "How quickly will I get results?",
      answer: "Our AI starts searching immediately after you submit a report. You'll receive email alerts when potential matches are found. Most matches happen within 24-48 hours, but we continue searching 24/7."
    },
    {
      question: "Is my information private?",
      answer: "Yes! We use fuzzy geolocation to protect your exact address. Your contact information is only shared when a match is found and you choose to connect. We're GDPR and CCPA compliant."
    },
    {
      question: "What if I find my pet?",
      answer: "Great news! You can mark your pet as 'Found' in your reports, and we'll stop sending alerts. This helps us keep our database accurate and focus on pets that are still missing."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto">
          <div className="text-5xl mb-5">❓</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-2xl mx-auto">
            Quick answers to common questions about PetReunion. Can't find what you're looking for?
            <Link href="/contact" className="underline ml-1">
              Contact us
            </Link>.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid gap-5 mb-10">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="glass-card rounded-2xl p-8 hover:-translate-y-0.5 hover:shadow-xl transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={20} color="white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug">
                    {faq.question}
                  </h3>
                  <p className="text-slate-600 leading-relaxed m-0">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div style={{
          background: "linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)",
          borderRadius: "20px",
          padding: "40px",
          marginBottom: "40px",
          textAlign: "center"
        }}>
          <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#333", marginBottom: "24px" }}>
            Ready to Get Started?
          </h2>
          <p style={{ color: "#666", fontSize: "16px", marginBottom: "30px", lineHeight: "1.6" }}>
            Report a lost or found pet, or search our database to help reunite pets with their families.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "center" }}>
            <Link href="/report" style={{ textDecoration: "none" }}>
              <button style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.3)";
              }}
              >
                <Heart size={18} />
                Report a Pet
              </button>
            </Link>
            <Link href="/search" style={{ textDecoration: "none" }}>
              <button style={{
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
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#667eea";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
                e.currentTarget.style.color = "#667eea";
              }}
              >
                <Search size={18} />
                Search Pets
              </button>
            </Link>
          </div>
        </div>

        {/* Still Need Help */}
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#333", marginBottom: "16px" }}>
            Still Have Questions?
          </h2>
          <p style={{ color: "#666", fontSize: "16px", marginBottom: "24px", lineHeight: "1.6" }}>
            We're here to help! Reach out to our support team and we'll get back to you as soon as possible.
          </p>
          <Link href="/contact">
            <button style={{
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
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#667eea";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#667eea";
            }}
            >
              Contact Support
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

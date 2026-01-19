import { useState } from 'react';
import { mockCharters } from '../data/mockCharters';

interface ContactFormProps {
  charterId?: string;
}

export default function ContactForm({ charterId }: ContactFormProps) {
  const charter = charterId ? mockCharters.find(c => c.id === charterId) : null;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    tripType: 'full-day',
    passengers: '1',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Inquiry submitted successfully
    alert(`Thank you! Your inquiry has been sent to ${charter?.businessName || 'the charter'}. They will contact you shortly.`);
    window.location.hash = '#';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <button
          onClick={() => window.location.hash = charter ? `#charter/${charter.id}` : '#'}
          className="text-blue-900 hover:underline mb-4"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Contact Captain</h2>
          {charter && (
            <>
              <p className="text-gray-600 mb-2">
                Inquiring about: <span className="font-semibold">{charter.businessName}</span> - {charter.boatName}
              </p>
              <p className="text-gray-600 mb-6">
                Captain: <span className="font-semibold">{charter.captainName}</span>
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Direct Contact Information</h4>
                <div className="space-y-2 text-sm">
                  {charter.contactPreferences.email && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a 
                        href={`mailto:${charter.useCustomEmail && charter.customEmail ? charter.customEmail : charter.captainEmail}`} 
                        className="text-blue-900 hover:underline"
                      >
                        {charter.useCustomEmail && charter.customEmail ? charter.customEmail : charter.captainEmail}
                      </a>
                    </div>
                  )}
                  {charter.contactPreferences.phone && (
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${charter.captainPhone}`} className="text-blue-900 hover:underline">{charter.captainPhone}</a>
                    </div>
                  )}
                </div>
              </div>

            </>
          )}


          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Your Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Preferred Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Trip Type *</label>
                <select
                  name="tripType"
                  value={formData.tripType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="half-day">Half Day (4 hours)</option>
                  <option value="full-day">Full Day (8 hours)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Number of Passengers *</label>
                <input
                  type="number"
                  name="passengers"
                  value={formData.passengers}
                  onChange={handleChange}
                  min="1"
                  max={charter?.maxPassengers || 20}
                  required
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Additional Information</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Tell us about your fishing experience, target species, or any special requests..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition"
            >
              Send Inquiry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

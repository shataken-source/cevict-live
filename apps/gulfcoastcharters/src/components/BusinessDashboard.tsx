import { useState, useEffect } from 'react';
import { MapPin, Calendar, LogOut, TrendingUp, MousePointerClick, Eye, DollarSign } from 'lucide-react';
import LocalBusinessMap from './LocalBusinessMap';
import BookingCalendar from './BookingCalendar';
import CaptainLogin from './CaptainLogin';
import CustomEmailPurchase from './CustomEmailPurchase';
import AnalyticsChart from './AnalyticsChart';
import { useAppStore } from '@/stores/appStore';
import { mockCharters } from '@/data/mockCharters';
import { supabase } from '@/lib/supabase';

export default function BusinessDashboard() {
  const updateCharterAvailability = useAppStore((state) => state.updateCharterAvailability);

  const [loggedInCaptain, setLoggedInCaptain] = useState<string | null>(null);
  const [captainCharter, setCaptainCharter] = useState<any>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({
    businessName: '',
    boatName: '',
    captainName: '',
    captainEmail: '',
    captainPhone: '',
    contactEmail: true,
    contactPhone: true,
    location: '',
    city: '',
    boatType: '',
    boatLength: '',
    maxPassengers: '',
    priceHalfDay: '',
    priceFullDay: '',
    description: '',
  });

  useEffect(() => {
    if (loggedInCaptain) {
      const charter = mockCharters.find(c => c.captainEmail === loggedInCaptain);
      if (charter) {
        setCaptainCharter(charter);
        setFormData({
          businessName: charter.businessName || '',
          boatName: charter.boatName || '',
          captainName: charter.captainName || '',
          captainEmail: charter.captainEmail || '',
          captainPhone: charter.captainPhone || '',
          contactEmail: charter.contactPreferences?.email ?? true,
          contactPhone: charter.contactPreferences?.phone ?? true,
          location: charter.location || '',
          city: charter.city || '',
          boatType: charter.boatType || '',
          boatLength: charter.boatLength?.toString() || '',
          maxPassengers: charter.maxPassengers?.toString() || '',
          priceHalfDay: charter.priceHalfDay?.toString() || '',
          priceFullDay: charter.priceFullDay?.toString() || '',
          description: (charter as any).description || '',
        });
      }
    }
  }, [loggedInCaptain]);

  const handleCustomEmailPurchase = () => {
    if (captainCharter) {
      setSuccessMessage('Custom email purchased successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };


  const handleLoginSuccess = (email: string) => {
    setLoggedInCaptain(email);
  };

  const handleLogout = () => {
    setLoggedInCaptain(null);
    setCaptainCharter(null);
    setSuccessMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update charter info
    const updatedCharter = {
      ...captainCharter,
      businessName: formData.businessName,
      boatName: formData.boatName,
      captainName: formData.captainName,
      captainEmail: formData.captainEmail,
      captainPhone: formData.captainPhone,
      contactPreferences: {
        email: formData.contactEmail,
        phone: formData.contactPhone,
      },
      location: formData.location,
      city: formData.city,
      boatType: formData.boatType,
      boatLength: parseInt(formData.boatLength),
      maxPassengers: formData.maxPassengers ? parseInt(formData.maxPassengers) : undefined,
      priceHalfDay: formData.priceHalfDay ? parseFloat(formData.priceHalfDay) : undefined,
      priceFullDay: formData.priceFullDay ? parseFloat(formData.priceFullDay) : undefined,
      description: formData.description,
    };

    setCaptainCharter(updatedCharter);
    setSuccessMessage('Charter information updated successfully!');
    
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUnavailableDatesChange = (dates: Date[]) => {
    if (captainCharter) {
      const dateStrings = dates.map((d) => d.toISOString().split('T')[0]);
      updateCharterAvailability(captainCharter.id, dateStrings);
      setSuccessMessage('Availability updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };



  // Mock analytics data - in production this would come from the database
  const analyticsData = {
    impressions: 1247,
    clicks: 89,
    ctr: 7.14,
    roi: 245.8,
    adSpend: 500,
    revenue: 1729
  };

  const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Impressions',
        data: [145, 189, 167, 201, 178, 223, 144],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
      },
      {
        label: 'Clicks',
        data: [12, 15, 11, 18, 14, 19, 10],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
      }
    ]
  };

  if (!loggedInCaptain) {
    return (
      <div className="bg-gray-50 py-12 min-h-screen">
        <div className="container mx-auto px-4">
          <CaptainLogin onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Captain Dashboard</h2>
            <p className="text-gray-600 mt-1">Welcome back, {captainCharter?.captainName}!</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4">Ad Performance Analytics</h3>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Impressions</p>
                  <p className="text-3xl font-bold text-blue-600">{analyticsData.impressions}</p>
                </div>
                <Eye className="h-10 w-10 text-blue-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Clicks</p>
                  <p className="text-3xl font-bold text-green-600">{analyticsData.clicks}</p>
                </div>
                <MousePointerClick className="h-10 w-10 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Click-Through Rate</p>
                  <p className="text-3xl font-bold text-purple-600">{analyticsData.ctr}%</p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-600" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">ROI</p>
                  <p className="text-3xl font-bold text-orange-600">{analyticsData.roi}%</p>
                </div>
                <DollarSign className="h-10 w-10 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <AnalyticsChart 
                type="line" 
                data={chartData} 
                title="Weekly Performance" 
              />
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-bold mb-4">Revenue Summary</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Ad Spend</span>
                  <span className="text-xl font-bold text-red-600">${analyticsData.adSpend}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-gray-600">Revenue Generated</span>
                  <span className="text-xl font-bold text-green-600">${analyticsData.revenue}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-900 font-semibold">Net Profit</span>
                  <span className="text-2xl font-bold text-blue-600">${analyticsData.revenue - analyticsData.adSpend}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCalendar(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <Calendar className="h-5 w-5" />
            Manage Availability
          </button>
          <button
            onClick={() => setShowMap(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition"
          >
            <MapPin className="h-5 w-5" />
            View on Map
          </button>
        </div>

        {authUserId && (
          <CustomEmailPurchase
            userId={authUserId}
            userType="captain"
            currentPoints={0}
            onPurchaseSuccess={handleCustomEmailPurchase}
          />
        )}



        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-xl font-bold mb-6">Update Charter Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Business Name *</label>
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Boat Name *</label>
              <input type="text" name="boatName" value={formData.boatName} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Captain Name *</label>
              <input type="text" name="captainName" value={formData.captainName} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Captain Email *</label>
              <input type="email" name="captainEmail" value={formData.captainEmail} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Captain Phone *</label>
              <input type="tel" name="captainPhone" value={formData.captainPhone} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Contact Preferences *</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="contactEmail" checked={formData.contactEmail} onChange={handleChange} className="w-4 h-4" />
                  <span>Allow Email Contact</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="contactPhone" checked={formData.contactPhone} onChange={handleChange} className="w-4 h-4" />
                  <span>Allow Phone Contact</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">State *</label>
              <select name="location" value={formData.location} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Select State</option>
                <option value="Texas">Texas</option>
                <option value="Louisiana">Louisiana</option>
                <option value="Mississippi">Mississippi</option>
                <option value="Alabama">Alabama</option>
                <option value="Florida">Florida</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">City *</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Boat Type *</label>
              <select name="boatType" value={formData.boatType} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Select Type</option>
                <option value="Sport Fishing">Sport Fishing</option>
                <option value="Deep Sea">Deep Sea</option>
                <option value="Bay Fishing">Bay Fishing</option>
                <option value="Party Boat">Party Boat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Boat Length (ft) *</label>
              <input type="number" name="boatLength" value={formData.boatLength} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Max Passengers</label>
              <input type="number" name="maxPassengers" value={formData.maxPassengers} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Half Day Price ($)</label>
              <input type="number" name="priceHalfDay" value={formData.priceHalfDay} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Full Day Price ($)</label>
              <input type="number" name="priceFullDay" value={formData.priceFullDay} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2">Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={4} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" className="mt-6 w-full bg-blue-900 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition">
            Save Changes
          </button>
        </form>

        <LocalBusinessMap open={showMap} onOpenChange={setShowMap} location={formData.city && formData.location ? `${formData.city}, ${formData.location}` : 'Gulf Coast'} />
        
        {captainCharter && (
          <BookingCalendar
            open={showCalendar}
            onOpenChange={setShowCalendar}
            charter={captainCharter}
            onDateRangeSelect={() => {}}
            unavailableDates={captainCharter.unavailableDates || []}
            onUnavailableDatesChange={handleUnavailableDatesChange}
            isManagementMode={true}
          />
        )}
      </div>
    </div>
  );
}


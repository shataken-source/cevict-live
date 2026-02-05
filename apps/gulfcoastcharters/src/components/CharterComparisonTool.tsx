import { X, Users, Anchor, DollarSign, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface Charter {
  id: string;
  businessName: string;
  captainName: string;
  location: string;
  city: string;
  boatType: string;
  boatLength: number;
  maxPassengers: number;
  priceHalfDay: number;
  priceFullDay: number;
  rating: number;
  reviewCount: number;
  image: string;
}

interface CharterComparisonToolProps {
  charters: Charter[];
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function CharterComparisonTool({ charters, onRemove, onClose }: CharterComparisonToolProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-white rounded-xl max-w-6xl w-full p-6 relative max-h-[90vh] overflow-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 hover:bg-gray-100 rounded-full p-2">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-purple-900">Compare Charters</h2>
        
        {charters.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No charters to compare. Add some from the listings!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-purple-200">
                  <th className="text-left p-4 font-semibold text-gray-700">Feature</th>
                  {charters.map((charter) => (
                    <th key={charter.id} className="p-4 min-w-[200px]">
                      <div className="relative">
                        <button
                          onClick={() => onRemove(charter.id)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <img src={charter.image} alt={charter.businessName} className="w-full h-32 object-cover rounded-lg mb-2" />
                        <h3 className="font-bold text-sm">{charter.businessName}</h3>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ComparisonRow label="Captain" icon={<Users className="w-4 h-4" />}>
                  {charters.map(c => <td key={c.id} className="p-4 text-center">{c.captainName}</td>)}
                </ComparisonRow>
                <ComparisonRow label="Location" icon={<Anchor className="w-4 h-4" />}>
                  {charters.map(c => <td key={c.id} className="p-4 text-center">{c.city}, {c.location}</td>)}
                </ComparisonRow>
                <ComparisonRow label="Boat Type">
                  {charters.map(c => <td key={c.id} className="p-4 text-center"><Badge>{c.boatType}</Badge></td>)}
                </ComparisonRow>
                <ComparisonRow label="Boat Length">
                  {charters.map(c => <td key={c.id} className="p-4 text-center font-semibold">{c.boatLength}ft</td>)}
                </ComparisonRow>
                <ComparisonRow label="Max Passengers">
                  {charters.map(c => <td key={c.id} className="p-4 text-center font-semibold">{c.maxPassengers}</td>)}
                </ComparisonRow>
                <ComparisonRow label="Rating" icon={<Star className="w-4 h-4 text-yellow-500" />}>
                  {charters.map(c => <td key={c.id} className="p-4 text-center font-bold">{c.rating} ({c.reviewCount})</td>)}
                </ComparisonRow>
                <ComparisonRow label="Half Day" icon={<DollarSign className="w-4 h-4 text-green-600" />}>
                  {charters.map(c => <td key={c.id} className="p-4 text-center text-green-600 font-bold">${c.priceHalfDay}</td>)}
                </ComparisonRow>
                <ComparisonRow label="Full Day" icon={<DollarSign className="w-4 h-4 text-green-600" />}>
                  {charters.map(c => <td key={c.id} className="p-4 text-center text-green-600 font-bold">${c.priceFullDay}</td>)}
                </ComparisonRow>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ComparisonRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-4 font-medium text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </td>
      {children}
    </tr>
  );
}

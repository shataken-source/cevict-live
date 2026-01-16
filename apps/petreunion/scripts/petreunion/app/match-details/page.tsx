"use client";

import { useState } from "react";
import { Shield } from "lucide-react";

export default function MatchDetailsPage() {
  const [ack, setAck] = useState(false);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-xl p-6 relative">
        {!ack && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="bg-slate-900 border border-yellow-500 text-yellow-100 rounded-lg p-5 max-w-md text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-lg font-bold">
                <Shield className="w-6 h-6 text-yellow-400" />
                Liability Shield
              </div>
              <p className="text-sm text-yellow-200">
                AI matches are estimates only. Shelter contact information is shown after you acknowledge this notice. We are not liable for actions taken based on this data.
              </p>
              <button
                onClick={() => setAck(true)}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold py-2 rounded-md"
              >
                I Understand – Show Details
              </button>
            </div>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-4">Match Details</h1>
        <p className="text-sm text-slate-300 mb-4">
          Contact details are protected until you accept the liability notice. Once acknowledged, shelter contact info will appear here.
        </p>

        {ack ? (
          <div className="space-y-2">
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <h2 className="font-semibold text-lg">Shelter Contact</h2>
              <p className="text-sm text-slate-200">Phone: (redacted)</p>
              <p className="text-sm text-slate-200">Email: (redacted)</p>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">
            Acknowledge the shield to view shelter contact info.
          </div>
        )}
      </div>
    </div>
  );
}

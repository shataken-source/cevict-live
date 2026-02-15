'use client';

import { useState } from 'react';
import { MessageCircle, Send, Backpack, Tent, Moon, HeartPulse, AlertTriangle, Thermometer, Droplets, Bandage, Phone } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  type?: 'normal' | 'first-aid' | 'emergency';
}

interface FirstAidInfo {
  steps: string[];
  warning?: string;
  call911?: boolean;
}

const FIRST_AID_KNOWLEDGE: Record<string, FirstAidInfo> = {
  'bleeding': {
    steps: [
      'Apply direct pressure to the wound with a clean cloth or bandage',
      'Elevate the injured area above heart level if possible',
      'If bleeding is severe, use a tourniquet 2-3 inches above the wound (last resort)',
      'Do NOT remove any embedded objects',
      'Seek medical attention immediately for severe bleeding'
    ],
    warning: 'If bleeding doesn\'t stop after 10 minutes of pressure, call emergency services',
    call911: true
  },
  'burn': {
    steps: [
      'Cool the burn with cool (not cold) running water for 10-20 minutes',
      'Remove rings, watches, or tight items before swelling occurs',
      'Do NOT apply ice, butter, or ointments to fresh burns',
      'Cover with sterile, non-stick bandage',
      'For chemical burns, flush with water for 20+ minutes'
    ],
    warning: 'Seek emergency care for burns larger than 3 inches, on face/hands/genitals, or deep burns'
  },
  'snake bite': {
    steps: [
      'Move away from the snake to prevent additional bites',
      'Keep the person calm and still - minimize movement',
      'Position the bite area at or below heart level',
      'Remove tight clothing/jewelry near the bite',
      'Do NOT cut the wound, suck venom, or apply ice/tourniquet',
      'Note the snake\'s appearance for identification',
      'Seek emergency medical attention immediately'
    ],
    warning: 'This is a medical emergency. Call 911 immediately.',
    call911: true
  },
  'cpr': {
    steps: [
      'Check responsiveness - tap shoulder and shout',
      'Call 911 or have someone call',
      'Begin chest compressions: 100-120 per minute, 2 inches deep',
      'Push hard and fast in center of chest',
      'If trained, give 2 rescue breaths after every 30 compressions',
      'Continue until help arrives or person shows signs of life',
      'Use AED if available - follow voice prompts'
    ],
    warning: 'This is life-threatening. Call 911 immediately.',
    call911: true
  },
  'choking': {
    steps: [
      'Ask "Are you choking?" - if they can speak/cough, encourage coughing',
      'If cannot breathe: Stand behind them, wrap arms around waist',
      'Make fist with one hand, thumb side against stomach above navel',
      'Grasp fist with other hand, pull inward and upward sharply',
      'Repeat until object is expelled or person becomes unconscious',
      'If unconscious, begin CPR and call 911'
    ],
    warning: 'Call 911 if choking persists or person becomes unconscious',
    call911: true
  },
  'hypothermia': {
    steps: [
      'Move person to shelter, remove wet clothing',
      'Warm the center of body (chest, neck, head, groin) first',
      'Use skin-to-skin contact under blankets if needed',
      'Give warm (not hot) beverages if conscious',
      'Handle gently - rough movement can trigger heart issues',
      'Do NOT rub extremities or use direct heat on skin'
    ],
    warning: 'Severe hypothermia is life-threatening. Seek medical help immediately.'
  },
  'heat stroke': {
    steps: [
      'Call 911 immediately - this is a medical emergency',
      'Move person to shade/air conditioning',
      'Remove excess clothing',
      'Cool rapidly with ice packs to neck, armpits, groin',
      'Immerse in cool water if available',
      'Do NOT give fluids if person is unconscious or vomiting'
    ],
    warning: 'Heat stroke can be fatal. Call 911 immediately.',
    call911: true
  },
  'fracture': {
    steps: [
      'Do NOT move the person unless absolutely necessary',
      'Immobilize the injured area - use splints if available',
      'Apply ice wrapped in cloth to reduce swelling',
      'Elevate if possible without causing pain',
      'Watch for signs of shock (pale, clammy, confused)'
    ],
    warning: 'Suspected spine, hip, or pelvic fractures require professional rescue - do not move'
  },
  'allergic reaction': {
    steps: [
      'For mild reactions: remove allergen, give antihistamine',
      'For severe reactions (anaphylaxis): use EpiPen immediately',
      'Inject into outer thigh through clothing if necessary',
      'Call 911 - second reaction can occur',
      'Keep person lying down with legs elevated',
      'Be prepared to give CPR if breathing stops'
    ],
    warning: 'Anaphylaxis is life-threatening. Use EpiPen and call 911 immediately.',
    call911: true
  },
  'tick': {
    steps: [
      'Use fine-tipped tweezers to grasp tick close to skin',
      'Pull upward with steady, even pressure - don\'t twist or jerk',
      'Clean bite area with rubbing alcohol or soap and water',
      'Dispose of tick by flushing down toilet or wrapping in tape',
      'Never crush tick with fingers',
      'Watch for rash, fever, or flu-like symptoms for 30 days'
    ],
    warning: 'Seek medical care if rash (especially bullseye) or fever develops - Lyme disease risk'
  },
  'dehydration': {
    steps: [
      'Move to cool, shaded area',
      'Give small sips of water or oral rehydration solution',
      'Avoid caffeine and alcohol',
      'Apply cool cloths to skin',
      'Rest and monitor'
    ],
    warning: 'Severe dehydration requires IV fluids - seek medical care if confused, very weak, or not urinating'
  },
  'poison': {
    steps: [
      'Call Poison Control: 1-800-222-1222 (24/7, free, confidential)',
      'Do NOT give anything by mouth unless instructed',
      'Do NOT induce vomiting unless told to by poison control',
      'Have substance container/info ready when calling',
      'Note time of exposure and amount taken'
    ],
    warning: 'For seizures, difficulty breathing, or unresponsiveness, call 911 immediately'
  },
  'bee sting': {
    steps: [
      'Remove stinger quickly by scraping with fingernail or credit card',
      'Wash area with soap and water',
      'Apply cold compress to reduce swelling',
      'Apply hydrocortisone cream or calamine for itching',
      'Take antihistamine if needed',
      'Watch for signs of allergic reaction (difficulty breathing, swelling)'
    ],
    warning: 'Multiple stings or allergic reactions require immediate medical attention'
  },
  'blister': {
    steps: [
      'Do not pop small blisters - they protect against infection',
      'Cover with moleskin or bandage to prevent rubbing',
      'For large painful blisters: clean area, sterilize needle, drain at edge',
      'Leave skin flap intact - it acts as natural bandage',
      'Apply antibiotic ointment and cover with bandage'
    ],
    warning: 'Diabetics or those with poor circulation should not drain blisters - seek medical care'
  },
  'sprain': {
    steps: [
      'R.I.C.E.: Rest, Ice, Compression, Elevation',
      'Rest the injured area and avoid weight bearing',
      'Ice for 15-20 minutes every 2-3 hours for 48 hours',
      'Use elastic bandage for compression (not too tight)',
      'Elevate above heart level when possible',
      'After 48 hours, gentle movement and heat'
    ],
    warning: 'If you can\'t bear weight or severe deformity, seek X-ray to rule out fracture'
  },
  'nosebleed': {
    steps: [
      'Sit upright and lean forward slightly',
      'Pinch soft part of nose (just below bony bridge)',
      'Hold pressure for 10-15 minutes without checking',
      'Breathe through mouth',
      'Apply cold compress to nose/cheeks',
      'Do NOT tilt head back'
    ],
    warning: 'Seek care if bleeding lasts >20 minutes, or from head injury'
  },
  'chest pain': {
    steps: [
      'Call 911 immediately - do not drive yourself',
      'Stop all activity and rest',
      'Chew aspirin (325mg) if not allergic and advised by 911',
      'Loosen tight clothing',
      'If person becomes unconscious, begin CPR'
    ],
    warning: 'This could be a heart attack. Call 911 immediately.',
    call911: true
  },
  'seizure': {
    steps: [
      'Clear the area of dangerous objects',
      'Do NOT restrain the person',
      'Do NOT put anything in their mouth',
      'Turn person on their side if possible',
      'Place something soft under head',
      'Time the seizure',
      'Stay until fully conscious and oriented'
    ],
    warning: 'Call 911 if seizure lasts >5 minutes, repeated seizures, or first seizure',
    call911: true
  },
  'drowning': {
    steps: [
      'Call 911 immediately',
      'Only enter water if you are trained and it is safe',
      'Remove person from water if possible',
      'Check for breathing - begin CPR if not breathing',
      'If vomiting, roll on side',
      'Even if person seems fine, seek medical evaluation - secondary drowning risk'
    ],
    warning: 'This is a medical emergency. Always seek medical evaluation after near-drowning.',
    call911: true
  }
};

const CAMPING_RESPONSES: Record<string, string> = {
  'fire': 'For wet conditions: Use dry tinder (birch bark works great), build a platform to keep wood off wet ground, and use a windbreak. Fatwood or fire starters help too!',
  'pack': 'Cold weather essentials: Layered clothing, 4-season sleeping bag, insulated pad, warm hat/gloves, hand warmers, and a backup stove fuel.',
  'water': 'Purification methods: Boil for 1 minute (3 min at altitude), use filters (0.1 micron), purification tablets, or UV sterilizers. Always have a backup method!',
  'bear': 'Hang food 10 feet high and 4 feet from tree trunk, or use bear canisters. Never store food in your tent!',
  'see': 'Stay calm, speak calmly, don\'t run. Back away slowly. Make yourself look big. If attacked, fight back with any available objects.',
};

export default function CampingChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Hi! I\'m your camping assistant. Ask me anything about camping, or tap "First Aid" for emergency medical help. Remember: I\'m AI - for serious emergencies, call 911!' }
  ]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'camping' | 'first-aid'>('camping');

  const campingSuggestions = [
    'How do I start a fire in wet conditions?',
    'What should I pack for cold weather?',
    'Best way to purify water?',
    'How to hang a bear bag?',
    'What to do if I see a bear?',
  ];

  const firstAidSuggestions = [
    'Severe bleeding',
    'Snake bite',
    'Heat stroke',
    'Hypothermia',
    'Someone is choking',
    'Burn treatment',
    'CPR instructions',
    'Tick removal',
    'Sprained ankle',
    'Allergic reaction',
  ];

  const handleSend = () => {
    console.log('handleSend called, input:', input);
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');

    setTimeout(() => {
      const lower = userMsg.toLowerCase();

      // Check for first aid keywords
      for (const [key, aid] of Object.entries(FIRST_AID_KNOWLEDGE)) {
        if (lower.includes(key)) {
          let response = `🚨 FIRST AID: ${key.toUpperCase()}\n\n`;

          if (aid.call911) {
            response += `⚠️ CALL 911 IMMEDIATELY\n\n`;
          }

          response += `Steps:\n`;
          aid.steps.forEach((step, i) => {
            response += `${i + 1}. ${step}\n`;
          });

          if (aid.warning) {
            response += `\n⚠️ WARNING: ${aid.warning}`;
          }

          response += `\n\n📞 Emergency Numbers:\n• 911 - Emergency Services\n• 1-800-222-1222 - Poison Control\n• 1-800-275-8777 - USPS (if lost in mail)`;

          setMessages(prev => [...prev, {
            role: 'assistant',
            text: response,
            type: aid.call911 ? 'emergency' : 'first-aid'
          }]);
          return;
        }
      }

      // Check for camping keywords
      for (const [key, val] of Object.entries(CAMPING_RESPONSES)) {
        if (lower.includes(key)) {
          setMessages(prev => [...prev, { role: 'assistant', text: val }]);
          return;
        }
      }

      // Default response
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'That\'s a great question! For general camping tips, I can help with gear, setup, and safety. For medical emergencies, tap "First Aid Mode" below or describe the injury/illness.'
      }]);
    }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-2">
          {mode === 'camping' ? (
            <MessageCircle className="w-6 h-6 text-purple-400" />
          ) : (
            <HeartPulse className="w-6 h-6 text-red-400" />
          )}
          <h2 className="text-xl font-semibold">
            {mode === 'camping' ? 'Camping Assistant' : '🚨 First Aid Assistant'}
          </h2>
        </div>
        <p className="text-slate-400">
          {mode === 'camping'
            ? 'Ask me anything about camping, outdoor skills, or wilderness tips.'
            : 'Emergency medical guidance. For life-threatening situations, call 911 immediately!'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('camping')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'camping'
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
        >
          <Tent className="w-4 h-4" />
          Camping Mode
        </button>
        <button
          onClick={() => setMode('first-aid')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${mode === 'first-aid'
            ? 'bg-red-600 text-white'
            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
        >
          <HeartPulse className="w-4 h-4" />
          First Aid Mode
        </button>
      </div>

      {/* Mode-Specific Suggestions */}
      <div className="flex flex-wrap gap-2">
        {(mode === 'camping' ? campingSuggestions : firstAidSuggestions).map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => {
              console.log('Suggestion clicked:', suggestion);
              setInput(suggestion);
            }}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${mode === 'first-aid'
              ? 'bg-red-900/30 hover:bg-red-900/50 border border-red-700/30 text-red-200'
              : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300'
              }`}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Emergency Banner (First Aid Mode) */}
      {mode === 'first-aid' && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-400 mb-1">Emergency Medical Disclaimer</h3>
              <p className="text-sm text-red-200">
                This AI provides basic first aid guidance only. For life-threatening emergencies,
                call <strong>911</strong> immediately. Do not delay professional medical care.
                I cannot diagnose conditions or replace trained medical personnel.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="tel:911"
                  className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Call 911
                </a>
                <a
                  href="tel:1-800-222-1222"
                  className="inline-flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-sm transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Poison Control
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 min-h-[300px] max-h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div className={`inline-block max-w-[85%] rounded-lg p-3 whitespace-pre-wrap ${msg.role === 'user'
              ? 'bg-purple-500 text-white'
              : msg.type === 'emergency'
                ? 'bg-red-900/50 border border-red-700/50 text-red-100'
                : msg.type === 'first-aid'
                  ? 'bg-amber-900/30 border border-amber-700/30 text-amber-100'
                  : 'bg-slate-700 text-slate-200'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={mode === 'camping' ? "Ask a camping question..." : "Describe the emergency or injury..."}
          className={`flex-1 bg-slate-800 border rounded-lg px-4 py-3 text-white placeholder-slate-500 ${mode === 'first-aid' ? 'border-red-700/50 focus:border-red-500' : 'border-slate-700'
            }`}
        />
        <button
          onClick={handleSend}
          className={`text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${mode === 'first-aid'
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-purple-500 hover:bg-purple-600'
            }`}
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </div>

      {/* Quick Tips */}
      {mode === 'camping' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Tent className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="font-medium">Tent Setup</h4>
            <p className="text-sm text-slate-400">Always use a footprint. Guy out all lines for stability.</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Moon className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="font-medium">Sleep Better</h4>
            <p className="text-sm text-slate-400">Insulated pad R-value 4+ for cold ground. Earplugs help!</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Backpack className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="font-medium">Pack Light</h4>
            <p className="text-sm text-slate-400">Merino wool layers. Multi-use items. Leave the cotton home.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <HeartPulse className="w-5 h-5 text-red-400 mb-2" />
            <h4 className="font-medium text-red-400">CPR</h4>
            <p className="text-sm text-slate-400">100-120 compressions/min, 2 inches deep</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Droplets className="w-5 h-5 text-blue-400 mb-2" />
            <h4 className="font-medium text-blue-400">Bleeding</h4>
            <p className="text-sm text-slate-400">Direct pressure, elevate, tourniquet last resort</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Thermometer className="w-5 h-5 text-amber-400 mb-2" />
            <h4 className="font-medium text-amber-400">Temp Extremes</h4>
            <p className="text-sm text-slate-400">Hypothermia: warm core first. Heat: cool rapidly</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <Bandage className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="font-medium text-emerald-400">Wounds</h4>
            <p className="text-sm text-slate-400">Clean, cover, watch for infection</p>
          </div>
        </div>
      )}
      {/* Footer Disclaimer */}
      <div className="text-xs text-slate-500 text-center">
        <p>
          AI First Aid is for informational purposes only. Always seek professional medical help for emergencies.
          Call 911 for life-threatening situations.
        </p>
      </div>
    </div>
  );
}

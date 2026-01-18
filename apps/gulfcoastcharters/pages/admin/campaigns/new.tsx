import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';

export default function NewCampaign() {
  const router = useRouter();
  const supabase = createPagesBrowserClient();
  const [formData, setFormData] = useState({
    name: 'T-Shirt Vote',
    subject: 'Vote on Gulf Coast Charters logo shirts (big back logo + pocket front)',
    body: `Hey there,

I'm finalizing Gulf Coast Charters T‑shirts and I've settled on one style:

- Big GCC logo on the back
- Small GCC logo + short slogan on the front pocket area

No extra artwork—just our real logo, clean and professional.

What I need from you

Please reply with:

1) Which front pocket slogan do you like best?
   (all with a small GCC logo next to or above the text)

   A) "Gulf Coast Charters – Captain's Crew"
   B) "Gulf Coast Charters – Life's Better on the Water"
   C) "Gulf Coast Charters – Reel Adventures"
   D) "Gulf Coast Charters – Est. 2024"

2) Shirt color(s) you'd actually wear
   - White
   - Navy
   - Black
   - Heather gray
   - Light blue
   - Other: _________

3) Size
   - S / M / L / XL / XXL / other

A short reply like this is perfect:
Back logo + C, navy or heather gray, XL

Thanks for helping me lock this in,
Shane
Gulf Coast Charters`,
    recipients: '',
    template: 'tshirt-vote'
  });
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/admin/login');
    });
  }, [router, supabase]);

  const templates = {
    'tshirt-vote': {
      name: 'T-Shirt Vote',
      subject: 'Vote on Gulf Coast Charters logo shirts (big back logo + pocket front)',
      body: `Hey {name},

I'm finalizing Gulf Coast Charters T‑shirts and I've settled on one style:

- Big GCC logo on the back
- Small GCC logo + short slogan on the front pocket area

No extra artwork—just our real logo, clean and professional.

What I need from you

Please reply with:

1) Which front pocket slogan do you like best?
   (all with a small GCC logo next to or above the text)

   A) "Gulf Coast Charters – Captain's Crew"
   B) "Gulf Coast Charters – Life's Better on the Water"
   C) "Gulf Coast Charters – Reel Adventures"
   D) "Gulf Coast Charters – Est. 2024"

2) Shirt color(s) you'd actually wear
   - White
   - Navy
   - Black
   - Heather gray
   - Light blue
   - Other: _________

3) Size
   - S / M / L / XL / XXL / other

A short reply like this is perfect:
Back logo + C, navy or heather gray, XL

Thanks for helping me lock this in,
Shane
Gulf Coast Charters`
    },
    'custom': {
      name: 'Custom Email',
      subject: '',
      body: ''
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const template = templates[templateId as keyof typeof templates];
    setFormData({
      ...formData,
      template: templateId,
      name: template.name,
      subject: template.subject,
      body: template.body
    });
  };

  const importAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (data.users && data.users.length > 0) {
        const emails = data.users.map((u: any) => u.email).filter(Boolean).join(', ');
        setFormData({ ...formData, recipients: emails });
        alert(`Imported ${data.users.length} user emails`);
      } else {
        alert('No users found');
      }
    } catch (error: any) {
      alert(`Error importing users: ${error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          recipients: formData.recipients,
          sendNow: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create campaign');
      }

      const data = await response.json();
      alert(`Campaign created! Sending to ${data.recipientCount} recipients...`);
      router.push('/admin/campaigns');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>New Campaign - Admin - Gulf Coast Charters</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => router.push('/admin/campaigns')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to Campaigns
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Campaign</h1>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8 space-y-6">
            {/* Template Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Template
              </label>
              <select
                value={formData.template}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="tshirt-vote">T-Shirt Vote</option>
                <option value="custom">Custom Email</option>
              </select>
            </div>

            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., T-Shirt Vote - December 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Subject line"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                placeholder="Email content... Use {name} for personalization"
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Use {'{name}'} and {'{email}'} for personalization
              </p>
            </div>

            {/* Recipients */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Recipients (comma-separated emails)
                </label>
                <button
                  type="button"
                  onClick={importAllUsers}
                  disabled={loadingUsers}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold disabled:opacity-50"
                >
                  {loadingUsers ? 'Loading...' : '📥 Import All Users'}
                </button>
              </div>
              <textarea
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                placeholder="email1@example.com, email2@example.com"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Or click "Import All Users" to load all registered emails
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
              >
                Send Now
              </button>
              <button
                type="button"
                onClick={() => alert('Schedule feature coming soon!')}
                className="flex-1 bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 font-semibold"
              >
                Schedule for Later
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/campaigns')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

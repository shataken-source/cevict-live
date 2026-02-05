import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Key, Eye, AlertTriangle, CheckCircle, Activity, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EnterpriseSecurityDashboard() {
  const securityFeatures = [
    { icon: Shield, title: 'SSL/TLS Encryption', status: 'Active', color: 'text-green-600' },
    { icon: Lock, title: 'Two-Factor Authentication', status: 'Enabled', color: 'text-green-600' },
    { icon: Key, title: 'Passkey/WebAuthn', status: 'Active', color: 'text-green-600' },
    { icon: Eye, title: 'Session Monitoring', status: 'Active', color: 'text-green-600' },
    { icon: AlertTriangle, title: 'Rate Limiting', status: 'Active', color: 'text-green-600' },
    { icon: CheckCircle, title: 'Row Level Security', status: 'Enabled', color: 'text-green-600' },
    { icon: Activity, title: 'Audit Logging', status: 'Active', color: 'text-green-600' },
    { icon: UserCheck, title: 'OAuth 2.0', status: 'Configured', color: 'text-green-600' }
  ];

  const recentAlerts = [
    { type: 'info', message: 'Successful login from new device', time: '2 min ago' },
    { type: 'warning', message: 'Rate limit reached for IP 192.168.1.1', time: '15 min ago' },
    { type: 'success', message: 'Database backup completed', time: '1 hour ago' }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Shield className="w-8 h-8" />
            Enterprise Security Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold">100%</div>
          <p className="text-green-100 mt-2">All security features operational</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {securityFeatures.map((feature, idx) => (
          <Card key={idx}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{feature.title}</p>
                  <p className={`text-lg font-bold ${feature.color}`}>{feature.status}</p>
                </div>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAlerts.map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'success' ? 'bg-green-500' : 
                    alert.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <p className="text-sm">{alert.message}</p>
                </div>
                <span className="text-xs text-gray-500">{alert.time}</span>
              </div>
            ))}
          </div>
          <Button className="w-full mt-4" variant="outline">View All Security Logs</Button>
        </CardContent>
      </Card>
    </div>
  );
}

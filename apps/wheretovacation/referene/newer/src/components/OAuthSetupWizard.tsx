import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OAuthSetupWizard() {
  const [providers, setProviders] = useState<any>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    checkProviders();
  }, []);

  const checkProviders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setProviders({
        google: false,
        github: false,
        email: !!user
      });
    } catch (error) {
      console.error('Error checking providers:', error);
    }
  };

  const testProvider = async (provider: string) => {
    setTesting(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo: `${window.location.origin}/` }
      });
      
      if (error) {
        setTestResults({ ...testResults, [provider]: { success: false, message: error.message } });
      } else {
        setTestResults({ ...testResults, [provider]: { success: true, message: 'Redirect initiated' } });
      }
    } catch (error: any) {
      setTestResults({ ...testResults, [provider]: { success: false, message: error.message } });
    } finally {
      setTesting(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const redirectUrl = `${window.location.origin}/`;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">OAuth Setup Wizard</h1>
        <p className="text-muted-foreground">Configure authentication providers step-by-step</p>
      </div>

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="google">Google</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="test">Test & Validate</TabsTrigger>
        </TabsList>

        <TabsContent value="google" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google OAuth Setup</CardTitle>
              <CardDescription>Follow these steps to enable Google authentication</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Go to Google Cloud Console</h3>
                    <p className="text-sm text-muted-foreground mb-2">Create a new project or select existing one</p>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">
                        Open Console <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Enable Google+ API</h3>
                    <p className="text-sm text-muted-foreground">Navigate to APIs & Services → Enable APIs and Services → Search for "Google+ API"</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Create OAuth Credentials</h3>
                    <p className="text-sm text-muted-foreground mb-2">Go to Credentials → Create Credentials → OAuth Client ID → Web Application</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Add Authorized Redirect URI</h3>
                    <div className="bg-muted p-3 rounded-md mt-2 flex items-center justify-between">
                      <code className="text-sm break-all">{`https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`, 'google-redirect')}>
                        {copied === 'google-redirect' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Replace [YOUR-PROJECT-REF] with your Supabase project reference</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">5</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Configure Supabase</h3>
                    <p className="text-sm text-muted-foreground mb-2">Go to Supabase Dashboard → Authentication → Providers → Google</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Enable Google provider</li>
                      <li>Paste Client ID from Google Console</li>
                      <li>Paste Client Secret from Google Console</li>
                      <li>Save changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to add your site URL to Authorized JavaScript origins in Google Console
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub OAuth Setup</CardTitle>
              <CardDescription>Configure GitHub authentication provider</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Go to GitHub Settings</h3>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer">
                        Open GitHub Settings <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Create OAuth App</h3>
                    <p className="text-sm text-muted-foreground">Click "New OAuth App" and fill in the details</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Set Authorization Callback URL</h3>
                    <div className="bg-muted p-3 rounded-md mt-2 flex items-center justify-between">
                      <code className="text-sm break-all">{`https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`}</code>
                      <Button size="sm" variant="ghost" onClick={() => copyToClipboard(`https://[YOUR-PROJECT-REF].supabase.co/auth/v1/callback`, 'github-redirect')}>
                        {copied === 'github-redirect' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">4</div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Configure Supabase</h3>
                    <p className="text-sm text-muted-foreground">Add Client ID and Client Secret to Supabase Dashboard → Authentication → Providers → GitHub</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test OAuth Providers</CardTitle>
              <CardDescription>Validate your OAuth configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">Google OAuth</div>
                    {testResults.google && (
                      <Badge variant={testResults.google.success ? "default" : "destructive"}>
                        {testResults.google.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {testResults.google.message}
                      </Badge>
                    )}
                  </div>
                  <Button onClick={() => testProvider('google')} disabled={testing === 'google'}>
                    {testing === 'google' ? 'Testing...' : 'Test Google'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold">GitHub OAuth</div>
                    {testResults.github && (
                      <Badge variant={testResults.github.success ? "default" : "destructive"}>
                        {testResults.github.success ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                        {testResults.github.message}
                      </Badge>
                    )}
                  </div>
                  <Button onClick={() => testProvider('github')} disabled={testing === 'github'}>
                    {testing === 'github' ? 'Testing...' : 'Test GitHub'}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Test buttons will initiate OAuth flow. If configured correctly, you'll be redirected to the provider's login page.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

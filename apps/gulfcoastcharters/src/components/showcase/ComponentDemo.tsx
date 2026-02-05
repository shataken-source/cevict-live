/**
 * ComponentDemo - Wrapper for individual component demonstrations
 * Displays live example, props controls, and code snippet
 */
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface ComponentDemoProps {
  title: string;
  description: string;
  category: string;
  children: React.ReactNode;
  code: string;
  controls?: React.ReactNode;
}

export function ComponentDemo({ title, description, category, children, code, controls }: ComponentDemoProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{category}</span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="preview">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="code">Code</TabsTrigger>
            {controls && <TabsTrigger value="controls">Controls</TabsTrigger>}
          </TabsList>
          <TabsContent value="preview" className="p-6 border rounded-lg bg-gray-50">
            {children}
          </TabsContent>
          <TabsContent value="code" className="relative">
            <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{code}</code>
            </pre>
          </TabsContent>
          {controls && (
            <TabsContent value="controls" className="p-4 border rounded-lg">
              {controls}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}

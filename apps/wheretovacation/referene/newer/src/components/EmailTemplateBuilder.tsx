import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sanitizeHtml } from '@/lib/security';

interface EmailBlock {
  id: string;
  type: 'header' | 'text' | 'image' | 'button' | 'divider';
  content: string;
  styles?: Record<string, string>;
}

interface EmailTemplateBuilderProps {
  onSave: (template: { subject: string; html: string; preview: string }) => void;
}

const EmailTemplateBuilder: React.FC<EmailTemplateBuilderProps> = ({ onSave }) => {
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [subject, setSubject] = useState('');
  const [previewText, setPreviewText] = useState('');

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: `block-${Date.now()}`,
      type,
      content: type === 'header' ? 'Header Text' : type === 'text' ? 'Your text here...' : 
               type === 'button' ? 'Click Here' : type === 'image' ? 'https://via.placeholder.com/600x300' : '',
      styles: {}
    };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, content: string) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const generateHTML = () => {
    let html = `<!DOCTYPE html><html><head><style>body{font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;}</style></head><body>`;
    blocks.forEach(block => {
      if (block.type === 'header') html += `<h1 style="color:#1e40af;font-size:28px;">${block.content}</h1>`;
      else if (block.type === 'text') html += `<p style="line-height:1.6;color:#333;">${block.content}</p>`;
      else if (block.type === 'image') html += `<img src="${block.content}" style="max-width:100%;height:auto;" />`;
      else if (block.type === 'button') html += `<a href="#" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;">${block.content}</a>`;
      else if (block.type === 'divider') html += `<hr style="border:1px solid #e5e7eb;margin:20px 0;" />`;
    });
    html += `</body></html>`;
    return html;
  };

  const handleSave = () => {
    onSave({ subject, html: generateHTML(), preview: previewText });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <CardHeader><CardTitle>Add Blocks</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button onClick={() => addBlock('header')} className="w-full" variant="outline">+ Header</Button>
          <Button onClick={() => addBlock('text')} className="w-full" variant="outline">+ Text</Button>
          <Button onClick={() => addBlock('image')} className="w-full" variant="outline">+ Image</Button>
          <Button onClick={() => addBlock('button')} className="w-full" variant="outline">+ Button</Button>
          <Button onClick={() => addBlock('divider')} className="w-full" variant="outline">+ Divider</Button>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Email Builder</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="build">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="build">Build</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="build" className="space-y-4">
              <Input placeholder="Subject Line" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Input placeholder="Preview Text" value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
              <div className="space-y-3 border rounded-lg p-4 min-h-[300px]">
                {blocks.map(block => (
                  <div key={block.id} className="border p-3 rounded bg-white">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500">{block.type.toUpperCase()}</span>
                      <Button size="sm" variant="ghost" onClick={() => deleteBlock(block.id)}>Delete</Button>
                    </div>
                    {block.type === 'text' || block.type === 'header' ? (
                      <Textarea value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} rows={2} />
                    ) : (
                      <Input value={block.content} onChange={(e) => updateBlock(block.id, e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={handleSave} className="w-full">Save Template</Button>
            </TabsContent>
            <TabsContent value="preview">
              <div className="border rounded-lg p-4 bg-gray-50" dangerouslySetInnerHTML={{ __html: sanitizeHtml(generateHTML()) }} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailTemplateBuilder;

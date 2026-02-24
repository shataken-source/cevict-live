'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle2, X, AlertCircle, Loader2, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function BulkImportPage() {
  const router = useRouter();
  const [shelterId, setShelterId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check login on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('shelter_id');
      if (!id) {
        router.push('/petreunion/shelter/login');
        return;
      }
      setShelterId(id);
    }
  }, [router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setPreview(null);
    setImportResult(null);

    // Determine format from file extension
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      setFormat('csv');
    } else if (ext === 'json') {
      setFormat('json');
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setFileContent(content);

      // Preview the file
      try {
        const response = await fetch(`/api/petreunion/shelter/bulk-import?content=${encodeURIComponent(content)}&format=${format}`);
        const data = await response.json();
        
        if (data.success) {
          setPreview(data);
        } else {
          setErrors([data.error || 'Failed to parse file']);
        }
      } catch (error: any) {
        setErrors([error.message || 'Failed to preview file']);
      }
    };
    reader.onerror = () => {
      setErrors(['Failed to read file']);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!fileContent || !shelterId) {
      setErrors(['Please select a file first']);
      return;
    }

    setLoading(true);
    setErrors([]);
    setImportResult(null);

    try {
      // Parse the content
      let pets: any[] = [];
      
      if (format === 'csv') {
        const lines = fileContent.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV file must have at least a header row and one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            if (values[index]) {
              row[header] = values[index];
            }
          });
          if (Object.keys(row).length > 0) {
            pets.push(row);
          }
        }
      } else {
        const parsed = JSON.parse(fileContent);
        pets = Array.isArray(parsed) ? parsed : (parsed.pets || []);
      }

      if (pets.length === 0) {
        throw new Error('No pets found in file');
      }

      // Import
      const response = await fetch('/api/petreunion/shelter/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pets,
          shelter_id: shelterId,
          format
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setImportResult(result);
      } else {
        setErrors([result.error || 'Import failed']);
        if (result.errors) {
          setErrors(prev => [...prev, ...result.errors]);
        }
      }
    } catch (error: any) {
      setErrors([error.message || 'Failed to import pets']);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type: 'csv' | 'json') => {
    if (type === 'csv') {
      const csv = `pet_name,pet_type,breed,color,size,location_city,location_state,age,gender,description,photo_url,status
Buddy,dog,Labrador Retriever,Golden,large,Albertville,Alabama,2 years,male,Friendly and playful,https://example.com/buddy.jpg,found
Fluffy,cat,Persian,White,small,Birmingham,Alabama,1 year,female,Calm and affectionate,https://example.com/fluffy.jpg,found`;
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pet-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const json = {
        pets: [
          {
            pet_name: 'Buddy',
            pet_type: 'dog',
            breed: 'Labrador Retriever',
            color: 'Golden',
            size: 'large',
            location_city: 'Albertville',
            location_state: 'Alabama',
            age: '2 years',
            gender: 'male',
            description: 'Friendly and playful',
            photo_url: 'https://example.com/buddy.jpg',
            status: 'found'
          },
          {
            pet_name: 'Fluffy',
            pet_type: 'cat',
            breed: 'Persian',
            color: 'White',
            size: 'small',
            location_city: 'Birmingham',
            location_state: 'Alabama',
            age: '1 year',
            gender: 'female',
            description: 'Calm and affectionate',
            photo_url: 'https://example.com/fluffy.jpg',
            status: 'found'
          }
        ]
      };
      
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pet-import-template.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href="/petreunion/shelter/dashboard" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Bulk Import Pets
          </h1>
          <p className="text-gray-600 text-lg">
            Upload your entire pet database at once using CSV or JSON format
          </p>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Download a template file (CSV or JSON) below</li>
              <li>Fill in your pet data using the template format</li>
              <li>Upload your file using the form below</li>
              <li>Preview the data to ensure it's correct</li>
              <li>Click "Import All Pets" to add them to the database</li>
            </ol>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" onClick={() => downloadTemplate('csv')}>
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
              <Button variant="outline" onClick={() => downloadTemplate('json')}>
                <Download className="w-4 h-4 mr-2" />
                Download JSON Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Pet Database</CardTitle>
            <CardDescription>
              Supported formats: CSV, JSON. Maximum file size: 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                {file ? (
                  <div>
                    <p className="text-gray-900 font-semibold">{file.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
                    <p className="text-sm text-gray-500">CSV or JSON file</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {file && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFile(null);
                      setFileContent('');
                      setPreview(null);
                      setImportResult(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear File
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <Eye className="w-5 h-5" />
                Preview ({preview.totalRows} pets found)
              </CardTitle>
              <CardDescription>
                Review the first {preview.preview.length} pets to ensure data is correct
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {preview.preview.map((item: any) => (
                  <div
                    key={item.row}
                    className={`p-4 rounded-lg border ${
                      item.valid
                        ? 'bg-white border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {item.valid ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-semibold">Row {item.row}</span>
                      </div>
                      {item.valid && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Valid
                        </span>
                      )}
                    </div>
                    {item.valid ? (
                      <div className="text-sm text-gray-700 space-y-1">
                        <p><strong>Name:</strong> {item.pet.pet_name || 'N/A'}</p>
                        <p><strong>Type:</strong> {item.pet.pet_type} • <strong>Breed:</strong> {item.pet.breed} • <strong>Color:</strong> {item.pet.color}</p>
                        <p><strong>Location:</strong> {item.pet.location_city}, {item.pet.location_state}</p>
                      </div>
                    ) : (
                      <div className="text-sm text-red-700">
                        <p className="font-semibold mb-1">Errors:</p>
                        <ul className="list-disc list-inside">
                          {item.errors.map((err: string, i: number) => (
                            <li key={i}>{err}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-1">
                {errors.map((error, i) => (
                  <p key={i} className="text-red-700">{error}</p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Import Result */}
        {importResult && (
          <Card className={`mb-6 ${
            importResult.summary.errors > 0
              ? 'border-yellow-200 bg-yellow-50'
              : 'border-green-200 bg-green-50'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.summary.errors === 0 ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-600" />
                )}
                Import Complete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{importResult.summary.total}</p>
                    <p className="text-sm text-gray-600">Total Rows</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">{importResult.summary.imported}</p>
                    <p className="text-sm text-gray-600">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{importResult.summary.skipped}</p>
                    <p className="text-sm text-gray-600">Skipped</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{importResult.summary.errors}</p>
                    <p className="text-sm text-gray-600">Errors</p>
                  </div>
                </div>
                <p className="text-gray-700">{importResult.message}</p>
                <Link href="/petreunion/shelter/dashboard">
                  <Button className="w-full">
                    View Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {file && preview && preview.totalRows > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={handleImport}
                disabled={loading}
                size="lg"
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importing {preview.totalRows} Pets...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    Import All {preview.totalRows} Pets
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


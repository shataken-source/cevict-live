export const handleFileUpload = async (
  file: File,
  docType: string,
  captainId: string,
  supabase: any,
  processOCR: (url: string, type: string) => Promise<any>
) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${captainId}/${docType}-${Date.now()}.${fileExt}`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('captain-documents')
    .upload(fileName, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('captain-documents')
    .getPublicUrl(fileName);

  const ocrData = await processOCR(publicUrl, docType);

  const { data: { user } } = await supabase.auth.getUser();
  
  const { error: dbError } = await supabase
    .from('captain_documents')
    .insert({
      captain_id: user.id,
      type: docType,
      name: file.name,
      url: publicUrl,
      status: 'pending',
      expiry_date: ocrData?.expirationDate || null,
      ocr_data: ocrData,
      uploaded_at: new Date().toISOString()
    });

  if (dbError) throw dbError;

  return { publicUrl, ocrData };
};

export const getExpiryStatus = (expiryDate: string | null) => {
  if (!expiryDate) return 'pending';
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil < 0) return 'expired';
  if (daysUntil <= 30) return 'expiring_soon';
  return 'verified';
};

export const getDaysUntilExpiry = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

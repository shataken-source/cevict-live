import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export function PhotoGuidelines() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo Upload Guidelines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-green-700 flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5" />
            Acceptable Content
          </h3>
          <ul className="space-y-1 text-sm text-gray-600 ml-7">
            <li>• Fishing catches and trophy fish</li>
            <li>• Charter boat experiences and activities</li>
            <li>• Scenic ocean and coastal views</li>
            <li>• Family-friendly group photos</li>
            <li>• Marine wildlife and nature</li>
            <li>• Boat and equipment photos</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-red-700 flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5" />
            Prohibited Content
          </h3>
          <ul className="space-y-1 text-sm text-gray-600 ml-7">
            <li>• Inappropriate or offensive material</li>
            <li>• Copyrighted images without permission</li>
            <li>• Spam or promotional content</li>
            <li>• Low quality or blurry images</li>
            <li>• Duplicate submissions</li>
            <li>• Unrelated content</li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-yellow-700 flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5" />
            Quality Standards
          </h3>
          <ul className="space-y-1 text-sm text-gray-600 ml-7">
            <li>• Minimum resolution: 800x600 pixels</li>
            <li>• Clear, well-lit photos preferred</li>
            <li>• Accurate captions and tags</li>
            <li>• Proper location information</li>
            <li>• Respectful of privacy</li>
          </ul>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            All photos are reviewed by our moderation team before appearing in the gallery. 
            You'll receive a notification once your photo is approved or if any issues are found.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { NextRequest, NextResponse } from 'next/server';
import type { ScenarioResults } from '@/app/lib/solar-core/scenarioCalculator';

/**
 * POST /api/scenarios/pdf
 * Generate HTML report that can be converted to PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title = 'Solar System Report',
      systemName,
      currentResults,
      proposedResults,
      monthlyData,
    } = body;

    if (!systemName || !currentResults) {
      return NextResponse.json(
        { error: 'Missing systemName or currentResults' },
        { status: 400 }
      );
    }

    const generatedDate = new Date().toISOString().split('T')[0];

    // Generate HTML string directly (no JSX in .ts file)
    const fullHTML = generatePDFHTML({
      title,
      systemName,
      generatedDate,
      currentResults,
      proposedResults,
      monthlyData,
    });

    return NextResponse.json(
      {
        html: fullHTML,
        message: 'PDF report generated',
        filename: `${systemName}-report-${generatedDate}.html`,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('Failed to generate PDF:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generatePDFHTML(params: {
  title: string;
  systemName: string;
  generatedDate: string;
  currentResults: ScenarioResults;
  proposedResults?: ScenarioResults;
  monthlyData?: any[];
}) {
  const { title, systemName, generatedDate, currentResults, proposedResults, monthlyData } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${systemName} - Solar Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @media print {
            .page-break {
                page-break-after: always;
            }
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: #111827;
        }
    </style>
</head>
<body>
    <div id="report" class="bg-white text-gray-900">
        <!-- PAGE 1 -->
        <div class="page-break p-12 border-b-4 border-gray-200">
            <div class="mb-12 border-b-2 border-green-500 pb-6">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">☀️ ${title}</h1>
                <p class="text-xl text-gray-600 mb-2">${systemName}</p>
                <p class="text-sm text-gray-500">Generated: ${generatedDate}</p>
            </div>

            <div class="mb-12">
                <h2 class="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">📊 Key Metrics</h2>
                
                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-gray-100 p-6 rounded">
                        <p class="text-xs text-gray-600 mb-2 font-semibold">Annual Production</p>
                        <p class="text-3xl font-bold text-gray-900">${currentResults.annualProductionKWh.toLocaleString()}<span class="text-lg text-gray-500 ml-2">kWh</span></p>
                    </div>
                    <div class="bg-gray-100 p-6 rounded">
                        <p class="text-xs text-gray-600 mb-2 font-semibold">Daily Average</p>
                        <p class="text-3xl font-bold text-gray-900">${currentResults.dailyAverageKWh}<span class="text-lg text-gray-500 ml-2">kWh</span></p>
                    </div>
                </div>
            </div>

            <div class="mb-12">
                <h2 class="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">💰 Financial Summary</h2>
                
                <div class="bg-indigo-100 border-l-4 border-indigo-600 p-6 rounded mb-6">
                    <p class="text-sm text-indigo-700 mb-2 font-semibold">20-Year ROI</p>
                    <p class="text-4xl font-bold text-indigo-600">$${currentResults.twentyYearROI.toLocaleString()}</p>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-gray-100 p-6 rounded">
                        <p class="text-xs text-gray-600 mb-2 font-semibold">Annual Savings</p>
                        <p class="text-3xl font-bold text-green-600">$${currentResults.annualSavings.toLocaleString()}</p>
                    </div>
                    <div class="bg-gray-100 p-6 rounded">
                        <p class="text-xs text-gray-600 mb-2 font-semibold">Payback Period</p>
                        <p class="text-3xl font-bold text-gray-900">${currentResults.paybackYears}<span class="text-lg text-gray-500 ml-2">years</span></p>
                    </div>
                </div>
            </div>

            <div>
                <h2 class="text-2xl font-bold text-green-600 mb-6 pb-2 border-b border-gray-200">⚡ Voltage Safety</h2>
                ${currentResults.coldWeatherWarnings
                  .map((warning) => {
                    if (warning.severity === 'info' && warning.type === 'voc_safe') {
                      return `<div class="bg-green-50 border-l-4 border-green-600 p-4 rounded mb-4">
                        <p class="font-bold text-green-900 mb-2">${warning.title}</p>
                        <p class="text-sm text-green-800">${warning.message}</p>
                      </div>`;
                    }
                    return `<div class="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded mb-4">
                      <p class="font-bold text-yellow-900 mb-2">${warning.title}</p>
                      <p class="text-sm text-yellow-800">${warning.message}</p>
                    </div>`;
                  })
                  .join('')}
            </div>
        </div>

        <!-- PAGE 3: Recommendations -->
        <div class="page-break p-12">
            <div class="mb-12 border-b-2 border-green-500 pb-6">
                <h1 class="text-3xl font-bold text-gray-900">🎯 Recommendations</h1>
            </div>

            <div class="space-y-6">
                <div class="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded">
                    <h3 class="font-bold text-yellow-900 mb-2 text-lg">1. Tilt Angle Optimization</h3>
                    <p class="text-sm text-yellow-800">Consider adjustable mounting to optimize for seasonal peaks.</p>
                </div>

                <div class="bg-yellow-50 border-l-4 border-yellow-600 p-6 rounded">
                    <h3 class="font-bold text-yellow-900 mb-2 text-lg">2. Cold Weather Voltage Management</h3>
                    <p class="text-sm text-yellow-800">Ensure your system protection is properly configured for winter months.</p>
                </div>

                <div class="bg-green-50 border-l-4 border-green-600 p-6 rounded">
                    <h3 class="font-bold text-green-900 mb-2 text-lg">✅ System Optimization</h3>
                    <p class="text-sm text-green-800">Your system is operating efficiently. Continue regular monitoring.</p>
                </div>
            </div>

            <div class="mt-12 pt-6 border-t border-gray-300 text-center text-xs text-gray-600">
                <p>Generated by Accu Solar Command on ${generatedDate}</p>
                <p>For support: support@accusolarcmd.com</p>
            </div>
        </div>
    </div>

    <script>
        if (typeof window !== 'undefined') {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    </script>
</body>
</html>
  `;
}

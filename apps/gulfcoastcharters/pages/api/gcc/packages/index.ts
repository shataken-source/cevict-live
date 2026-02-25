/**
 * Smart Vacation Package API (Pages Router style)
 * POST /api/gcc/packages - Create package
 * GET  /api/gcc/packages?customerId=... - Get customer packages
 *
 * NOTE: This file lives under `pages/api`, so it must export a default
 * Next.js API route handler (NextApiRequest/NextApiResponse), not App
 * Router `NextRequest`/`NextResponse`.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createVacationPackage, getCustomerPackages } from '@/lib/smart-vacation-packages';
import { getAuthedUser } from '../../_lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { user, error: authError } = await getAuthedUser(req, res);
      if (authError || !user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
      }

      const {
        customerId,
        packageName,
        charterId,
        rentalId,
        startDate,
        endDate,
        location,
      } = req.body || {};

      if (!customerId || !packageName || !startDate || !endDate || !location) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customerId, packageName, startDate, endDate, location',
        });
      }

      const vacationPackage = await createVacationPackage({
        customerId,
        packageName,
        charterId,
        rentalId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
      });

      if (!vacationPackage) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create vacation package',
        });
      }

      return res.status(200).json({
        success: true,
        data: vacationPackage,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  if (req.method === 'GET') {
    try {
      const customerId = String(req.query.customerId || '').trim();

      if (!customerId) {
        return res.status(400).json({
          success: false,
          error: 'Missing customerId parameter',
        });
      }

      const packages = await getCustomerPackages(customerId);

      return res.status(200).json({
        success: true,
        data: packages,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message || 'Internal server error',
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, error: 'Method Not Allowed' });
}

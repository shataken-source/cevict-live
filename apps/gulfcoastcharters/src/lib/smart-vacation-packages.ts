/**
 * Smart Vacation Packages – minimal implementation
 *
 * NOTE: This is a lightweight, non-persistent implementation to satisfy
 * API usage from `/pages/api/gcc/packages` and `/pages/api/gcc/packages/recommend`.
 * It can be wired to real Supabase tables defined in
 * `20260208_smart_vacation_packages.sql` when you're ready to persist data.
 */

export interface VacationPackageInput {
  customerId: string;
  packageName: string;
  charterId?: string | null;
  rentalId?: string | null;
  startDate: Date;
  endDate: Date;
  location: string;
}

export interface VacationPackage extends VacationPackageInput {
  id: string;
  createdAt: string;
}

/**
 * Create a vacation package.
 * Currently returns an in-memory object; does not persist.
 */
export async function createVacationPackage(input: VacationPackageInput): Promise<VacationPackage> {
  return {
    ...input,
    id: `pkg_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Get customer packages.
 * Currently returns an empty list; wire to Supabase when ready.
 */
export async function getCustomerPackages(_customerId: string): Promise<VacationPackage[]> {
  return [];
}

/**
 * Generate a simple Finn-style package recommendation.
 * Returns a deterministic object with a `finn_reasoning` array used by the API.
 */
export async function generatePackageRecommendation(input: VacationPackageInput): Promise<VacationPackage & { finn_reasoning: string[] }> {
  const base = await createVacationPackage(input);
  const days = Math.max(
    1,
    Math.round((input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    ...base,
    finn_reasoning: [
      `This package keeps you based in ${input.location} for ${days} day${days === 1 ? '' : 's'},`,
      `with flexibility to mix charter (${input.charterId ? 'selected' : 'optional'}) and rental (${input.rentalId ? 'selected' : 'optional'}) experiences.`,
    ],
  };
}


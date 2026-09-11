export interface BestValueWeights {
  compatibility: number;
  mechanical: number;
  supplier_trust: number;
  price: number;
  mileage: number;
  year: number;
  documentation: number;
  logistics: number;
}

export const DEFAULT_BEST_VALUE_WEIGHTS: BestValueWeights = {
  compatibility: 30,
  mechanical: 20,
  supplier_trust: 15,
  price: 15,
  mileage: 5,
  year: 5,
  documentation: 5,
  logistics: 5,
};

export interface QuoteCandidate {
  id: string;
  compatibilityScore: number; // 0-100
  mechanicalScore: number; // 0-100
  supplierTrustScore: number; // 0-100
  totalPrice: number; // truck + dismantling + packing + inland + freight, normalized currency
  mileageKm: number | null;
  year: number | null;
  documentationCompletenessPct: number; // 0-100, share of RFQ items answered
  logisticsScore: number; // 0-100, derived from freight lead time / route reliability
}

export interface BestValueResult {
  id: string;
  score: number;
  breakdown: Record<keyof BestValueWeights, number>;
}

function validateWeights(weights: BestValueWeights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`Best value weights must sum to 100, got ${total}`);
  }
}

/** Lower price/mileage/older year score higher within the candidate set (relative ranking). */
export function rankQuotesByBestValue(
  candidates: QuoteCandidate[],
  weights: BestValueWeights = DEFAULT_BEST_VALUE_WEIGHTS,
): BestValueResult[] {
  validateWeights(weights);
  if (candidates.length === 0) return [];

  const prices = candidates.map((c) => c.totalPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const mileages = candidates.map((c) => c.mileageKm).filter((m): m is number => m !== null);
  const minMileage = mileages.length ? Math.min(...mileages) : 0;
  const maxMileage = mileages.length ? Math.max(...mileages) : 0;

  const years = candidates.map((c) => c.year).filter((y): y is number => y !== null);
  const minYear = years.length ? Math.min(...years) : 0;
  const maxYear = years.length ? Math.max(...years) : 0;

  function priceScore(price: number) {
    if (maxPrice === minPrice) return 100;
    return ((maxPrice - price) / (maxPrice - minPrice)) * 100;
  }
  function mileageScore(mileage: number | null) {
    if (mileage === null) return 0;
    if (maxMileage === minMileage) return 100;
    return ((maxMileage - mileage) / (maxMileage - minMileage)) * 100;
  }
  function yearScore(year: number | null) {
    if (year === null) return 0;
    if (maxYear === minYear) return 100;
    return ((year - minYear) / (maxYear - minYear)) * 100;
  }

  return candidates.map((c) => {
    const breakdown = {
      compatibility: (c.compatibilityScore / 100) * weights.compatibility,
      mechanical: (c.mechanicalScore / 100) * weights.mechanical,
      supplier_trust: (c.supplierTrustScore / 100) * weights.supplier_trust,
      price: (priceScore(c.totalPrice) / 100) * weights.price,
      mileage: (mileageScore(c.mileageKm) / 100) * weights.mileage,
      year: (yearScore(c.year) / 100) * weights.year,
      documentation: (c.documentationCompletenessPct / 100) * weights.documentation,
      logistics: (c.logisticsScore / 100) * weights.logistics,
    };
    const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));
    return { id: c.id, score: Math.min(100, Math.max(0, score)), breakdown };
  }).sort((a, b) => b.score - a.score);
}

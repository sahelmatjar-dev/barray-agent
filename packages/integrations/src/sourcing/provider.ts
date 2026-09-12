/** A sourcing provider turns a search query into raw listing candidates.
 * New sources (additional marketplaces, approved feeds) implement this same
 * interface — see docs/sourcing-providers.md for how to add one. */
export interface RawListing {
  platform: string;
  listingUrl: string;
  title: string;
  priceText: string | null;
  locationText: string | null;
  descriptionText: string | null;
  imageUrls: string[];
  scrapedAt: string;
}

export interface SourcingQuery {
  brand: string; // e.g. "SITRAK"
  models: string[]; // e.g. ["C7H", "G7", "C9H"]
  configurations: string[]; // e.g. ["8x4"]
}

export interface SourcingProvider {
  readonly name: string;
  search(query: SourcingQuery): Promise<RawListing[]>;
}

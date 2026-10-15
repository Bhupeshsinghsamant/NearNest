import { apiClient } from "./client";
import { Listing, PaginatedListings } from "../types";

export interface ListingFilterParams {
  type?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
  maxRent?: number;
  minRent?: number;
  vehicleType?: string;
  kind?: "lost" | "found";
  serviceCategory?: string;
}

export async function fetchListings(params: ListingFilterParams = {}): Promise<PaginatedListings> {
  const response = await apiClient.get<PaginatedListings>("/listings", { params });
  return response.data;
}

export async function fetchListingById(id: string): Promise<Listing> {
  const response = await apiClient.get<{ success: boolean; data: Listing }>(`/listings/${id}`);
  return response.data.data;
}

export async function createListing(data: Record<string, any>): Promise<Listing> {
  const response = await apiClient.post<{ success: boolean; data: Listing }>("/listings", data);
  return response.data.data;
}

export async function updateListing(id: string, data: Record<string, any>): Promise<Listing> {
  const response = await apiClient.patch<{ success: boolean; data: Listing }>(`/listings/${id}`, data);
  return response.data.data;
}

export async function deleteListing(id: string): Promise<{ success: boolean; deletedId: string }> {
  const response = await apiClient.delete<{ success: boolean; deletedId: string }>(`/listings/${id}`);
  return response.data;
}

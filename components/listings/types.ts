import type { ListingKind, RoomKind } from "@/lib/types";
import type { ListingStatus } from "@/lib/data/listings";

export type ListingWants = {
  propertyIds: string[];
  roomKinds: RoomKind[];
  maxPrice: number;
};

export type RoomListing = {
  id: string;
  ownerId: string;
  ownerName: string;
  university: string;
  propertyId: string;
  propertyName: string;
  roomKind: RoomKind;
  priceWeek: number;
  flatmates: number;
  contractWeeks: number;
  startDate: string;
  endDate: string;
  description: string;
  photos: string[];
  kind: ListingKind;
  wants: ListingWants;
  createdAt: string;
  likes?: number;
  likedByMe?: boolean;
  status?: ListingStatus;
  mutualMatch?: boolean;
};

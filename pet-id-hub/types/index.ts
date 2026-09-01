export type PetStatus = "normal" | "lost";

export type Badge =
  | "Vaccinated"
  | "Rescue"
  | "Friendly"
  | "Microchipped"
  | "Trained"
  | "Senior";

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  ageYears: number | null;
  photoUrl: string | null;
  medicalNotes: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  microchipId: string | null;
  status: PetStatus;
  lostSince: string | null;
  rewardNote: string | null;
  lastSeenLocation: string | null;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthLog {
  id: string;
  petId: string;
  logType: "vaccination" | "weight" | "medication";
  label: string;
  value: string | null;
  dueDate: string | null;
  loggedDate: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string | null; // denormalized at write time (Firestore has no joins)
  petId: string | null;
  content: string;
  photoUrl: string | null;
  isFlagged: boolean;
  isRemoved: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  fullName: string | null;
  city: string | null;
  phone: string | null;
  isAdmin: boolean;
  createdAt: string;
}

export interface QRScan {
  id: string;
  petId: string;
  scannedAt: string;
  finderMessage: string | null;
  finderContact: string | null;
  finderLat: number | null;
  finderLng: number | null;
}

export interface BroadcastAlert {
  id: string;
  petId: string | null;
  message: string;
  triggeredBy: string | null;
  isManual: boolean;
  createdAt: string;
}

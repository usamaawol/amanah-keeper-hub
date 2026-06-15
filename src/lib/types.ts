export type BorrowStatus = "Borrowed" | "Reading" | "Returned" | "Overdue";

export type BookType = "single" | "multi";

export interface BorrowRecord {
  id: string;
  libraryId: string;
  borrowerFullName: string;
  bookType: BookType;
  bookNameArabic: string;
  bookNameEnglish: string;
  sharhName: string | null;
  juzNumber: string | null;
  borrowDate: string; // ISO date (yyyy-mm-dd)
  expectedReturnDate: string;
  actualReturnDate: string | null;
  status: BorrowStatus;
  notes: string;
  createdAt: string; // ISO datetime
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Reservation {
  id: string;
  libraryId: string;
  bookKey: string; // normalized book identity
  bookNameArabic: string;
  bookNameEnglish: string;
  sharhName: string | null;
  juzNumber: string | null;
  queue: { name: string; addedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = "borrow" | "return" | "due" | "overdue" | "reservation";

export interface AppNotification {
  id: string;
  libraryId: string;
  type: NotificationType;
  messageEn: string;
  messageAr: string;
  createdAt: string;
  read: boolean;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: "visitor" | "admin";
  libraryId: string | null;
  libraryName: string | null;
  emailVerified: boolean;
}

export interface AppSettings {
  libraryName: string;
  openRouterKey: string;
  aiModel: string;
  firebaseConfig: string;
  // Detected/editable account info (from Google or manual edits).
  userDisplayName: string;
  userEmail: string;
  userPhotoURL: string;
}

export interface ReaderProfile {
  name: string;
  totalBorrowed: number;
  returned: number;
  currentlyBorrowed: number;
  books: string[];
}

import type { UserRole } from "./roles";

export type { UserRole } from "./roles";

export type BorrowStatus = "Borrowed" | "Reading" | "Returned" | "Overdue";

export type BookType = "single" | "multi";

export interface BorrowRecord {
  id: string;
  libraryId: string;
  borrowerFullName: string;
  phoneNumber: string | null;
  email: string | null;

  // Legacy fields (kept for backward compatibility with single-book records)
  bookType?: BookType;
  bookNameArabic?: string;
  bookNameEnglish?: string;
  sharhName?: string | null;
  juzNumber?: string | null;
  author?: string | null;

  // New multi-book support
  books?: BorrowedBook[];
  
  borrowDate: string; // ISO date (yyyy-mm-dd)
  expectedReturnDate: string;
  
  // Legacy status (kept for compatibility)
  status: BorrowStatus;
  actualReturnDate: string | null;
  
  notes: string;
  remarks: string | null;
  createdAt: string; // ISO datetime
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  /**
   * Links multiple BorrowRecords that were borrowed together in one transaction.
   * Records with the same transactionId belong to the same borrowing session.
   * Undefined on legacy records (single-book, pre-Feature 4).
   */
  transactionId?: string;
}

export interface BorrowedBook {
  id: string; // unique within the record
  bookType: BookType;
  bookNameArabic: string;
  bookNameEnglish: string;
  sharhName: string | null;
  juzNumber: string | null;
  author: string | null;
  status: BorrowStatus;
  actualReturnDate: string | null;
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

export type NotificationType = "borrow" | "return" | "due" | "overdue" | "reservation" | "support";

export interface AppNotification {
  id: string;
  libraryId: string;
  type: NotificationType;
  messageEn: string;
  messageAr: string;
  createdAt: string;
  read: boolean;
  /** Optional: sender info for support requests */
  fromEmail?: string;
  fromName?: string;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  /** From Firestore users/{uid}.role — never derived from email. */
  role: UserRole;
  disabled?: boolean;
  libraryId: string | null;
  libraryName: string | null;
  emailVerified: boolean;
}

export interface AppSettings {
  libraryName: string;
  firebaseConfig: string;
  // Detected/editable account info (from Google or manual edits).
  userDisplayName: string;
  userEmail: string;
  userPhotoURL: string;
  // UI preferences
  language?: string;
  theme?: string;
  updatedAt?: string;
  // Saved login credentials (never synced to cloud)
  savedEmail?: string;
  savedPassword?: string;
}

export interface ReaderProfile {
  name: string;
  totalBorrowed: number;
  returned: number;
  currentlyBorrowed: number;
  books: string[];
}


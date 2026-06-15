import { putBorrow, putReservation, uid } from "./db";
import type { BorrowRecord, Reservation } from "./types";
import { bookKey, nowISO } from "./store";

function addDays(d: string, n: number) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

export async function seedDemoData(libraryId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const mk = (
    borrowerFullName: string,
    bookNameEnglish: string,
    bookNameArabic: string,
    sharhName: string,
    juzNumber: string | null,
    offsetBorrow: number,
    span: number,
    returnOffset: number | null,
  ): BorrowRecord => {
    const borrowDate = addDays(today, offsetBorrow);
    const expectedReturnDate = addDays(borrowDate, span);
    const actualReturnDate = returnOffset !== null ? addDays(borrowDate, returnOffset) : null;
    return {
      id: uid(),
      libraryId,
      borrowerFullName,
      bookType: juzNumber !== null || sharhName ? "multi" : "single",
      bookNameEnglish,
      bookNameArabic,
      sharhName,
      juzNumber,
      borrowDate,
      expectedReturnDate,
      actualReturnDate,
      status: actualReturnDate ? "Returned" : "Borrowed",
      notes: "",
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
  };

  const records: BorrowRecord[] = [
    mk("Ahmed Mohammed Ali", "Bulugh al-Maram", "بلوغ المرام", "Subul al-Salam", "1", -40, 14, 10),
    mk("Ahmed Mohammed Ali", "Bulugh al-Maram", "بلوغ المرام", "Subul al-Salam", "2", -3, 14, null),
    mk("Mohammed Yusuf", "Riyad al-Salihin", "رياض الصالحين", "", "1", -20, 14, 12),
    mk("Mohammed Yusuf", "Bulugh al-Maram", "بلوغ المرام", "Subul al-Salam", "1", -1, 14, null),
    mk("Yusuf Ibrahim", "Al-Adab al-Mufrad", "الأدب المفرد", "", null, -25, 10, -15),
    mk("Ali Hassan", "Sahih al-Bukhari", "صحيح البخاري", "Fath al-Bari", "3", -2, 7, null),
    mk("Fatima Zahra", "Riyad al-Salihin", "رياض الصالحين", "", "2", -10, 14, null),
  ];

  for (const r of records) await putBorrow(r);

  const reserved = records.find((r) => r.juzNumber === "1" && r.bookNameEnglish === "Bulugh al-Maram" && !r.actualReturnDate);
  if (reserved) {
    const res: Reservation = {
      id: uid(),
      libraryId,
      bookKey: bookKey(reserved),
      bookNameArabic: reserved.bookNameArabic,
      bookNameEnglish: reserved.bookNameEnglish,
      sharhName: reserved.sharhName,
      juzNumber: reserved.juzNumber,
      queue: [
        { name: "Yusuf Ibrahim", addedAt: nowISO() },
        { name: "Ali Hassan", addedAt: nowISO() },
      ],
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    await putReservation(res);
  }
}

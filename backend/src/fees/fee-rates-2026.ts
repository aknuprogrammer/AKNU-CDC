/**
 * Adikavi Nannaya University (AKNU), Rajamahendravaram
 * Affiliation & College Development Council (CDC) Fee Structure for 2026-27.
 * ALL amounts stored strictly as integer PAISE (1 INR = 100 PAISE).
 */

export const FEE_RATES_2026_27 = {
  // Institutional Base Fees
  INSPECTION_FEE_PAISE: 8000 * 100, // 8,000 INR = 800,000 paise
  ICGS_FEE_PAISE: 1600 * 100, // 1,600 INR = 160,000 paise (Inter-Collegiate Games & Sports)

  // UG Rules
  UG: {
    // Affiliation slabs based on active student count
    AFFILIATION_SLABS: [
      { min: 1, max: 100, amountPaise: 5500 * 100 },
      { min: 101, max: 300, amountPaise: 8000 * 100 },
      { min: 301, max: 600, amountPaise: 16500 * 100 },
      { min: 601, max: 1000, amountPaise: 24500 * 100 },
      { min: 1001, max: Infinity, amountPaise: 27500 * 100 },
    ],
    // Section fees
    COMPUTER_SCIENCE_SECTION_PAISE: 3300 * 100, // 3,300 INR
    COMPUTER_ARTS_SECTION_PAISE: 1100 * 100, // 1,100 INR
    // Per-student tuition / affiliation charges
    YEAR_1_PAISE: 560 * 100, // 560 INR
    YEAR_OTHER_PAISE: 340 * 100, // 340 INR (Years 2, 3, 4)
    // Hostel fees
    HOSTEL_INSPECTION_PAISE: 5000 * 100, // 5,000 INR
    HOSTEL_RECOGNITION_RURAL_PAISE: 5500 * 100, // 5,500 INR
    HOSTEL_RECOGNITION_URBAN_PAISE: 11000 * 100, // 11,000 INR
  },

  // LAW Rules
  LAW: {
    YEAR_1_PAISE: 900 * 100, // 900 INR
    YEAR_OTHER_PAISE: 800 * 100, // 800 INR (Years 2, 3, 4, 5)
  },

  // Education & Physical Education (B.Ed, B.P.Ed, D.P.Ed)
  EDUCATION: {
    YEAR_1_PAISE: 1660 * 100, // 1,660 INR
    YEAR_2_PAISE: 560 * 100, // 560 INR
    STAFF_RATIFICATION_PAISE: 22000 * 100, // 22,000 INR
    AFFILIATION_SLABS: [
      { min: 1, max: 100, amountPaise: 22000 * 100 }, // 22,000 INR
      { min: 101, max: 200, amountPaise: 27500 * 100 }, // 27,500 INR
      { min: 201, max: Infinity, amountPaise: 33000 * 100 }, // 33,000 INR
    ],
  },

  // PG Rules (M.Sc, M.A, M.Com, MHRM, M.Sc CS)
  PG: {
    MSC_STUDENT_PAISE: 1300 * 100, // 1,300 INR
    MA_MCOM_MHRM_STUDENT_PAISE: 1200 * 100, // 1,200 INR
    MSC_COMP_SCI_STUDENT_PAISE: 1960 * 100, // 1,960 INR
    MQ_ARTS_STUDENT_PAISE: 3300 * 100, // 3,300 INR (Management Quota)
    MQ_SCIENCE_STUDENT_PAISE: 5500 * 100, // 5,500 INR (Management Quota)
  },

  // MBA & MCA
  MBA_MCA: {
    YEAR_1_PAISE: 1500 * 100,
    YEAR_2_PAISE: 1000 * 100,
    AFFILIATION_FLAT_PAISE: 25000 * 100,
  },
} as const;

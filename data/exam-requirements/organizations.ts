import type { Organization } from "./schema";

/** Recruitment bodies covered by the registry. Websites are official domains only. */
export const ORGANIZATIONS: Organization[] = [
  {
    id: "ssc",
    shortName: "SSC",
    name: "Staff Selection Commission",
    website: "https://ssc.gov.in",
    description: "Group B and C posts in central government ministries and departments (CGL, CHSL and others).",
  },
  {
    id: "upsc",
    shortName: "UPSC",
    name: "Union Public Service Commission",
    website: "https://upsc.gov.in",
    description: "Civil Services and other Group A examinations of the Government of India.",
  },
  {
    id: "ibps",
    shortName: "IBPS",
    name: "Institute of Banking Personnel Selection",
    website: "https://www.ibps.in",
    description: "Common recruitment processes for participating public sector banks.",
  },
  {
    id: "sbi",
    shortName: "SBI",
    name: "State Bank of India",
    website: "https://sbi.bank.in/web/careers",
    description: "SBI's own recruitment for Probationary Officers and Junior Associates.",
  },
  {
    id: "rrb",
    shortName: "RRB",
    name: "Railway Recruitment Boards",
    website: null,
    description: "Centralised Employment Notifications (CEN) published on the websites of the regional RRBs.",
  },
  {
    id: "other",
    shortName: "Other",
    name: "Other or custom requirements",
    website: null,
    description: "Enter the limits from any other notification yourself, or try the example preset.",
  },
];

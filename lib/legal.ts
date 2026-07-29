/**
 * Facts the legal pages interpolate. Kept in one file so filling in the company
 * details is a single edit rather than a hunt through three documents.
 *
 * ⚠️ The bracketed values below are PLACEHOLDERS and are rendered verbatim on
 * public pages. Replace every one before going live — a Terms page that names
 * "[COMPANY LEGAL NAME]" is worse than no Terms page.
 */

/** Registered legal entity that contracts with the customer. */
export const ENTITY = "[COMPANY LEGAL NAME]";

/** Registered address, shown for GDPR/LGPD controller identification. */
export const ADDRESS = "[REGISTERED ADDRESS]";

/** Governing law + venue for disputes, e.g. "the State of Delaware, USA". */
export const JURISDICTION = "[JURISDICTION]";

/** Where support, refund and privacy requests go. Already live in the product. */
export const SUPPORT_EMAIL = "support@getmodo.pro";

/** Trading name used throughout the product. */
export const BRAND = "Aperture";

/**
 * Shown as "Last updated" on all three documents. Bump this whenever the terms
 * change materially — and tell existing users, per the change clauses.
 */
export const LAST_UPDATED = "July 29, 2026";

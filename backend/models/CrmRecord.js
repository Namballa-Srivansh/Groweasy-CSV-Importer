export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

export const ALLOWED_CRM_STATUS = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
];

export const ALLOWED_DATA_SOURCE = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
];

export const FIELD_DESCRIPTIONS = {
  created_at: "Lead creation date/time. Must be parseable by JS `new Date()`, prefer ISO 8601 (YYYY-MM-DD HH:mm:ss).",
  name: "Full name of the lead.",
  email: "Primary email address.",
  country_code: "Phone country code, e.g. +91.",
  mobile_without_country_code: "Mobile number WITHOUT the country code.",
  company: "Company or organisation name, if present.",
  city: "City.",
  state: "State / province.",
  country: "Country.",
  lead_owner: "Person/agent who owns this lead (often an email or name).",
  crm_status: `One of: ${ALLOWED_CRM_STATUS.join(", ")}. Leave blank ("") if nothing in the row confidently maps to one of these.`,
  crm_note: "Free-text remarks, follow-up notes, extra phone numbers/emails beyond the primary one, or any useful info that doesn't fit elsewhere.",
  data_source: `One of: ${ALLOWED_DATA_SOURCE.join(", ")}. Leave blank ("") if nothing matches confidently.`,
  possession_time: "Property possession time/date, if this is real-estate related data.",
  description: "Any additional descriptive text about the lead that isn't a note.",
};

export function createEmptyCrmRecord() {
  return CRM_FIELDS.reduce((acc, field) => {
    acc[field] = "";
    return acc;
  }, {});
}

export function coerceToCrmRecord(raw = {}) {
  const record = createEmptyCrmRecord();
  for (const field of CRM_FIELDS) {
    if (typeof raw[field] === "string") {
      record[field] = raw[field].trim();
    }
  }
  return record;
}

export function isAllowedCrmStatus(value) {
  return ALLOWED_CRM_STATUS.includes(value);
}

export function isAllowedDataSource(value) {
  return ALLOWED_DATA_SOURCE.includes(value);
}

import { coerceToCrmRecord, isAllowedCrmStatus, isAllowedDataSource } from "../models/CrmRecord.js";

export function sanitizeRecord(raw) {
  const record = coerceToCrmRecord(raw);

  if (record.crm_status && !isAllowedCrmStatus(record.crm_status)) {
    record.crm_note = appendNote(record.crm_note, `(dropped invalid status: ${record.crm_status})`);
    record.crm_status = "";
  }

  if (record.data_source && !isAllowedDataSource(record.data_source)) {
    record.crm_note = appendNote(record.crm_note, `(dropped invalid data_source: ${record.data_source})`);
    record.data_source = "";
  }

  if (record.created_at) {
    const d = new Date(record.created_at);
    if (isNaN(d.getTime())) {
      record.crm_note = appendNote(record.crm_note, `(unparseable created_at cleared: ${record.created_at})`);
      record.created_at = "";
    }
  }

  const hasEmail = record.email && record.email.includes("@");
  const hasPhone = record.mobile_without_country_code && /\d{5,}/.test(record.mobile_without_country_code);
  if (!hasEmail && !hasPhone) {
    return null;
  }

  return record;
}

function appendNote(existing, addition) {
  return existing ? `${existing} ${addition}` : addition;
}

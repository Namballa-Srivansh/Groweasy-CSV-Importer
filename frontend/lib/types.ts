export type CrmRecord = {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
};

export type SkippedRecord = {
  index?: number;
  reason: string;
};

export type ImportResponse = {
  total_rows: number;
  total_imported: number;
  total_skipped: number;
  records: CrmRecord[];
  skipped_records: SkippedRecord[];
  warnings: string[];
  source_headers: string[];
};

export type Step = "upload" | "preview" | "processing" | "result";

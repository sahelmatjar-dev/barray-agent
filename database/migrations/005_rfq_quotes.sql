-- 005_rfq_quotes.sql

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  gmail_thread_id TEXT,
  requires_not_scrapped_declaration BOOLEAN NOT NULL DEFAULT true,
  follow_up_1_hours INT NOT NULL DEFAULT 48,
  follow_up_2_hours INT NOT NULL DEFAULT 120, -- +72h after follow-up 1
  no_response_hours INT NOT NULL DEFAULT 240, -- +5 days after follow-up 2
  sent_at TIMESTAMPTZ,
  follow_up_1_sent_at TIMESTAMPTZ,
  follow_up_2_sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','SENT','FOLLOWED_UP_1','FOLLOWED_UP_2','NO_RESPONSE','ANSWERED','CANCELLED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_rfqs_updated_at BEFORE UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_rfqs_opportunity ON rfqs (opportunity_id);

CREATE TABLE rfq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN (
    'DATA_FIELD','PHOTO_REQUEST','VIDEO_REQUEST','PRICE_REQUEST','DECLARATION'
  )),
  label TEXT NOT NULL, -- e.g. "VIN", "cold start video", "FOB Qingdao"
  is_required BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RECEIVED','MISSING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfq_items_rfq ON rfq_items (rfq_id);

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  source_email_id TEXT,
  truck_price NUMERIC(14,2),
  dismantling_price NUMERIC(14,2),
  packing_price NUMERIC(14,2),
  china_inland_transport_price NUMERIC(14,2),
  fob_qingdao_price NUMERIC(14,2),
  fob_shanghai_price NUMERIC(14,2),
  fob_ningbo_price NUMERIC(14,2),
  cif_tanger_med_price NUMERIC(14,2),
  cif_casablanca_price NUMERIC(14,2),
  inspection_price NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  not_officially_scrapped_declared BOOLEAN NOT NULL DEFAULT false,
  raw_text TEXT, -- original supplier text, kept for AI extraction audit trail
  extracted_by_ai BOOLEAN NOT NULL DEFAULT false,
  ai_extraction_confidence NUMERIC(5,2),
  best_value_score INT CHECK (best_value_score BETWEEN 0 AND 100),
  best_value_breakdown JSONB,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN (
    'RECEIVED','NEEDS_CLARIFICATION','RANKED','SUPERSEDED','ACCEPTED','REJECTED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_quotes_opportunity ON quotes (opportunity_id);

CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit_price NUMERIC(14,2),
  quantity INT NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_quote_items_quote ON quote_items (quote_id);

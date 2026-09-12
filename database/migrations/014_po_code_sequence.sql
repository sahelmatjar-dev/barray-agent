-- 014_po_code_sequence.sql
-- Auto-generates purchase_orders.code the same way opportunities.code and
-- donor_trucks.code are generated, so WF-014's PO generator never has to
-- invent a code in application code.

CREATE SEQUENCE purchase_order_code_seq_2026 START 1;

CREATE OR REPLACE FUNCTION generate_purchase_order_code()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT := 'purchase_order_code_seq_' || to_char(now(), 'YYYY');
  next_val BIGINT;
BEGIN
  IF NEW.code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF to_regclass(seq_name) IS NULL THEN
    EXECUTE format('CREATE SEQUENCE %I START 1', seq_name);
  END IF;
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  NEW.code := 'EBR-PO-' || to_char(now(), 'YYYY') || '-' || lpad(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_orders_code BEFORE INSERT ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION generate_purchase_order_code();

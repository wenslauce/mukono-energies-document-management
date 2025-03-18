-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'manager');
CREATE TYPE document_type AS ENUM (
  'invoice', 
  'tax_invoice', 
  'proforma_invoice', 
  'receipt', 
  'sales_receipt', 
  'cash_receipt', 
  'quote', 
  'estimate', 
  'credit_memo', 
  'credit_note', 
  'purchase_order', 
  'delivery_note'
);
CREATE TYPE document_status AS ENUM ('draft', 'final', 'paid', 'canceled', 'overdue');
CREATE TYPE currency AS ENUM ('KES', 'UGX', 'USD');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'manager',
  company_name TEXT,
  company_logo TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  default_currency currency DEFAULT 'UGX',
  signature TEXT,
  settings JSONB DEFAULT '{}'::JSONB
);

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tax_id TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  type document_type NOT NULL,
  status document_status NOT NULL DEFAULT 'draft',
  document_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  currency currency NOT NULL DEFAULT 'UGX',
  notes TEXT,
  terms TEXT,
  data JSONB DEFAULT '{}'::JSONB,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create document_items table
CREATE TABLE document_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(12, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_rate DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0
);

-- Create document_history table for tracking changes
CREATE TABLE document_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB
);

-- Create settings table for global settings
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  default_tax_rate DECIMAL(5, 2) DEFAULT 18,
  default_currency currency DEFAULT 'UGX',
  invoice_prefix TEXT DEFAULT 'INV-',
  receipt_prefix TEXT DEFAULT 'RCT-',
  quote_prefix TEXT DEFAULT 'QT-',
  estimate_prefix TEXT DEFAULT 'EST-',
  credit_note_prefix TEXT DEFAULT 'CN-',
  purchase_order_prefix TEXT DEFAULT 'PO-',
  delivery_note_prefix TEXT DEFAULT 'DN-',
  default_terms TEXT,
  default_notes TEXT,
  auto_numbering BOOLEAN DEFAULT TRUE,
  logo_url TEXT,
  signature_url TEXT
);

-- Create RLS policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Customers table policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- Documents table policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Document items table policies
ALTER TABLE document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document items"
  ON document_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_items.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own document items"
  ON document_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_items.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own document items"
  ON document_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_items.document_id
    AND documents.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own document items"
  ON document_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_items.document_id
    AND documents.user_id = auth.uid()
  ));

-- Document history table policies
ALTER TABLE document_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document history"
  ON document_history FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = document_history.document_id
    AND documents.user_id = auth.uid()
  ));

-- Settings table policies
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create functions for document numbering
CREATE OR REPLACE FUNCTION generate_document_number(doc_type document_type, user_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  last_number INTEGER;
  new_number INTEGER;
  result TEXT;
BEGIN
  -- Get the appropriate prefix based on document type and user settings
  SELECT 
    CASE 
      WHEN doc_type = 'invoice' THEN invoice_prefix
      WHEN doc_type = 'tax_invoice' THEN invoice_prefix
      WHEN doc_type = 'proforma_invoice' THEN invoice_prefix
      WHEN doc_type = 'receipt' THEN receipt_prefix
      WHEN doc_type = 'sales_receipt' THEN receipt_prefix
      WHEN doc_type = 'cash_receipt' THEN receipt_prefix
      WHEN doc_type = 'quote' THEN quote_prefix
      WHEN doc_type = 'estimate' THEN estimate_prefix
      WHEN doc_type = 'credit_memo' THEN credit_note_prefix
      WHEN doc_type = 'credit_note' THEN credit_note_prefix
      WHEN doc_type = 'purchase_order' THEN purchase_order_prefix
      WHEN doc_type = 'delivery_note' THEN delivery_note_prefix
      ELSE 'DOC-'
    END INTO prefix
  FROM settings
  WHERE settings.user_id = $2
  LIMIT 1;

  -- If no settings found, use default prefixes
  IF prefix IS NULL THEN
    prefix := CASE 
      WHEN doc_type = 'invoice' THEN 'INV-'
      WHEN doc_type = 'tax_invoice' THEN 'TINV-'
      WHEN doc_type = 'proforma_invoice' THEN 'PINV-'
      WHEN doc_type = 'receipt' THEN 'RCT-'
      WHEN doc_type = 'sales_receipt' THEN 'SRCT-'
      WHEN doc_type = 'cash_receipt' THEN 'CRCT-'
      WHEN doc_type = 'quote' THEN 'QT-'
      WHEN doc_type = 'estimate' THEN 'EST-'
      WHEN doc_type = 'credit_memo' THEN 'CM-'
      WHEN doc_type = 'credit_note' THEN 'CN-'
      WHEN doc_type = 'purchase_order' THEN 'PO-'
      WHEN doc_type = 'delivery_note' THEN 'DN-'
      ELSE 'DOC-'
    END;
  END IF;

  -- Find the last number used for this document type and user
  SELECT 
    COALESCE(
      MAX(
        NULLIF(
          REGEXP_REPLACE(
            SUBSTRING(document_number FROM LENGTH(prefix) + 1), 
            '[^0-9]', '', 'g'
          ), 
          ''
        )::INTEGER
      ), 
      0
    ) INTO last_number
  FROM documents
  WHERE 
    type = doc_type AND 
    user_id = $2 AND
    document_number LIKE prefix || '%';

  -- Generate the new number
  new_number := last_number + 1;
  
  -- Format the result
  result := prefix || LPAD(new_number::TEXT, 6, '0');
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_customers_timestamp
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_documents_timestamp
BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_document_items_timestamp
BEFORE UPDATE ON document_items
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_settings_timestamp
BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Create function to handle document creation with items
CREATE OR REPLACE FUNCTION create_document_with_items(
  p_user_id UUID,
  p_customer_id UUID,
  p_type document_type,
  p_status document_status,
  p_customer_name TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_currency currency,
  p_notes TEXT,
  p_terms TEXT,
  p_data JSONB,
  p_items JSONB
)
RETURNS UUID AS $$
DECLARE
  doc_id UUID;
  item_data JSONB;
  item_id UUID;
BEGIN
  -- Generate document number
  IF p_data->>'document_number' IS NULL THEN
    p_data := jsonb_set(p_data, '{document_number}', to_jsonb(generate_document_number(p_type, p_user_id)));
  END IF;

  -- Insert the document
  INSERT INTO documents (
    user_id,
    customer_id,
    type,
    status,
    document_number,
    customer_name,
    issue_date,
    due_date,
    currency,
    notes,
    terms,
    data
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_type,
    p_status,
    p_data->>'document_number',
    p_customer_name,
    p_issue_date,
    p_due_date,
    p_currency,
    p_notes,
    p_terms,
    p_data
  ) RETURNING id INTO doc_id;

  -- Insert document items
  FOR item_data IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO document_items (
      document_id,
      description,
      quantity,
      unit_price,
      tax_rate,
      tax_amount,
      discount_rate,
      discount_amount,
      amount
    ) VALUES (
      doc_id,
      item_data->>'description',
      (item_data->>'quantity')::DECIMAL,
      (item_data->>'unit_price')::DECIMAL,
      COALESCE((item_data->>'tax_rate')::DECIMAL, 0),
      COALESCE((item_data->>'tax_amount')::DECIMAL, 0),
      COALESCE((item_data->>'discount_rate')::DECIMAL, 0),
      COALESCE((item_data->>'discount_amount')::DECIMAL, 0),
      (item_data->>'amount')::DECIMAL
    );
  END LOOP;

  -- Update document totals
  UPDATE documents
  SET 
    total_amount = (
      SELECT SUM(amount)
      FROM document_items
      WHERE document_id = doc_id
    ),
    tax_amount = (
      SELECT SUM(tax_amount)
      FROM document_items
      WHERE document_id = doc_id
    )
  WHERE id = doc_id;

  -- Record history
  INSERT INTO document_history (
    document_id,
    user_id,
    action,
    details
  ) VALUES (
    doc_id,
    p_user_id,
    'created',
    jsonb_build_object(
      'type', p_type,
      'status', p_status
    )
  );

  RETURN doc_id;
END;
$$ LANGUAGE plpgsql;


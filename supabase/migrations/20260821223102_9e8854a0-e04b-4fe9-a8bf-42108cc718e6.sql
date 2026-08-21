INSERT INTO public.email_templates (template_key, name, subject, title, body, signature, extra_info, enabled)
VALUES (
  'complimentary_confirmed',
  'Confirmación de cortesía',
  'Tu reserva {{booking_code}} está confirmada ✅',
  'Tu reserva está confirmada',
  E'Hola {{customer_name}},\n\nTu reserva quedó confirmada como cortesía. No necesitas realizar ningún pago.\n\nCódigo: {{booking_code}}\nFecha: {{reservation_date}}\nHora: {{reservation_time}}\nPersonas: {{party_size}}\nTotal: {{reservation_total}}\nEstado de pago: {{payment_status}}',
  E'Te esperamos.\n{{business_name}}',
  E'Llega 5 minutos antes del inicio. Si necesitas cambiar o cancelar tu reserva, escríbenos por WhatsApp al +51 919 112 980.',
  true
)
ON CONFLICT (template_key) DO NOTHING;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS last_email_result text,
  ADD COLUMN IF NOT EXISTS last_email_at timestamptz;
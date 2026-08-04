ALTER TABLE public.settings
ADD COLUMN IF NOT EXISTS whatsapp_message_template text NOT NULL DEFAULT 'Hola {{customer_name}}, recibimos tu solicitud de reserva {{booking_code}} para el {{session_date}} a las {{session_time}} ({{guest_count}} personas). Tu pago aún está pendiente: {{pending_amount}}. Puedes pagar así:
{{payment_options}}
Envíanos el comprobante por aquí para confirmar tu reserva. ¡Gracias!';
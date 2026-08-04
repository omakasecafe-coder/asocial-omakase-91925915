update public.email_templates
set
  name = 'Medios de pago de reserva',
  subject = 'Recibimos tu reserva en asocial',
  title = 'Recibimos tu reserva',
  body = 'Hola {{customer_name}},

Recibimos tu reserva en asocial · café omakase.

Código: {{booking_code}}
Fecha: {{reservation_date}}
Hora: {{reservation_time}}
Personas: {{party_size}}
Total: {{reservation_total}}

Para confirmar tu lugar, realiza el pago con uno de los medios disponibles y envíanos el comprobante por WhatsApp o email.

Medios de pago:
{{payment_options}}',
  signature = 'Gracias,
asocial · café omakase',
  extra_info = 'Cuando validemos el pago, recibirás la confirmación final de tu reserva.'
where template_key = 'reservation_confirmed';

update public.email_templates
set
  name = 'Confirmación final de reserva',
  subject = 'Tu reserva en asocial está confirmada',
  title = 'Reserva confirmada',
  body = 'Hola {{customer_name}},

Validamos tu pago y tu reserva está confirmada.

Código: {{booking_code}}
Fecha: {{reservation_date}}
Hora: {{reservation_time}}
Personas: {{party_size}}
Monto pagado: {{payment_amount}}
Estado del pago: {{payment_status}}',
  signature = 'Nos vemos pronto,
asocial · café omakase',
  extra_info = 'Llega 5 minutos antes. La experiencia dura aproximadamente 90 minutos.'
where template_key = 'payment_confirmed';

interface BookingConfirmationEmailProps {
  userName: string;
  captainName: string;
  date: string;
  time: string;
  location: string;
  price: string;
  language?: 'en' | 'es' | 'fr' | 'pt';
}

const translations = {
  en: {
    subject: 'Booking Confirmed!',
    title: 'Your Charter is Confirmed',
    details: 'Booking Details',
    captain: 'Captain',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    total: 'Total',
    prepare: 'What to bring: Sunscreen, hat, water, and excitement!',
    contact: 'Contact your captain if you have questions.',
  },
  es: {
    subject: '¡Reserva Confirmada!',
    title: 'Tu Charter está Confirmado',
    details: 'Detalles de la Reserva',
    captain: 'Capitán',
    date: 'Fecha',
    time: 'Hora',
    location: 'Ubicación',
    total: 'Total',
    prepare: 'Qué traer: Protector solar, sombrero, agua y emoción!',
    contact: 'Contacta a tu capitán si tienes preguntas.',
  },
  fr: {
    subject: 'Réservation Confirmée!',
    title: 'Votre Charter est Confirmé',
    details: 'Détails de la Réservation',
    captain: 'Capitaine',
    date: 'Date',
    time: 'Heure',
    location: 'Lieu',
    total: 'Total',
    prepare: 'Quoi apporter: Crème solaire, chapeau, eau et enthousiasme!',
    contact: 'Contactez votre capitaine si vous avez des questions.',
  },
  pt: {
    subject: 'Reserva Confirmada!',
    title: 'Seu Charter está Confirmado',
    details: 'Detalhes da Reserva',
    captain: 'Capitão',
    date: 'Data',
    time: 'Hora',
    location: 'Localização',
    total: 'Total',
    prepare: 'O que trazer: Protetor solar, chapéu, água e empolgação!',
    contact: 'Entre em contato com seu capitão se tiver dúvidas.',
  }
};

export const BookingConfirmationEmail = (props: BookingConfirmationEmailProps) => {
  const t = translations[props.language || 'en'];
  return `
    <h1>${t.title}</h1>
    <h3>${t.details}</h3>
    <p><strong>${t.captain}:</strong> ${props.captainName}</p>
    <p><strong>${t.date}:</strong> ${props.date}</p>
    <p><strong>${t.time}:</strong> ${props.time}</p>
    <p><strong>${t.location}:</strong> ${props.location}</p>
    <p><strong>${t.total}:</strong> ${props.price}</p>
    <p>${t.prepare}</p>
    <p>${t.contact}</p>
  `;
};

interface BookingReminderEmailProps {
  userName: string;
  captainName: string;
  date: string;
  time: string;
  location: string;
  hoursUntil: number;
  language?: 'en' | 'es' | 'fr' | 'pt';
}

const translations = {
  en: {
    subject: 'Reminder: Your Charter is Tomorrow!',
    title: 'Your Charter is Coming Up!',
    reminder: 'Just a friendly reminder about your upcoming charter',
    hours: 'hours',
    checklist: 'Pre-Trip Checklist:',
    item1: 'Check weather conditions',
    item2: 'Bring sunscreen and hat',
    item3: 'Arrive 15 minutes early',
    item4: 'Bring valid fishing license',
    excited: 'We\'re excited for your adventure!'
  },
  es: {
    subject: 'Recordatorio: ¡Tu Charter es Mañana!',
    title: '¡Tu Charter se Acerca!',
    reminder: 'Solo un recordatorio amistoso sobre tu próximo charter',
    hours: 'horas',
    checklist: 'Lista Pre-Viaje:',
    item1: 'Verificar condiciones climáticas',
    item2: 'Traer protector solar y sombrero',
    item3: 'Llegar 15 minutos antes',
    item4: 'Traer licencia de pesca válida',
    excited: '¡Estamos emocionados por tu aventura!'
  },
  fr: {
    subject: 'Rappel: Votre Charter est Demain!',
    title: 'Votre Charter Approche!',
    reminder: 'Juste un rappel amical de votre charter à venir',
    hours: 'heures',
    checklist: 'Liste Pré-Voyage:',
    item1: 'Vérifier les conditions météo',
    item2: 'Apporter crème solaire et chapeau',
    item3: 'Arriver 15 minutes en avance',
    item4: 'Apporter permis de pêche valide',
    excited: 'Nous sommes ravis de votre aventure!'
  },
  pt: {
    subject: 'Lembrete: Seu Charter é Amanhã!',
    title: 'Seu Charter está Chegando!',
    reminder: 'Apenas um lembrete amigável sobre seu próximo charter',
    hours: 'horas',
    checklist: 'Lista Pré-Viagem:',
    item1: 'Verificar condições climáticas',
    item2: 'Trazer protetor solar e chapéu',
    item3: 'Chegar 15 minutos mais cedo',
    item4: 'Trazer licença de pesca válida',
    excited: 'Estamos animados pela sua aventura!'
  }
};

export const BookingReminderEmail = (props: BookingReminderEmailProps) => {
  const t = translations[props.language || 'en'];
  return `
    <h1>${t.title}</h1>
    <p>${t.reminder} (${props.hoursUntil} ${t.hours})</p>
    <p><strong>${props.captainName}</strong></p>
    <p>${props.date} at ${props.time}</p>
    <p>${props.location}</p>
    <h3>${t.checklist}</h3>
    <ul>
      <li>${t.item1}</li>
      <li>${t.item2}</li>
      <li>${t.item3}</li>
      <li>${t.item4}</li>
    </ul>
    <p>${t.excited}</p>
  `;
};

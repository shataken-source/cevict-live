export const smsTemplates = {
  bookingConfirmation: {
    en: (name: string, date: string) => `Hi ${name}! Your charter is confirmed for ${date}. See you soon!`,
    es: (name: string, date: string) => `¡Hola ${name}! Tu charter está confirmado para ${date}. ¡Nos vemos pronto!`,
    fr: (name: string, date: string) => `Bonjour ${name}! Votre charter est confirmé pour ${date}. À bientôt!`,
    pt: (name: string, date: string) => `Olá ${name}! Seu charter está confirmado para ${date}. Até breve!`
  },
  bookingReminder: {
    en: (name: string, hours: number) => `Hi ${name}! Your charter is in ${hours} hours. Don't forget sunscreen!`,
    es: (name: string, hours: number) => `¡Hola ${name}! Tu charter es en ${hours} horas. ¡No olvides protector solar!`,
    fr: (name: string, hours: number) => `Bonjour ${name}! Votre charter est dans ${hours} heures. N'oubliez pas la crème solaire!`,
    pt: (name: string, hours: number) => `Olá ${name}! Seu charter é em ${hours} horas. Não esqueça protetor solar!`
  },
  dealAlert: {
    en: (discount: string) => `Special offer! Save ${discount} on charters this week. Book now!`,
    es: (discount: string) => `¡Oferta especial! Ahorra ${discount} en charters esta semana. ¡Reserva ahora!`,
    fr: (discount: string) => `Offre spéciale! Économisez ${discount} sur les charters cette semaine. Réservez maintenant!`,
    pt: (discount: string) => `Oferta especial! Economize ${discount} em charters esta semana. Reserve agora!`
  },
  weatherAlert: {
    en: (condition: string) => `Weather alert: ${condition}. Contact your captain for updates.`,
    es: (condition: string) => `Alerta meteorológica: ${condition}. Contacta a tu capitán para actualizaciones.`,
    fr: (condition: string) => `Alerte météo: ${condition}. Contactez votre capitaine pour les mises à jour.`,
    pt: (condition: string) => `Alerta meteorológico: ${condition}. Entre em contato com seu capitão para atualizações.`
  }
};

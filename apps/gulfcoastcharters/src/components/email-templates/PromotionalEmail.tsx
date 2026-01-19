interface PromotionalEmailProps {
  userName: string;
  dealTitle: string;
  dealDescription: string;
  discount: string;
  expiryDate: string;
  language?: 'en' | 'es' | 'fr' | 'pt';
}

const translations = {
  en: {
    subject: 'Special Offer Just for You!',
    greeting: 'Hi',
    intro: 'We have an exclusive deal for you!',
    discount: 'Save',
    expires: 'Offer expires',
    cta: 'Book Now',
    footer: 'Don\'t miss out on this limited-time offer!'
  },
  es: {
    subject: '¡Oferta Especial Solo Para Ti!',
    greeting: 'Hola',
    intro: '¡Tenemos una oferta exclusiva para ti!',
    discount: 'Ahorra',
    expires: 'La oferta expira',
    cta: 'Reservar Ahora',
    footer: '¡No te pierdas esta oferta por tiempo limitado!'
  },
  fr: {
    subject: 'Offre Spéciale Rien Que Pour Vous!',
    greeting: 'Bonjour',
    intro: 'Nous avons une offre exclusive pour vous!',
    discount: 'Économisez',
    expires: 'L\'offre expire',
    cta: 'Réserver Maintenant',
    footer: 'Ne manquez pas cette offre à durée limitée!'
  },
  pt: {
    subject: 'Oferta Especial Só Para Você!',
    greeting: 'Olá',
    intro: 'Temos uma oferta exclusiva para você!',
    discount: 'Economize',
    expires: 'A oferta expira',
    cta: 'Reservar Agora',
    footer: 'Não perca esta oferta por tempo limitado!'
  }
};

export const PromotionalEmail = (props: PromotionalEmailProps) => {
  const t = translations[props.language || 'en'];
  return `
    <h1>${t.greeting}, ${props.userName}!</h1>
    <p>${t.intro}</p>
    <h2>${props.dealTitle}</h2>
    <p>${props.dealDescription}</p>
    <h3 style="color:#0066cc;">${t.discount} ${props.discount}</h3>
    <p><em>${t.expires}: ${props.expiryDate}</em></p>
    <a href="https://gulfcoastcharters.com" style="background:#0066cc;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">${t.cta}</a>
    <p>${t.footer}</p>
  `;
};

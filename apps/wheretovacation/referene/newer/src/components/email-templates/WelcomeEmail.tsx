interface WelcomeEmailProps {
  userName: string;
  language?: 'en' | 'es' | 'fr' | 'pt';
}

const translations = {
  en: {
    subject: 'Welcome to Gulf Coast Charters!',
    greeting: 'Welcome aboard',
    intro: 'Thank you for joining Gulf Coast Charters! We\'re excited to help you discover unforgettable fishing adventures.',
    features: 'What you can do:',
    feature1: 'Browse and book certified captains',
    feature2: 'Earn loyalty points and rewards',
    feature3: 'Join our fishing community',
    cta: 'Start Exploring',
    footer: 'Happy fishing!'
  },
  es: {
    subject: '¡Bienvenido a Gulf Coast Charters!',
    greeting: 'Bienvenido a bordo',
    intro: '¡Gracias por unirte a Gulf Coast Charters! Estamos emocionados de ayudarte a descubrir aventuras de pesca inolvidables.',
    features: 'Lo que puedes hacer:',
    feature1: 'Explorar y reservar capitanes certificados',
    feature2: 'Ganar puntos de lealtad y recompensas',
    feature3: 'Únete a nuestra comunidad de pesca',
    cta: 'Comenzar a Explorar',
    footer: '¡Feliz pesca!'
  },
  fr: {
    subject: 'Bienvenue chez Gulf Coast Charters!',
    greeting: 'Bienvenue à bord',
    intro: 'Merci de rejoindre Gulf Coast Charters! Nous sommes ravis de vous aider à découvrir des aventures de pêche inoubliables.',
    features: 'Ce que vous pouvez faire:',
    feature1: 'Parcourir et réserver des capitaines certifiés',
    feature2: 'Gagner des points de fidélité et des récompenses',
    feature3: 'Rejoindre notre communauté de pêche',
    cta: 'Commencer à Explorer',
    footer: 'Bonne pêche!'
  },
  pt: {
    subject: 'Bem-vindo ao Gulf Coast Charters!',
    greeting: 'Bem-vindo a bordo',
    intro: 'Obrigado por se juntar ao Gulf Coast Charters! Estamos animados para ajudá-lo a descobrir aventuras de pesca inesquecíveis.',
    features: 'O que você pode fazer:',
    feature1: 'Navegar e reservar capitães certificados',
    feature2: 'Ganhar pontos de fidelidade e recompensas',
    feature3: 'Junte-se à nossa comunidade de pesca',
    cta: 'Começar a Explorar',
    footer: 'Boa pesca!'
  }
};

export const WelcomeEmail = ({ userName, language = 'en' }: WelcomeEmailProps) => {
  const t = translations[language];
  return `
    <h1>${t.greeting}, ${userName}!</h1>
    <p>${t.intro}</p>
    <h3>${t.features}</h3>
    <ul>
      <li>${t.feature1}</li>
      <li>${t.feature2}</li>
      <li>${t.feature3}</li>
    </ul>
    <a href="https://gulfcoastcharters.com" style="background:#0066cc;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">${t.cta}</a>
    <p>${t.footer}</p>
  `;
};

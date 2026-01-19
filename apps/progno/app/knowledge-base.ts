// Comprehensive Knowledge Base for Progno "Predict Anything" Feature

import { SPORTS_KNOWLEDGE, CAMPING_KNOWLEDGE } from './knowledge-base-sports-camping';

export interface KnowledgeResponse {
  answer: string;
  confidence: number;
  sources?: string[];
  category: string;
}

// Science Knowledge
export const SCIENCE_KNOWLEDGE: Record<string, string> = {
  'gravity': 'Gravity is a fundamental force that attracts objects with mass toward each other. On Earth, gravity accelerates objects at approximately 9.8 m/s². It\'s what keeps us grounded and governs planetary motion.',
  'photosynthesis': 'Photosynthesis is the process by which plants convert light energy, carbon dioxide, and water into glucose and oxygen. It occurs primarily in chloroplasts and is essential for life on Earth.',
  'atoms': 'Atoms are the basic building blocks of matter, consisting of protons, neutrons, and electrons. The number of protons determines the element, while electrons determine chemical properties.',
  'speed of light': 'The speed of light in a vacuum is approximately 299,792,458 meters per second (about 186,282 miles per second). It\'s the universal speed limit according to Einstein\'s theory of relativity.',
  'evolution': 'Evolution is the process by which species change over time through natural selection, genetic drift, and other mechanisms. It explains the diversity of life on Earth.',
  'quantum': 'Quantum mechanics describes the behavior of matter and energy at atomic and subatomic scales, where particles can exist in multiple states simultaneously until observed.',
  'black hole': 'Black holes are regions of spacetime where gravity is so strong that nothing, not even light, can escape. They form when massive stars collapse at the end of their life cycle.',
  'dna': 'DNA (deoxyribonucleic acid) is the molecule that carries genetic instructions for all living organisms. It\'s a double helix structure discovered by Watson and Crick in 1953.',
  'climate change': 'Climate change refers to long-term shifts in global temperatures and weather patterns, primarily driven by human activities that increase greenhouse gas concentrations in the atmosphere.',
  'solar system': 'Our solar system consists of the Sun and eight planets (Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune), along with moons, asteroids, and comets orbiting the Sun.',

  // Astronomy
  'astronomy': 'Astronomy is the scientific study of celestial objects, space, and the physical universe beyond Earth. It includes the study of stars, planets, galaxies, nebulae, and cosmic phenomena.',
  'stars': 'Stars are massive, luminous spheres of plasma held together by gravity. Our Sun is a star, and stars produce light and heat through nuclear fusion in their cores.',
  'planets': 'Planets are celestial bodies that orbit stars. In our solar system, there are eight planets: four rocky inner planets (Mercury, Venus, Earth, Mars) and four gas giants (Jupiter, Saturn, Uranus, Neptune).',
  'galaxy': 'A galaxy is a massive system of stars, stellar remnants, gas, dust, and dark matter bound together by gravity. Our Milky Way galaxy contains billions of stars, including our Sun.',
  'milky way': 'The Milky Way is our home galaxy, a barred spiral galaxy containing 100-400 billion stars. Our solar system is located in one of the spiral arms, about 27,000 light-years from the galactic center.',
  'moon': 'The Moon is Earth\'s only natural satellite, orbiting at an average distance of 384,400 km. It affects tides, stabilizes Earth\'s axial tilt, and has been visited by humans during the Apollo missions.',
  'mars': 'Mars is the fourth planet from the Sun, known as the "Red Planet" due to iron oxide on its surface. It has the largest volcano in the solar system (Olympus Mons) and evidence of ancient water.',
  'jupiter': 'Jupiter is the largest planet in our solar system, a gas giant with a Great Red Spot (a massive storm) and at least 95 known moons, including the four largest: Io, Europa, Ganymede, and Callisto.',
  'saturn': 'Saturn is the sixth planet from the Sun, famous for its spectacular ring system made of ice and rock particles. It has 146 known moons, including Titan, which has a thick atmosphere.',
  'nebula': 'A nebula is a giant cloud of dust and gas in space. Some nebulae are regions where new stars are forming, while others are the remains of dead or dying stars.',
  'constellation': 'A constellation is a group of stars that form a recognizable pattern in the night sky. There are 88 officially recognized constellations, including Orion, Ursa Major, and Cassiopeia.',
  'light year': 'A light-year is the distance that light travels in one year, approximately 9.46 trillion kilometers (5.88 trillion miles). It\'s used to measure vast distances in space.',
  'big bang': 'The Big Bang theory describes the origin of the universe, suggesting it began as an extremely hot, dense point about 13.8 billion years ago and has been expanding ever since.',
};

// History Knowledge
export const HISTORY_KNOWLEDGE: Record<string, string> = {
  'world war 2': 'World War II (1939-1945) was a global conflict involving most of the world\'s nations. It resulted in over 70 million deaths and led to significant geopolitical changes, including the formation of the United Nations.',
  'american revolution': 'The American Revolution (1775-1783) was the war in which 13 American colonies gained independence from Great Britain, leading to the formation of the United States of America.',
  'civil war': 'The American Civil War (1861-1865) was fought between the Union (North) and Confederacy (South) over slavery and states\' rights. It resulted in the abolition of slavery and preservation of the Union.',
  'renaissance': 'The Renaissance (14th-17th centuries) was a period of cultural, artistic, and intellectual rebirth in Europe, marked by renewed interest in classical learning and humanism.',
  'industrial revolution': 'The Industrial Revolution (1760-1840) was a period of major technological and economic change, transitioning from agrarian societies to industrialized ones, beginning in Britain.',
  'space race': 'The Space Race (1955-1975) was a competition between the US and USSR to achieve spaceflight milestones, culminating in the Apollo 11 moon landing in 1969.',
  'cold war': 'The Cold War (1947-1991) was a period of geopolitical tension between the US and USSR, characterized by proxy wars, nuclear arms race, and ideological conflict without direct military engagement.',
  'ancient rome': 'Ancient Rome was a powerful civilization that existed from 753 BCE to 476 CE, known for its military conquests, engineering achievements, legal system, and lasting influence on Western civilization.',
  'ancient greece': 'Ancient Greece (800-146 BCE) was a civilization known for democracy, philosophy, mathematics, theater, and the Olympic Games, with lasting influence on Western culture.',
  'middle ages': 'The Middle Ages (500-1500 CE) was the period between the fall of Rome and the Renaissance, characterized by feudalism, the rise of Christianity, and the Crusades.',
};

// Geography Knowledge
export const GEOGRAPHY_KNOWLEDGE: Record<string, string> = {
  'largest country': 'Russia is the largest country by land area, covering approximately 17.1 million square kilometers (6.6 million square miles), spanning 11 time zones.',
  'smallest country': 'Vatican City is the smallest country in the world, covering just 0.44 square kilometers (0.17 square miles) and located entirely within Rome, Italy.',
  'tallest mountain': 'Mount Everest, located in the Himalayas on the border of Nepal and Tibet, is the world\'s highest peak at 8,848.86 meters (29,031.7 feet) above sea level.',
  'longest river': 'The Nile River in Africa is the longest river in the world, stretching approximately 6,650 kilometers (4,130 miles) from its source to the Mediterranean Sea.',
  'largest ocean': 'The Pacific Ocean is the largest and deepest ocean, covering approximately 165.25 million square kilometers (63.8 million square miles), larger than all landmasses combined.',
  'deepest ocean': 'The Mariana Trench in the Pacific Ocean is the deepest point on Earth, reaching 10,994 meters (36,070 feet) below sea level at the Challenger Deep.',
  'largest desert': 'The Antarctic Desert is the largest desert in the world, covering 14.2 million square kilometers (5.5 million square miles). The Sahara is the largest hot desert.',
  'most populous country': 'China is the most populous country with over 1.4 billion people, followed closely by India with over 1.3 billion people.',
  'continents': 'There are seven continents: Asia, Africa, North America, South America, Antarctica, Europe, and Australia. Some geographers consider Europe and Asia as one continent (Eurasia).',
  'time zones': 'The world is divided into 24 time zones, each approximately 15 degrees of longitude wide. Some countries and regions use half-hour or quarter-hour offsets.',
};

// Technology Knowledge
export const TECHNOLOGY_KNOWLEDGE: Record<string, string> = {
  'internet': 'The Internet is a global network of interconnected computers that communicate using standardized protocols. It was developed in the 1960s-70s and became publicly accessible in the 1990s.',
  'artificial intelligence': 'Artificial Intelligence (AI) refers to computer systems that can perform tasks typically requiring human intelligence, such as learning, reasoning, and problem-solving.',
  'blockchain': 'Blockchain is a distributed ledger technology that maintains a continuously growing list of records (blocks) linked and secured using cryptography, most famously used for cryptocurrencies.',
  'cloud computing': 'Cloud computing delivers computing services (servers, storage, databases, software) over the Internet, allowing on-demand access and scalability without direct infrastructure management.',
  'quantum computing': 'Quantum computing uses quantum mechanical phenomena like superposition and entanglement to perform computations that would be infeasible for classical computers.',
  'machine learning': 'Machine learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed, using algorithms to identify patterns in data.',
  'programming languages': 'Popular programming languages include Python (versatile, data science), JavaScript (web development), Java (enterprise), C++ (system programming), and many others, each suited for different purposes.',
  'operating systems': 'Major operating systems include Windows (Microsoft), macOS (Apple), Linux (open-source), iOS and Android (mobile). Each manages hardware resources and provides user interfaces.',
  'cybersecurity': 'Cybersecurity protects computer systems, networks, and data from digital attacks through measures like encryption, firewalls, antivirus software, and security protocols.',
  'virtual reality': 'Virtual Reality (VR) creates immersive, computer-generated environments that users can interact with using specialized headsets and controllers, simulating real or imagined worlds.',
};

// Health & Wellness Knowledge (General, not medical advice)
export const HEALTH_KNOWLEDGE: Record<string, string> = {
  'exercise': 'Regular exercise provides numerous benefits including improved cardiovascular health, stronger muscles and bones, better mental health, weight management, and reduced risk of chronic diseases.',
  'nutrition': 'A balanced diet includes fruits, vegetables, whole grains, lean proteins, and healthy fats. The recommended daily intake varies by age, gender, and activity level.',
  'sleep': 'Most adults need 7-9 hours of sleep per night for optimal health. Quality sleep supports immune function, memory consolidation, and physical recovery.',
  'hydration': 'Adequate hydration is essential for bodily functions. General recommendations suggest drinking about 8 glasses (2 liters) of water daily, though needs vary by activity and climate.',
  'stress management': 'Effective stress management techniques include exercise, meditation, deep breathing, time management, social support, and maintaining work-life balance.',
  'mental health': 'Mental health is as important as physical health. Practices like mindfulness, therapy, social connection, and self-care contribute to overall well-being.',
  'vitamins': 'Essential vitamins include A, B complex, C, D, E, and K. Most can be obtained through a balanced diet, though some people may need supplements based on individual needs.',
  'fitness': 'Fitness encompasses cardiovascular endurance, muscular strength, flexibility, and body composition. A well-rounded fitness program addresses all these components.',
  'weight management': 'Healthy weight management involves balancing calorie intake with physical activity, focusing on sustainable lifestyle changes rather than quick fixes.',
  'aging': 'Healthy aging involves staying active, maintaining social connections, eating well, getting regular health checkups, and engaging in mentally stimulating activities.',
};

// Finance & Economics Knowledge (General, not financial advice)
export const FINANCE_KNOWLEDGE: Record<string, string> = {
  'inflation': 'Inflation is the rate at which the general price level of goods and services rises, eroding purchasing power. Central banks typically target 2-3% annual inflation.',
  'stock market': 'The stock market is where shares of publicly traded companies are bought and sold. Major indices include the S&P 500, Dow Jones, and NASDAQ.',
  'interest rates': 'Interest rates are the cost of borrowing money. They\'re set by central banks and influence economic activity, inflation, and investment decisions.',
  'cryptocurrency': 'Cryptocurrency is digital or virtual currency secured by cryptography. Bitcoin, created in 2009, was the first decentralized cryptocurrency.',
  'retirement planning': 'Retirement planning involves saving and investing for the future, typically through employer-sponsored plans (401k), IRAs, and other investment vehicles.',
  'budgeting': 'Effective budgeting involves tracking income and expenses, setting financial goals, prioritizing needs over wants, and building an emergency fund.',
  'credit score': 'Credit scores (typically 300-850) reflect creditworthiness based on payment history, credit utilization, length of credit history, and other factors.',
  'investment': 'Common investment types include stocks, bonds, mutual funds, ETFs, and real estate. Diversification helps manage risk across different asset classes.',
  'taxes': 'Taxes fund government services. Common types include income tax, sales tax, property tax, and capital gains tax. Tax laws vary by jurisdiction.',
  'economy': 'Economic indicators include GDP (gross domestic product), unemployment rate, inflation, and consumer confidence, which help measure economic health.',
};

// Food & Cooking Knowledge
export const FOOD_KNOWLEDGE: Record<string, string> = {
  'cooking methods': 'Common cooking methods include baking, grilling, sautéing, boiling, steaming, roasting, and frying. Each method affects flavor, texture, and nutritional content differently.',
  'food safety': 'Food safety practices include proper handwashing, cooking to appropriate temperatures, avoiding cross-contamination, and proper food storage to prevent foodborne illness.',
  'nutritional value': 'Foods provide macronutrients (carbohydrates, proteins, fats) and micronutrients (vitamins, minerals). A balanced diet includes variety from all food groups.',
  'cuisine types': 'Major cuisine types include Italian, Chinese, Japanese, Mexican, French, Indian, Thai, Mediterranean, and many regional variations, each with unique flavors and techniques.',
  'baking': 'Baking is a cooking method using dry heat in an oven. Key ingredients include flour, leavening agents (yeast, baking powder), fats, and liquids. Precision in measurements is important.',
  'grilling': 'Grilling involves cooking food over direct heat, typically on a grill. It creates distinctive flavors through caramelization and the Maillard reaction.',
  'spices': 'Spices add flavor, aroma, and sometimes color to food. Common spices include salt, pepper, garlic, cinnamon, cumin, paprika, and many others, each with unique properties.',
  'dietary restrictions': 'Common dietary needs include vegetarian, vegan, gluten-free, dairy-free, kosher, halal, and various allergies, each requiring specific food choices.',
  'meal prep': 'Meal preparation involves planning and preparing meals in advance, saving time and helping maintain healthy eating habits throughout the week.',
  'food storage': 'Proper food storage extends shelf life and maintains quality. Refrigeration, freezing, canning, and proper containers help preserve different types of food.',

  // Recipes
  'recipes': 'Recipes provide step-by-step instructions for preparing dishes, including ingredients, measurements, cooking methods, and timing. Following recipes helps ensure consistent results.',
  'chocolate chip cookies': 'Classic chocolate chip cookies typically include flour, butter, sugar, eggs, vanilla, baking soda, salt, and chocolate chips. Bake at 375°F (190°C) for 9-11 minutes until golden brown.',
  'pasta recipe': 'Basic pasta can be made with flour, eggs, salt, and water. For sauce, popular options include marinara (tomatoes, garlic, basil), alfredo (cream, butter, parmesan), or carbonara (eggs, bacon, cheese).',
  'chicken recipe': 'Chicken can be prepared many ways: roasted (400°F for 20-25 min per pound), grilled (6-8 min per side), or pan-seared. Internal temperature should reach 165°F (74°C) for safety.',
  'bread recipe': 'Basic bread requires flour, water, yeast, salt, and sometimes sugar or oil. The dough needs to rise (proof) before baking. Most bread bakes at 350-450°F for 25-45 minutes.',
  'pizza recipe': 'Pizza dough typically includes flour, water, yeast, salt, and olive oil. Top with sauce, cheese, and desired toppings. Bake at high temperature (450-500°F) for 10-15 minutes.',
  'salad recipe': 'Salads combine fresh vegetables, greens, proteins, and dressings. Popular bases include lettuce, spinach, or mixed greens. Add proteins like chicken, tuna, or beans for a complete meal.',
  'soup recipe': 'Soups start with a base (broth or stock), add vegetables, proteins, and seasonings. Simmer until ingredients are tender. Popular types include chicken noodle, tomato, and vegetable soup.',
  'dessert recipes': 'Desserts range from simple (fruit) to complex (multi-layer cakes). Common desserts include cakes, cookies, pies, ice cream, and puddings. Baking often requires precise measurements.',
  'breakfast recipes': 'Popular breakfast options include eggs (scrambled, fried, poached), pancakes, waffles, oatmeal, cereal, and toast. Many breakfast foods are quick to prepare and provide morning energy.',
  'vegetarian recipes': 'Vegetarian recipes exclude meat but may include eggs and dairy. Popular dishes include vegetable stir-fries, pasta primavera, bean burgers, and various grain bowls.',
};

// Travel Knowledge
export const TRAVEL_KNOWLEDGE: Record<string, string> = {
  'passport': 'A passport is an official government document that certifies identity and nationality, required for international travel. Most countries require passports to be valid for at least 6 months.',
  'visa': 'A visa is official permission to enter a country, often required in addition to a passport. Requirements vary by nationality and destination country.',
  'travel insurance': 'Travel insurance provides coverage for trip cancellations, medical emergencies, lost luggage, and other travel-related issues, offering peace of mind during trips.',
  'time zones': 'When traveling across time zones, jet lag can occur. Adjusting sleep schedules gradually and staying hydrated can help minimize its effects.',
  'currency exchange': 'Currency exchange rates fluctuate daily. It\'s often best to exchange money at banks or official exchange offices rather than airports for better rates.',
  'packing': 'Effective packing involves making a list, rolling clothes to save space, packing versatile items, and checking airline baggage restrictions and weight limits.',
  'airport security': 'Airport security requires removing liquids over 100ml, electronics from bags, shoes, and belts. Following TSA guidelines helps ensure smooth passage through security.',
  'travel documents': 'Essential travel documents include passport, visa (if required), travel insurance, flight confirmations, hotel reservations, and emergency contact information.',
  'safety': 'Travel safety involves researching destinations, staying aware of surroundings, keeping copies of important documents, and following local laws and customs.',
  'budget travel': 'Budget travel tips include booking in advance, traveling during off-peak seasons, using public transportation, staying in hostels, and eating local food.',
};

// Education Knowledge
export const EDUCATION_KNOWLEDGE: Record<string, string> = {
  'learning styles': 'Common learning styles include visual (seeing), auditory (hearing), kinesthetic (doing), and reading/writing. Most people benefit from a combination of approaches.',
  'study techniques': 'Effective study techniques include active recall, spaced repetition, the Pomodoro Technique, teaching others, and creating mind maps or summaries.',
  'online learning': 'Online learning offers flexibility and accessibility. Success requires self-discipline, time management, active participation, and creating a dedicated study space.',
  'critical thinking': 'Critical thinking involves analyzing information objectively, questioning assumptions, evaluating evidence, and forming reasoned conclusions rather than accepting information at face value.',
  'research': 'Good research involves identifying reliable sources, evaluating credibility, cross-referencing information, and properly citing sources to avoid plagiarism.',
  'time management': 'Effective time management for students includes creating schedules, prioritizing tasks, breaking large projects into smaller steps, and avoiding procrastination.',
  'test taking': 'Test-taking strategies include reading questions carefully, managing time, answering easy questions first, reviewing answers, and staying calm under pressure.',
  'note taking': 'Effective note-taking methods include the Cornell method, mind mapping, outline method, and charting. The best method depends on the subject and learning style.',
  'motivation': 'Maintaining motivation involves setting clear goals, breaking tasks into manageable steps, celebrating small wins, and finding personal meaning in the work.',
  'career planning': 'Career planning involves self-assessment, researching career options, gaining relevant experience, networking, and developing necessary skills and qualifications.',
};

// Entertainment Knowledge
export const ENTERTAINMENT_KNOWLEDGE: Record<string, string> = {
  'movies': 'The film industry produces thousands of movies annually across genres including action, comedy, drama, horror, sci-fi, and documentary. Major awards include Oscars, Golden Globes, and Cannes.',
  'music': 'Music genres include pop, rock, classical, jazz, hip-hop, country, electronic, and many others. Music has evolved significantly throughout history with new technologies and cultural influences.',
  'books': 'Literature spans fiction (novels, short stories) and non-fiction (biography, history, science). Major literary awards include the Pulitzer Prize, Nobel Prize in Literature, and Booker Prize.',
  'television': 'Television has evolved from broadcast to cable to streaming services. Popular formats include dramas, comedies, reality shows, documentaries, and news programming.',
  'video games': 'Video games span genres including action, adventure, RPG, strategy, sports, and simulation. The industry has grown into a major entertainment form with esports and streaming.',
  'theater': 'Theater includes plays, musicals, and performances. Major theater awards include the Tony Awards (Broadway) and Olivier Awards (West End).',
  'streaming': 'Streaming services like Netflix, Disney+, Amazon Prime, and others have transformed entertainment consumption, offering on-demand access to vast libraries of content.',
  'podcasts': 'Podcasts are digital audio programs available on-demand, covering topics from news and education to entertainment and storytelling.',
  'sports entertainment': 'Sports entertainment combines athletic competition with entertainment, including professional leagues, championships, and major events like the Olympics and World Cup.',
  'social media': 'Social media platforms have become major entertainment sources, enabling content creation, sharing, and consumption across various formats and communities.',

  // TV Shows
  'tv shows': 'TV shows are episodic programs broadcast or streamed on television. Popular genres include drama, comedy, reality, crime, sci-fi, and documentaries. Shows can be scripted or unscripted.',
  'game of thrones': 'Game of Thrones is a fantasy drama series based on George R.R. Martin\'s novels, known for its complex characters, political intrigue, and epic battles. It aired on HBO from 2011-2019.',
  'breaking bad': 'Breaking Bad is a crime drama about a chemistry teacher turned methamphetamine manufacturer. It aired from 2008-2013 and is widely considered one of the greatest TV shows.',
  'friends': 'Friends is a popular sitcom about six friends living in Manhattan, airing from 1994-2004. It remains one of the most-watched and beloved comedy series.',
  'the office': 'The Office is a mockumentary sitcom about office workers, with both US and UK versions. The US version (2005-2013) became a cultural phenomenon.',
  'stranger things': 'Stranger Things is a sci-fi horror series set in the 1980s, following kids who encounter supernatural forces. It premiered on Netflix in 2016.',
  'the crown': 'The Crown is a historical drama about the reign of Queen Elizabeth II, known for its production quality and attention to historical detail. It premiered on Netflix in 2016.',
  'the simpsons': 'The Simpsons is the longest-running American sitcom, an animated series satirizing American culture. It premiered in 1989 and continues to air.',
  'squid game': 'Squid Game is a South Korean survival drama about contestants playing deadly children\'s games for money. It became a global phenomenon on Netflix in 2021.',
  'the wire': 'The Wire is a crime drama exploring Baltimore\'s drug scene, port, schools, and politics. It aired from 2002-2008 and is critically acclaimed for its realism.',
  'chernobyl': 'Chernobyl is a historical drama miniseries about the 1986 nuclear disaster. It premiered on HBO in 2019 and won multiple awards for its accuracy and storytelling.',
  'popular tv shows': 'Popular TV shows include dramas (Breaking Bad, Game of Thrones), comedies (Friends, The Office), reality shows (Survivor, The Bachelor), and streaming originals (Stranger Things, The Crown).',
};

// General Knowledge Helper Functions
export function findKnowledgeMatch(question: string, category: string): string | null {
  const questionLower = question.toLowerCase();
  let knowledgeBase: Record<string, string>;

  switch (category) {
    case 'science':
      knowledgeBase = SCIENCE_KNOWLEDGE;
      break;
    case 'history':
      knowledgeBase = HISTORY_KNOWLEDGE;
      break;
    case 'geography':
      knowledgeBase = GEOGRAPHY_KNOWLEDGE;
      break;
    case 'technology':
      knowledgeBase = TECHNOLOGY_KNOWLEDGE;
      break;
    case 'health':
      knowledgeBase = HEALTH_KNOWLEDGE;
      break;
    case 'finance':
      knowledgeBase = FINANCE_KNOWLEDGE;
      break;
    case 'food':
      knowledgeBase = FOOD_KNOWLEDGE;
      break;
    case 'travel':
      knowledgeBase = TRAVEL_KNOWLEDGE;
      break;
    case 'education':
      knowledgeBase = EDUCATION_KNOWLEDGE;
      break;
    case 'entertainment':
      knowledgeBase = ENTERTAINMENT_KNOWLEDGE;
      break;
    case 'sports':
      knowledgeBase = SPORTS_KNOWLEDGE;
      break;
    case 'camping':
      knowledgeBase = CAMPING_KNOWLEDGE;
      break;
    default:
      return null;
  }

  // Try exact matches first
  for (const [key, value] of Object.entries(knowledgeBase)) {
    if (questionLower.includes(key)) {
      return value;
    }
  }

  // Try partial matches
  for (const [key, value] of Object.entries(knowledgeBase)) {
    const keyWords = key.split(' ');
    if (keyWords.some(word => questionLower.includes(word) && word.length > 3)) {
      return value;
    }
  }

  return null;
}

export function getKnowledgeCategories(): string[] {
  return [
    'science',
    'history',
    'geography',
    'technology',
    'health',
    'finance',
    'food',
    'travel',
    'education',
    'entertainment'
  ];
}


export interface State {
  name: string;
  code: string;
  cities: string[];
}

export const US_STATES: State[] = [
  {
    name: 'Alabama',
    code: 'AL',
    cities: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville', 'Tuscaloosa']
  },
  {
    name: 'Alaska',
    code: 'AK',
    cities: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan']
  },
  {
    name: 'Arizona',
    code: 'AZ',
    cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Glendale']
  },
  {
    name: 'Arkansas',
    code: 'AR',
    cities: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro']
  },
  {
    name: 'California',
    code: 'CA',
    cities: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno']
  },
  {
    name: 'Colorado',
    code: 'CO',
    cities: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood']
  },
  {
    name: 'Connecticut',
    code: 'CT',
    cities: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury']
  },
  {
    name: 'Delaware',
    code: 'DE',
    cities: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna']
  },
  {
    name: 'Florida',
    code: 'FL',
    cities: ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg']
  },
  {
    name: 'Georgia',
    code: 'GA',
    cities: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens']
  },
  {
    name: 'Hawaii',
    code: 'HI',
    cities: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu']
  },
  {
    name: 'Idaho',
    code: 'ID',
    cities: ['Boise', 'Nampa', 'Meridian', 'Idaho Falls', 'Pocatello']
  },
  {
    name: 'Illinois',
    code: 'IL',
    cities: ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville']
  },
  {
    name: 'Indiana',
    code: 'IN',
    cities: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel']
  },
  {
    name: 'Iowa',
    code: 'IA',
    cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Waterloo']
  },
  {
    name: 'Kansas',
    code: 'KS',
    cities: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe']
  },
  {
    name: 'Kentucky',
    code: 'KY',
    cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington']
  },
  {
    name: 'Louisiana',
    code: 'LA',
    cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles']
  },
  {
    name: 'Maine',
    code: 'ME',
    cities: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn']
  },
  {
    name: 'Maryland',
    code: 'MD',
    cities: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie']
  },
  {
    name: 'Massachusetts',
    code: 'MA',
    cities: ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge']
  },
  {
    name: 'Michigan',
    code: 'MI',
    cities: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing']
  },
  {
    name: 'Minnesota',
    code: 'MN',
    cities: ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington']
  },
  {
    name: 'Mississippi',
    code: 'MS',
    cities: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi']
  },
  {
    name: 'Missouri',
    code: 'MO',
    cities: ['Kansas City', 'St. Louis', 'Springfield', 'Independence', 'Columbia']
  },
  {
    name: 'Montana',
    code: 'MT',
    cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Helena']
  },
  {
    name: 'Nebraska',
    code: 'NE',
    cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney']
  },
  {
    name: 'Nevada',
    code: 'NV',
    cities: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks']
  },
  {
    name: 'New Hampshire',
    code: 'NH',
    cities: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover']
  },
  {
    name: 'New Jersey',
    code: 'NJ',
    cities: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison']
  },
  {
    name: 'New Mexico',
    code: 'NM',
    cities: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell']
  },
  {
    name: 'New York',
    code: 'NY',
    cities: ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse']
  },
  {
    name: 'North Carolina',
    code: 'NC',
    cities: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem']
  },
  {
    name: 'North Dakota',
    code: 'ND',
    cities: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo']
  },
  {
    name: 'Ohio',
    code: 'OH',
    cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron']
  },
  {
    name: 'Oklahoma',
    code: 'OK',
    cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton']
  },
  {
    name: 'Oregon',
    code: 'OR',
    cities: ['Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro']
  },
  {
    name: 'Pennsylvania',
    code: 'PA',
    cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading']
  },
  {
    name: 'Rhode Island',
    code: 'RI',
    cities: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence']
  },
  {
    name: 'South Carolina',
    code: 'SC',
    cities: ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Rock Hill']
  },
  {
    name: 'South Dakota',
    code: 'SD',
    cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown']
  },
  {
    name: 'Tennessee',
    code: 'TN',
    cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville']
  },
  {
    name: 'Texas',
    code: 'TX',
    cities: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth']
  },
  {
    name: 'Utah',
    code: 'UT',
    cities: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem']
  },
  {
    name: 'Vermont',
    code: 'VT',
    cities: ['Burlington', 'Essex', 'South Burlington', 'Colchester', 'Rutland']
  },
  {
    name: 'Virginia',
    code: 'VA',
    cities: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News']
  },
  {
    name: 'Washington',
    code: 'WA',
    cities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue']
  },
  {
    name: 'West Virginia',
    code: 'WV',
    cities: ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling']
  },
  {
    name: 'Wisconsin',
    code: 'WI',
    cities: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine']
  },
  {
    name: 'Wyoming',
    code: 'WY',
    cities: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs']
  }
];

export function getCitiesByState(stateCode: string): string[] {
  const state = US_STATES.find(s => s.code === stateCode);
  return state ? state.cities : [];
}

export function getCitiesForState(stateCode: string): string[] {
  return getCitiesByState(stateCode);
}

export function getStateByCode(stateCode: string): State | undefined {
  return US_STATES.find(s => s.code === stateCode);
}

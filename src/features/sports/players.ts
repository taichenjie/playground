/**
 * Player data for Guess the Player and Mystery Career.
 *
 * ⚠ Drafted with AI assistance from memory of public records. Every entry
 * must be checked against a reliable source (e.g. Wikipedia, Transfermarkt,
 * Basketball-Reference) before public launch — see `verified`.
 * Careers list senior clubs/teams only; loans and brief spells are omitted.
 * Only append new players: inserting or removing changes every future day.
 */
export type Sport = "football" | "basketball";
export type Spell = { team: string; from: number; to: number | null };

export type Player = {
  name: string;
  aka?: string[];
  sport: Sport;
  nationality: string;
  position: string;
  born: number;
  career: Spell[];
  facts: [string, string];
  /** A famous team for the final clue. */
  keyTeam: string;
  verified: boolean;
};

export const PLAYERS: Player[] = [
  {
    name: "Thierry Henry", aka: ["Henry"], sport: "football", nationality: "French", position: "forward", born: 1977,
    career: [
      { team: "Monaco", from: 1994, to: 1999 },
      { team: "Juventus", from: 1999, to: 1999 },
      { team: "Arsenal", from: 1999, to: 2007 },
      { team: "Barcelona", from: 2007, to: 2010 },
      { team: "New York Red Bulls", from: 2010, to: 2014 },
    ],
    facts: ["Their club's all-time leading goalscorer in north London.", "Won the World Cup in 1998 and the European Championship in 2000."],
    keyTeam: "Arsenal", verified: false,
  },
  {
    name: "Zinedine Zidane", aka: ["Zidane", "Zizou"], sport: "football", nationality: "French", position: "attacking midfielder", born: 1972,
    career: [
      { team: "Cannes", from: 1989, to: 1992 },
      { team: "Bordeaux", from: 1992, to: 1996 },
      { team: "Juventus", from: 1996, to: 2001 },
      { team: "Real Madrid", from: 2001, to: 2006 },
    ],
    facts: ["Scored twice with headers in a World Cup final.", "Was sent off in the 2006 World Cup final, the last match of their career."],
    keyTeam: "Real Madrid", verified: false,
  },
  {
    name: "David Beckham", aka: ["Beckham"], sport: "football", nationality: "English", position: "midfielder", born: 1975,
    career: [
      { team: "Manchester United", from: 1992, to: 2003 },
      { team: "Real Madrid", from: 2003, to: 2007 },
      { team: "LA Galaxy", from: 2007, to: 2012 },
      { team: "Paris Saint-Germain", from: 2013, to: 2013 },
    ],
    facts: ["Famous for free-kicks and crossing, and captained their country.", "Won six league titles with their first club."],
    keyTeam: "Manchester United", verified: false,
  },
  {
    name: "Ronaldo Nazário", aka: ["Ronaldo", "R9", "Ronaldo Nazario", "Ronaldo Luís Nazário de Lima"], sport: "football", nationality: "Brazilian", position: "striker", born: 1976,
    career: [
      { team: "Cruzeiro", from: 1993, to: 1994 },
      { team: "PSV", from: 1994, to: 1996 },
      { team: "Barcelona", from: 1996, to: 1997 },
      { team: "Inter Milan", from: 1997, to: 2002 },
      { team: "Real Madrid", from: 2002, to: 2007 },
      { team: "AC Milan", from: 2007, to: 2008 },
      { team: "Corinthians", from: 2009, to: 2011 },
    ],
    facts: ["Won the Ballon d'Or in 1997 and 2002.", "Scored eight goals at the 2002 World Cup, including both in the final."],
    keyTeam: "Inter Milan", verified: false,
  },
  {
    name: "Andrea Pirlo", aka: ["Pirlo"], sport: "football", nationality: "Italian", position: "deep-lying playmaker", born: 1979,
    career: [
      { team: "Brescia", from: 1995, to: 1998 },
      { team: "Inter Milan", from: 1998, to: 2001 },
      { team: "AC Milan", from: 2001, to: 2011 },
      { team: "Juventus", from: 2011, to: 2015 },
      { team: "New York City FC", from: 2015, to: 2017 },
    ],
    facts: ["Famous for long-range passing and free-kicks from deep in midfield.", "Won the World Cup in 2006."],
    keyTeam: "AC Milan", verified: false,
  },
  {
    name: "Zlatan Ibrahimović", aka: ["Zlatan", "Ibrahimovic", "Zlatan Ibrahimovic"], sport: "football", nationality: "Swedish", position: "striker", born: 1981,
    career: [
      { team: "Malmö", from: 1999, to: 2001 },
      { team: "Ajax", from: 2001, to: 2004 },
      { team: "Juventus", from: 2004, to: 2006 },
      { team: "Inter Milan", from: 2006, to: 2009 },
      { team: "Barcelona", from: 2009, to: 2011 },
      { team: "AC Milan", from: 2010, to: 2012 },
      { team: "Paris Saint-Germain", from: 2012, to: 2016 },
      { team: "Manchester United", from: 2016, to: 2018 },
      { team: "LA Galaxy", from: 2018, to: 2019 },
      { team: "AC Milan", from: 2020, to: 2023 },
    ],
    facts: ["Scored a famous long-range overhead kick against England in 2012.", "Their country's all-time top international goalscorer."],
    keyTeam: "Paris Saint-Germain", verified: false,
  },
  {
    name: "Luís Figo", aka: ["Figo", "Luis Figo"], sport: "football", nationality: "Portuguese", position: "winger", born: 1972,
    career: [
      { team: "Sporting CP", from: 1989, to: 1995 },
      { team: "Barcelona", from: 1995, to: 2000 },
      { team: "Real Madrid", from: 2000, to: 2005 },
      { team: "Inter Milan", from: 2005, to: 2009 },
    ],
    facts: ["Won the Ballon d'Or in 2000.", "Their move between two bitter Spanish rivals caused uproar."],
    keyTeam: "Real Madrid", verified: false,
  },
  {
    name: "Didier Drogba", aka: ["Drogba"], sport: "football", nationality: "Ivorian", position: "striker", born: 1978,
    career: [
      { team: "Le Mans", from: 1998, to: 2002 },
      { team: "Guingamp", from: 2002, to: 2003 },
      { team: "Marseille", from: 2003, to: 2004 },
      { team: "Chelsea", from: 2004, to: 2012 },
      { team: "Shanghai Shenhua", from: 2012, to: 2012 },
      { team: "Galatasaray", from: 2013, to: 2014 },
      { team: "Chelsea", from: 2014, to: 2015 },
      { team: "Montreal Impact", from: 2015, to: 2016 },
      { team: "Phoenix Rising", from: 2017, to: 2018 },
    ],
    facts: ["Scored the equaliser and the winning penalty in the 2012 Champions League final.", "Their country's all-time top international goalscorer."],
    keyTeam: "Chelsea", verified: false,
  },
  {
    name: "Steven Gerrard", aka: ["Gerrard"], sport: "football", nationality: "English", position: "midfielder", born: 1980,
    career: [
      { team: "Liverpool", from: 1998, to: 2015 },
      { team: "LA Galaxy", from: 2015, to: 2016 },
    ],
    facts: ["Captained their club to a famous Champions League comeback in Istanbul in 2005.", "Spent 17 seasons at their boyhood club."],
    keyTeam: "Liverpool", verified: false,
  },
  {
    name: "Kaká", aka: ["Kaka", "Ricardo Kaká"], sport: "football", nationality: "Brazilian", position: "attacking midfielder", born: 1982,
    career: [
      { team: "São Paulo", from: 2001, to: 2003 },
      { team: "AC Milan", from: 2003, to: 2009 },
      { team: "Real Madrid", from: 2009, to: 2013 },
      { team: "AC Milan", from: 2013, to: 2014 },
      { team: "Orlando City", from: 2015, to: 2017 },
    ],
    facts: ["Won the Ballon d'Or in 2007.", "Was part of their country's World Cup-winning squad in 2002."],
    keyTeam: "AC Milan", verified: false,
  },
  {
    name: "Wayne Rooney", aka: ["Rooney"], sport: "football", nationality: "English", position: "forward", born: 1985,
    career: [
      { team: "Everton", from: 2002, to: 2004 },
      { team: "Manchester United", from: 2004, to: 2017 },
      { team: "Everton", from: 2017, to: 2018 },
      { team: "DC United", from: 2018, to: 2019 },
      { team: "Derby County", from: 2020, to: 2021 },
    ],
    facts: ["Burst onto the scene with a famous winning goal against Arsenal at the age of 16.", "Their biggest club's all-time record goalscorer."],
    keyTeam: "Manchester United", verified: false,
  },
  {
    name: "Fernando Torres", aka: ["Torres", "El Niño"], sport: "football", nationality: "Spanish", position: "striker", born: 1984,
    career: [
      { team: "Atlético Madrid", from: 2001, to: 2007 },
      { team: "Liverpool", from: 2007, to: 2011 },
      { team: "Chelsea", from: 2011, to: 2015 },
      { team: "Atlético Madrid", from: 2015, to: 2018 },
      { team: "Sagan Tosu", from: 2018, to: 2019 },
    ],
    facts: ["Scored the winning goal in the Euro 2008 final.", "Joined a London club for a then-British record transfer fee in 2011."],
    keyTeam: "Liverpool", verified: false,
  },
  {
    name: "Gianluigi Buffon", aka: ["Buffon", "Gigi Buffon"], sport: "football", nationality: "Italian", position: "goalkeeper", born: 1978,
    career: [
      { team: "Parma", from: 1995, to: 2001 },
      { team: "Juventus", from: 2001, to: 2018 },
      { team: "Paris Saint-Germain", from: 2018, to: 2019 },
      { team: "Juventus", from: 2019, to: 2021 },
      { team: "Parma", from: 2021, to: 2023 },
    ],
    facts: ["Won the World Cup in 2006.", "Played professionally for nearly three decades."],
    keyTeam: "Juventus", verified: false,
  },
  {
    name: "Shaquille O'Neal", aka: ["Shaq", "Shaquille ONeal", "O'Neal"], sport: "basketball", nationality: "American", position: "center", born: 1972,
    career: [
      { team: "Orlando Magic", from: 1992, to: 1996 },
      { team: "Los Angeles Lakers", from: 1996, to: 2004 },
      { team: "Miami Heat", from: 2004, to: 2008 },
      { team: "Phoenix Suns", from: 2008, to: 2009 },
      { team: "Cleveland Cavaliers", from: 2009, to: 2010 },
      { team: "Boston Celtics", from: 2010, to: 2011 },
    ],
    facts: ["Won three straight titles alongside Kobe Bryant.", "Also released rap albums and starred in films."],
    keyTeam: "Los Angeles Lakers", verified: false,
  },
  {
    name: "LeBron James", aka: ["LeBron", "King James"], sport: "basketball", nationality: "American", position: "forward", born: 1984,
    career: [
      { team: "Cleveland Cavaliers", from: 2003, to: 2010 },
      { team: "Miami Heat", from: 2010, to: 2014 },
      { team: "Cleveland Cavaliers", from: 2014, to: 2018 },
      { team: "Los Angeles Lakers", from: 2018, to: null },
    ],
    facts: ["Drafted first overall straight out of high school in 2003.", "Became the NBA's all-time leading scorer in 2023."],
    keyTeam: "Cleveland Cavaliers", verified: false,
  },
  {
    name: "Michael Jordan", aka: ["Jordan", "MJ"], sport: "basketball", nationality: "American", position: "shooting guard", born: 1963,
    career: [
      { team: "Chicago Bulls", from: 1984, to: 1993 },
      { team: "Chicago Bulls", from: 1995, to: 1998 },
      { team: "Washington Wizards", from: 2001, to: 2003 },
    ],
    facts: ["Won six NBA titles in two separate 'three-peats'.", "Briefly left basketball to play minor-league baseball."],
    keyTeam: "Chicago Bulls", verified: false,
  },
  {
    name: "Kareem Abdul-Jabbar", aka: ["Kareem", "Lew Alcindor"], sport: "basketball", nationality: "American", position: "center", born: 1947,
    career: [
      { team: "Milwaukee Bucks", from: 1969, to: 1975 },
      { team: "Los Angeles Lakers", from: 1975, to: 1989 },
    ],
    facts: ["Famous for the unblockable 'skyhook' shot.", "Held the NBA all-time scoring record for nearly 39 years."],
    keyTeam: "Los Angeles Lakers", verified: false,
  },
  {
    name: "Allen Iverson", aka: ["Iverson", "AI", "The Answer"], sport: "basketball", nationality: "American", position: "guard", born: 1975,
    career: [
      { team: "Philadelphia 76ers", from: 1996, to: 2006 },
      { team: "Denver Nuggets", from: 2006, to: 2008 },
      { team: "Detroit Pistons", from: 2008, to: 2009 },
      { team: "Memphis Grizzlies", from: 2009, to: 2009 },
      { team: "Philadelphia 76ers", from: 2009, to: 2010 },
    ],
    facts: ["One of the smallest players ever to win the league MVP award (2001).", "Famous for a devastating crossover dribble."],
    keyTeam: "Philadelphia 76ers", verified: false,
  },
  {
    name: "Dirk Nowitzki", aka: ["Dirk", "Nowitzki"], sport: "basketball", nationality: "German", position: "power forward", born: 1978,
    career: [{ team: "Dallas Mavericks", from: 1998, to: 2019 }],
    facts: ["Spent all 21 seasons of their NBA career with one team.", "Won the 2011 NBA title and was named Finals MVP."],
    keyTeam: "Dallas Mavericks", verified: false,
  },
  {
    name: "Steve Nash", aka: ["Nash"], sport: "basketball", nationality: "Canadian", position: "point guard", born: 1974,
    career: [
      { team: "Phoenix Suns", from: 1996, to: 1998 },
      { team: "Dallas Mavericks", from: 1998, to: 2004 },
      { team: "Phoenix Suns", from: 2004, to: 2012 },
      { team: "Los Angeles Lakers", from: 2012, to: 2015 },
    ],
    facts: ["Won back-to-back league MVP awards in 2005 and 2006.", "A point guard famed for passing in a fast-paced 'seven seconds or less' offence."],
    keyTeam: "Phoenix Suns", verified: false,
  },
  {
    name: "Dwyane Wade", aka: ["Wade", "D-Wade", "Dwayne Wade"], sport: "basketball", nationality: "American", position: "shooting guard", born: 1982,
    career: [
      { team: "Miami Heat", from: 2003, to: 2016 },
      { team: "Chicago Bulls", from: 2016, to: 2017 },
      { team: "Cleveland Cavaliers", from: 2017, to: 2018 },
      { team: "Miami Heat", from: 2018, to: 2019 },
    ],
    facts: ["Won three NBA titles, the first in 2006 as Finals MVP.", "Spent most of their career with one Florida team."],
    keyTeam: "Miami Heat", verified: false,
  },
  {
    name: "Pau Gasol", aka: ["Gasol"], sport: "basketball", nationality: "Spanish", position: "power forward / center", born: 1980,
    career: [
      { team: "Memphis Grizzlies", from: 2001, to: 2008 },
      { team: "Los Angeles Lakers", from: 2008, to: 2014 },
      { team: "Chicago Bulls", from: 2014, to: 2016 },
      { team: "San Antonio Spurs", from: 2016, to: 2019 },
      { team: "Milwaukee Bucks", from: 2019, to: 2019 },
    ],
    facts: ["Won back-to-back NBA titles in 2009 and 2010.", "Their younger brother also became an NBA All-Star."],
    keyTeam: "Los Angeles Lakers", verified: false,
  },
  {
    name: "Dennis Rodman", aka: ["Rodman", "The Worm"], sport: "basketball", nationality: "American", position: "power forward", born: 1961,
    career: [
      { team: "Detroit Pistons", from: 1986, to: 1993 },
      { team: "San Antonio Spurs", from: 1993, to: 1995 },
      { team: "Chicago Bulls", from: 1995, to: 1998 },
      { team: "Los Angeles Lakers", from: 1999, to: 1999 },
      { team: "Dallas Mavericks", from: 2000, to: 2000 },
    ],
    facts: ["Led the league in rebounding seven seasons in a row.", "Known for brightly dyed hair and wild off-court antics."],
    keyTeam: "Chicago Bulls", verified: false,
  },
  {
    name: "Vince Carter", aka: ["Carter", "Vinsanity"], sport: "basketball", nationality: "American", position: "shooting guard", born: 1977,
    career: [
      { team: "Toronto Raptors", from: 1998, to: 2004 },
      { team: "New Jersey Nets", from: 2004, to: 2009 },
      { team: "Orlando Magic", from: 2009, to: 2010 },
      { team: "Phoenix Suns", from: 2010, to: 2011 },
      { team: "Dallas Mavericks", from: 2011, to: 2014 },
      { team: "Memphis Grizzlies", from: 2014, to: 2017 },
      { team: "Sacramento Kings", from: 2017, to: 2018 },
      { team: "Atlanta Hawks", from: 2018, to: 2020 },
    ],
    facts: ["Won a legendary Slam Dunk Contest in 2000.", "Played a record 22 NBA seasons."],
    keyTeam: "Toronto Raptors", verified: false,
  },
  {
    name: "Tim Duncan", aka: ["Duncan"], sport: "basketball", nationality: "American (US Virgin Islands)", position: "power forward", born: 1976,
    career: [{ team: "San Antonio Spurs", from: 1997, to: 2016 }],
    facts: ["Won five NBA titles, all with the same team.", "Grew up as a competitive swimmer before switching to basketball."],
    keyTeam: "San Antonio Spurs", verified: false,
  },
  {
    name: "Kobe Bryant", aka: ["Kobe", "Bryant", "Black Mamba"], sport: "basketball", nationality: "American", position: "shooting guard", born: 1978,
    career: [{ team: "Los Angeles Lakers", from: 1996, to: 2016 }],
    facts: ["Scored 81 points in a single game in 2006.", "Spent all 20 seasons of their career with one franchise."],
    keyTeam: "Los Angeles Lakers", verified: false,
  },
];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => `${part[0]}.`)
    .join(" ");

export const careerSpan = (p: Player) =>
  `${p.career[0].from}–${p.career[p.career.length - 1].to ?? "present"}`;

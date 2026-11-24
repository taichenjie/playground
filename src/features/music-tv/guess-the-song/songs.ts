/**
 * Guess the Song puzzles. Clues are facts written for PLAYGROUND in our own
 * words — no lyrics, audio or artwork, so no media licensing is needed.
 *
 * ⚠ Facts were drafted with AI assistance and must be checked by a person
 * before public launch (see `verified`). Source for every entry: the song's
 * and artist's Wikipedia articles.
 *
 * Only append new songs: inserting or removing changes every future day.
 */
export type Song = {
  title: string;
  artist: string;
  year: number;
  genre: string;
  /** Shown as "Performed by …" */
  origin: string;
  album?: string;
  facts: [string, string];
  /** Other accepted spellings of the title. */
  aka?: string[];
  verified: boolean;
};

export const SONGS: Song[] = [
  {
    title: "Bohemian Rhapsody", artist: "Queen", year: 1975, genre: "rock", origin: "a British rock band", album: "A Night at the Opera",
    facts: [
      "Nearly six minutes long with no repeating chorus, it moves through ballad, opera and hard-rock sections.",
      "It topped the UK chart again when it was re-released in 1991, after the singer's death.",
    ],
    verified: false,
  },
  {
    title: "Billie Jean", artist: "Michael Jackson", year: 1983, genre: "pop / funk", origin: "an American solo singer", album: "Thriller",
    facts: [
      "A 1983 TV performance of this song introduced millions of viewers to the moonwalk.",
      "It comes from what is widely cited as the best-selling album of all time.",
    ],
    verified: false,
  },
  {
    title: "Smells Like Teen Spirit", artist: "Nirvana", year: 1991, genre: "grunge", origin: "an American rock trio", album: "Nevermind",
    facts: [
      "Its title came from a friend's joke scrawled on a wall, which referenced a brand of deodorant.",
      "Its music video is set at a high-school pep rally that descends into chaos.",
    ],
    verified: false,
  },
  {
    title: "Hey Jude", artist: "The Beatles", year: 1968, genre: "pop / rock", origin: "a British band",
    facts: [
      "Its sing-along coda runs for about four minutes of a seven-minute single.",
      "It was written to comfort a bandmate's young son during his parents' divorce.",
    ],
    verified: false,
  },
  {
    title: "Like a Rolling Stone", artist: "Bob Dylan", year: 1965, genre: "folk rock", origin: "an American singer-songwriter", album: "Highway 61 Revisited",
    facts: [
      "At over six minutes it was unusually long for a hit single in the mid-1960s.",
      "Its famous organ part was played by a musician who had come to the session hoping to play guitar.",
    ],
    verified: false,
  },
  {
    title: "Hotel California", artist: "Eagles", year: 1977, genre: "rock", origin: "an American rock band", album: "Hotel California",
    facts: [
      "Famous for a long twin-guitar solo that closes the song.",
      "It won the Grammy Award for Record of the Year.",
    ],
    verified: false,
  },
  {
    title: "Purple Rain", artist: "Prince", year: 1984, genre: "rock ballad", origin: "an American singer and multi-instrumentalist", album: "Purple Rain",
    facts: [
      "The title track of a film in which the singer also starred.",
      "Its basic track was recorded live at a benefit concert at a Minneapolis nightclub.",
    ],
    verified: false,
  },
  {
    title: "Wonderwall", artist: "Oasis", year: 1995, genre: "Britpop", origin: "a British rock band", album: "(What's the Story) Morning Glory?",
    facts: [
      "Its title was borrowed from a 1968 soundtrack album by George Harrison.",
      "Despite becoming one of the band's best-known songs, it peaked at No. 2 in the UK.",
    ],
    verified: false,
  },
  {
    title: "Rolling in the Deep", artist: "Adele", year: 2010, genre: "soul / pop", origin: "a British solo singer", album: "21",
    facts: [
      "The lead single from an album named after the singer's age at the time.",
      "It won the Grammy Award for Record of the Year.",
    ],
    verified: false,
  },
  {
    title: "Hips Don't Lie", artist: "Shakira", year: 2006, genre: "Latin pop", origin: "a Colombian solo singer, with a Haitian-American rapper", album: "Oral Fixation, Vol. 2",
    facts: [
      "It topped the US Billboard Hot 100 and many charts around the world.",
      "Its horn hook comes from a salsa song by Jerry Rivera.",
    ],
    aka: ["Hips Dont Lie"],
    verified: false,
  },
  {
    title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", year: 2014, genre: "funk / pop", origin: "a British producer featuring an American singer", album: "Uptown Special",
    facts: [
      "It spent 14 weeks at No. 1 on the US Billboard Hot 100.",
      "It won the Grammy Award for Record of the Year.",
    ],
    verified: false,
  },
  {
    title: "Dancing Queen", artist: "ABBA", year: 1976, genre: "disco / pop", origin: "a Swedish pop group", album: "Arrival",
    facts: [
      "The group performed it on Swedish TV at a gala on the eve of the King of Sweden's wedding in 1976.",
      "It was the group's only No. 1 single in the United States.",
    ],
    verified: false,
  },
  {
    title: "Stayin' Alive", artist: "Bee Gees", year: 1977, genre: "disco", origin: "a band of three brothers",
    facts: [
      "It plays over the opening scene of a 1977 film about a Brooklyn dancer.",
      "Its tempo is often recommended as a guide for the rhythm of CPR chest compressions.",
    ],
    aka: ["Stayin Alive", "Staying Alive"],
    verified: false,
  },
  {
    title: "Sweet Child o' Mine", artist: "Guns N' Roses", year: 1988, genre: "hard rock", origin: "an American hard-rock band", album: "Appetite for Destruction",
    facts: [
      "Its opening guitar riff began as a warm-up exercise the guitarist was messing around with.",
      "It was the band's only No. 1 single in the United States.",
    ],
    aka: ["Sweet Child of Mine", "Sweet Child O Mine"],
    verified: false,
  },
  {
    title: "Respect", artist: "Aretha Franklin", year: 1967, genre: "soul", origin: "an American soul singer",
    facts: [
      "It is a cover of a song first recorded by Otis Redding.",
      "This version added a famous spelled-out section that wasn't in the original.",
    ],
    verified: false,
  },
  {
    title: "Good Vibrations", artist: "The Beach Boys", year: 1966, genre: "psychedelic pop", origin: "an American band from California",
    facts: [
      "Its eerie high melody is played on an electro-theremin.",
      "It was assembled from sections recorded in several studios over many months.",
    ],
    verified: false,
  },
  {
    title: "Superstition", artist: "Stevie Wonder", year: 1972, genre: "funk / soul", origin: "an American singer and multi-instrumentalist", album: "Talking Book",
    facts: [
      "It is built around a funky clavinet riff.",
      "The song was originally meant to be given to guitarist Jeff Beck.",
    ],
    verified: false,
  },
  {
    title: "Africa", artist: "Toto", year: 1982, genre: "soft rock", origin: "an American rock band", album: "Toto IV",
    facts: [
      "It was the band's only No. 1 single in the United States.",
      "It enjoyed a huge internet-fuelled revival decades later, including a cover by Weezer.",
    ],
    verified: false,
  },
  {
    title: "Take On Me", artist: "a-ha", year: 1985, genre: "synth-pop", origin: "a Norwegian band", album: "Hunting High and Low",
    facts: [
      "Its music video mixes live action with pencil-sketch animation.",
      "It flopped at first and was re-recorded before becoming a worldwide hit.",
    ],
    verified: false,
  },
  {
    title: "Seven Nation Army", artist: "The White Stripes", year: 2003, genre: "garage rock", origin: "an American rock duo", album: "Elephant",
    facts: [
      "Its famous riff sounds like a bass but was played on a guitar through an octave pedal.",
      "The riff became a chant sung by crowds in football stadiums.",
    ],
    verified: false,
  },
  {
    title: "Crazy in Love", artist: "Beyoncé ft. Jay-Z", year: 2003, genre: "R&B / pop", origin: "an American singer featuring an American rapper", album: "Dangerously in Love",
    facts: [
      "Its blaring horn hook is sampled from a 1970 song by the Chi-Lites.",
      "It was the lead single from the singer's debut solo album.",
    ],
    verified: false,
  },
  {
    title: "Hey Ya!", artist: "OutKast", year: 2003, genre: "hip-hop / pop", origin: "an American hip-hop duo", album: "Speakerboxxx/The Love Below",
    facts: [
      "Its music video spoofs a famous 1964 American TV appearance by a British band.",
      "It comes from a double album on which each half of the duo made their own disc.",
    ],
    aka: ["Hey Ya"],
    verified: false,
  },
  {
    title: "Mr. Brightside", artist: "The Killers", year: 2004, genre: "indie rock", origin: "an American rock band from Las Vegas", album: "Hot Fuss",
    facts: [
      "It has stayed in the UK singles chart for years, long after its original release.",
      "It was the band's first single, later re-released to much bigger success.",
    ],
    aka: ["Mr Brightside", "Mister Brightside"],
    verified: false,
  },
  {
    title: "Shape of You", artist: "Ed Sheeran", year: 2017, genre: "pop", origin: "a British singer-songwriter", album: "÷ (Divide)",
    facts: [
      "The singer has said it was first written with another star, Rihanna, in mind.",
      "It was the first song to reach 3 billion streams on Spotify.",
    ],
    verified: false,
  },
  {
    title: "Bad Guy", artist: "Billie Eilish", year: 2019, genre: "electropop", origin: "an American singer", album: "When We All Fall Asleep, Where Do We Go?",
    facts: [
      "It was written and recorded with the singer's brother, largely in a bedroom studio.",
      "It won Grammys for both Record and Song of the Year.",
    ],
    verified: false,
  },
  {
    title: "Blinding Lights", artist: "The Weeknd", year: 2019, genre: "synth-pop", origin: "a Canadian singer", album: "After Hours",
    facts: [
      "It spent a record 90 weeks on the US Billboard Hot 100.",
      "Its pulsing synths deliberately echo 1980s pop.",
    ],
    verified: false,
  },
  {
    title: "Despacito", artist: "Luis Fonsi ft. Daddy Yankee", year: 2017, genre: "reggaeton / Latin pop", origin: "a Puerto Rican singer featuring a Puerto Rican rapper",
    facts: [
      "Its music video was the first on YouTube to reach 5 billion views.",
      "A remix added verses from a Canadian pop star.",
    ],
    verified: false,
  },
  {
    title: "Gangnam Style", artist: "PSY", year: 2012, genre: "K-pop", origin: "a South Korean singer and rapper",
    facts: [
      "It was the first YouTube video to reach one billion views.",
      "Its horse-riding dance became a worldwide craze.",
    ],
    verified: false,
  },
  {
    title: "Rehab", artist: "Amy Winehouse", year: 2006, genre: "soul", origin: "a British singer", album: "Back to Black",
    facts: [
      "Produced by Mark Ronson with a retro 1960s soul sound.",
      "It won three Grammys, including Record of the Year.",
    ],
    verified: false,
  },
  {
    title: "Toxic", artist: "Britney Spears", year: 2004, genre: "dance-pop", origin: "an American pop singer", album: "In the Zone",
    facts: [
      "Its swirling string hook is sampled from a Bollywood song.",
      "It won the singer her first Grammy Award.",
    ],
    verified: false,
  },
  {
    title: "Lose Yourself", artist: "Eminem", year: 2002, genre: "hip-hop", origin: "an American rapper",
    facts: [
      "It was the first hip-hop song to win the Oscar for Best Original Song.",
      "It comes from the soundtrack of a semi-autobiographical film about a Detroit rapper.",
    ],
    verified: false,
  },
  {
    title: "Wannabe", artist: "Spice Girls", year: 1996, genre: "pop", origin: "a British girl group", album: "Spice",
    facts: [
      "It was the group's debut single and reached No. 1 in more than 30 countries.",
      "Its video was filmed in one continuous take at a London hotel.",
    ],
    verified: false,
  },
  {
    title: "Every Breath You Take", artist: "The Police", year: 1983, genre: "new wave / pop rock", origin: "a British rock trio", album: "Synchronicity",
    facts: [
      "Often mistaken for a love song, its writer has described it as sinister — about obsession and surveillance.",
      "It was sampled for a 1997 tribute hit by Puff Daddy.",
    ],
    verified: false,
  },
  {
    title: "Yellow", artist: "Coldplay", year: 2000, genre: "alternative rock", origin: "a British rock band", album: "Parachutes",
    facts: [
      "Its video is a single continuous shot of the singer walking along a beach.",
      "It was the band's first top-five hit in the UK.",
    ],
    verified: false,
  },
  {
    title: "Running Up That Hill", artist: "Kate Bush", year: 1985, genre: "art pop", origin: "a British singer-songwriter", album: "Hounds of Love",
    facts: [
      "It hit No. 1 in the UK in 2022, 37 years after release, after featuring in a Netflix series.",
      "Its full title adds a phrase about making a deal with God.",
    ],
    aka: ["Running Up That Hill (A Deal with God)"],
    verified: false,
  },
  {
    title: "Zombie", artist: "The Cranberries", year: 1994, genre: "alternative rock", origin: "an Irish rock band", album: "No Need to Argue",
    facts: [
      "It was written in protest after a 1993 bombing in Warrington, England.",
      "Its heavy, distorted guitars set it apart from the band's softer hits.",
    ],
    verified: false,
  },
  {
    title: "I Will Always Love You", artist: "Whitney Houston", year: 1992, genre: "pop / soul ballad", origin: "an American singer", album: "The Bodyguard (soundtrack)",
    facts: [
      "It is a cover of a song written and first recorded by Dolly Parton.",
      "It comes from the soundtrack of a film in which the singer also starred.",
    ],
    verified: false,
  },
  {
    title: "Smooth", artist: "Santana ft. Rob Thomas", year: 1999, genre: "Latin rock", origin: "a Mexican-American guitarist featuring an American singer", album: "Supernatural",
    facts: [
      "It spent 12 weeks at No. 1 on the US Billboard Hot 100.",
      "It won three Grammys, including Record and Song of the Year.",
    ],
    verified: false,
  },
  {
    title: "Happy", artist: "Pharrell Williams", year: 2013, genre: "soul / pop", origin: "an American singer and producer",
    facts: [
      "It was written for the soundtrack of an animated film about a reformed supervillain.",
      "Its official music video lasts 24 hours.",
    ],
    verified: false,
  },
  {
    title: "Call Me Maybe", artist: "Carly Rae Jepsen", year: 2011, genre: "pop", origin: "a Canadian singer", album: "Kiss",
    facts: [
      "Its rise was boosted when two big pop stars tweeted about it and made a lip-sync video.",
      "It topped the charts in many countries, including the US and UK.",
    ],
    verified: false,
  },
  {
    title: "Imagine", artist: "John Lennon", year: 1971, genre: "soft rock", origin: "a British singer-songwriter",
    facts: [
      "It was recorded largely in a studio at the singer's own country house in England.",
      "Built on a simple piano part, it asks the listener to picture a world without borders or possessions.",
    ],
    verified: false,
  },
  {
    title: "Born to Run", artist: "Bruce Springsteen", year: 1975, genre: "heartland rock", origin: "an American singer-songwriter from New Jersey", album: "Born to Run",
    facts: [
      "The album it named put the singer on the covers of both Time and Newsweek in the same week.",
      "Its 'wall of sound' production took months to finish.",
    ],
    verified: false,
  },
];

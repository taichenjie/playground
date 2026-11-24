/**
 * Four by Four puzzles: 16 music & TV names, four hidden groups of four.
 * Groups go from easiest (level 0) to trickiest (level 3).
 *
 * ⚠ Drafted with AI assistance; every group must be checked by a person
 * before public launch. Each item must fit exactly one group.
 * Only append new puzzles.
 */
export type Group = { label: string; items: [string, string, string, string]; level: 0 | 1 | 2 | 3 };
export type Puzzle = { groups: [Group, Group, Group, Group]; verified: boolean };

export const PUZZLES: Puzzle[] = [
  {
    groups: [
      { level: 0, label: "Sitcoms", items: ["Friends", "Seinfeld", "Frasier", "Cheers"] },
      { level: 1, label: "Queen songs", items: ["Bohemian Rhapsody", "Radio Ga Ga", "Somebody to Love", "Under Pressure"] },
      { level: 2, label: "Singers known by one name", items: ["Adele", "Rihanna", "Shakira", "Beyoncé"] },
      { level: 3, label: "Colours in band names", items: ["Green Day", "Deep Purple", "Simply Red", "Black Sabbath"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "Hospital dramas", items: ["Grey's Anatomy", "Scrubs", "ER", "House"] },
      { level: 1, label: "Beatles songs", items: ["Yesterday", "Help!", "Yellow Submarine", "Let It Be"] },
      { level: 2, label: "Animals in band names", items: ["Arctic Monkeys", "Eagles", "Gorillaz", "Def Leppard"] },
      { level: 3, label: "Days of the week in song titles", items: ["Manic Monday", "Ruby Tuesday", "Friday I'm in Love", "Sunday Bloody Sunday"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "Rappers", items: ["Drake", "Eminem", "Nas", "Jay-Z"] },
      { level: 1, label: "Michael Jackson songs", items: ["Thriller", "Beat It", "Bad", "Black or White"] },
      { level: 2, label: "Sci-fi TV series", items: ["Doctor Who", "Star Trek", "The X-Files", "Firefly"] },
      { level: 3, label: "Songs named after women", items: ["Roxanne", "Jolene", "Layla", "Angie"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "Animated sitcoms", items: ["The Simpsons", "Family Guy", "South Park", "Futurama"] },
      { level: 1, label: "ABBA songs", items: ["Waterloo", "Mamma Mia", "Fernando", "Dancing Queen"] },
      { level: 2, label: "Netflix original series", items: ["Stranger Things", "The Crown", "Squid Game", "Bridgerton"] },
      { level: 3, label: "Metals in band names", items: ["Iron Maiden", "Led Zeppelin", "Silverchair", "Goldfrapp"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "TV talent shows", items: ["The X Factor", "American Idol", "The Voice", "Britain's Got Talent"] },
      { level: 1, label: "Taylor Swift albums", items: ["Fearless", "Red", "Folklore", "Lover"] },
      { level: 2, label: "Bands from Manchester", items: ["Oasis", "The Smiths", "Joy Division", "The Stone Roses"] },
      { level: 3, label: "Songs from the musical Grease", items: ["Summer Nights", "Greased Lightnin'", "You're the One That I Want", "Hopelessly Devoted to You"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "Crime dramas", items: ["Breaking Bad", "The Wire", "Sherlock", "Line of Duty"] },
      { level: 1, label: "Prince songs", items: ["Purple Rain", "Kiss", "1999", "When Doves Cry"] },
      { level: 2, label: "Sang a James Bond theme", items: ["Billie Eilish", "Sam Smith", "Tina Turner", "Shirley Bassey"] },
      { level: 3, label: "Bands named after places", items: ["Chicago", "Boston", "Europe", "Kansas"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "K-pop groups", items: ["BTS", "Blackpink", "Twice", "Stray Kids"] },
      { level: 1, label: "Elton John songs", items: ["Rocket Man", "Tiny Dancer", "Your Song", "Candle in the Wind"] },
      { level: 2, label: "Fantasy TV series", items: ["Game of Thrones", "The Witcher", "The Wheel of Time", "House of the Dragon"] },
      { level: 3, label: "Fleetwood Mac songs", items: ["Dreams", "Go Your Own Way", "Landslide", "Everywhere"] },
    ],
    verified: false,
  },
  {
    groups: [
      { level: 0, label: "Reality TV", items: ["Love Island", "Survivor", "Big Brother", "The Apprentice"] },
      { level: 1, label: "Dolly Parton hits", items: ["Jolene", "9 to 5", "Coat of Many Colors", "Islands in the Stream"] },
      { level: 2, label: "Electronic duos", items: ["Daft Punk", "The Chemical Brothers", "Pet Shop Boys", "Disclosure"] },
      { level: 3, label: "Eurovision-winning songs", items: ["Waterloo", "Euphoria", "Arcade", "Rise Like a Phoenix"] },
    ],
    verified: false,
  },
];

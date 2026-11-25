/*
 * Who's That? roster: well-known public figures only (no private or
 * "viral" individuals). Each entry is an English Wikipedia article title;
 * the build script resolves it to Wikidata and that person's own portrait
 * image (property P18) on Wikimedia Commons.
 *
 * Append freely. Run `npm run faces` afterwards, then review new faces at
 * /whos-that/review before they appear in the game.
 */

export type Category = "athletes" | "singers" | "actors" | "comedians" | "creators" | "public";

export type RosterEntry = { title: string; category: Category; korean?: boolean };

const group = (category: Category, titles: string[], korean = false): RosterEntry[] =>
  titles.map((title) => ({ title, category, korean }));

export const ROSTER: RosterEntry[] = [
  ...group("athletes", [
    "Lionel Messi", "Cristiano Ronaldo", "Neymar", "Kylian Mbappé", "Erling Haaland", "Mohamed Salah",
    "Kevin De Bruyne", "Luka Modrić", "Harry Kane", "Jude Bellingham", "Vinícius Júnior", "Robert Lewandowski",
    "David Beckham", "Zlatan Ibrahimović", "LeBron James", "Stephen Curry", "Michael Jordan", "Kobe Bryant",
    "Giannis Antetokounmpo", "Kevin Durant", "Shaquille O'Neal", "Nikola Jokić", "Victor Wembanyama",
    "Serena Williams", "Roger Federer", "Rafael Nadal", "Novak Djokovic", "Naomi Osaka", "Carlos Alcaraz",
    "Usain Bolt", "Simone Biles", "Michael Phelps", "Tiger Woods", "Lewis Hamilton", "Max Verstappen",
    "Muhammad Ali", "Mike Tyson", "Conor McGregor", "Tom Brady", "Shohei Ohtani", "Virat Kohli", "Wayne Gretzky",
  ]),
  ...group("singers", [
    "Taylor Swift", "Beyoncé", "Rihanna", "Adele", "Ed Sheeran", "Bruno Mars", "Billie Eilish", "Ariana Grande",
    "Lady Gaga", "Justin Bieber", "Dua Lipa", "The Weeknd", "Drake (musician)", "Harry Styles", "Olivia Rodrigo",
    "Shakira", "Katy Perry", "Selena Gomez", "Eminem", "Kendrick Lamar", "Post Malone", "Bad Bunny", "Doja Cat",
    "SZA", "Sabrina Carpenter", "Miley Cyrus", "Elton John", "Madonna", "Michael Jackson", "Freddie Mercury",
    "Elvis Presley", "Mariah Carey", "Jennifer Lopez", "Snoop Dogg", "Chris Martin", "Lana Del Rey", "Sam Smith",
    "Chappell Roan", "Bob Marley", "Celine Dion",
  ]),
  ...group("actors", [
    "Tom Hanks", "Leonardo DiCaprio", "Brad Pitt", "Meryl Streep", "Scarlett Johansson", "Dwayne Johnson", "Zendaya",
    "Tom Holland", "Robert Downey Jr.", "Margot Robbie", "Ryan Gosling", "Keanu Reeves", "Jennifer Lawrence",
    "Will Smith", "Denzel Washington", "Johnny Depp", "Morgan Freeman", "Emma Stone", "Timothée Chalamet",
    "Florence Pugh", "Chris Hemsworth", "Gal Gadot", "Samuel L. Jackson", "Nicole Kidman", "Cate Blanchett",
    "Tom Cruise", "Angelina Jolie", "Jackie Chan", "Pedro Pascal", "Cillian Murphy", "Anya Taylor-Joy",
    "Michelle Yeoh", "Hugh Jackman", "Ryan Reynolds", "Natalie Portman", "Daniel Radcliffe", "Emma Watson",
    "Jason Momoa", "Viola Davis", "Jenna Ortega",
  ]),
  ...group("comedians", [
    "Kevin Hart", "Jimmy Fallon", "Jimmy Kimmel", "Ellen DeGeneres", "Oprah Winfrey", "Trevor Noah",
    "Conan O'Brien", "Stephen Colbert", "John Oliver", "James Corden", "Jerry Seinfeld", "Dave Chappelle",
    "Chris Rock", "Ricky Gervais", "Steve Harvey", "Gordon Ramsay", "Simon Cowell", "Rowan Atkinson",
    "Adam Sandler", "Jim Carrey", "Eddie Murphy", "Amy Schumer", "Tina Fey", "John Mulaney", "Ali Wong",
    "Jimmy Carr", "Graham Norton", "David Letterman", "Jay Leno", "Steve Carell", "Will Ferrell", "Robin Williams",
    "Ryan Seacrest", "Jon Stewart", "Bill Burr",
  ]),
  ...group("public", [
    "Barack Obama", "Joe Biden", "Donald Trump", "Kamala Harris", "Emmanuel Macron", "Angela Merkel",
    "Justin Trudeau", "Narendra Modi", "Xi Jinping", "Vladimir Putin", "Volodymyr Zelenskyy", "Rishi Sunak",
    "Keir Starmer", "Boris Johnson", "Pope Francis", "14th Dalai Lama", "Elizabeth II", "Charles III",
    "William, Prince of Wales", "Elon Musk", "Bill Gates", "Mark Zuckerberg", "Jeff Bezos", "Steve Jobs", "Tim Cook",
    "Warren Buffett", "Jensen Huang", "Sam Altman", "Sundar Pichai", "Satya Nadella", "Malala Yousafzai",
    "Greta Thunberg", "Michelle Obama", "Nelson Mandela", "Albert Einstein", "Lee Hsien Loong", "Lawrence Wong",
    "Jacinda Ardern",
  ]),

  // Korean edition
  ...group("singers", [
    "RM (rapper)", "Jin (singer)", "Suga (rapper)", "J-Hope", "Jimin", "V (singer)", "Jungkook", "Jennie (singer)",
    "Lisa (rapper)", "Rosé (singer)", "Jisoo", "IU (singer)", "Psy", "G-Dragon", "Taeyeon", "BoA", "Rain (entertainer)",
    "Cha Eun-woo", "Jang Won-young", "Karina (South Korean singer)", "Taemin", "Lim Young-woong",
  ], true),
  ...group("actors", [
    "Song Kang-ho", "Lee Byung-hun", "Lee Min-ho", "Hyun Bin", "Son Ye-jin", "Park Seo-joon", "Kim Soo-hyun",
    "Song Hye-kyo", "Song Joong-ki", "Gong Yoo", "Jun Ji-hyun", "Ma Dong-seok", "Jung Ho-yeon", "Lee Jung-jae",
    "Park Bo-gum", "Kim Go-eun", "Bae Doona", "Youn Yuh-jung", "Lee Jong-suk", "Park Shin-hye", "Han So-hee",
    "Kim Tae-ri", "Jung Hae-in", "Bae Suzy",
  ], true),
  ...group("athletes", [
    "Son Heung-min", "Kim Min-jae (footballer)", "Kim Yuna", "Ryu Hyun-jin", "Park Ji-sung", "Faker (gamer)", "Lee Kang-in",
    "An Se-young", "Hwang Hee-chan", "Park Chan-ho", "Kim Yeon-koung", "Hwang Sun-woo",
  ], true),
  ...group("comedians", [
    "Yoo Jae-suk", "Kang Ho-dong", "Lee Kwang-soo", "Kim Jong-kook", "Haha (entertainer)", "Jun Hyun-moo",
    "Shin Dong-yup (comedian)", "Park Na-rae",
  ], true),
  ...group("public", [
    "Yoon Suk Yeol", "Moon Jae-in", "Lee Jae-myung", "Ban Ki-moon", "Lee Jae-yong", "Bong Joon-ho", "Park Chan-wook",
    "Han Kang",
  ], true),

  // Korean edition, expanded: idols, solo artists, trot stars
  ...group("singers", [
    "Nayeon", "Jeongyeon", "Jihyo", "Dahyun", "Son Chae-young", "Irene (singer)", "Seulgi", "Wendy (singer)",
    "Joy (singer)", "Yeri (singer)", "Baekhyun", "Chanyeol", "Doh Kyung-soo", "Oh Se-hun", "Suho (singer)", "Kai (entertainer, born 1994)",
    "Taeyang", "Daesung", "T.O.P (entertainer)", "Im Yoon-ah", "Tiffany Young", "Seohyun", "Choi Soo-young",
    "Kwon Yu-ri", "Choi Si-won", "Kyuhyun", "Kim Heechul", "CL (singer)", "Sandara Park", "Sunmi", "Hyuna",
    "Chungha", "Zico (rapper)", "Jay Park", "Heize", "Ailee", "Lee Hi", "Crush (singer)", "Tablo", "Jessi (musician)",
    "Jeon Somi", "Kim Jae-joong", "Lee Seung-gi", "Lee Jun-ho (singer)", "Ok Taec-yeon", "Hwang Min-hyun",
    "Kang Daniel", "Park Ji-hoon", "Wonho (singer)", "Lee Hyori", "Uhm Jung-hwa", "Seo Taiji", "Park Jin-young",
    "Lee Chan-won", "Song Ga-in", "Jang Yoon-jeong (singer)", "Solar (singer)", "Hwasa", "Moonbyul", "Key (entertainer)",
    "Choi Min-ho", "Ahn Yu-jin", "Winter (singer)", "Jeon So-yeon", "Cho Mi-yeon", "Huh Yun-jin", "Younha",
    "Kim Se-jeong", "Jo Yu-ri", "Kwon Eun-bi", "Yerin Baek", "Lee Young-ji",
  ], true),
  ...group("actors", [
    "Lee Do-hyun", "Kim Seon-ho", "Nam Joo-hyuk", "Song Seung-heon", "Jo In-sung", "Ha Jung-woo", "Hwang Jung-min",
    "Jung Woo-sung", "Kim Hye-soo", "Jeon Do-yeon", "Kim Tae-hee", "Han Hyo-joo", "Park Min-young", "Shin Min-a",
    "Kim Ji-won (actress)", "Seo Ye-ji", "Park Eun-bin", "Kim Yoo-jung", "Moon Ga-young", "Lee Sung-kyung",
    "Kim Da-mi", "Choi Woo-shik", "Wi Ha-joon", "Park Hae-soo", "Lee Je-hoon", "So Ji-sub", "Won Bin",
    "Ji Chang-wook", "Lee Joon-gi", "Kim Woo-bin", "Ahn Hyo-seop", "Rowoon", "Byeon Woo-seok", "Ha Ji-won",
    "Jang Na-ra", "Go Youn-jung", "Kim Hye-yoon", "Yeo Jin-goo", "Seo Kang-joon", "Namkoong Min", "Lee Dong-wook",
    "Gong Hyo-jin", "Jang Dong-gun", "Park Hae-il", "Choi Min-sik", "Sol Kyung-gu", "Ryu Seung-ryong", "Jo Jung-suk",
    "Hwang In-youp", "Kim Nam-gil", "Lee Jun-young", "Park Bo-young", "Jung So-min", "Kim Ji-won",
    "Lee Se-young", "Shin Hye-sun", "Song Kang", "Lee Min-ki", "Kim Sung-kyu",
  ], true),
  ...group("comedians", [
    "Kim Gu-ra", "Lee Kyung-kyu", "Seo Jang-hoon", "Ahn Jung-hwan", "Kim Jong-min", "Jo Se-ho",
    "Yang Se-hyung", "Yang Se-chan", "Boom (entertainer)", "Lee Young-ja", "Kim Sook", "Song Eun-i", "Lee Guk-joo",
    "Defconn", "Kim Shin-young", "Jang Do-yeon", "Baek Jong-won", "Lee Seo-jin", "Na Young-seok", "Kim Byung-man",
    "Jung Hyung-don", "Noh Hong-chul", "Park Myung-soo", "Jeong Jun-ha", "Hong Jin-kyung", "Lee Soo-geun",
    "Ji Suk-jin", "Song Ji-hyo",
  ], true),
  ...group("athletes", [
    "Choo Shin-soo", "Lee Dae-ho", "Kim Ha-seong", "Lee Jung-hoo", "Inbee Park", "Ko Jin-young", "Hong Myung-bo",
    "Cha Bum-kun", "Ki Sung-yueng", "Kim Woo-jin (archer)", "An San", "Woo Sang-hyeok", "Choi Min-jeong",
    "Lee Sang-hwa", "Hwang Dae-heon", "Lee Seung-hoon", "Shin Yu-bin",
  ], true),

  // Expansion, 26 Nov 2026: more athletes, YouTubers and creators, global singers and public figures.
  ...group("athletes", [
    // Football
    "Pelé", "Diego Maradona", "Ronaldinho", "Ronaldo (Brazilian footballer)", "Zinedine Zidane", "Thierry Henry",
    "Wayne Rooney", "Steven Gerrard", "Frank Lampard", "Andrés Iniesta", "Xavi (footballer, born 1980)", "Sergio Ramos", "Gerard Piqué",
    "Karim Benzema", "Luis Suárez (Uruguayan footballer)", "Gareth Bale", "Kaká", "Andrea Pirlo", "Gianluigi Buffon", "Paolo Maldini",
    "Francesco Totti", "Alessandro Del Piero", "Manuel Neuer", "Thomas Müller", "Toni Kroos", "Antoine Griezmann",
    "Paul Pogba", "N'Golo Kanté", "Virgil van Dijk", "Bukayo Saka", "Phil Foden", "Declan Rice", "Marcus Rashford",
    "Bruno Fernandes", "Bernardo Silva", "Rodri (footballer, born 1996)", "Lamine Yamal", "Pedri", "Florian Wirtz",
    "Jamal Musiala", "Rodrygo", "Federico Valverde", "Achraf Hakimi", "Sadio Mané", "Didier Drogba", "Samuel Eto'o",
    "Cole Palmer", "Martin Ødegaard", "Lautaro Martínez", "Julián Álvarez", "Emiliano Martínez", "Ousmane Dembélé",
    "Luís Figo", "Fernando Torres", "Arjen Robben", "Robin van Persie", "Iker Casillas", "Thibaut Courtois",
    "Alisson Becker", "Dani Alves", "Raheem Sterling", "Jürgen Klopp", "Pep Guardiola", "José Mourinho",
    "Carlo Ancelotti", "Alex Ferguson", "Megan Rapinoe", "Alex Morgan", "Alexia Putellas", "Aitana Bonmatí", "Sam Kerr",
    // Basketball
    "Magic Johnson", "Larry Bird", "Kareem Abdul-Jabbar", "Tim Duncan", "Dirk Nowitzki", "Allen Iverson", "Dwyane Wade",
    "Chris Paul", "Kawhi Leonard", "James Harden", "Russell Westbrook", "Kyrie Irving", "Damian Lillard", "Luka Dončić",
    "Joel Embiid", "Jayson Tatum", "Anthony Edwards (basketball)", "Shai Gilgeous-Alexander", "Ja Morant", "Anthony Davis",
    "Klay Thompson", "Draymond Green", "Jimmy Butler", "Paul George", "Devin Booker", "Kevin Garnett", "Yao Ming",
    "Hakeem Olajuwon", "Scottie Pippen", "Dennis Rodman", "Charles Barkley", "Vince Carter", "Tony Parker", "Pau Gasol",
    "Steve Nash", "Carmelo Anthony", "Caitlin Clark", "Jalen Brunson", "Zion Williamson",
    // Formula One and motorsport
    "Michael Schumacher", "Ayrton Senna", "Fernando Alonso", "Sebastian Vettel", "Charles Leclerc", "Lando Norris",
    "Oscar Piastri", "Carlos Sainz Jr.", "George Russell (racing driver)", "Sergio Pérez", "Daniel Ricciardo",
    "Kimi Räikkönen", "Nico Rosberg", "Valtteri Bottas", "Pierre Gasly", "Yuki Tsunoda", "Alexander Albon",
    "Andrea Kimi Antonelli", "Niki Lauda", "Alain Prost", "Toto Wolff", "Christian Horner", "Valentino Rossi",
    "Marc Márquez",
    // Badminton and table tennis
    "Lee Chong Wei", "Loh Kean Yew", "Lin Dan", "Viktor Axelsen", "Kento Momota", "Carolina Marín", "P. V. Sindhu",
    "Tai Tzu-ying", "Chen Long", "Shi Yuqi", "Taufik Hidayat", "Saina Nehwal", "Ma Long", "Fan Zhendong", "Sun Yingsha",
    // Tennis and golf
    "Andy Murray", "Venus Williams", "Maria Sharapova", "Iga Świątek", "Aryna Sabalenka", "Coco Gauff", "Jannik Sinner",
    "Daniil Medvedev", "Alexander Zverev", "Stefanos Tsitsipas", "Pete Sampras", "Andre Agassi", "Steffi Graf",
    "Emma Raducanu", "Nick Kyrgios", "Rory McIlroy", "Scottie Scheffler", "Phil Mickelson", "Jack Nicklaus", "Jon Rahm",
    // Combat sports
    "Floyd Mayweather Jr.", "Manny Pacquiao", "Canelo Álvarez", "Tyson Fury", "Anthony Joshua", "Oleksandr Usyk",
    "Khabib Nurmagomedov", "Jon Jones", "Ronda Rousey", "Israel Adesanya",
    // Athletics, swimming, gymnastics
    "Carl Lewis", "Eliud Kipchoge", "Armand Duplantis", "Mo Farah", "Florence Griffith Joyner",
    "Katie Ledecky", "Joseph Schooling", "Ian Thorpe", "Nadia Comăneci",
    // Cricket, American sports, ice hockey and more
    "Sachin Tendulkar", "MS Dhoni", "Rohit Sharma", "Ben Stokes", "Babar Azam", "Shane Warne", "Patrick Mahomes",
    "Travis Kelce", "Peyton Manning", "Aaron Rodgers", "Babe Ruth", "Derek Jeter", "Aaron Judge", "Sidney Crosby",
    "Alexander Ovechkin", "Connor McDavid", "Tony Hawk", "Shaun White", "Eileen Gu", "Lindsey Vonn", "Kelly Slater",
    "Magnus Carlsen",
  ]),
  ...group("creators", [
    "MrBeast", "PewDiePie", "Markiplier", "Jacksepticeye", "Logan Paul", "Jake Paul", "KSI", "Ninja (gamer)",
    "Pokimane", "XQc", "Kai Cenat", "IShowSpeed", "Casey Neistat", "Marques Brownlee", "Lilly Singh", "Liza Koshy",
    "Charli D'Amelio", "Addison Rae", "Khaby Lame", "Zach King", "Mark Rober", "Michelle Phan",
    "James Charles", "Ludwig Ahgren", "Valkyrae", "Hasan Piker", "Bretman Rock", "Ryan Higa", "Lele Pons",
    "Bella Poarch", "Linus Sebastian", "Zoella", "Daniel Howell", "Phil Lester", "NikkieTutorials", "Huda Kattan",
    "Joe Rogan", "Ms Rachel", "JianHao Tan", "Kim Kardashian", "Kylie Jenner", "Paris Hilton",
  ]),
  ...group("singers", [
    "Travis Scott", "Cardi B", "Nicki Minaj", "Kanye West", "Jay-Z", "Rosalía", "Karol G", "J Balvin", "Shawn Mendes",
    "Charlie Puth", "Lewis Capaldi", "Benson Boone", "Tate McRae", "Ice Spice", "Megan Thee Stallion", "Lizzo",
    "Usher (musician)", "Alicia Keys", "Whitney Houston", "Prince (musician)", "David Bowie", "John Lennon",
    "Paul McCartney", "Mick Jagger", "Jon Bon Jovi", "Stevie Wonder", "Britney Spears", "Christina Aguilera",
    "Pink (singer)", "Avril Lavigne", "Jay Chou", "JJ Lin", "Stefanie Sun", "Teresa Teng", "Faye Wong", "Joji (musician)",
    "Rich Brian", "Gracie Abrams", "Noah Kahan", "Zayn Malik", "Niall Horan", "Frank Ocean",
  ]),
  ...group("actors", [
    "Chow Yun-fat", "Tony Leung Chiu-wai", "Andy Lau", "Stephen Chow", "Gong Li", "Zhang Ziyi",
    "Ken Watanabe", "Simu Liu",
  ]),
  ...group("public", [
    "Lee Kuan Yew", "Tharman Shanmugaratnam", "Anwar Ibrahim", "Mahathir Mohamad", "Joko Widodo", "Prabowo Subianto",
    "Shinzo Abe", "Pope Leo XIV", "Javier Milei", "Giorgia Meloni", "Mark Carney", "Jack Ma", "Tony Fernandes",
    "Larry Page", "Sergey Brin", "Richard Branson", "Lisa Su", "Masayoshi Son", "Mukesh Ambani", "Bernard Arnault",
    "Stephen Hawking", "Neil Armstrong", "Martin Luther King Jr.", "Mahatma Gandhi", "Diana, Princess of Wales",
    "Catherine, Princess of Wales", "Prince Harry, Duke of Sussex", "Meghan, Duchess of Sussex",
  ]),
  ...group("athletes", [
    "Park Tae-hwan", "Jang Mi-ran", "Lee Young-pyo",
  ], true),
];

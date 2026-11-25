/*
 * Extra accepted answers, on top of the Wikidata aliases in faces.json.
 *
 * A single name (a surname or first name alone) is only accepted when it is
 * listed here, for people the world really does call by that one name.
 * Keyed by the face's exact name in faces.json.
 */
export const NICKNAMES: Record<string, string[]> = {
  "Lionel Messi": ["Messi", "Leo Messi"],
  "Cristiano Ronaldo": ["Ronaldo", "Cristiano"],
  "David Beckham": ["Beckham"],
  "Erling Haaland": ["Haaland"],
  "Jude Bellingham": ["Bellingham"],
  "Kevin De Bruyne": ["De Bruyne", "KDB"],
  "LeBron James": ["LeBron", "King James"],
  "Luka Modrić": ["Modric"],
  "Max Verstappen": ["Verstappen"],
  "Michael Jordan": ["MJ"],
  "Mohamed Salah": ["Salah"],
  "Novak Djokovic": ["Djokovic"],
  "Rafael Nadal": ["Nadal", "Rafa Nadal"],
  "Robert Lewandowski": ["Lewandowski"],
  "Roger Federer": ["Federer"],
  "Shaquille O'Neal": ["Shaq"],
  "Shohei Ohtani": ["Ohtani"],
  "Stephen Curry": ["Steph Curry"],
  "Usain Bolt": ["Bolt"],
  "Victor Wembanyama": ["Wembanyama"],
  "Vinícius Júnior": ["Vinicius", "Vini Jr"],
  "Wayne Gretzky": ["Gretzky"],
  "Zlatan Ibrahimović": ["Zlatan", "Ibrahimovic"],
  "Giannis Antetokounmpo": ["Giannis"],
  "Nikola Jokić": ["Jokic"],
  "Kylian Mbappé": ["Mbappe"],
  // Stage names whose full names Wikidata doesn't list as aliases.
  Miley: ["Miley Cyrus"],
  Zendaya: ["Zendaya Coleman"],
  Drake: ["Aubrey Graham", "Drizzy"],
  "Beyoncé": ["Beyoncé Knowles"],
  Rihanna: ["Robyn Fenty"],
  Shakira: ["Shakira Mebarak"],
  MrBeast: ["Jimmy Donaldson"],
};

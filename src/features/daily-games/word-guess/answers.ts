/**
 * Daily answers: a hand-picked list of common, family-friendly five-letter
 * words, written for PLAYGROUND. The daily order is shuffled in daily.ts.
 *
 * Adding words is safe, but only ever append to the end: inserting or
 * removing changes which word every future day gets.
 */
export const ANSWERS: readonly string[] = `
about above actor adapt admit adopt adult after again agent agree ahead alarm album alert alien
align alive allow alone along alter amber amend angel anger angle angry apple apply apron arena
argue arise armor arrow aside asset audio audit avoid awake award aware awful bacon badge badly
baker basic basin batch beach beard beast begin being belly below bench berry birth black blade
blame blank blast blaze bleak blend bless blind blink block bloom blown board boast bonus boost
booth brain brake brand brave bread break breed brick bride brief bring brisk broad broke brown
brush buddy build built bunch burst buyer cabin cable camel canal candy canoe cargo carry carve
catch cause chain chair chalk champ charm chart chase cheap check cheek cheer chess chest chief
child chill choir chord chunk cider civic claim clash class clean clear clerk click cliff climb
clock close cloth cloud clown coach coast cobra cocoa coral couch count court cover crack craft
crane crash crate crawl crazy cream creek crisp crowd crown crumb crush crust curve cycle daily
dairy daisy dance dealt decay delay delta dense depth diary diner dizzy dodge donor doubt dough
dozen draft drain drama drank dream dress dried drift drill drink drive eager eagle early earth
easel eaten eight elbow elder elect elite empty enemy enjoy enter entry equal error essay event
every exact exist extra fable faith false fancy feast fence ferry fetch fever fiber field fifth
fifty fight final first flame flash fleet float flock flood floor flour fluid flute focus foggy
force forge forth forty forum found frame fresh front frost fruit funny gauge ghost giant given
glass gleam globe glove grace grade grain grand grant grape graph grasp grass grave gravy great
greed green greet grill grind groan group grove guard guess guest guide habit happy harsh haste
haven heart heavy hedge hello hinge hobby honey honor horse hotel hound house hover human humor
hurry ideal image index inner input irony issue ivory jelly jewel joint jolly judge juice jumbo
kayak knife knock label laser later laugh layer learn lemon level light limit linen liver llama
lobby local lodge logic loose lover lucky lunar lunch magic major mango manor maple march match
mayor medal melon mercy merit metal meter might minor mixer model money month moral motor mount
mouse mouth movie music naive nerve never newly niece night noble noise north novel nurse nylon
ocean offer often olive onion opera orbit order organ other otter ought ounce outer owner oxide
paint panel panic paper party pasta paste patch pause peach pearl pedal penny perch piano piece
pilot pinch pixel pizza place plain plane plant plate plaza point polar porch pouch pound power
press price pride prime print prism prize proof proud prune pulse punch puppy queen query quest
quick quiet quilt quote radar radio rally ranch range rapid raven reach react ready realm rebel
relax relay reply ridge right rigid rinse risky rival river roast robin robot rocky rouge rough
round route royal rugby ruler rural salad salon sauce scale scarf scene scent scone score scout
scrap seize sense serve seven shade shake shape share shark sharp sheep sheet shelf shell shift
shine shirt shock shore short shout shrug sight silly since skate skill skirt slate sleep slice
slide slope smart smile smoke snack snake solar solid solve sonic sound south space spare spark
speak speed spell spend spice spike spine spoon sport spray squad stack staff stage stain stair
stake stamp stand stare start state steak steam steel steep stern stick still stock stone stool
storm story stove straw strip study stuff style sugar suite sunny super surge swamp swarm sweat
sweep sweet swift swing sword syrup table taste teach tempo thank theme thick thief thing think
third thorn three throw thumb tiger tight timer toast today token topic torch total touch tough
towel tower trace track trade trail train treat trend trial tribe trick troop truck truly trunk
trust truth tulip tutor twist uncle under union unity until upper upset urban usage usual valid
value valve vapor vault venue verse video vigor vinyl viola vital vivid vocal voice voter wagon
waltz waste watch water whale wheat wheel while whisk whole witty woman world worry worth wrist
write wrong yacht yeast yield young youth zebra
`
  .trim()
  .split(/\s+/);

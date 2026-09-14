// Turns curated thematic clusters into a deduped, undirected similarity edge
// list for the initial cold-start seed dataset. Pure data generation, no
// network and no NestJS/TypeORM dependency — this documents *how* the
// dataset was put together and lets it be regenerated/tweaked later.
//
// Run with: node scripts/data/build-seed-similarities.js
// Writes seed-movies.json and seed-edges.json next to this file, which
// scripts/seed-similarities-import.ts then imports into the database.
'use strict';
const fs = require('fs');
const path = require('path');

function slug(title, year) {
  const s = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${s}-${year}`;
}

// Each cluster is a genuine curatorial concept (tone/theme/structure/atmosphere),
// never a bare genre label. `reason` is the shared rationale applied to every
// intra-cluster edge; clusters of size <= 12 are fully connected (every pair in
// a tightly-defined cluster is a reasonable "these feel similar" claim), larger
// clusters connect each movie to its 7 nearest neighbours in list order to avoid
// linking loosely-related tail entries.
const CLUSTERS = [
  { name: 'Cerebral mind-bending sci-fi', reason: 'Reality-questioning sci-fi built around a puzzle-box structure, unreliable perception, and a twist that recontextualizes everything before it', movies: ['Inception (2010)','Memento (2000)','The Prestige (2006)','Predestination (2014)','Primer (2004)','Donnie Darko (2001)','Source Code (2011)','Looper (2012)','Coherence (2013)','Triangle (2009)','The Butterfly Effect (2004)','Shutter Island (2010)'] },
  { name: 'Contemplative epic sci-fi', reason: 'Slow-burn, awe-driven science fiction that uses space or the unknown to explore grief, isolation, and what it means to be human', movies: ['Interstellar (2014)','Arrival (2016)','Gravity (2013)','2001: A Space Odyssey (1968)','Solaris (1972)','Ad Astra (2019)','Contact (1997)','The Martian (2015)','Sunshine (2007)','Moon (2009)','First Man (2018)','Annihilation (2018)'] },
  { name: 'Dystopian sci-fi', reason: 'A controlled, surveilled or engineered society whose rules quietly strip away individual freedom, seen through one person pushing back against it', movies: ['Blade Runner (1982)','Blade Runner 2049 (2017)','Children of Men (2006)','Brazil (1985)','Nineteen Eighty-Four (1984)','A Clockwork Orange (1971)','Minority Report (2002)','Gattaca (1997)','The Matrix (1999)','Snowpiercer (2013)','Ex Machina (2014)','Her (2013)','The Truman Show (1998)','The Stepford Wives (1975)'] },
  { name: 'Cyberpunk and hard-edged sci-fi action', reason: 'Grimy, tech-noir future worlds where bodies, machines and identity blur, delivered with hard-edged action', movies: ['The Terminator (1984)','Terminator 2: Judgment Day (1991)','RoboCop (1987)','Total Recall (1990)','Akira (1988)','Ghost in the Shell (1995)','The Fifth Element (1997)','Edge of Tomorrow (2014)','District 9 (2009)','Elysium (2013)'] },
  { name: 'Space opera and sense-of-wonder adventure', reason: 'Sweeping, mythic adventure across alien worlds that trades hard science for wonder, spectacle and a classic hero’s journey', movies: ['Star Wars (1977)','The Empire Strikes Back (1980)','Guardians of the Galaxy (2014)','Star Trek (2009)','Dune (2021)','Avatar (2009)','John Carter (2012)','Serenity (2005)','E.T. the Extra-Terrestrial (1982)','Close Encounters of the Third Kind (1977)'] },
  { name: 'Superhero and vigilante drama', reason: 'A masked or powered figure wrestling with identity, morality and the cost of power, more character study than spectacle', movies: ['The Dark Knight (2008)','Batman Begins (2005)','Iron Man (2008)','The Avengers (2012)','Spider-Man: Into the Spider-Verse (2018)','Logan (2017)','Watchmen (2009)','V for Vendetta (2005)','Unbreakable (2000)','Kick-Ass (2010)','Deadpool (2016)','Joker (2019)','The Incredibles (2004)','Spider-Man 2 (2004)'] },
  { name: 'Sweeping fantasy epic', reason: 'A hero’s-journey quest across a richly built fantasy world, with an ensemble cast, an ancient evil, and mythic stakes', movies: ['The Lord of the Rings: The Fellowship of the Ring (2001)','The Lord of the Rings: The Two Towers (2002)','The Lord of the Rings: The Return of the King (2003)','The Hobbit: An Unexpected Journey (2012)','Harry Potter and the Sorcerer’s Stone (2001)','Harry Potter and the Prisoner of Azkaban (2004)','The Chronicles of Narnia: The Lion, the Witch and the Wardrobe (2005)','Willow (1988)','Conan the Barbarian (1982)','Excalibur (1981)','The NeverEnding Story (1984)','Stardust (2007)'] },
  { name: 'Whimsical dark fantasy', reason: 'A hand-crafted, melancholy fairy-tale atmosphere where wonder and darkness sit side by side', movies: ['Pan’s Labyrinth (2006)','The Shape of Water (2017)','Edward Scissorhands (1990)','Big Fish (2003)','The Fall (2006)','MirrorMask (2005)','Coraline (2009)','Labyrinth (1986)','The Fisher King (1991)','Spirited Away (2001)','Howl’s Moving Castle (2004)'] },
  { name: 'Studio Ghibli and family animation', reason: 'Gentle, hand-drawn coming-of-age wonder aimed at all ages, where small everyday moments matter as much as the fantastical ones', movies: ['Spirited Away (2001)','My Neighbor Totoro (1988)','Princess Mononoke (1997)','Grave of the Fireflies (1988)','Kiki’s Delivery Service (1989)','Howl’s Moving Castle (2004)','The Wind Rises (2013)','Up (2009)','WALL·E (2008)','Toy Story (1995)','Finding Nemo (2003)','Coco (2017)'] },
  { name: 'Adult and darker animation', reason: 'Animation used as a tool for adult, often unsettling storytelling rather than family entertainment', movies: ['Persepolis (2007)','Waltz with Bashir (2008)','Anomalisa (2015)','Perfect Blue (1997)','Paprika (2006)','Fantastic Mr. Fox (2009)','The Iron Giant (1999)','Wolf Children (2012)','A Silent Voice (2016)','Your Name (2016)'] },
  { name: 'Modern movie musical', reason: 'Song-and-performance driven storytelling about the price of chasing an artistic dream', movies: ['La La Land (2016)','Whiplash (2014)','Once (2007)','Sing Street (2016)','The Umbrellas of Cherbourg (1964)','Chicago (2002)','Moulin Rouge! (2001)','A Star Is Born (2018)'] },
  { name: 'Coming-of-age drama', reason: 'An intimate portrait of adolescence — first love, identity, alienation — told with emotional honesty rather than nostalgia alone', movies: ['The Perks of Being a Wallflower (2012)','Lady Bird (2017)','Call Me by Your Name (2017)','Boyhood (2014)','Stand by Me (1986)','The Breakfast Club (1985)','Eighth Grade (2018)','Moonlight (2016)','The 400 Blows (1959)','Y Tu Mamá También (2001)','An Education (2009)','The Spectacular Now (2013)','Mid90s (2018)','Superbad (2007)'] },
  { name: 'Marriage and family drama', reason: 'A close, unflinching look at a family or marriage coming apart under the weight of unspoken resentment', movies: ['Ordinary People (1980)','Manchester by the Sea (2016)','Marriage Story (2019)','Kramer vs. Kramer (1979)','American Beauty (1999)','Revolutionary Road (2008)','The Ice Storm (1997)','Little Miss Sunshine (2006)','August: Osage County (2013)','The Squid and the Whale (2005)','Terms of Endearment (1983)'] },
  { name: 'Prestige biography', reason: 'A dramatized true-life story of a singular, difficult figure told through the awards-season biopic playbook', movies: ['The Social Network (2010)','Steve Jobs (2015)','The Theory of Everything (2014)','A Beautiful Mind (2001)','The Imitation Game (2014)','Walk the Line (2005)','Ray (2004)','Bohemian Rhapsody (2018)','Rocketman (2019)','Capote (2005)','Lincoln (2012)','The King’s Speech (2010)'] },
  { name: 'Obsessive genius and ambition', reason: 'A character consumed by perfectionism or ambition, where the pursuit of greatness curdles into self-destruction', movies: ['Whiplash (2014)','Black Swan (2010)','The Master (2012)','There Will Be Blood (2007)','Nightcrawler (2014)','Foxcatcher (2014)','Amadeus (1984)','The Aviator (2004)','Birdman (2014)','Boogie Nights (1997)'] },
  { name: 'Legal and political drama', reason: 'An institution’s process — a courtroom, a newsroom, a hearing — used to expose a larger moral or political reckoning', movies: ['12 Angry Men (1957)','A Few Good Men (1992)','Erin Brockovich (2000)','Spotlight (2015)','All the President’s Men (1976)','The Insider (1999)','Michael Clayton (2007)','JFK (1991)','The Trial of the Chicago 7 (2020)','Judgment at Nuremberg (1961)'] },
  { name: 'War and its human cost', reason: 'A visceral, ground-level depiction of combat or wartime survival that strips away the glory of war', movies: ['Saving Private Ryan (1998)','Full Metal Jacket (1987)','Apocalypse Now (1979)','Platoon (1986)','Dunkirk (2017)','1917 (2019)','Hacksaw Ridge (2016)','The Thin Red Line (1998)','Black Hawk Down (2001)','Come and See (1985)','Das Boot (1981)','Grave of the Fireflies (1988)','Schindler’s List (1993)','The Pianist (2002)','Life Is Beautiful (1997)','Son of Saul (2015)'] },
  { name: 'Mafia and gangster saga', reason: 'A multi-generational rise-and-fall inside organized crime, built on loyalty, betrayal and the corrupting pull of power', movies: ['The Godfather (1972)','The Godfather Part II (1974)','Goodfellas (1990)','Casino (1995)','Scarface (1983)','Once Upon a Time in America (1984)','The Departed (2006)','American Gangster (2007)','City of God (2002)','A Bronx Tale (1993)','Donnie Brasco (1997)','Miller’s Crossing (1990)','The Untouchables (1987)','Eastern Promises (2007)'] },
  { name: 'Neo-noir crime thriller', reason: 'A morally murky crime investigation told with stylized violence, nonlinear structure or a corrosive view of human nature', movies: ['Pulp Fiction (1994)','Reservoir Dogs (1992)','Se7en (1995)','Fargo (1996)','No Country for Old Men (2007)','L.A. Confidential (1997)','Chinatown (1974)','The Usual Suspects (1995)','Memento (2000)','Drive (2011)','Nightcrawler (2014)','Prisoners (2013)','Zodiac (2007)','Gone Girl (2014)','Le Samouraï (1967)'] },
  { name: 'Heist thriller', reason: 'A meticulously planned crew pulling off an elaborate job, where the plan itself is the entertainment', movies: ['Ocean’s Eleven (2001)','Inside Man (2006)','Heat (1995)','The Italian Job (2003)','Baby Driver (2017)','Logan Lucky (2017)','Dog Day Afternoon (1975)','Hell or High Water (2016)','Widows (2018)','The Town (2010)'] },
  { name: 'Psychological thriller', reason: 'A destabilizing thriller built on an unreliable mind, a hidden identity, or a slow descent into madness', movies: ['Black Swan (2010)','Gone Girl (2014)','Shutter Island (2010)','The Sixth Sense (1999)','Fight Club (1999)','American Psycho (2000)','The Silence of the Lambs (1991)','Misery (1990)','Rear Window (1954)','Vertigo (1958)','Get Out (2017)','Us (2019)','Taxi Driver (1976)','Repulsion (1965)'] },
  { name: 'Home-invasion and confined-space survival', reason: 'A trapped protagonist matching wits with an intruder or captor in one confined, tension-locked space', movies: ['Don’t Breathe (2016)','Panic Room (2002)','The Purge (2013)','Green Room (2015)','You’re Next (2011)','10 Cloverfield Lane (2016)','Hush (2016)','The Strangers (2008)'] },
  { name: 'Slasher and classic stalk-and-kill horror', reason: 'A masked or unstoppable killer stalking victims in an escalating body count, built on dread and jump-scare craft', movies: ['Halloween (1978)','A Nightmare on Elm Street (1984)','Scream (1996)','Friday the 13th (1980)','The Texas Chain Saw Massacre (1974)','Psycho (1960)','Child’s Play (1988)','It Follows (2014)','Candyman (1992)','The Cabin in the Woods (2011)','Happy Death Day (2017)','X (2022)'] },
  { name: 'Atmospheric and supernatural horror', reason: 'Slow-building dread rooted in family, faith or grief, where the supernatural is a vessel for real psychological horror', movies: ['The Exorcist (1973)','Hereditary (2018)','Midsommar (2019)','The Witch (2015)','Rosemary’s Baby (1968)','The Shining (1980)','The Conjuring (2013)','Insidious (2010)','A Quiet Place (2018)','The Babadook (2014)','It (2017)','Sinister (2012)','The Ring (2002)','Paranormal Activity (2007)','The Wicker Man (1973)'] },
  { name: 'Body horror and sci-fi horror', reason: 'Claustrophobic sci-fi horror where an alien or mutating threat corrupts the human body itself', movies: ['Alien (1979)','Aliens (1986)','The Thing (1982)','The Fly (1986)','Annihilation (2018)','Event Horizon (1997)','Predator (1987)','Life (2017)'] },
  { name: 'Korean revenge thriller', reason: 'A coldly stylish revenge story with brutal violence, moral ambiguity and a devastating late twist', movies: ['Oldboy (2003)','Sympathy for Mr. Vengeance (2002)','Lady Vengeance (2005)','I Saw the Devil (2010)','The Chaser (2008)','Memories of Murder (2003)','Mother (2009)','The Handmaiden (2016)','Parasite (2019)','Burning (2018)'] },
  { name: 'Japanese cinema classics', reason: 'Formally masterful Japanese storytelling examining honor, truth and social order, hugely influential on world cinema', movies: ['Seven Samurai (1954)','Rashomon (1950)','Ikiru (1952)','Tokyo Story (1953)','Yojimbo (1961)','High and Low (1963)','Ran (1985)','Departures (2008)','Shoplifters (2018)','Drive My Car (2021)','Nobody Knows (2004)'] },
  { name: 'Chinese and Hong Kong cinema', reason: 'Visually stylized Chinese-language cinema, spanning wuxia spectacle to intimate romantic longing', movies: ['In the Mood for Love (2000)','Chungking Express (1994)','Hero (2002)','Crouching Tiger, Hidden Dragon (2000)','House of Flying Daggers (2004)','Infernal Affairs (2002)','A Chinese Ghost Story (1987)','Farewell My Concubine (1993)','Raise the Red Lantern (1991)','Hard Boiled (1992)'] },
  { name: 'Indian cinema', reason: 'Emotionally maximalist Indian storytelling blending personal struggle with a broader social or national canvas', movies: ['Dangal (2016)','3 Idiots (2009)','Lagaan (2001)','Gully Boy (2019)','Slumdog Millionaire (2008)','RRR (2022)','Pather Panchali (1955)','The Lunchbox (2013)'] },
  { name: 'French cinema', reason: 'Distinctly French storytelling — romantic, existential or socially raw — with a strong authorial voice', movies: ['Amélie (2001)','La Haine (1995)','The 400 Blows (1959)','Breathless (1960)','Blue Is the Warmest Colour (2013)','Amour (2012)','The Artist (2011)','Léon: The Professional (1994)','A Prophet (2009)','Holy Motors (2012)'] },
  { name: 'Italian and Spanish-language cinema', reason: 'Warm, melancholic Southern European filmmaking preoccupied with memory, longing and mortality', movies: ['Cinema Paradiso (1988)','La Dolce Vita (1960)','Bicycle Thieves (1948)','8½ (1963)','Pan’s Labyrinth (2006)','Volver (2006)','Talk to Her (2002)','The Skin I Live In (2011)','Life Is Beautiful (1997)','The Great Beauty (2013)'] },
  { name: 'Scandinavian and Northern European cinema', reason: 'Bleak, formally precise Northern European drama probing grief, cruelty or repressed emotion beneath a placid surface', movies: ['Let the Right One In (2008)','Force Majeure (2014)','The Hunt (2012)','A Man Called Ove (2015)','Amour (2012)','The Square (2017)','Melancholia (2011)','Antichrist (2009)'] },
  { name: 'Classic and revisionist Western', reason: 'The mythology of the American West, either celebrated in classic form or dismantled by a harder, more violent revisionist lens', movies: ['The Good, the Bad and the Ugly (1966)','Once Upon a Time in the West (1968)','Unforgiven (1992)','True Grit (2010)','No Country for Old Men (2007)','There Will Be Blood (2007)','The Revenant (2015)','3:10 to Yuma (2007)','Django Unchained (2012)','The Hateful Eight (2015)'] },
  { name: 'Buddy and absurdist comedy', reason: 'Broad, escalating comic chaos carried by a mismatched pair or ensemble’s chemistry', movies: ['Superbad (2007)','The Hangover (2009)','Dumb and Dumber (1994)','Anchorman: The Legend of Ron Burgundy (2004)','Step Brothers (2008)','Shaun of the Dead (2004)','Hot Fuzz (2007)','In Bruges (2008)','The Grand Budapest Hotel (2014)','Knives Out (2019)','Jojo Rabbit (2019)','Groundhog Day (1993)'] },
  { name: 'Romance and romantic comedy', reason: 'A central love story that lives or dies on the chemistry and specificity of its two leads rather than genre formula', movies: ['When Harry Met Sally... (1989)','Notting Hill (1999)','Pretty Woman (1990)','500 Days of Summer (2009)','Eternal Sunshine of the Spotless Mind (2004)','The Notebook (2004)','Before Sunrise (1995)','Before Sunset (2004)','Silver Linings Playbook (2012)','Crazy Rich Asians (2018)','About Time (2013)','Amélie (2001)','Her (2013)','La La Land (2016)'] },
  { name: 'Sports drama', reason: 'An underdog’s grueling road through a sport, where the real story is discipline, sacrifice and self-worth', movies: ['Rocky (1976)','Raging Bull (1980)','Rudy (1993)','Miracle (2004)','Moneyball (2011)','The Blind Side (2009)','Creed (2015)','Whiplash (2014)'] },
  { name: 'Survival against nature or isolation', reason: 'One person (or a small group) fighting to survive against an indifferent, punishing environment', movies: ['Cast Away (2000)','127 Hours (2010)','Life of Pi (2012)','The Revenant (2015)','All Is Lost (2013)','Gravity (2013)','Into the Wild (2007)','The Martian (2015)','Titanic (1997)','Deepwater Horizon (2016)','The Road (2009)','The Diving Bell and the Butterfly (2007)'] },
  { name: 'Documentary', reason: 'Nonfiction filmmaking that turns a real person, event or investigation into a compelling narrative arc', movies: ['Won’t You Be My Neighbor? (2018)','Free Solo (2018)','Man on Wire (2008)','The Act of Killing (2012)','Amy (2015)','13th (2016)','Icarus (2017)','Jiro Dreams of Sushi (2011)'] },
  { name: 'Quirky American independent film', reason: 'Deadpan, idiosyncratic indie storytelling about outsiders and dysfunctional families, driven by voice over plot', movies: ['Little Miss Sunshine (2006)','Juno (2007)','Napoleon Dynamite (2004)','Lost in Translation (2003)','The Royal Tenenbaums (2001)','Punch-Drunk Love (2002)','Frances Ha (2012)','Moonrise Kingdom (2012)','Garden State (2004)','Swiss Army Man (2016)'] },
  { name: 'Mystery and whodunit', reason: 'A puzzle-driven investigation where the pleasure is piecing together clues alongside the detective', movies: ['Knives Out (2019)','Gone Girl (2014)','Zodiac (2007)','Se7en (1995)','The Girl with the Dragon Tattoo (2011)','Prisoners (2013)','Shutter Island (2010)','Murder on the Orient Express (2017)','The Illusionist (2006)'] },
  { name: 'Modern high-octane action', reason: 'Kinetic, expertly-crafted modern action built around a relentless chase, mission or one-man army', movies: ['Mad Max: Fury Road (2015)','John Wick (2014)','Mission: Impossible - Fallout (2018)','Die Hard (1988)','The Bourne Identity (2002)','Speed (1994)','Gladiator (2000)','300 (2006)','Kill Bill: Vol. 1 (2003)','The Raid (2011)'] },
  { name: 'Teen high-school comedy', reason: 'Sharp, socially observant comedy set inside high-school hierarchy and adolescent anxiety', movies: ['Mean Girls (2004)','Clueless (1995)','10 Things I Hate About You (1999)','Easy A (2010)','Ferris Bueller’s Day Off (1986)','The Edge of Seventeen (2016)','Booksmart (2019)','American Pie (1999)'] },
  { name: 'Zombie and viral outbreak', reason: 'A fast-spreading outbreak collapses society, and the real horror is what survivors do to each other', movies: ['28 Days Later (2002)','Dawn of the Dead (2004)','World War Z (2013)','Train to Busan (2016)','Shaun of the Dead (2004)','I Am Legend (2007)','Zombieland (2009)','The Girl with All the Gifts (2016)'] },
  { name: 'Time-loop and time-travel comedy-adventure', reason: 'A time-bending premise played for comic or bittersweet self-improvement rather than hard sci-fi rigor', movies: ['Back to the Future (1985)','Groundhog Day (1993)','Bill & Ted’s Excellent Adventure (1989)','Palm Springs (2020)','Edge of Tomorrow (2014)','About Time (2013)'] },
  { name: 'Ancient and epic historical drama', reason: 'A sweeping historical canvas built around one figure’s conquest, faith, or defiance of empire', movies: ['Braveheart (1995)','Gladiator (2000)','Lawrence of Arabia (1962)','The Last Samurai (2003)','Kingdom of Heaven (2005)','Spartacus (1960)','Ben-Hur (1959)','The Mission (1986)','Amistad (1997)','12 Years a Slave (2013)'] },
  { name: 'Con artists and grifters', reason: 'A charming liar running an elaborate long con, where the fun is watching the audience get played too', movies: ['Catch Me If You Can (2002)','The Sting (1973)','American Hustle (2013)','Nine Queens (2000)','Matchstick Men (2003)','Now You See Me (2013)'] },
  { name: 'Alien contact and invasion', reason: 'First contact with an alien intelligence, played as either existential wonder or civilization-scale threat', movies: ['Arrival (2016)','War of the Worlds (2005)','Independence Day (1996)','A Quiet Place (2018)','Signs (2002)','The Day the Earth Stood Still (1951)'] },
  { name: 'Prison and captivity drama', reason: 'Confinement used to strip a character down to what they truly are, and their fight to hold onto hope or escape', movies: ['The Shawshank Redemption (1994)','Cool Hand Luke (1967)','Escape from Alcatraz (1979)','A Prophet (2009)','Papillon (1973)','Midnight Express (1978)','The Green Mile (1999)'] },
  { name: 'Road movie and self-discovery journey', reason: 'A literal journey that doubles as an emotional or spiritual one, reshaping the traveler by the final stretch', movies: ['Thelma & Louise (1991)','Little Miss Sunshine (2006)','Y Tu Mamá También (2001)','Into the Wild (2007)','Easy Rider (1969)','Nebraska (2013)','The Motorcycle Diaries (2004)','Wild (2014)'] },
  { name: 'Latin American cinema', reason: 'Latin American storytelling that grounds intimate personal drama in vivid social and political texture', movies: ['City of God (2002)','The Motorcycle Diaries (2004)','Amores Perros (2000)','Roma (2018)','Central Station (1998)','The Secret in Their Eyes (2009)'] },
  { name: 'African and Middle Eastern cinema', reason: 'Character-driven drama that uses one life to illuminate a specific and under-told social or political reality', movies: ['Tsotsi (2005)','Timbuktu (2014)','A Separation (2011)','The Kite Runner (2007)','Wadjda (2012)','Capernaum (2018)'] },
  { name: 'Interlocking-lives ensemble drama', reason: 'Multiple seemingly unrelated storylines that gradually reveal how deeply the characters’ fates are entangled', movies: ['Crash (2004)','Magnolia (1999)','Traffic (2000)','Babel (2006)','Short Cuts (1993)','Nashville (1975)','The Big Short (2015)','Spotlight (2015)','Do the Right Thing (1989)'] },
  { name: 'Golden-age Hollywood classics', reason: 'A canonical classic-Hollywood film prized for sharp dialogue, star chemistry and enduring craftsmanship', movies: ['Casablanca (1942)','Sunset Boulevard (1950)','Some Like It Hot (1959)','12 Angry Men (1957)','Double Indemnity (1944)','All About Eve (1950)','Singin’ in the Rain (1952)','It’s a Wonderful Life (1946)','Citizen Kane (1941)','Brief Encounter (1945)'] },
  { name: 'Cult and countercultural classics', reason: 'A defiantly strange, quotable film that built a devoted cult following outside the mainstream', movies: ['The Big Lebowski (1998)','Fight Club (1999)','Trainspotting (1996)','Fear and Loathing in Las Vegas (1998)','Donnie Darko (2001)','Repo Man (1984)','Being John Malkovich (1999)','The King of Comedy (1982)','Good Time (2017)'] },
  { name: 'Elevated A24-era auteur cinema', reason: 'Distinctive, tonally daring modern auteur films that blur genre lines around grief, identity or dread', movies: ['The Lighthouse (2019)','Uncut Gems (2019)','Ex Machina (2014)','Moonlight (2016)','Lady Bird (2017)','The Farewell (2019)','Minari (2020)','Everything Everywhere All at Once (2022)'] },
  { name: 'American drama classics', reason: 'A widely-cited American dramatic touchstone built around one flawed man’s all-consuming rise, fall, or moral compromise', movies: ['Forrest Gump (1994)','Good Will Hunting (1997)','American History X (1998)','Requiem for a Dream (2000)','The Wolf of Wall Street (2013)','Inglourious Basterds (2009)'] },
  { name: 'Creature-feature adventure spectacle', reason: 'A large-scale, effects-driven spectacle where a dangerous creature (or creatures) threatens an isolated group of people', movies: ['Jurassic Park (1993)','Jaws (1975)','King Kong (2005)','Tremors (1990)','The Meg (2018)','Predator (1987)'] },
];

// Bespoke cross-cluster bridge edges: pairs that deserve a direct connection
// even though their clusters differ, each with a specific (not templated) reason.
const BRIDGES = [
  ['Get Out (2017)', 'Rosemary’s Baby (1968)', 'A protagonist slowly realizes a warm, welcoming social circle is actually a monstrous conspiracy against them'],
  ['Get Out (2017)', 'The Stepford Wives (1975)', 'Suburban civility masking a horrifying plan to erase the protagonist’s identity'],
  ['Parasite (2019)', 'Nightcrawler (2014)', 'A morally hungry outsider exploits a broken system for survival, with the class critique sharpened into thriller tension'],
  ['Parasite (2019)', 'Knives Out (2019)', 'A modern class-conscious thriller staged around one wealthy family’s house and its secrets'],
  ['Parasite (2019)', 'Snowpiercer (2013)', 'Bong Joon-ho’s recurring fascination with rigid class stratification and the violence needed to break it'],
  ['The Truman Show (1998)', 'Ex Machina (2014)', 'A protagonist realizes the world (or person) they trust is an elaborate, controlled construction'],
  ['The Truman Show (1998)', 'Being John Malkovich (1999)', 'A high-concept satire of media, identity and the manufactured self'],
  ['Being John Malkovich (1999)', 'Eternal Sunshine of the Spotless Mind (2004)', 'Charlie Kaufman’s surreal, emotionally raw take on identity and the inescapability of the self'],
  ['Eternal Sunshine of the Spotless Mind (2004)', 'Her (2013)', 'A melancholy, tech-adjacent meditation on memory, love and the pain of letting go'],
  ['La La Land (2016)', 'Whiplash (2014)', 'Damien Chazelle’s recurring theme: the punishing cost of chasing artistic greatness'],
  ['Whiplash (2014)', 'Foxcatcher (2014)', 'An obsessive mentor-student dynamic curdles into psychological abuse in pursuit of greatness'],
  ['Whiplash (2014)', 'Rocky (1976)', 'Punishing, single-minded training as the true subject of the film, more than the eventual performance or fight'],
  ['Interstellar (2014)', 'Arrival (2016)', 'Hard science-fiction concept used as a vehicle for an intensely personal story about parenthood, time and loss'],
  ['Interstellar (2014)', 'Contact (1997)', 'A scientifically grounded first-contact/space journey that doubles as a story about faith and a parent-child bond'],
  ['Arrival (2016)', 'Contact (1997)', 'A linguist or scientist mediates humanity’s first contact with a radically alien intelligence'],
  ['Gravity (2013)', 'Moon (2009)', 'Isolation in space rendered as an almost single-hander survival story, tense and intimate rather than epic'],
  ['Children of Men (2006)', 'The Road (2009)', 'A quietly collapsing civilization seen through one person protecting the last flicker of hope for the future'],
  ['Children of Men (2006)', '28 Days Later (2002)', 'Britain gone to ruin, filmed with a gritty, documentary-like sense of collapse'],
  ['No Country for Old Men (2007)', 'There Will Be Blood (2007)', 'A bleak, unsentimental American landscape where violence and greed win out over decency'],
  ['No Country for Old Men (2007)', 'Fargo (1996)', 'The Coen brothers’ fascination with ordinary greed spiraling into senseless, escalating violence'],
  ['There Will Be Blood (2007)', 'Citizen Kane (1941)', 'The corrosive rise of a ruthless, singular American tycoon told as a character study of pure ambition'],
  ['Pulp Fiction (1994)', 'Reservoir Dogs (1992)', 'Tarantino’s nonlinear, dialogue-driven crime storytelling with sudden bursts of stylized violence'],
  ['Se7en (1995)', 'Zodiac (2007)', 'Fincher’s procedural obsession with an investigation that resists a satisfying resolution'],
  ['Se7en (1995)', 'The Silence of the Lambs (1991)', 'A detective drawn into the twisted worldview of a meticulous, philosophical serial killer'],
  ['Gone Girl (2014)', 'Nightcrawler (2014)', 'A cold, media-savvy sociopath manipulating public perception for personal gain'],
  ['Prisoners (2013)', 'Zodiac (2007)', 'An investigation that consumes the people chasing it, with no clean catharsis at the end'],
  ['Oldboy (2003)', 'Memento (2000)', 'A protagonist piecing together a fractured past to uncover the truth behind their own suffering'],
  ['Oldboy (2003)', 'I Saw the Devil (2010)', 'Revenge escalates past the point of any moral high ground for either party'],
  ['Memories of Murder (2003)', 'Zodiac (2007)', 'A based-on-fact serial-killer investigation defined by institutional failure and lingering unresolved dread'],
  ['Burning (2018)', 'Parasite (2019)', 'Simmering Korean class resentment that erupts only once the story’s tension finally breaks'],
  ['Amélie (2001)', 'Chungking Express (1994)', 'Playful, whimsical urban romance told through a quirky, lightly magical realist lens'],
  ['In the Mood for Love (2000)', 'Brief Encounter (1945)', 'A restrained, unconsummated romance defined by longing and social propriety rather than action'],
  ['Drive (2011)', 'Le Samouraï (1967)', 'A near-silent, professional getaway driver or hitman defined entirely by code and cool detachment'],
  ['Drive (2011)', 'Baby Driver (2017)', 'A stylish, music-driven crime film built around a quiet wheelman pulled into violence he wants to escape'],
  ['Heat (1995)', 'The Town (2010)', 'A professional criminal weighing one last score against a chance at a normal life'],
  ['The Departed (2006)', 'Infernal Affairs (2002)', 'Two moles — cop and criminal — embedded in each other’s worlds, racing to unmask one another first'],
  ['City of God (2002)', 'Goodfellas (1990)', 'A rise-through-the-ranks crime chronicle narrated with kinetic energy and dark, unglamorized authenticity'],
  ['Hereditary (2018)', 'Rosemary’s Baby (1968)', 'Domestic grief and family secrets curdle into a slow-building supernatural conspiracy'],
  ['Hereditary (2018)', 'The Babadook (2014)', 'Grief manifesting as a literal, inescapable supernatural presence within the home'],
  ['Midsommar (2019)', 'The Wicker Man (1973)', 'An outsider drawn into an idyllic, sun-drenched pagan community that turns out to be a trap'],
  ['The Witch (2015)', 'Rosemary’s Baby (1968)', 'Religious paranoia and isolation curdle into a slow-building supernatural nightmare'],
  ['It Follows (2014)', 'The Ring (2002)', 'An unstoppable, rules-bound curse passed from victim to victim that can never truly be escaped'],
  ['A Quiet Place (2018)', 'Signs (2002)', 'A family defending their home against an incomprehensible outside threat while quietly grieving a private loss'],
  ['The Shining (1980)', 'Hereditary (2018)', 'A family isolated in one house slowly comes apart as something malevolent takes hold of them'],
  ['Joker (2019)', 'Taxi Driver (1976)', 'A lonely, unstable outsider’s alienation curdles into violence against an indifferent city'],
  ['Joker (2019)', 'The King of Comedy (1982)', 'A delusional, socially rejected man obsessed with fame and validation spirals toward violence'],
  ['Nightcrawler (2014)', 'Taxi Driver (1976)', 'A disturbed loner circling the Los Angeles/New York night, narrating his own warped moral code'],
  ['Black Swan (2010)', 'Whiplash (2014)', 'The pursuit of artistic perfection portrayed as a form of self-destruction'],
  ['Black Swan (2010)', 'Repulsion (1965)', 'A woman’s psychological unraveling rendered as genuinely disorienting, subjective horror'],
  ['American Psycho (2000)', 'Fight Club (1999)', 'A biting satire of masculinity and consumer culture filtered through an unreliable, possibly delusional narrator'],
  ['Fight Club (1999)', 'Taxi Driver (1976)', 'An alienated urban man channels his rage into an increasingly extreme, self-destructive rebellion'],
  ['The Truman Show (1998)', 'Her (2013)', 'A quietly satirical look at how modern life mediates and manufactures intimacy and reality'],
  ['Her (2013)', 'Lost in Translation (2003)', 'A tender, melancholy story of unlikely connection between two lonely people adrift in modern life'],
  ['Lost in Translation (2003)', 'Before Sunrise (1995)', 'Two strangers form an intimate, fleeting bond over a short, unrepeatable stretch of time'],
  ['Before Sunrise (1995)', 'Before Sunset (2004)', 'Two people talk their way toward intimacy in real time, with the conversation itself as the plot'],
  ['500 Days of Summer (2009)', 'Eternal Sunshine of the Spotless Mind (2004)', 'A nonlinear, bittersweet dissection of a relationship’s beginning, middle and painful end'],
  ['La Haine (1995)', 'City of God (2002)', 'A tense, kinetic portrait of marginalized youth in a neighborhood primed to explode into violence'],
  ['Do the Right Thing (1989)', 'La Haine (1995)', 'Rising racial and social tension in one neighborhood over the course of a single day, building to eruption'],
  ['Moonlight (2016)', 'Call Me by Your Name (2017)', 'A tender, specific portrait of queer identity and first love, told with restraint rather than melodrama'],
  ['Boyhood (2014)', 'The 400 Blows (1959)', 'A naturalistic, unsentimental chronicle of a boy growing up under difficult family circumstances'],
  ['Lady Bird (2017)', 'The Perks of Being a Wallflower (2012)', 'A specific, emotionally honest coming-of-age story about outsiderhood and the desire to be seen'],
  ['12 Years a Slave (2013)', 'Schindler’s List (1993)', 'An unflinching historical account of systemic atrocity centered on one person’s fight to survive it'],
  ['Schindler’s List (1993)', 'The Pianist (2002)', 'A harrowing, humanist account of survival during the Holocaust'],
  ['Life Is Beautiful (1997)', 'Jojo Rabbit (2019)', 'Comedy and warmth used as a shield to make an atrocity bearable without diminishing its horror'],
  ['12 Angry Men (1957)', 'Spotlight (2015)', 'A methodical, dialogue-driven process film where the drama comes from patient, procedural persistence'],
  ['Spotlight (2015)', 'All the President’s Men (1976)', 'Journalists methodically uncovering an institutional cover-up through dogged, unglamorous legwork'],
  ['The Insider (1999)', 'Erin Brockovich (2000)', 'A whistleblower or ordinary citizen taking on a powerful corporation at great personal cost'],
  ['The Social Network (2010)', 'Steve Jobs (2015)', 'A brilliant but personally corrosive tech founder whose genius comes at the cost of every relationship around him'],
  ['The Big Short (2015)', 'Moneyball (2011)', 'Outsiders who see a systemic flaw everyone else missed, told with a brisk, unconventional narrative energy'],
  ['Uncut Gems (2019)', 'Good Time (2017)', 'Relentless, anxiety-inducing New York crime storytelling following one desperate man’s spiraling bad decisions'],
  ['Uncut Gems (2019)', 'Nightcrawler (2014)', 'A morally compromised protagonist whose addictive, self-destructive hustle drives the film’s tension'],
  ['The Lighthouse (2019)', 'The Shining (1980)', 'Isolation and cabin-fever paranoia curdle two (or one) minds into madness'],
  ['Everything Everywhere All at Once (2022)', 'Spirited Away (2001)', 'A family relationship reconciled through a wildly imaginative, genre-blending fantastical journey'],
  ['The Grand Budapest Hotel (2014)', 'Amélie (2001)', 'Meticulously stylized, whimsical filmmaking with a melancholy undercurrent beneath the visual playfulness'],
  ['In Bruges (2008)', 'Fargo (1996)', 'Pitch-black comedy threaded through a story about hitmen or criminals confronting real guilt'],
  ['Knives Out (2019)', 'Murder on the Orient Express (2017)', 'A classic whodunit structure — wealthy family, colorful suspects, a brilliant outside detective'],
  ['The Shawshank Redemption (1994)', 'The Green Mile (1999)', 'A wrongly-imprisoned man’s quiet endurance and hope inside a brutal institution'],
  ['Braveheart (1995)', 'Gladiator (2000)', 'A wronged warrior leads a rebellion against a corrupt, tyrannical seat of power'],
  ['Gladiator (2000)', '300 (2006)', 'Stylized, larger-than-life ancient-world combat built around honor, sacrifice and a doomed last stand'],
  ['Mad Max: Fury Road (2015)', 'Snowpiercer (2013)', 'A relentless, single-corridor chase through a scarred post-apocalyptic class hierarchy'],
  ['District 9 (2009)', 'Elysium (2013)', 'Neill Blomkamp’s recurring blend of gritty sci-fi action with pointed allegory about inequality and segregation'],
  ['Snowpiercer (2013)', 'Elysium (2013)', 'A rigidly stratified society where the underclass must literally fight their way to the privileged few'],
  ['Train to Busan (2016)', 'World War Z (2013)', 'A fast-moving outbreak thriller that uses relentless zombie set-pieces to test family bonds under pressure'],
  ['28 Days Later (2002)', 'The Road (2009)', 'A father-and-child (or found-family) bond as the last source of humanity in a collapsed world'],
  ['Blade Runner (1982)', 'Ghost in the Shell (1995)', 'A neo-noir investigation into what separates human consciousness from an artificial one'],
  ['Ex Machina (2014)', 'Her (2013)', 'An intimate, unsettling study of what it would mean to fall for — or be manipulated by — an artificial mind'],
  ['A Clockwork Orange (1971)', 'Fight Club (1999)', 'A stylized, provocative satire that revels in the violence it’s also critiquing'],
  ['Amadeus (1984)', 'Whiplash (2014)', 'Genius and mediocrity locked in a bitter, obsessive rivalry over who truly deserves greatness'],
  ['The Prestige (2006)', 'Black Swan (2010)', 'An escalating rivalry drives both competitors to sacrifice everything, including their own sanity, to win'],
  ['Predestination (2014)', 'Looper (2012)', 'A tightly-plotted time-travel puzzle where the protagonist’s own timeline loops back on itself'],
  ['Coherence (2013)', 'Triangle (2009)', 'A low-budget, brain-bending genre film that traps its characters in a looping, reality-fracturing scenario'],
  ['Roma (2018)', 'Cinema Paradiso (1988)', 'A deeply personal, memory-soaked film reconstructing the filmmaker’s own childhood and home'],
  ['A Separation (2011)', 'Shoplifters (2018)', 'A tightly wound domestic dilemma that exposes a much larger truth about family, class and moral compromise'],
  ['Shoplifters (2018)', 'Nobody Knows (2004)', 'A found or fractured family surviving on the margins of society through small, quiet acts of care and deception'],
  ['Capernaum (2018)', 'City of God (2002)', 'A child navigating a world of adult failures and poverty with startling, premature resilience'],
  ['The Diving Bell and the Butterfly (2007)', 'Amour (2012)', 'A devastating, unsentimental look at the body failing while the mind or love inside it endures'],
  ['Manchester by the Sea (2016)', 'Ordinary People (1980)', 'Grief so total it freezes a family’s ability to function or forgive itself'],
  ['Marriage Story (2019)', 'Kramer vs. Kramer (1979)', 'A marriage’s dissolution told with equal empathy for both sides, without a clear villain'],
  ['Silver Linings Playbook (2012)', 'Punch-Drunk Love (2002)', 'Two damaged, socially awkward people find an unlikely, believable romantic connection'],
  ['Little Miss Sunshine (2006)', 'The Royal Tenenbaums (2001)', 'A dysfunctional family forced together on a journey that exposes and eventually heals their fractures'],
  ['Juno (2007)', 'Lady Bird (2017)', 'A sharp-tongued, precociously funny teenage girl navigating an unplanned life-altering situation'],
  ['Rocky (1976)', 'Creed (2015)', 'An underdog boxer’s grueling climb told as a story about self-belief more than the sport itself'],
  ['Whiplash (2014)', 'Miracle (2004)', 'A punishing, borderline-abusive coach pushes a team or student to the brink in pursuit of greatness'],
  ['Cast Away (2000)', 'All Is Lost (2013)', 'A nearly wordless survival story stripped down to one person against the elements'],
  ['Life of Pi (2012)', 'All Is Lost (2013)', 'Isolation at sea rendered as both a physical survival test and a spiritual reckoning'],
  ['Into the Wild (2007)', 'Nebraska (2013)', 'A restless American drifting away from family toward an idea of freedom that proves more complicated than imagined'],
  ['Free Solo (2018)', 'Man on Wire (2008)', 'A documentary built entirely around the vertigo-inducing tension of one person risking death for a singular feat'],
  ['13th (2016)', 'The Act of Killing (2012)', 'A documentary confronting a society’s violent history through the systems that enabled and still sustain it'],
  ['Rashomon (1950)', 'Gone Girl (2014)', 'The same events retold from wildly conflicting perspectives, undermining any single version of the truth'],
  ['High and Low (1963)', 'Prisoners (2013)', 'A moral dilemma around a kidnapping forces a father to choose between principle and desperation'],
  ['Ikiru (1952)', 'About Time (2013)', 'A man confronting mortality learns to find meaning in small, previously overlooked moments of life'],
  ['Tokyo Story (1953)', 'Manchester by the Sea (2016)', 'A quiet, unsentimental study of family duty and emotional distance across generations'],
  ['Requiem for a Dream (2000)', 'Trainspotting (1996)', 'An unflinching, formally aggressive descent into addiction that refuses any easy redemption'],
  ['American History X (1998)', 'Do the Right Thing (1989)', 'Racial hatred and violence examined through the specific pressures of one community and one family'],
  ['Good Will Hunting (1997)', 'A Beautiful Mind (2001)', 'An extraordinary, misunderstood mind guided toward emotional growth by one patient mentor or relationship'],
  ['Forrest Gump (1994)', 'Big Fish (2003)', 'A tall-tale life story stretched across decades, blurring sincere emotion with an unreliable, fable-like narrator'],
  ['Inglourious Basterds (2009)', 'Django Unchained (2012)', 'Tarantino rewrites a brutal chapter of history into a stylized, cathartic revenge fantasy'],
  ['The Wolf of Wall Street (2013)', 'The Big Short (2015)', 'A darkly comic indictment of Wall Street excess and the fraud hiding in plain sight'],
  ['The Wolf of Wall Street (2013)', 'American Psycho (2000)', 'A satire of amoral 1980s/90s wealth culture narrated by a charismatic, unrepentant sociopath'],
  ['Goodfellas (1990)', 'The Wolf of Wall Street (2013)', 'A seductive, fast-cut rise into a criminal or morally bankrupt lifestyle, narrated by its own unrepentant insider'],
  ['The Silence of the Lambs (1991)', 'Zodiac (2007)', 'A meticulous investigator drawn deep into the mind of a killer who may never be fully caught or understood'],
  ['Inception (2010)', 'The Matrix (1999)', 'A hyper-competent team bends the rules of a constructed reality in a blockbuster built on a genuinely mind-bending concept'],
  ['The Matrix (1999)', 'Ghost in the Shell (1995)', 'Philosophical questions about consciousness and reality wrapped in stylish, influential cyberpunk action'],
  ['Jurassic Park (1993)', 'Jaws (1975)', 'Spielberg’s template for an unstoppable natural predator loose among people who underestimated it'],
  ['King Kong (2005)', 'Jaws (1975)', 'A massive, awe-inspiring creature that is as much tragic spectacle as it is threat'],
  ['The Green Mile (1999)', 'Forrest Gump (1994)', 'A gentle, almost mythic outsider whose simple goodness quietly changes everyone around him'],
  ['Nightcrawler (2014)', 'The Wolf of Wall Street (2013)', 'An amoral hustler narrates his own unchecked rise with unnerving charisma and zero remorse'],
  ['Whiplash (2014)', 'The Social Network (2010)', 'A driven, socially corrosive perfectionist alienates everyone close to them on the way to the top'],
  ['The Prestige (2006)', 'The Illusionist (2006)', 'Two rival stage magicians in a period setting whose tricks blur into real obsession and deception'],
  ['Se7en (1995)', 'Prisoners (2013)', 'A meticulous, ideologically-driven antagonist pushes investigators (and the audience) past their moral limits'],
  ['Shutter Island (2010)', 'Get Out (2017)', 'A protagonist slowly realizes the institution meant to help them is concealing a sinister truth about their own mind'],
  ['Donnie Darko (2001)', 'The Butterfly Effect (2004)', 'A troubled teenager glimpses a fractured timeline that only makes sense once the tragic ending recontextualizes it'],
  ['Children of Men (2006)', 'Snowpiercer (2013)', 'A cynical protagonist reluctantly becomes humanity’s last hope for a future worth living in'],
  ['Parasite (2019)', 'Shoplifters (2018)', 'A poor family’s resourceful, morally gray survival tactics expose the cruelty of the class structure around them'],
  ['Get Out (2017)', 'Us (2019)', 'Jordan Peele using genre horror as a sharp allegory for race, class or American identity'],
  ['It Follows (2014)', 'The Babadook (2014)', 'A modern horror film that reinvents a simple, almost folkloric premise into a lingering metaphor for trauma'],
  ['A Quiet Place (2018)', 'It Follows (2014)', 'A single unbreakable rule of survival generates sustained, ingeniously staged tension'],
  ['Her (2013)', '500 Days of Summer (2009)', 'An earnest, melancholy look at modern romantic disappointment filtered through a distinctly 21st-century loneliness'],
  ['Before Sunrise (1995)', 'Lost in Translation (2003)', 'Two people who shouldn’t fit talk their way into a fleeting, deeply felt intimacy neither wants to end'],
  ['The Grand Budapest Hotel (2014)', 'The Royal Tenenbaums (2001)', 'Wes Anderson’s meticulous, storybook visual style wrapped around a surprisingly wistful, melancholic core'],
  ['Moonrise Kingdom (2012)', 'The Grand Budapest Hotel (2014)', 'Wes Anderson’s symmetrical, deadpan whimsy applied to an unlikely pair of outsiders finding each other'],
  ['Knives Out (2019)', 'Gone Girl (2014)', 'A cleverly constructed mystery that keeps recontextualizing what the audience thought it already knew'],
  ['12 Angry Men (1957)', 'Judgment at Nuremberg (1961)', 'Justice argued almost entirely through dialogue in a single room, where conviction slowly overturns consensus'],
  ['Dunkirk (2017)', '1917 (2019)', 'A formally audacious war film built around real-time tension and a race against the clock rather than traditional battle spectacle'],
  ['Blade Runner (1982)', 'Dune (2021)', 'Denis Villeneuve’s patient, awe-struck approach to a vast, atmospheric sci-fi world, in the tradition Blade Runner set'],
  ['Arrival (2016)', 'Blade Runner 2049 (2017)', 'Denis Villeneuve’s recurring hallmark: hushed, contemplative sci-fi more interested in emotion than spectacle'],
  ['The Sixth Sense (1999)', 'The Prestige (2006)', 'A meticulously planted twist that forces the audience to instantly reconsider everything they just watched'],
  ['The Grand Budapest Hotel (2014)', 'Jojo Rabbit (2019)', 'A Nazi-era setting rendered through stylized, whimsical comedy without losing sight of the horror underneath'],
  ['Chungking Express (1994)', 'Lost in Translation (2003)', 'Dreamy, melancholic urban loneliness captured through mood and atmosphere more than plot'],
  ['Jaws (1975)', 'Alien (1979)', 'An unseen, unstoppable predator picks off a trapped group one by one, with dread built through what isn’t shown'],
  ['It (2017)', 'Stand by Me (1986)', 'A tight-knit group of kids confronts something dark and dangerous in their small town, and it changes them forever'],
  ['The Iron Giant (1999)', 'E.T. the Extra-Terrestrial (1982)', 'A lonely child bonds with a powerful, misunderstood outsider that the adult world wants to destroy'],
];

function parseEntry(entry) {
  const m = entry.match(/^(.*) \((\d{4})\)$/);
  if (!m) throw new Error(`Bad entry: ${entry}`);
  return { title: m[1].trim(), year: Number(m[2]) };
}

const movieMap = new Map(); // key -> {title, year, key}
function ensureMovie(entry) {
  const { title, year } = parseEntry(entry);
  const key = slug(title, year);
  if (!movieMap.has(key)) movieMap.set(key, { key, title, year });
  return key;
}

const edgeMap = new Map(); // "a|b" (sorted keys) -> {a,b,reason,source}
function addEdge(keyA, keyB, reason, source) {
  if (keyA === keyB) return;
  const [lo, hi] = [keyA, keyB].sort();
  const edgeKey = `${lo}|${hi}`;
  if (!edgeMap.has(edgeKey)) edgeMap.set(edgeKey, { a: lo, b: hi, reason, source });
}

for (const cluster of CLUSTERS) {
  const keys = cluster.movies.map(ensureMovie);
  const n = keys.length;
  const full = n <= 12;
  const window = 7;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (full || j - i <= window) addEdge(keys[i], keys[j], cluster.reason, cluster.name);
    }
  }
}

for (const [aEntry, bEntry, reason] of BRIDGES) {
  addEdge(ensureMovie(aEntry), ensureMovie(bEntry), reason, 'bridge');
}

// ---- Stats + sanity checks ----
const degree = new Map();
for (const k of movieMap.keys()) degree.set(k, 0);
for (const e of edgeMap.values()) {
  degree.set(e.a, (degree.get(e.a) || 0) + 1);
  degree.set(e.b, (degree.get(e.b) || 0) + 1);
}
const degrees = [...degree.values()];
const under5 = [...degree.entries()].filter(([, d]) => d < 5);

console.log('Movies:', movieMap.size);
console.log('Edges:', edgeMap.size);
console.log('Avg degree:', (degrees.reduce((a, b) => a + b, 0) / degrees.length).toFixed(2));
console.log('Min degree:', Math.min(...degrees), 'Max degree:', Math.max(...degrees));
console.log('Movies with degree < 5:', under5.length, under5.length ? JSON.stringify(under5) : '');

const byTitle = new Map();
for (const m of movieMap.values()) {
  const norm = m.title.toLowerCase();
  if (!byTitle.has(norm)) byTitle.set(norm, []);
  byTitle.get(norm).push(m.year);
}
for (const [title, years] of byTitle) {
  if (new Set(years).size > 1) console.log('CHECK possible duplicate title with different years:', title, years);
}

const outMovies = [...movieMap.values()].sort((a, b) => a.title.localeCompare(b.title));
const outEdges = [...edgeMap.values()];

fs.writeFileSync(path.join(__dirname, 'seed-movies.json'), JSON.stringify(outMovies, null, 2) + '\n');
fs.writeFileSync(path.join(__dirname, 'seed-edges.json'), JSON.stringify(outEdges, null, 2) + '\n');

console.log('Wrote seed-movies.json and seed-edges.json to', __dirname);

# SuperCapybara: Game Design

Everything here comes from Ethan. His drawings are in `concept-art/`. Lines marked **(guess)** are Claude's reading of a drawing and still need Ethan to confirm.

## Worlds

1. World 1: side-scroller in a **city** (**in the game**). You jump from building to building across the rooftops. Besides rooftops there are **billboards**, **water towers** and **window-washer platforms** that go up and down. The sky **changes as you go through the level**: daytime at the start, sunset in the middle, and **night for the Pizza Boss fight**. Missing a jump between buildings means falling all the way down: lose a heart and go back (like the holes before).
2. World 2: 3D (**in the game**). You get there with the key from Pizza Boss. It's in **space** 🚀: planets, a moon base, stars. The **transition**: after you get the key, a **rocket lands on the helipad**, you jump in, and it blasts off (3... 2... 1...) up through the clouds into space. In 3D, the **camera is behind** SuperCapybara and follows him as he runs and jumps (like Mario Odyssey or Fortnite). Jumping: **moon jumps** (super high, float down slowly) AND **little planets** you jump between and can walk all the way around, even upside down (like Mario Galaxy). Bad guys: **space versions of the World 1 bad guys** (sunglasses, apple, robot) wearing astronaut helmets. New **aliens** come in a later update. Boss: **Grape Boss** in a space suit, with his two big blasters. He **jumps from planet to planet** and does a **ground pound** that shakes everything. More will be added someday. In the game: he jumps at the planet you're on (a red ring shows where he'll land), and the ground pound sends a wave across the planet; jump over it. You get there by finding all 4 crystals (one on each planet), which turns off the force field around his planet. Jump from the yellow rings to fly to the next planet.
3. World 3: side-scroller in a **volcano** 🌋 (**in the game**): jump across rocks over lava pits, while lava rocks fall from the sky (a red arrow warns where). You need the key from Grape Boss to play it.

Beat a boss to get a key. Keys open the other worlds.

## Title screen (in the game)

The first screen: SuperCapybara flying over the night city under a big logo. Language and sound buttons at the top, 🎬 CREDITS (after beating the Lava Dragon) and 🔄 **RESET** (starts the whole game over; it asks "sure?" first, and keeps language/sound/touch) at the bottom. The **modes**:
- **STORY** (in the game): the normal game (3 worlds).
- **ADVENTURE** (in the game): **a big map to explore**, with the hero you picked in character select. Walk anywhere you want and find secret places, hidden treasure chests and surprises. There's no set path. It's **3D** with the camera behind you (like World 2), on big land with hills, trees and caves. The land is **a mix of the places from the story**: a city, a small space area, and a volcano, all connected. **Treasure chests** have a surprise: **bolts ⚡**, **hats and costumes** for your heroes (pirate hat, sunglasses, crown...), or **puzzle pieces** 🧩. **Bad guys guard** the chests and puzzle pieces: beat them to get the treasure. There are **6 puzzle pieces** (2 in the city, 2 in space, 2 in the volcano). Find all 6 to open a secret door to the **SUPER BOSS**: the biggest, hardest boss in the whole game: **Evil Capybara** (SuperCapybara's dark twin, black cape, red eyes, knows all your moves) AND **all 3 bosses joined together** (Pizza + Grape + Lava Dragon). **Part 1**: fight Evil Capybara (runs circles around you, jumps, shoots red lasers; jump on his head!). When he's almost beaten, he calls the 3 bosses and melts together with them into one **GIANT monster** (the MEGA MONSTER) for **part 2**: ground pounds (jump the wave), fire breath, and charging at you. Beating it gives 100 ⚡. The space area has **low gravity** for moon jumps, the volcano has **lava** (crater and lava rivers) that hurts. Opened chests stay opened.
- **TRAINING** (in the game): first a **lesson** that teaches new players step by step ("Press ← → to run!", "Press SPACE to jump!"...), then a **practice room** where you try every hero and power on **target dummies**, and you never lose hearts. Every power-up is on, and **H = next hero** lets you try every hero, even ones you haven't bought.
- **2 PLAYERS** (in the game): you choose between **TEAM** (both heroes in the same level, beating bad guys and bosses together) and **BATTLE** (fight each other in an arena). Controls: **one keyboard** (Player 1 = W A S D, Player 2 = arrow keys), **game controllers**, or on iPad **each player gets their own touch buttons** on their side of the screen. How to win a BATTLE: make the other player **lose all their hearts**; **best of 3 rounds** wins. TEAM can be played in **World 1 and World 3** for now; the two heroes share the hearts, and power-ups are off. Player 1 = A D move, W jump, F attack, G power. Player 2 = arrows, ENTER attack, SHIFT power. World 2 (3D) needs a split screen, so it comes later (add it to the update list). BATTLE arena: **pick it before each battle**, either the helipad rooftop (World 1, at night) or the Lava Dragon's lair (with lava that rises sometimes).

The 🎬 CREDITS button goes here too.

## Hats and the wardrobe (in the game)

Hats come from ADVENTURE chests: crown 👑, pirate hat 🏴‍☠️, wizard hat 🧙, party hat 🎉, cool shades 😎. A new hat goes on your hero right away, and the **🎩 WARDROBE** button in character select lets you pick a hat (or none) for each hero. Heroes wear their hats in every world.

## Character select screen (in the game)

The game starts here. You pick a hero, then press PLAY.
- **Language**: ENGLISH or DEUTSCH buttons at the top left (Ethan's friends only speak German). Every word in the game is in both languages.
- **Level picker**: WORLD 1 / WORLD 2 buttons next to PLAY. A world unlocks with the key from the boss before it (World 2 needs Pizza Boss's key).
- **Touch buttons** for iPad/iPhone: 📱 TOUCH ON/OFF on the title screen (top right) and at the bottom left of character select (on by default on touch screens). ◀ ▶ (and ▲ ▼ in World 2, or with Fly), JUMP, the attack button, and buttons for the powers you have (👻 🛡️ 🕊️), plus ⏸ to go back to the menu.
- **Sound**: ♪ ON/OFF button at the top right (and the M key, in the menu and in the game).
- **German names**: in German, the heroes are Supa Capybara, Supa Katze, Supa Chamäleon, Ultra Capybara and Blutmond-Katze.
- **Difficulty**: EASY, MEDIUM, HARD or EXTREME buttons above PLAY (in the game). EXTREME is how the game was first built; Ethan found it too hard. Easier levels give more hearts (EASY 5, MEDIUM 4, HARD and EXTREME 3), slower blaster shots that come less often, bad guys that wait a moment before the first shot, and a weaker Pizza Boss (EASY 12 hits, MEDIUM 16, HARD 20, EXTREME 25). New players start on MEDIUM. The numbers are in `src/difficulty.js`.
- The **shop** is at the bottom right.
- Right under the shop are the **keys** you got from bosses.

## Players (`concept-art/players*.jpeg`)

All heroes wear a blue cape. All of them are **in the game**.

Normal players (you can pick them from the start):
- **Supa Capybara**: brown, red suit with a yellow lightning bolt. X = **laser eyes**.
- **Supa Cat**: white cat, suit with a lightning bolt. **Double jump** (jump again in the air). X = **scratch** up close (2 damage).
- **Supa Chameleon**: green, pink suit, curly spiral tail. X = **sticky tongue** (reaches far). C = **turn invisible** for 10 seconds; then you have to wait 30 seconds before you can do it again. While invisible, bad guys can't see you: they don't shoot, and nothing hurts you. If you hit a bad guy, they see you again (invisible ends early).

Locked players: first you **beat a boss** to unlock them, **then you buy them** with ⚡.
- **Ultra Capybara**: unlocked by beating Pizza Boss, costs **2000 ⚡**. X = **super lasers** (bigger, double damage). Pink **fire aura**: bad guys that touch him get burned, and touching them doesn't hurt him (blaster shots still do).
- **Bloodmoon Cat**: a cat with a pink aura and a red moon. Unlocked by beating **Grape Boss** (World 2). Powers: X = **moon blast** (shoots a big red moon that **flies to the nearest bad guy** by itself) and **shadow form** (turns into a shadow: super fast, and nothing can hit him; press C, it lasts **5 seconds**, then wait **30 seconds**). Costs **3000 ⚡**. **In the game.**

## Controls

- Arrows or A/D: run. Space, Up or W: jump.
- X: attack (each hero has their own). C: special power (Supa Chameleon's invisible). V: Shield (if you bought it).
- **Jump on a bad guy's head** (or Pizza Boss's) to hurt them: 1 damage to them, none to you, and you bounce up. Works for every hero.
- ESC: back to the character select screen.
- You have 3 hearts ❤️. A bad guy, a blaster shot or falling in a hole takes 1 heart. With no hearts left you start again from the last checkpoint (the start, or the door of the boss room).

## Money and saving

**Fewer bolts in the level** (in the game): 20 in World 1 instead of 48, still worth 10 each. (Ethan didn't want them worth more; prices stay the same, so saving up takes longer.)

Lightning bolts ⚡ (a bolt inside a circle). Each one you collect gives 10 ⚡, beating a bad guy gives **5 ⚡**, and beating a boss gives **10 ⚡**. You spend them in the shop.
The game **saves everything** in the browser (⚡, keys, heroes, power-ups), so it's still there tomorrow.

## Power-ups (`concept-art/power-ups*.jpeg`)

Once you buy a power-up, you keep it **forever**. More power-ups will come in future updates.
Click one in the shop to buy it. The ones still being decided say "soon" and can't be bought yet.

| Power-up | Price | What it does |
|---|---|---|
| Shield | 500 ⚡ | **In the game.** Press V: the shield lasts **10 seconds**, then you wait **30 seconds**. Without the Multi Direction Upgrade it's a **wall** in front of you that blocks blaster shots. With the Multi Direction Upgrade it becomes a **bubble** all around you |
| Multi Direction Upgrade | 650 ⚡ | **In the game.** An **upgrade for the Shield**: it turns the wall into a **bubble** that protects you from every direction. It doesn't change your attack. You have to **buy the Shield first**. The bubble blocks blaster shots from **every side**, and bad guys that touch the bubble **bounce away** |
| Fly | 800 ⚡ | Press a button (F) to **fly for 10 seconds**, then wait **30 seconds** (like the Shield). While flying, the arrow keys move you **any direction** (up, down, left, right). **In the game.** In World 2: hold SPACE to go up, and press F again to stop flying early |
| Double | 1000 ⚡ | **Double ⚡**: everything you earn is worth twice as much (bolts 20 instead of 10, and the rewards for beating bad guys and bosses too). **In the game.** |
| Mecha Capybara | 1750 ⚡ | A **giant robot suit** you climb into for **15 seconds**: big, super strong, shoots **rockets**, and nothing can hurt you. Button: R (for Robot). **Once per level.** Touching bad guys smashes them. **In the game.** |
| Freeze Ray ❄️ | 1200 ⚡ | **New** (2026-10-24): freezes bad guys so they can't move or shoot. Press a button: **ALL bad guys on the screen freeze for 5 seconds**, then wait 30 seconds. Bosses are too strong to freeze: they just **slow down** for those 5 seconds. Button: **Z**. Hitting a frozen bad guy **shatters** it for **double bolts**. **In the game** in every world. (Ice-block stairs from frozen bad guys: maybe a future update.) |

## Bad guys (`concept-art/bad-guys.jpeg`)

**Every bad guy has 1 life**: one hit defeats it (in the game). Bosses are different.

- Pixel sunglasses: floats up and down. **In the game.**
- Apple with two blasters: stands still and shoots both ways. **In the game.**
- Green ball robot with a blaster arm: walks back and forth and shoots at you. **In the game.**
- In World 3 (volcano), the bad guys are **fire versions**: flaming sunglasses, a burning apple, a lava robot. They shoot **fireballs** instead of blaster shots. **In the game.**
- A horned knight robot with red wings: goes in **World 3** (volcano). **In the game.** Flies back and forth to **guard the bolts**, and **throws TNT bolts**: they look like normal ⚡ bolts, but when you grab one... **BOOM!** A tiny clue gives them away if you look closely: a little spark ✨ or a small fuse. The BOOM costs **1 heart**.
- TNT: in **World 3** (volcano), as the horned knight's TNT bolts (above).

## Bosses (`concept-art/bosses.jpeg`)

- **Pizza Boss** (World 1 boss, **in the game**). In the city, you fight him on a **helicopter pad** on a rooftop, at night. When the fight starts, **Pizza Boss jumps out of a helicopter**, and then the helicopter flies away. He is a pizza slice with blasters in both hands and spiky metal legs. Shoots 3 shots at once, jumps, and charges at you. 25 zaps. Drops the key to World 2.
- **Lava Dragon** (World 3 boss, **in the game**): a giant lava monster AND fire dragon mixed together, made of fire and rocks. Rises out of the lava. Attacks: **breathes fire** along the floor (jump over it), **flies up and drops lava rocks**, and makes the **lava rise** (climb onto the floating rocks). Beating him finishes the game, for now.
- **Grape Boss** (World 2 boss, **in the game**): a bunch of grapes in a helmet (a space suit in World 2), with two big blasters and purple feet.

## The ending (in the game)

When you beat the Lava Dragon:
1. A big **celebration**: fireworks and all the heroes dancing.
2. **Credits** scroll up like a movie: "SuperCapybara, a game by ETHAN".
   The ending plays the first time only, but the **🎬 CREDITS button** on the title screen lets you watch it again anytime.
3. You unlock **secret surprises**, all of these (the first time you beat the Lava Dragon):
   - 🌟 A secret hero: **Golden Capybara**, free: golden lasers (double damage), double jump, a golden fire aura, and shadow form (C). A **SWITCH button (Q)** changes his attack: golden lasers ↔ scratch. (He used to have 4 attacks, but Ethan found him too strong, so now it's 2.)
   - 🥊 **BOSS RUSH** (in the world picker): Pizza Boss, then the Lava Dragon, with no rest. Your hearts carry over, and losing them all is GAME OVER. (Grape Boss is 3D, so he's not in it yet.)
   - 🎨 **Secret colors**: the 🎨 COLORS button in the menu switches every hero's suit and cape (ocean, jungle, night, candy, or normal).

## Cube Islands (the secret "Pokémon Quest" world, in the game since 2026-11-01)

Ethan's own idea: a 3D world that looks like **Pokémon Quest**, where everything is made of cubes.
- **How to get there:** a **secret portal** in World 1, floating above the second water tower (near the end of the city). It's faint until you get close, then it glows.
- **Base camp:** the **cooking pot** and 3 **launch pads** that send you on missions: ☀️ Sunny Beach, ❄️ Frosty Forest and 🐉 Dragon Island. Each island has a pad back to base. Every visit is a new mission, so the food and bad guys come back.
- **Food:** find it on the islands, and blocky robot bad guys drop it when you beat them. 🍓 red berries, 🍄 blue mushrooms, 🌽 yellow corn.
- **Cooking:** walk up to the pot with 3 food. The color you have the most of decides the baby (red berries → red baby).
- **Babies:** **baby cats and baby capybaras**, made of cubes. The **color gives the power**: 🔥 red shoots fire (strong), ❄️ blue shoots ice (slows bad guys down), ⚡ yellow shoots lightning (fast). Up to 3 babies follow you and shoot by themselves; the rest wait at base camp.
- **Fall in the sea:** SPLASH! You lose a heart and swim back.
- **Boss: the Block Dragon.** He sleeps on Dragon Island next to 3 cages with the baby cats and capybaras he stole. Get close and he wakes up. He breathes fire, flies up and stomps down (watch for the red ring), and charges at you. Beat him and the cages open: the 3 babies join your team!

### Cube Islands update (round 2, in the game)

- 🍭 **Candy Island**: pink ground, giant lollipop trees, 🍬 candy (pink food), and bouncy 🐻 gummy bears.
- **Each island has its own bad guys**: 🦀 crabs on Sunny Beach (they walk sideways), ☃️ snowmen in Frosty Forest (they throw snowballs), 🦎 fast baby lizards and 🐉 little flying dragons (they drop fireballs) on Dragon Island.
- **7 baby colors**: 🔥 red fire, ❄️ blue ice (slows), ⚡ yellow lightning (fast), 🌿 green vines (bad guys can't move), 💗 pink heals you (a heart back now and then), 👻 purple ghost balls (fly through hills and trees, reach farther), 🌈 rainbow (super rare: heals AND every shot is the next power).
- **Foods**: 🍓 red, 🍄 blue, 🌽 yellow, 🥝 kiwi = green, 🍬 candy = pink, 🍆 eggplant = purple. Kiwi and eggplant are sold in the 🏪 **food shop** at base camp (15 ⚡ each).
- ⛺ **Team tent** at base camp: walk in to pick your 3 team babies.
- ⭐ **Levels**: every bad guy beaten gives your team babies xp (the dragon gives 10). Higher levels hit harder (and pink heals more often). They stay babies forever!
- 🐉 **Dragon rematches**: after the first win, the Block Dragon is back every time you visit Dragon Island. Each rematch has a 1 in 4 chance of dropping a 🌈 **rainbow egg**, which hatches a rainbow baby.
- The portal stays secret: you always go through World 1.

Ethan's decisions (round 2, built 2026-11-01):
- Q1: The secret world keeps the name **Cube Islands** (Würfel-Inseln).
- Q2: **4 new baby colors**, all of them: 💚 **green** shoots vines that trap bad guys (they can't move), 💗 **pink** heals you (hearts back), 💜 **purple** shoots ghost balls that fly through walls and trees, 🌈 **rainbow** is super rare and shoots ALL the powers.
- Q3: You get a 🌈 **rainbow baby** from a **rainbow egg**: beat the Block Dragon **again** (he comes back for rematches), and there's only a **low chance** he drops it (1 in 4).
- Q4: Ethan said "random", so the dice picked the foods: 🥝 **kiwi** = green, 🍬 **candy** = pink, 🍆 **eggplant** = purple.
- Q5: Choose your 3 team babies on a **team screen**: you pick your 3 favorites.
- Q6: Babies **level up** (beat bad guys → Level 1, 2, 3... and stronger) but **stay babies forever**, because babies are the cutest.
- Q7: New bad guys: **one for each island** (🦀 crabs on Sunny Beach, ☃️ snowmen in Frosty Forest, 🦎 baby lizards on Dragon Island) AND the dragon's **helpers**: little flying dragons that drop fireballs.
- Q8: A new 🍭 **Candy Island** where 🍬 **candy** (pink) grows. 🥝 **Kiwi** (green) and 🍆 **eggplant** (purple) are sold in a **food shop at base camp** for ⚡ bolts.
- Q9: Candy Island's bad guys are bouncy 🐻 **gummy bears**.
- Q10: The portal stays a secret: you **always go through World 1** to reach Cube Islands.

### 2 players in Cube Islands (round 3, in the game)

- Play **2 PLAYERS → TEAM → World 1** and jump into the secret portal together: Cube Islands opens in **split screen** (player 1 on the left, player 2 on the right).
- Keys: player 1 = W A S D, SPACE jump, F attack. Player 2 = arrows, right SHIFT jump, ENTER attack. Or one game controller each.
- **Player 2 can play as a baby**: in the ⛺ team tent, the first row picks what player 2 plays (their hero, or any of your babies). A baby player shoots its baby's power (pink heals player 1 when close). Land on player 1's head to **ride along**, jump to hop off.
- Each player has **their own hearts** (player 2's are blue). Run out and you're **knocked out**: your friend stands next to you to **revive** you. If both are knocked out, back to base camp.

### Aliens in World 2 (round 3, in the game)

- 🛸 **Flying saucers** with little green aliens inside fly around planets 2, 3 and 4 and chase you.
- 🔦 Get right under one and its **tractor beam** lifts you up. **Wiggle** (◀ ▶ ◀ ▶ fast) to escape!
- Don't escape in time and you're pulled **into the spaceship**: a metal room full of aliens. Beat them all, then the **big red button** shows up on the bottom of the floor. Press it to drop back down, and you win an 👽 **alien baby** for Cube Islands!
- Shoot a saucer 3 times (or jump on it) and it breaks: the alien jumps out and fights you with its green ray gun.
- 👽 The **alien baby** rides a mini flying saucer and shoots **shrink rays**: shrunk bad guys are tiny and take double damage.

Ethan's decisions (round 3, built 2026-11-01):
- Q1: This round: 👫 **2 players in Cube Islands** AND 👽 **aliens in World 2**.
- Q2: 2 players play with a **split screen** (one half each). Player 2 can also **choose to play as a baby** instead of a hero.
- Q3: Baby player 2 **picks one of your babies** and shoots that baby's power, AND can **hop on player 1's head** to ride along and shoot from there (hop off anytime).
- Q4: World 2's aliens are **little green aliens with big eyes and ray guns, riding flying saucers**. Knock a saucer down and the alien jumps out and fights you.
- Q5: The saucers have a **tractor beam** that lifts you into the air. **Wiggle** (press left/right fast) to escape!
- Q6: Don't escape in time and you get **pulled into the spaceship**: an alien room **full of aliens**!
- Q7: To get out: **beat all the aliens**, then a **big red button** shows up. Press it and you drop back down.
- Q8: Escaping the spaceship wins you an 👽 **alien baby** that goes to Cube Islands and joins your babies!
- Q9: The alien baby **rides a mini flying saucer** and shoots **shrink rays** from the sky: bad guys get tiny and easy to beat.
- Q10: In 2-player Cube Islands, **each player has their own hearts**. If one runs out, the other can **revive** them by standing next to them.

### From space to the volcano, and win dances (round 4, in the game)

- After Grape Boss blows up, he throws **one last sticky grape** into space. Then your rocket comes to pick you up, you hop in, 3... 2... 1... blast off, and the grape comes back: **SPLAT!** The rocket smokes and wobbles away.
- **World 3 starts with a crash landing**: the smoking rocket (with purple grape goo on it) crashes next to the volcano. **SMASH THE DOOR!** Press attack really fast before the timer runs out. Too slow? **BOOM**: you fly out all crispy and black and lose 1 heart. The burnt rocket stays there, smoking.
- It happens every time World 3 starts (not in Boss Rush or 2 players). After the first time, **ESC skips it**.
- 🎉 **Win dances**: in the 👕 **wardrobe** (under the hats), buy the 🤪 **Wiggle**, 🐰 **Bunny Hop** or 🤸 **Flip** for 50 ⚡ each and pick one for each hero. 🎲 RANDOM (or nothing picked) = a random one you own. After Pizza Boss, Grape Boss or the Lava Dragon, your hero dances, then the key drops.


Ethan's decisions (round 4, started 2026-11-07):
- Q1: After beating Grape Boss, you hop back in the 🚀 **rocket**, fly down, the engine catches fire, and you **crash land** next to the volcano (smoke, sparks, climb out of the wreck). Then World 3 starts.
- Q2: The engine catches fire because of **Grape Boss's revenge**: just before he explodes, he throws one last **sticky grape** at the rocket. *SPLAT!* Then smoke comes out.
- Q3: The rocket crashes **right at the start of World 3**. You have to **climb out before it explodes**! After the boom, the broken rocket stays behind you, smoking.
- Q4: To get out, you **smash the stuck door**: press attack really fast to fill a bar, while a timer counts down 3... 2... 1...
- Q5: Too slow? **BOOM, you get launched!** You fly through the air all crispy and black, land, and lose **1 heart**, but you keep playing.
- Q6: The crash happens **every time** World 3 starts, but after the first time you can **skip it** with ESC.
- Q7: No new worlds for now. Ethan wants **little details**, so his friends can get used to the game as it is.
- Q8: 🎉 **Win dances!** When you beat a boss, your hero does a little dance before grabbing the key. You **buy** the dances with ⚡ bolts.
- Q9: The dances are **silly moves**: the 🤪 **Wiggle** (shake your whole body), the 🐰 **Bunny Hop** (hop hop hop) and the 🤸 **Flip** (backflip in the air). 50 ⚡ each.
- Q10: You buy and pick dances in the 👕 **wardrobe**, next to the hats, so each hero can have their own dance. If a hero has no dance picked, they do a **random** one of the dances you own.

### Baby Capybara's tips, and the title flyer (round 5, in the game)

- 🐹 **Baby Capybara** (a mini SuperCapybara) flies over the first time you meet something new, stands next to it, **points at it** 👉 and explains it in a **comic speech bubble**. The game freezes until you press SPACE / JUMP. Each tip shows once.
- Tips: World 1: running and jumping, bolts, bad guys, gaps. World 3: horned knights, lava, falling rocks. World 2: walking around planets, jump rings, crystals, flying saucers. And every boss.
- On the title screen, **💬 TIPS** switches between 😄 EXCITED, 🤓 PROFESSOR, 👶 BABY and OFF. Turning tips back on shows every tip again (for a new friend).
- On the title screen, **🦸 FLYER** picks which of your heroes flies across the sky (wearing their hat).


Ethan's decisions (round 5, started 2026-11-07):
- Q1: 📖 **Tips for new players**: signs at the start of World 1 that show the buttons, in English and German, so his friends learn the game fast.
- Q2: The tips come from a **little helper character** who pops up and says each tip in a **speech bubble**.
- Q3: The helper is 🐹 **Baby Capybara**: a tiny capybara with a little cape, like a mini SuperCapybara. His speech bubbles look **like in comics** (white bubble, black outline, a pointy tail to his mouth).
- Q4: Baby Capybara pops up **the first time you meet something new** in any world (a new bad guy, lava, the portal, the boss...) and tells you what to do. Each tip shows only **once**.
- Q5: For each tip, Baby Capybara **stands next to the new thing** (next to the lava, the bad guy...) and **points at it**.
- Q6: While he talks, **the game freezes** until you press a button to say "got it!", so everyone has time to read.
- Q7: A **TIPS: ON/OFF** button in the menu. Turning it back **ON** makes all the tips show again from the start (for a new friend).
- Q8: Baby Capybara helps in **World 1, World 3 and World 2** (space is the most confusing: walking around planets!). Not in Adventure or Cube Islands for now.
- Q9: **The player chooses** how Baby Capybara talks: 😄 **super excited**, 🤓 **smart little professor** or 👶 **baby talk**. 
- Q10: You can **choose which hero flies across the title screen** (it's always SuperCapybara now). It keeps flying like it does now.

### Story mode: THE BAD GUY KING (round 6, first part in the game)

- On the title screen: **👑 THE BAD GUY KING**. You start alone as SuperCapybara on a **big 3D map** (the city, space launch pad and volcano from ADVENTURE, plus the new places in the south).
- Walk onto a place's **glowing pad** to play it. With 2 or more heroes on your team, you first **pick 2 heroes**; in the level, **Q** switches between them (🔄 on touch, R2 on a controller).
- ☁️ **Cloud Kingdom** (built): jump across fluffy clouds (fall and you lose a heart). At the end, **Dark Supa Cat** (an evil robot copy, glowing red) guards the real Supa Cat, who's a gold trophy. Beat the copy, the trophy breaks, and **Supa Cat joins your team**. A gold star floats over places you've won.
- 🌊 Underwater City and 🌴 Jungle: on the map, "coming soon".
- 🎬 **Opening movie** (the first time you start the story; SPACE skips): a sunny day with all the heroes, then the **Bad Guy King** flies in on his throne, laughs, and zaps everyone into gold trophies, except SuperCapybara, who jumps out of the way. He flies off with the trophies, and SuperCapybara promises to save them all.
- After you've seen it once, a red **🎬 OPENING** button on the title screen (next to 🎬 CREDITS) plays it again.
- Not built yet: fights against the Bad Guy King, babies as sidekicks.


Ethan's idea: a big story mode inspired by the adventure mode in Super Smash Bros, with our own story, villain and levels.

Ethan's decisions (round 6, started 2026-11-07):
- Q1: The villain is the 👑 **Bad Guy King**, a brand new bad guy. He builds a giant machine that **turns heroes into trophies**. You save your friends one by one, and each friend you save **joins your team**.
- Q2: The Bad Guy King is a 🐊 **crocodile king** in shiny black armor, sitting on a **flying throne** with laser cannons.
- Q3: You **travel to the levels on a 3D map** (walking around in 3D), and the **levels themselves are side-scrollers**, like World 1 and World 3.
- Q4: The 3D map is **the whole SupaCapybara world**: the city, a space launch pad, the volcano, and new places, all on one big map.
- Q5: The new places are ☁️ **cloud kingdom**, 🌊 **underwater city** and 🌴 **jungle**.
- Q6: The King turns **both** the heroes AND the babies (Baby Capybara and the Cube Islands babies) into trophies. You start alone as SuperCapybara. Saved heroes **join your team**, and saved babies help you as **sidekicks**.
- Q7: **Before each level, pick 2 heroes** from your saved team. In the level, you **switch** between those 2.
- Q8: Each trophy is guarded by a **mini boss**. Beat the mini boss, and the trophy breaks open and your friend is free.
- Q9: The mini bosses are **evil robot copies** of the heroes you're saving (made by the King's machine). Beat the dark copy of a hero to free the real one.
- Q10: Build first: **the 3D map + the first level** (☁️ cloud kingdom, beat **Dark Supa Cat** to save the real Supa Cat), and **if possible** the Bad Guy King's intro movie and a first fight against him.

## Fixed (2026-11-01, bugs Ethan found)

- The hero's hat (and fire glow) got left behind on the helipad when jumping into the rocket. Now they go into the rocket too.
- After Boss Rush, World 1 and World 3 kept starting at the boss. Now they start normally.
- Golden Capybara was too strong: his SWITCH button now has 2 attacks instead of 4.
- Game controllers (like the **ANBERNIC RG 477V**) now work in the menus and the 3D worlds too, not only in the 2D levels. Buttons: A jump/pick, B or X attack, Y power, L1 shield, R1 fly, L2 Mecha, R2 switch, SELECT back, press the stick for the Freeze Ray.

## Future updates (Ethan wants these later; don't forget!)

- More worlds: underwater 🌊, a spooky castle 🏰, candy land 🍭.
- More power-ups.
- A world that looks **exactly like Ethan's drawings** (the `concept-art/` style). Do it **after** the story mode (Ethan, 2026-11-07).
- A big new **story mode** with levels, cutscenes and lots of heroes teaming up, inspired by the adventure mode in Super Smash Bros (Ethan's idea, 2026-11-07). Our own story and bad guys, not a copy.
- 2 PLAYERS TEAM in World 2 (3D), with a split screen (Cube Islands has it now).
- Grape Boss in Boss Rush (he's in the 3D world).
- More stuff for Grape Boss / World 2.

## Removed

- The friends on the hills holding the "Wir lieben SupaCapybara" sign: taken out by request on 2026-10-24.

## Sounds and music (in the game)

- **Theme songs**: a heroic song for the menu, a funky city song for World 1, and a fast, scary song for the Pizza Boss fight. The music stops when Pizza Boss explodes, and a win jingle plays.
- **City sounds**: traffic rumbling and car horns far away. It gets quieter at night, and the horns stop.
- **Effects**: jump, double jump, laser, super laser, scratch, tongue, bolt, bad guy POP, stomp, blaster shots, getting hurt, falling, Shield, invisible, bubble bounce, helicopter, Pizza Boss roar/hit/explosion, key, buying, and an error beep.

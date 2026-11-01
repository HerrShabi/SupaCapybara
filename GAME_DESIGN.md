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

## Fixed (2026-11-01, bugs Ethan found)

- The hero's hat (and fire glow) got left behind on the helipad when jumping into the rocket. Now they go into the rocket too.
- After Boss Rush, World 1 and World 3 kept starting at the boss. Now they start normally.
- Golden Capybara was too strong: his SWITCH button now has 2 attacks instead of 4.
- Game controllers (like the **ANBERNIC RG 477V**) now work in the menus and the 3D worlds too, not only in the 2D levels. Buttons: A jump/pick, B or X attack, Y power, L1 shield, R1 fly, L2 Mecha, R2 switch, SELECT back, press the stick for the Freeze Ray.

## Future updates (Ethan wants these later; don't forget!)

- More worlds: underwater 🌊, a spooky castle 🏰, candy land 🍭.
- More power-ups.
- 2 PLAYERS TEAM in World 2 (3D), with a split screen (Cube Islands has it now).
- Grape Boss in Boss Rush (he's in the 3D world).
- More stuff for Grape Boss / World 2.

## Removed

- The friends on the hills holding the "Wir lieben SupaCapybara" sign: taken out by request on 2026-10-24.

## Sounds and music (in the game)

- **Theme songs**: a heroic song for the menu, a funky city song for World 1, and a fast, scary song for the Pizza Boss fight. The music stops when Pizza Boss explodes, and a win jingle plays.
- **City sounds**: traffic rumbling and car horns far away. It gets quieter at night, and the horns stop.
- **Effects**: jump, double jump, laser, super laser, scratch, tongue, bolt, bad guy POP, stomp, blaster shots, getting hurt, falling, Shield, invisible, bubble bounce, helicopter, Pizza Boss roar/hit/explosion, key, buying, and an error beep.

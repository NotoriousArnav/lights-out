**The game:** you have a grid of tiles, some lit and some dark. Tapping a tile flips it and its up, down, left and right neighbors (lit becomes dark, dark becomes lit). You win when every tile is dark. Fewer moves is a better score.

**How it works underneath:**

- **Flipping:** each tile is just on or off, and a tap flips the tapped tile plus whichever neighbors exist (edge and corner tiles have fewer).
- **Order doesn't matter:** a tile's final state depends only on how many times it was flipped, so pressing the same tile twice cancels out. Any solution is therefore a *set* of tiles to press once each, and you never need to press anything twice.
- **Guaranteed solvable:** the game starts from an all-dark board and presses random tiles to scramble it. Since every scramble is reversible, repeating those same presses must solve it. (Not every random lit pattern is solvable in Lights Out, so building puzzles this way avoids unwinnable ones.)
- **Hint:** the game keeps a running record of which tiles still need pressing. Each tap you make adds or removes that tile from the record, and Hint highlights one tile from it.

**Strategy tip:** work row by row. Whenever a tile is lit, press the tile directly below it to turn it off without disturbing the rows above. Once you reach the bottom row, whatever lit pattern remains tells you which tiles to press in the top row, and you repeat the sweep.

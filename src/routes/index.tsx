import { createFileRoute } from '@tanstack/react-router'

import { Board } from '../components/Board'
import { Controls } from '../components/Controls'
import { Message } from '../components/Message'
import { SizePicker } from '../components/SizePicker'
import { StatBar } from '../components/StatBar'
import { randomSeed } from '../game/rng'
import { useGame } from '../hooks/useGame'

export const Route = createFileRoute('/')({
  // The seed is generated on the server during SSR and serialised into the
  // page, so the first client render produces the same board.
  loader: () => ({ seed: randomSeed() }),
  component: Game,
})

function Game() {
  const { seed } = Route.useLoaderData()
  const game = useGame(seed)

  return (
    <main className="app">
      <h1>Lights Out</h1>
      <p className="sub">
        Tap a tile to flip it and its neighbors. Turn every light off.
      </p>

      <SizePicker size={game.size} onChange={game.newGame} />

      <StatBar moves={game.moves} best={game.bests[game.size]} />

      <Board
        size={game.size}
        grid={game.puzzle.grid}
        hint={game.hint?.index ?? null}
        locked={game.done}
        onPress={game.press}
      />

      <Controls
        onHint={game.showHint}
        onReset={() => game.newGame()}
      />

      <Message>{game.message}</Message>
    </main>
  )
}

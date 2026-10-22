import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-react-start'

import { AccountChip } from '../components/AccountChip'
import { Board } from '../components/Board'
import { Controls } from '../components/Controls'
import { HighScores } from '../components/HighScores'
import { Message } from '../components/Message'
import { SaveStatus } from '../components/SaveStatus'
import { ScoresDialog } from '../components/ScoresDialog'
import { SizePicker } from '../components/SizePicker'
import { StatBar } from '../components/StatBar'
import type { Size } from '../game/types'
import { useGame } from '../hooks/useGame'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { clerkEnabled } from '../lib/clerk'
import { issueGame } from '../server/game-fns'
import type { IssuedGame } from '../server/game-fns'

export const Route = createFileRoute('/')({
  // The server picks the seed, signs it into the game token, and sends both
  // back. The client rebuilds the same board from the seed, while every
  // score is verified against the signed token.
  loader: () => issueGame({ data: { size: 4 } }),
  component: GamePage,
})

function GamePage() {
  const initial = Route.useLoaderData()

  return clerkEnabled ? (
    <GameWithAuth initial={initial} />
  ) : (
    <GameView initial={initial} signedIn={false} />
  )
}

function GameWithAuth({ initial }: { initial: IssuedGame }) {
  const { isSignedIn, userId } = useAuth()

  return (
    <GameView
      initial={initial}
      signedIn={Boolean(isSignedIn)}
      userId={userId ?? undefined}
    />
  )
}

interface GameViewProps {
  initial: IssuedGame
  signedIn: boolean
  userId?: string
}

function GameView({ initial, signedIn, userId }: GameViewProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [scoresOpen, setScoresOpen] = useState(false)
  const [scoresSize, setScoresSize] = useState<Size>(initial.size)

  const handleScoreSaved = useCallback(() => {
    setRefreshKey((current) => current + 1)
  }, [])

  const game = useGame(initial, { signedIn, onScoreSaved: handleScoreSaved })
  const leaderboard = useLeaderboard(scoresSize, refreshKey)

  // Follow the board the player is actually on, but leave manual tab
  // changes alone until the game size changes again.
  useEffect(() => {
    setScoresSize(game.size)
  }, [game.size])

  const scores = (
    <HighScores
      size={scoresSize}
      onSize={setScoresSize}
      rows={leaderboard.rows}
      total={leaderboard.total}
      loading={leaderboard.loading}
      loadingMore={leaderboard.loadingMore}
      error={leaderboard.error}
      signedIn={signedIn}
      currentUserId={userId}
      onLoadMore={leaderboard.loadMore}
      onRefresh={leaderboard.refresh}
    />
  )

  return (
    <div className="layout">
      <main className="app">
        <AccountChip />

        <h1>Lights Out</h1>
        <p className="sub">
          Tap a tile to flip it and its neighbors. Turn every light off.
        </p>

        <SizePicker size={game.size} onChange={game.newGame} />

        <StatBar
          moves={game.moves}
          best={game.bests[game.size]}
          elapsedMs={game.elapsedMs}
        />

        <Board
          size={game.size}
          grid={game.puzzle.grid}
          hint={game.hint?.index ?? null}
          locked={game.done || game.starting}
          onPress={game.press}
        />

        <Controls
          onHint={game.showHint}
          onReset={() => void game.newGame()}
          onScores={() => {
            setScoresOpen(true)
            leaderboard.refresh()
          }}
          busy={game.starting}
          hinting={game.hinting}
          done={game.done}
        />

        <Message>{game.message}</Message>
        <SaveStatus save={game.save} signedIn={signedIn} />
      </main>

      <aside className="scores-aside" aria-label="Global high scores">
        {scores}
      </aside>

      {scoresOpen && (
        <ScoresDialog onClose={() => setScoresOpen(false)}>{scores}</ScoresDialog>
      )}
    </div>
  )
}

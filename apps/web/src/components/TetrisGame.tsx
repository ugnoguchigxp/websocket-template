import React, { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"

interface Position {
	x: number
	y: number
}

interface Piece {
	shape: number[][]
	position: Position
	color: string
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_SPEED = 800
const SPEED_INCREASE = 50

const TETROMINOS = [
	{ shape: [[1, 1, 1, 1]], color: "bg-cyan-400" }, // I
	{ shape: [[1, 1], [1, 1]], color: "bg-yellow-400" }, // O
	{ shape: [[0, 1, 0], [1, 1, 1]], color: "bg-purple-400" }, // T
	{ shape: [[1, 1, 0], [0, 1, 1]], color: "bg-green-400" }, // S
	{ shape: [[0, 1, 1], [1, 1, 0]], color: "bg-red-400" }, // Z
	{ shape: [[1, 0, 0], [1, 1, 1]], color: "bg-blue-400" }, // J
	{ shape: [[0, 0, 1], [1, 1, 1]], color: "bg-orange-400" }, // L
]

export const TetrisGame = () => {
	const { t } = useTranslation()
	const [board, setBoard] = useState<string[][]>(() =>
		Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(""))
	)
	const [currentPiece, setCurrentPiece] = useState<Piece | null>(null)
	const [score, setScore] = useState(0)
	const [lines, setLines] = useState(0)
	const [level, setLevel] = useState(1)
	const [gameOver, setGameOver] = useState(false)
	const [isPaused, setIsPaused] = useState(false)
	const [isStarted, setIsStarted] = useState(false)
	const gameLoopRef = useRef<NodeJS.Timeout | null>(null)

	const getRandomPiece = useCallback((): Piece => {
		const tetromino = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)]
		return {
			shape: tetromino.shape,
			position: { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 },
			color: tetromino.color,
		}
	}, [])

	const isValidMove = useCallback(
		(piece: Piece, board: string[][]): boolean => {
			for (let y = 0; y < piece.shape.length; y++) {
				for (let x = 0; x < piece.shape[y].length; x++) {
					if (piece.shape[y][x]) {
						const newX = piece.position.x + x
						const newY = piece.position.y + y

						if (
							newX < 0 ||
							newX >= BOARD_WIDTH ||
							newY >= BOARD_HEIGHT ||
							(newY >= 0 && board[newY][newX])
						) {
							return false
						}
					}
				}
			}
			return true
		},
		[]
	)

	const rotatePiece = useCallback((piece: Piece): number[][] => {
			const rotated = piece.shape[0].map((_, index) =>
				piece.shape.map(row => row[index]).reverse()
			)
			return rotated
		}, [])

	const movePiece = useCallback(
		(dx: number, dy: number) => {
			if (!currentPiece || gameOver || isPaused) return

			const newPiece = {
				...currentPiece,
				position: { x: currentPiece.position.x + dx, y: currentPiece.position.y + dy },
			}

			if (isValidMove(newPiece, board)) {
				setCurrentPiece(newPiece)
			} else if (dy > 0) {
				// Piece has landed
				const newBoard = board.map(row => [...row])
				for (let y = 0; y < currentPiece.shape.length; y++) {
					for (let x = 0; x < currentPiece.shape[y].length; x++) {
						if (currentPiece.shape[y][x]) {
							const boardY = currentPiece.position.y + y
							const boardX = currentPiece.position.x + x
							if (boardY >= 0) {
								newBoard[boardY][boardX] = currentPiece.color
							}
						}
					}
				}

				// Check for completed lines
				let completedLines = 0
				const filteredBoard = newBoard.filter(row => {
					const isComplete = row.every(cell => cell !== "")
					if (isComplete) completedLines++
					return !isComplete
				})

				// Add empty rows at the top
				while (filteredBoard.length < BOARD_HEIGHT) {
					filteredBoard.unshift(Array(BOARD_WIDTH).fill(""))
				}

				setBoard(filteredBoard)
				setLines(prev => prev + completedLines)
				setScore(prev => prev + completedLines * 100 * level)

				// Level up every 10 lines
				const newLines = lines + completedLines
				if (newLines >= level * 10) {
					setLevel(prev => prev + 1)
				}

				// Check game over
				const nextPiece = getRandomPiece()
				if (!isValidMove(nextPiece, filteredBoard)) {
					setGameOver(true)
					setIsStarted(false)
				} else {
					setCurrentPiece(nextPiece)
				}
			}
		},
		[currentPiece, board, gameOver, isPaused, isValidMove, getRandomPiece, level, lines]
	)

	const rotate = useCallback(() => {
		if (!currentPiece || gameOver || isPaused) return

		const rotated = rotatePiece(currentPiece)
		const newPiece = { ...currentPiece, shape: rotated }

		if (isValidMove(newPiece, board)) {
			setCurrentPiece(newPiece)
		}
	}, [currentPiece, board, gameOver, isPaused, isValidMove, rotatePiece])

	const dropPiece = useCallback(() => {
		if (!currentPiece || gameOver || isPaused) return

		let newPiece = { ...currentPiece }
		while (isValidMove({ ...newPiece, position: { ...newPiece.position, y: newPiece.position.y + 1 } }, board)) {
			newPiece.position.y++
		}
		setCurrentPiece(newPiece)
		movePiece(0, 1)
	}, [currentPiece, board, gameOver, isPaused, isValidMove, movePiece])

	const startGame = useCallback(() => {
		setBoard(Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill("")))
		setScore(0)
		setLines(0)
		setLevel(1)
		setGameOver(false)
		setIsPaused(false)
		setIsStarted(true)
		setCurrentPiece(getRandomPiece())
	}, [getRandomPiece])

	const togglePause = useCallback(() => {
		if (!isStarted || gameOver) return
		setIsPaused(prev => !prev)
	}, [isStarted, gameOver])

	// Game loop
	useEffect(() => {
		if (isStarted && !gameOver && !isPaused) {
			gameLoopRef.current = setInterval(() => {
				movePiece(0, 1)
			}, Math.max(100, INITIAL_SPEED - (level - 1) * SPEED_INCREASE))
		} else {
			if (gameLoopRef.current) {
				clearInterval(gameLoopRef.current)
			}
		}

		return () => {
			if (gameLoopRef.current) {
				clearInterval(gameLoopRef.current)
			}
		}
	}, [isStarted, gameOver, isPaused, level, movePiece])

	// Keyboard controls
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (!isStarted || gameOver) return

			switch (e.key) {
				case "ArrowLeft":
					e.preventDefault()
					movePiece(-1, 0)
					break
				case "ArrowRight":
					e.preventDefault()
					movePiece(1, 0)
					break
				case "ArrowDown":
					e.preventDefault()
					movePiece(0, 1)
					break
				case "ArrowUp":
					e.preventDefault()
					rotate()
					break
				case " ":
					e.preventDefault()
					dropPiece()
					break
				case "p":
				case "P":
					e.preventDefault()
					togglePause()
					break
			}
		}

		window.addEventListener("keydown", handleKeyPress)
		return () => window.removeEventListener("keydown", handleKeyPress)
	}, [isStarted, gameOver, movePiece, rotate, dropPiece, togglePause])

	// Render board with current piece
	const renderBoard = () => {
		const displayBoard = board.map(row => [...row])

		if (currentPiece) {
			for (let y = 0; y < currentPiece.shape.length; y++) {
				for (let x = 0; x < currentPiece.shape[y].length; x++) {
					if (currentPiece.shape[y][x]) {
						const boardY = currentPiece.position.y + y
						const boardX = currentPiece.position.x + x
						if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
							displayBoard[boardY][boardX] = currentPiece.color
						}
					}
				}
			}
		}

		return displayBoard
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
			<h1 className="text-4xl font-bold mb-8">{t("tetris", "テトリス")}</h1>

			<div className="flex gap-8">
				{/* Game Board */}
				<div className="relative">
					<div className="grid grid-cols-10 gap-0 bg-gray-800 p-2 rounded-lg border-4 border-gray-700">
						{renderBoard().map((row, y) =>
							row.map((cell, x) => (
								<div
									key={`${y}-${x}`}
									className={`w-6 h-6 border border-gray-600 ${
										cell || "bg-gray-900"
									}`}
								/>
							))
						)}
					</div>

					{/* Game Over Overlay */}
					{gameOver && (
						<div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
							<div className="text-center">
								<h2 className="text-2xl font-bold mb-4">Game Over</h2>
								<p className="text-xl mb-4">Score: {score}</p>
							</div>
						</div>
					)}

					{/* Pause Overlay */}
					{isPaused && !gameOver && (
						<div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
							<h2 className="text-2xl font-bold">Paused</h2>
						</div>
					)}
				</div>

				{/* Controls and Info */}
				<div className="flex flex-col gap-4">
					{/* Score */}
					<div className="bg-gray-800 p-4 rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Score</h3>
						<p className="text-2xl font-bold">{score}</p>
					</div>

					<div className="bg-gray-800 p-4 rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Lines</h3>
						<p className="text-xl font-bold">{lines}</p>
					</div>

					<div className="bg-gray-800 p-4 rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Level</h3>
						<p className="text-xl font-bold">{level}</p>
					</div>

					{/* Controls */}
					<div className="bg-gray-800 p-4 rounded-lg">
						<h3 className="text-lg font-semibold mb-2">Controls</h3>
						<div className="text-sm space-y-1">
							<p>← → : Move</p>
							<p>↓ : Soft Drop</p>
							<p>↑ : Rotate</p>
							<p>Space : Hard Drop</p>
							<p>P : Pause</p>
						</div>
					</div>

					{/* Buttons */}
					<div className="flex flex-col gap-2">
						{!isStarted || gameOver ? (
							<button
								onClick={startGame}
								className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-semibold transition-colors"
							>
								{gameOver ? "New Game" : "Start Game"}
							</button>
						) : (
							<button
								onClick={togglePause}
								className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-semibold transition-colors"
							>
								{isPaused ? "Resume" : "Pause"}
							</button>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

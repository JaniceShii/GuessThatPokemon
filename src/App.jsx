import { useEffect, useState } from "react";

const MAX_ATTEMPTS = 5;
// You can change this to limit which Pokémon appear (e.g., 1–151 for only Gen 1)
const MIN_POKEMON_ID = 1;
const MAX_POKEMON_ID = 898;

function getRandomPokemonId() {
  return (
    Math.floor(Math.random() * (MAX_POKEMON_ID - MIN_POKEMON_ID + 1)) +
    MIN_POKEMON_ID
  );
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/♀/g, "f")
    .replace(/♂/g, "m")
    .replace(/[^a-z0-9]/g, ""); // remove spaces, hyphens, punctuation
}

function formatGeneration(genName) {
  // "generation-i" -> "Generation I"
  if (!genName) return "Unknown";
  const suffix = genName.replace("generation-", "");
  return "Generation " + suffix.toUpperCase();
}

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

async function fetchPokemonData(id) {
  // Fetch main Pokémon data
  const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
  if (!pokemonRes.ok) throw new Error("Failed to fetch pokemon");
  const pokemon = await pokemonRes.json();

  // Fetch species data
  const speciesRes = await fetch(
    `https://pokeapi.co/api/v2/pokemon-species/${id}`
  );
  if (!speciesRes.ok) throw new Error("Failed to fetch species");
  const species = await speciesRes.json();

  // Types
  const types = pokemon.types
    .sort((a, b) => a.slot - b.slot)
    .map((t) => t.type.name);

  // Generation
  const generation = species.generation?.name || "unknown";

  // Colour
  const color = species.color?.name || "unknown";

  // Species / genus (English)
  const genusEntry = species.genera.find(
    (g) => g.language.name === "en"
  );
  const speciesName = genusEntry ? genusEntry.genus : "Unknown Pokémon";

  // Sprite
  const sprite = pokemon.sprites.front_default;

  // Cry URL – you can wire a real one later if you want
  const cryUrl = null;

  return {
    id,
    name: pokemon.name,
    types,
    generation,
    color,
    speciesName,
    sprite,
    cryUrl,
  };
}

function App() {
  const [pokemon, setPokemon] = useState(null);
  const [gameState, setGameState] = useState("loading"); // "loading" | "playing" | "won" | "lost" | "error"
  const [attempts, setAttempts] = useState(0);
  const [userGuess, setUserGuess] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load first Pokémon when the app mounts
  useEffect(() => {
    startNewGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hintFunctions = [
    (p) => `Type: ${p.types.map(capitalize).join(" / ")}`,
    (p) => `Generation: ${formatGeneration(p.generation)}`,
    (p) => `Main colour: ${capitalize(p.color)}`,
    (p) => `Species: ${p.speciesName}`,
    (p) =>
      p.cryUrl
        ? "Cry: (play the sound!)"
        : "Cry: (Pokémon cry hint – audio not wired in yet)",
  ];

  async function startNewGame() {
    setGameState("loading");
    setPokemon(null);
    setAttempts(0);
    setUserGuess("");
    setMessage("");
    setError("");

    try {
      const id = getRandomPokemonId();
      const data = await fetchPokemonData(id);
      setPokemon(data);
      setGameState("playing");
      setMessage("First hint unlocked! Who’s that Pokémon?");
    } catch (err) {
      console.error(err);
      setError("Failed to load Pokémon. Please try again.");
      setGameState("error");
    }
  }

  function handleGuessSubmit(e) {
    e.preventDefault();
    if (!pokemon || gameState !== "playing") return;

    const trimmed = userGuess.trim();
    if (!trimmed) return;

    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    const normalizedGuess = normalizeName(trimmed);
    const correctName = normalizeName(pokemon.name);

    if (normalizedGuess === correctName) {
      setGameState("won");
      setMessage(
        `Correct! It was ${capitalize(pokemon.name)}. You won in ${newAttempts} ${
          newAttempts === 1 ? "try" : "tries"
        }!`
      );
    } else if (newAttempts >= MAX_ATTEMPTS) {
      setGameState("lost");
      setMessage(
        `No more hints! You lose. The Pokémon was ${capitalize(
          pokemon.name
        )}.`
      );
    } else {
      setMessage("Not quite! Here’s another hint…");
    }

    setUserGuess("");
  }

  function visibleHints() {
    if (!pokemon) return [];
    // First hint is available before the first guess, then one more per wrong guess
    const count = Math.min(attempts + 1, MAX_ATTEMPTS);
    return hintFunctions.slice(0, count).map((fn) => fn(pokemon));
  }

  const canGuess = gameState === "playing";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",          
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start", // or center for vertical centering
        background:
          "radial-gradient(circle at top, #ffe066, #ff6b6b 30%, #1c1c3c 80%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          width: "100%",
          background: "rgba(0, 0, 0, 0.6)",
          borderRadius: "1.5rem",
          padding: "1.75rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          Pokémon Guesser
        </h1>
        <p style={{ textAlign: "center", opacity: 0.85, marginBottom: "1rem" }}>
          You have 5 hints to guess the Pokémon. A new hint unlocks after each
          wrong guess!
        </p>

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "0.75rem",
              background: "rgba(255, 0, 0, 0.2)",
            }}
          >
            {error}
          </div>
        )}

        {gameState === "loading" && <p>Loading Pokémon...</p>}

        {pokemon && (
          <>
            {/* Hints */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                borderRadius: "1rem",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Hints</h2>
              <ol style={{ paddingLeft: "1.25rem", margin: 0 }}>
                {visibleHints().map((hint, i) => (
                  <li key={i} style={{ marginBottom: "0.3rem" }}>
                    {hint}
                  </li>
                ))}
              </ol>
              <p style={{ marginTop: "0.75rem", fontSize: "0.9rem" }}>
                Attempt {attempts + 1} of {MAX_ATTEMPTS}
              </p>
            </div>

            {/* Guess form */}
            <form onSubmit={handleGuessSubmit} style={{ marginBottom: "1rem" }}>
              <label
                style={{ display: "block", marginBottom: "0.5rem" }}
                htmlFor="guess"
              >
                Your guess:
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  id="guess"
                  type="text"
                  value={userGuess}
                  disabled={!canGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  placeholder="e.g. Pikachu"
                  style={{
                    flex: 1,
                    padding: "0.6rem 0.8rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    fontSize: "1rem",
                  }}
                />
                <button
                  type="submit"
                  disabled={!canGuess}
                  style={{
                    padding: "0.6rem 1.1rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    fontWeight: 600,
                    cursor: canGuess ? "pointer" : "not-allowed",
                    background: "#ffcc00",
                    color: "#222",
                    transition: "transform 0.1s ease, box-shadow 0.1s ease",
                  }}
                >
                  Guess
                </button>
              </div>
            </form>

            {/* Message */}
            {message && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  background: "rgba(255, 255, 255, 0.06)",
                  fontSize: "0.95rem",
                }}
              >
                {message}
              </div>
            )}

            {/* End-of-game info */}
            {(gameState === "won" || gameState === "lost") && (
              <div
                style={{
                  marginBottom: "1rem",
                  padding: "1rem",
                  borderRadius: "1rem",
                  background: "rgba(0, 0, 0, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                {pokemon.sprite && (
                  <img
                    src={pokemon.sprite}
                    alt={pokemon.name}
                    style={{
                      width: "96px",
                      height: "96px",
                      imageRendering: "pixelated",
                    }}
                  />
                )}
                <div>
                  <h3 style={{ margin: 0 }}>
                    {capitalize(pokemon.name)} (#{pokemon.id})
                  </h3>
                  <p style={{ margin: "0.25rem 0" }}>
                    Type: {pokemon.types.map(capitalize).join(" / ")}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>
                    {formatGeneration(pokemon.generation)} • Colour:{" "}
                    {capitalize(pokemon.color)}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>
                    Species: {pokemon.speciesName}
                  </p>
                </div>
              </div>
            )}

            {/* Play again button */}
            {(gameState === "won" ||
              gameState === "lost" ||
              gameState === "error") && (
              <button
                onClick={startNewGame}
                style={{
                  width: "100%",
                  padding: "0.7rem 1rem",
                  borderRadius: "0.9rem",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #4dabf7, #9775fa)",
                  color: "white",
                  fontSize: "1rem",
                }}
              >
                Play Again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;

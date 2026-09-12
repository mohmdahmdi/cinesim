import { Movie } from "@/services/movies";
import { posterUrl } from "@/utils/tmdbImage";

type Node = { x: number; y: number; movie: Movie };

const POSITIONS = [
  { x: 70, y: 65 },
  { x: 185, y: 165 },
  { x: 305, y: 55 },
  { x: 420, y: 145 },
  { x: 255, y: 225 },
];

const EDGES: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [1, 4],
  [3, 4],
];

const NODE_R = 28;

function edgePath(a: Node, b: Node): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Bow the line perpendicular to a-b for a gentle arc instead of a straight segment.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bow = 18;
  const cx = mx + nx * bow;
  const cy = my + ny * bow;
  return `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
}

export default function MovieGraphHero({ movies }: { movies: Movie[] }) {
  const withPosters = movies.filter((m) => m.posterPath).slice(0, POSITIONS.length);
  if (withPosters.length < 3) return null;

  const nodes: Node[] = withPosters.map((movie, i) => ({ ...POSITIONS[i], movie }));
  const edges = EDGES.filter(([a, b]) => a < nodes.length && b < nodes.length);

  return (
    <svg
      viewBox="0 0 480 260"
      className="h-full w-full"
      role="img"
      aria-label="A network of movies connected by community-suggested similarities"
    >
      <defs>
        {nodes.map((n, i) => (
          <clipPath id={`hero-node-${i}`} key={i}>
            <circle cx={n.x} cy={n.y} r={NODE_R} />
          </clipPath>
        ))}
      </defs>

      {edges.map(([a, b], i) => (
        <path
          key={i}
          d={edgePath(nodes[a], nodes[b])}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity={0.35}
          strokeWidth={1.5}
        />
      ))}

      {nodes.map((n, i) => {
        const poster = posterUrl(n.movie.posterPath, "w185");
        return (
          <g key={i} className="hero-node" style={{ animationDelay: `${i * 0.4}s` }}>
            <circle
              cx={n.x}
              cy={n.y}
              r={NODE_R + 4}
              fill="none"
              stroke="var(--accent)"
              strokeOpacity={0.5}
              strokeWidth={1.5}
              className="hero-node-ring"
            />
            {poster && (
              <image
                href={poster}
                x={n.x - NODE_R}
                y={n.y - NODE_R}
                width={NODE_R * 2}
                height={NODE_R * 2}
                clipPath={`url(#hero-node-${i})`}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

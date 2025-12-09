"use client";

import { useEffect, useRef } from "react";

const CELL_SIZE = 4;
const ALIVE_PROBABILITY = 0.15;

export default function GameOfLife() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get colors from CSS variables
    const styles = getComputedStyle(document.documentElement);
    // We'll use a fallback if the variable isn't found, but it should be there.
    // Using a subtle color for the cells so it doesn't distract from content.
    const aliveColor = styles.getPropertyValue("--gray-6").trim() || "#888";
    const deadColor = "transparent";

    let width = canvas.width;
    let height = canvas.height;
    let cols = Math.floor(width / CELL_SIZE);
    let rows = Math.floor(height / CELL_SIZE);

    let grid: number[][] = [];

    const initGrid = () => {
      grid = new Array(cols)
        .fill(null)
        .map(() =>
          new Array(rows)
            .fill(null)
            .map(() => (Math.random() < ALIVE_PROBABILITY ? 1 : 0))
        );
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = aliveColor;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          if (grid[i][j] === 1) {
            ctx.fillRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        }
      }
    };

    const updateGrid = () => {
      const newGrid = grid.map((arr) => [...arr]);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const state = grid[i][j];
          let neighbors = 0;

          for (let x = -1; x < 2; x++) {
            for (let y = -1; y < 2; y++) {
              if (x === 0 && y === 0) continue;
              const col = (i + x + cols) % cols;
              const row = (j + y + rows) % rows;
              neighbors += grid[col][row];
            }
          }

          if (state === 0 && neighbors === 3) {
            newGrid[i][j] = 1;
          } else if (state === 1 && (neighbors < 2 || neighbors > 3)) {
            newGrid[i][j] = 0;
          }
        }
      }

      grid = newGrid;
    };

    const loop = () => {
      drawGrid();
      updateGrid();
      // Slow down animation slightly if needed, or run full speed
      // setTimeout(() => {
      animationFrameId.current = requestAnimationFrame(loop);
      // }, 50);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        width = canvas.width;
        height = canvas.height;
        cols = Math.floor(width / CELL_SIZE);
        rows = Math.floor(height / CELL_SIZE);
        initGrid();
      }
    };

    // Initial setup
    handleResize();
    window.addEventListener("resize", handleResize);

    // Start loop
    loop();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
      style={{ zIndex: 0 }}
    />
  );
}

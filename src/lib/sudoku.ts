export type SudokuGrid = number[][];

export type SudokuSolveResult = {
  solution: SudokuGrid | null;
  solutionCount: number;
};

export function createEmptyGrid(): SudokuGrid {
  return Array.from({ length: 9 }, () => Array(9).fill(0));
}

export function countClues(grid: SudokuGrid): number {
  return grid.reduce(
    (total, row) => total + row.filter((value) => value > 0).length,
    0,
  );
}

export function findGridConflict(grid: SudokuGrid): string | null {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = grid[row][col];
      if (!value) continue;

      for (let otherCol = col + 1; otherCol < 9; otherCol += 1) {
        if (grid[row][otherCol] === value) {
          return `There are two ${value}s in row ${row + 1}. Check the two clues.`;
        }
      }

      for (let otherRow = row + 1; otherRow < 9; otherRow += 1) {
        if (grid[otherRow][col] === value) {
          return `There are two ${value}s in column ${col + 1}. Check the two clues.`;
        }
      }

      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let r = boxRow; r < boxRow + 3; r += 1) {
        for (let c = boxCol; c < boxCol + 3; c += 1) {
          if ((r > row || (r === row && c > col)) && grid[r][c] === value) {
            return `There are two ${value}s in the same 3×3 box. Check the two clues.`;
          }
        }
      }
    }
  }
  return null;
}

export function solveSudoku(grid: SudokuGrid): SudokuSolveResult {
  if (findGridConflict(grid)) return { solution: null, solutionCount: 0 };

  const work = grid.map((row) => [...row]);
  const rowMasks = Array(9).fill(0);
  const colMasks = Array(9).fill(0);
  const boxMasks = Array(9).fill(0);
  const fullMask = 0b1111111110;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = work[row][col];
      if (!value) continue;
      const bit = 1 << value;
      rowMasks[row] |= bit;
      colMasks[col] |= bit;
      boxMasks[Math.floor(row / 3) * 3 + Math.floor(col / 3)] |= bit;
    }
  }

  let solution: SudokuGrid | null = null;
  let solutionCount = 0;

  function search(): void {
    if (solutionCount >= 2) return;

    let bestRow = -1;
    let bestCol = -1;
    let bestCandidates = 0;
    let bestCount = 10;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (work[row][col] !== 0) continue;

        const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
        const candidates = fullMask & ~(rowMasks[row] | colMasks[col] | boxMasks[box]);
        let count = 0;
        for (let mask = candidates; mask; mask &= mask - 1) count += 1;

        if (count === 0) return;
        if (count < bestCount) {
          bestCount = count;
          bestRow = row;
          bestCol = col;
          bestCandidates = candidates;
          if (count === 1) break;
        }
      }
      if (bestCount === 1) break;
    }

    if (bestRow === -1) {
      solutionCount += 1;
      if (!solution) solution = work.map((row) => [...row]);
      return;
    }

    const box = Math.floor(bestRow / 3) * 3 + Math.floor(bestCol / 3);
    for (let value = 1; value <= 9; value += 1) {
      const bit = 1 << value;
      if (!(bestCandidates & bit)) continue;

      work[bestRow][bestCol] = value;
      rowMasks[bestRow] |= bit;
      colMasks[bestCol] |= bit;
      boxMasks[box] |= bit;
      search();
      work[bestRow][bestCol] = 0;
      rowMasks[bestRow] ^= bit;
      colMasks[bestCol] ^= bit;
      boxMasks[box] ^= bit;
      if (solutionCount >= 2) return;
    }
  }

  search();
  return { solution, solutionCount };
}

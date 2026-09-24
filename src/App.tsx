"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Eye,
  Grid3X3,
  ImagePlus,
  LoaderCircle,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { readSudokuPhoto } from "@/lib/photo-reader";
import {
  countClues,
  createEmptyGrid,
  findGridConflict,
  solveSudoku,
  type SudokuGrid,
} from "@/lib/sudoku";
import { detectLocale, languages, t, type Locale, type Key } from "@/lib/i18n";

type Phase = "idle" | "photo" | "scanning" | "review" | "solved";

export default function Home() {
  const [locale, setLocale] = useState<Locale>(detectLocale);
  const tr = (key: Key, params?: Record<string, string | number>) => t(locale, key, params);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<SudokuGrid>(createEmptyGrid);
  const [solution, setSolution] = useState<SudokuGrid | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [multipleSolutions, setMultipleSolutions] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(() => new Set());
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = tr("title");
    localStorage.setItem("sudoku-language", locale);
    setNotice("");
    setError("");
  }, [locale]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const clues = countClues(puzzle);
  const answerCount = 81 - clues;
  const allRevealed = phase === "solved" && revealedCells.size >= answerCount;

  function selectPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(tr("chooseImageError"));
      return;
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPhoto(file);
    setPreviewUrl(nextUrl);
    setPuzzle(createEmptyGrid());
    setSolution(null);
    setPhase("photo");
    setProgress(0);
    setNotice("");
    setError("");
    setMultipleSolutions(false);
    setRevealedCells(new Set());
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    selectPhoto(event.currentTarget.files?.[0]);
    event.currentTarget.value = "";
  }

  async function scanPhoto() {
    if (!photo) return;
    setPhase("scanning");
    setProgress(4);
    setProgressLabel(tr("preparing"));
    setError("");
    setNotice("");

    try {
      const detected = await readSudokuPhoto(photo, (label, percent) => {
        setProgressLabel(tr(({ "Opening photo": "opening", "Finding the puzzle grid": "finding", "Loading number reader": "loading" } as const)[label as "Opening photo" | "Finding the puzzle grid" | "Loading number reader"] ?? "reading", label.startsWith("Reading clues") ? { current: label.match(/\d+/g)?.[0] ?? 0, total: label.match(/\d+/g)?.[1] ?? 0 } : {}));
        setProgress(percent);
      });
      setPuzzle(detected);
      setPhase("review");
      setNotice(tr("detected", { count: countClues(detected) }));
      setActiveCell(null);
    } catch (scanError) {
      console.error("Sudoku photo scan failed:", scanError);
      setPhase("photo");
      setError(
        scanError instanceof Error ? localizeScanError(scanError, locale) : tr("scanFailed"),
      );
    }
  }

  function editCell(rowIndex: number, colIndex: number, rawValue: string) {
    const digit = rawValue.replace(/[^1-9]/g, "").slice(-1);
    const next = puzzle.map((row) => [...row]);
    next[rowIndex][colIndex] = digit ? Number(digit) : 0;
    setPuzzle(next);
    setSolution(null);
    setMultipleSolutions(false);
    setRevealedCells(new Set());
    setPhase("review");
    setNotice("");
    setError("");
  }

  function solvePuzzle() {
    if (!clues) {
      setError(tr("addClues"));
      return;
    }

    const conflict = findGridConflict(puzzle);
    if (conflict) {
      setError(localizeConflict(conflict, locale));
      return;
    }

    const result = solveSudoku(puzzle);
    if (!result.solution) {
      setError(tr("noSolution"));
      return;
    }

    setSolution(result.solution);
    setMultipleSolutions(result.solutionCount > 1);
    setRevealedCells(new Set());
    setPhase("solved");
    setError("");
    setNotice(
      result.solutionCount > 1
        ? tr("multipleReady")
        : tr("singleReady"),
    );
  }

  function revealCell(row: number, col: number) {
    const key = `${row}-${col}`;
    setRevealedCells((current) => new Set(current).add(key));
    setNotice(tr("cellRevealed", { row: row + 1, col: col + 1 }));
  }

  function revealAllAnswers() {
    const next = new Set<string>();
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (puzzle[row][col] === 0) next.add(`${row}-${col}`);
      }
    }
    setRevealedCells(next);
    setNotice(tr("allDone"));
  }

  function clearPuzzle() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPhoto(null);
    setPreviewUrl(null);
    setPuzzle(createEmptyGrid());
    setSolution(null);
    setPhase("idle");
    setProgress(0);
    setNotice("");
    setError("");
    setMultipleSolutions(false);
    setRevealedCells(new Set());
    setActiveCell(null);
    if (cameraInput.current) cameraInput.current.value = "";
    if (photoInput.current) photoInput.current.value = "";
  }

  function moveFocus(
    event: React.KeyboardEvent<HTMLElement>,
    row: number,
    col: number,
  ) {
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    const nextRow = (row + move[0] + 9) % 9;
    const nextCol = (col + move[1] + 9) % 9;
    event.currentTarget
      .closest("table")
      ?.querySelector<HTMLElement>(`[data-row="${nextRow}"][data-col="${nextCol}"]`)
      ?.focus();
  }

  const statusLabel =
    phase === "scanning"
      ? tr("scanning")
      : phase === "solved"
          ? allRevealed
            ? tr("allRevealed")
            : revealedCells.size
              ? tr("hintsRevealed")
              : tr("solutionReady")
        : phase === "review"
          ? tr("readyToSolve")
          : phase === "photo"
            ? tr("photoSelected")
            : tr("waiting");

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="wordmark" href={import.meta.env.BASE_URL} aria-label={tr("title")}>
          <span className="brand-icon" aria-hidden="true">
            <Grid3X3 size={19} strokeWidth={2.1} />
          </span>
          <span>{tr("title")}</span>
        </a>
        <div className="header-tools">
          <label className="visually-hidden" htmlFor="language">{tr("languageLabel")}</label>
          <select id="language" className="language-select" value={locale} onChange={(event) => setLocale(event.target.value as Locale)} aria-label={tr("languageLabel")}>
            {Object.entries(languages).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        <div className="privacy-label">
          <ShieldCheck size={17} strokeWidth={1.8} aria-hidden="true" />
          <span>{tr("privacyShort")}</span>
        </div>
        </div>
      </header>

      <section className="page-intro" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">{tr("eyebrow")}</p>
          <h1 id="page-title">{tr("headline")}</h1>
          <p className="intro-copy">{tr("intro")}</p>
        </div>
        <div className="step-trail" aria-hidden="true">
          <span className="step-active">01&nbsp; {tr("photo")}</span>
          <span className="step-divider" />
          <span>02&nbsp; {tr("solution")}</span>
        </div>
      </section>

      <div className="workspace">
        <section className="panel photo-panel" aria-labelledby="photo-title">
          <div className="panel-heading">
            <span className="panel-step">01</span>
            <div>
              <p className="section-label">{tr("photoUpper")}</p>
              <h2 id="photo-title">{tr("scanTitle")}</h2>
            </div>
          </div>

          <div className={`photo-well${previewUrl ? " photo-well-filled" : ""}`}>
            {previewUrl ? (
              <div className="preview-content">
                <img src={previewUrl} alt={tr("selectedAlt")} className="photo-preview" />
                <div className="photo-caption">
                  <span className="file-name" title={photo?.name}>{photo?.name}</span>
                  <button className="text-action" type="button" onClick={() => photoInput.current?.click()}>
                    {tr("changePhoto")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="photo-empty">
                <span className="photo-empty-icon"><ImagePlus size={25} strokeWidth={1.7} /></span>
                <strong>{tr("clearPhoto")}</strong>
                <span>{tr("fullGrid")}</span>
              </div>
            )}
          </div>

          <div className="photo-actions">
            <Button
              type="button"
              className="photo-action photo-action-primary"
              onClick={() => cameraInput.current?.click()}
            >
              <Camera size={18} />
              {tr("takePhoto")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="photo-action photo-action-secondary"
              onClick={() => photoInput.current?.click()}
            >
              <ImagePlus size={18} />
              {tr("choosePhoto")}
            </Button>
          </div>

          {phase === "scanning" ? (
            <div className="scan-progress" aria-live="polite">
              <div className="progress-copy">
                <span className="progress-label"><LoaderCircle className="spin" size={16} />{progressLabel}</span>
                <span className="progress-number">{progress}%</span>
              </div>
              <Progress value={progress} className="photo-progress" aria-label={tr("scanProgress")} />
            </div>
          ) : photo ? (
            <Button type="button" className="scan-action" onClick={scanPhoto}>
              <ScanLine size={18} />
              {tr("scanPhoto")}
            </Button>
          ) : null}

          <p className="privacy-note">
            <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
            {tr("privacyNote")}
          </p>

          {error ? <p className="message message-error" role="alert">{error}</p> : null}
        </section>

        <section className="panel puzzle-panel" aria-labelledby="board-title">
          <div className="board-heading">
            <div className="panel-heading">
              <span className="panel-step">02</span>
              <div>
                <p className="section-label">{tr("gridUpper")}</p>
                <h2 id="board-title">{tr("solutionTitle")}</h2>
              </div>
            </div>
            <span className={`status-pill${phase === "solved" && !multipleSolutions ? " status-solved" : ""}`}>
              {phase === "solved" && !multipleSolutions ? <Check size={14} /> : null}
              {statusLabel}
            </span>
          </div>

          <p className="board-instruction">
            {phase === "solved"
              ? allRevealed
                ? tr("allInstruction")
                : multipleSolutions
                  ? tr("multipleInstruction")
                  : revealedCells.size
                    ? tr("partialInstruction", { shown: revealedCells.size, total: answerCount })
                    : tr("readyInstruction")
              : phase === "review"
                ? tr("reviewInstruction")
                : tr("emptyInstruction")}
          </p>

          <div className="board-frame">
            <Table className="sudoku-table" aria-label={tr("gridLabel")}>
              <TableBody>
                {Array.from({ length: 9 }, (_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {Array.from({ length: 9 }, (_, colIndex) => {
                      const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex;
                      const isGiven = puzzle[rowIndex][colIndex] !== 0;
                      const key = `${rowIndex}-${colIndex}`;
                      const isRevealed = revealedCells.has(key);
                      return (
                        <TableCell key={colIndex} className="sudoku-cell">
                          {phase === "solved" ? (
                            isGiven ? (
                              <span className="cell-display cell-given">{puzzle[rowIndex][colIndex]}</span>
                            ) : isRevealed && solution ? (
                              <span className="cell-display cell-answer">{solution[rowIndex][colIndex]}</span>
                            ) : (
                              <button
                                type="button"
                                className="cell-reveal"
                                aria-label={tr("revealCellLabel", { row: rowIndex + 1, col: colIndex + 1 })}
                                data-row={rowIndex}
                                data-col={colIndex}
                                onClick={() => revealCell(rowIndex, colIndex)}
                                onKeyDown={(event) => moveFocus(event, rowIndex, colIndex)}
                              >
                                <span aria-hidden="true">?</span>
                              </button>
                            )
                          ) : (
                            <input
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              aria-label={tr("cellLabel", { row: rowIndex + 1, col: colIndex + 1 })}
                              data-row={rowIndex}
                              data-col={colIndex}
                              maxLength={1}
                              value={puzzle[rowIndex][colIndex] || ""}
                              className={`cell-input${isGiven ? " cell-given" : ""}${isActive ? " cell-focused" : ""}`}
                              onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                              onKeyDown={(event) => moveFocus(event, rowIndex, colIndex)}
                              onChange={(event) => editCell(rowIndex, colIndex, event.currentTarget.value)}
                            />
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {phase === "solved" ? (
            <div className="number-legend" aria-label={tr("legendLabel")}>
              <span><i className="legend-dot legend-given" />{tr("cluesLegend")}</span>
              <span><i className="legend-dot legend-answer" />{tr("answersLegend")}</span>
            </div>
          ) : (
            <p className="board-hint">{tr("tip")}</p>
          )}

          {notice ? <p className={`message${phase === "solved" && allRevealed ? " message-success" : " message-neutral"}`} aria-live="polite">{notice}</p> : null}
          {error && phase !== "photo" ? <p className="message message-error" role="alert">{error}</p> : null}

          <div className="board-actions">
            {phase === "solved" ? (
              <>
                {!allRevealed ? (
                  <Button type="button" className="solve-action reveal-all-action" onClick={revealAllAnswers}>
                    <Eye size={17} />
                    {tr("revealAll")}
                  </Button>
                ) : null}
                <Button type="button" variant="outline" className="edit-action" onClick={() => { setPhase("review"); setNotice(""); setRevealedCells(new Set()); }}>
                  {tr("editClues")}
                </Button>
              </>
            ) : (
              <Button type="button" className="solve-action" disabled={clues === 0} onClick={solvePuzzle}>
                <Check size={17} />
                {tr("solve")}
              </Button>
            )}
            {photo || clues > 0 ? (
              <Button type="button" variant="ghost" className="clear-action" onClick={clearPuzzle}>
                <RotateCcw size={16} />
                {tr("clear")}
              </Button>
            ) : null}
          </div>
          {clues > 0 && phase !== "solved" ? <p className="clue-count">{tr("clueCount", { count: clues })}</p> : null}
        </section>
      </div>

      <footer className="page-footer">
        <span>{tr("title")}</span>
        <span title={tr("aboutPrivacy")}>{tr("footer")}</span>
      </footer>

      <input
        ref={cameraInput}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        aria-label={tr("takePhoto")}
        onChange={handleFileChange}
      />
      <input
        ref={photoInput}
        className="visually-hidden"
        type="file"
        accept="image/*"
        aria-label={tr("choosePhoto")}
        onChange={handleFileChange}
      />
    </main>
  );
}

function localizeConflict(message: string, locale: Locale): string {
  const row = message.match(/two (\d)s in row (\d)/);
  if (row) return t(locale, "rowConflict", { value: row[1], row: row[2] });
  const col = message.match(/two (\d)s in column (\d)/);
  if (col) return t(locale, "colConflict", { value: col[1], col: col[2] });
  const box = message.match(/two (\d)s in the same/);
  if (box) return t(locale, "boxConflict", { value: box[1] });
  return message;
}

function localizeScanError(error: Error, locale: Locale): string {
  if (error.message.includes("could not start")) return t(locale, "scanStartError");
  if (error.message.includes("could not be opened")) return t(locale, "photoOpenError");
  if (error.message.includes("square Sudoku grid")) return t(locale, "gridNotFound");
  if (error.message.includes("read any numbers")) return t(locale, "noNumbers");
  return t(locale, "scanError");
}

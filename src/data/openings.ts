export interface OpeningLine {
  id: string
  opening: string        // nombre del repertorio
  name: string           // nombre de la variante
  side: 'w' | 'b'        // bando que entrena el usuario
  moves: string[]        // SAN, desde la posición inicial
  notes?: Record<number, string>  // índice de jugada (0-based) → idea breve
}

/* Repertorio corto para nivel 800-1200. Solo líneas principales conocidas;
   las notas son ideas generales, no análisis de motor. */
export const OPENING_LINES: OpeningLine[] = [
  // ---------- BLANCAS: Apertura Italiana ----------
  {
    id: 'ita-pianissimo', opening: 'Italiana (blancas)', name: 'Giuoco Pianissimo', side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'a4'],
    notes: { 6: 'c3 prepara d4 y da la casilla c2 al alfil.', 8: 'd3: centro sólido, sin prisas.', 14: 'a4 frena ...b5 y gana espacio.' },
  },
  {
    id: 'ita-nf6-bb3', opening: 'Italiana (blancas)', name: 'Dos caballos con d3', side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'c3', 'd6', 'O-O', 'O-O', 'Re1', 'a6', 'Bb3', 'Ba7', 'h3'],
    notes: { 6: 'd3 protege e4 y evita ...Nxe4.', 14: 'Bb3 saca al alfil de la diagonal de ...d5/...Na5.', 16: 'h3 quita g4 al alfil y al caballo.' },
  },
  {
    id: 'ita-be7', opening: 'Italiana (blancas)', name: 'Defensa con ...Be7', side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Be7', 'O-O', 'O-O', 'Re1', 'd6', 'c3'],
    notes: { 12: 'c3 prepara d4 con apoyo.' },
  },
  {
    id: 'ita-petrov', opening: 'Italiana (blancas)', name: 'Contra la Petrov: 3.Nc3', side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'Nf6', 'Nc3', 'Nc6', 'Bc4', 'Bc5', 'd3', 'd6', 'O-O', 'O-O'],
    notes: { 4: 'Nc3 evita la teoría de la Petrov y suele transponer a la Italiana.' },
  },
  {
    id: 'ita-philidor', opening: 'Italiana (blancas)', name: 'Contra la Philidor', side: 'w',
    moves: ['e4', 'e5', 'Nf3', 'd6', 'd4', 'exd4', 'Nxd4', 'Nf6', 'Nc3', 'Be7', 'Be2', 'O-O', 'O-O'],
    notes: { 4: 'd4 abre el centro: las negras tienen menos espacio.' },
  },
  // ---------- NEGRAS vs 1.e4: Caro-Kann ----------
  {
    id: 'ck-advance', opening: 'Caro-Kann (negras)', name: 'Variante del avance', side: 'b',
    moves: ['e4', 'c6', 'd4', 'd5', 'e5', 'Bf5', 'Nf3', 'e6', 'Be2', 'c5', 'Be3', 'Nd7'],
    notes: { 5: 'Saca el alfil antes de jugar ...e6: la gran ventaja sobre la Francesa.', 9: '...c5 ataca la base de la cadena.' },
  },
  {
    id: 'ck-exchange', opening: 'Caro-Kann (negras)', name: 'Variante del cambio', side: 'b',
    moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'Bd3', 'Nc6', 'c3', 'Nf6', 'Bf4', 'Bg4', 'Qb3', 'Qd7'],
    notes: { 11: '...Bg4 desarrolla con tempo sobre f3.', 13: '...Qd7 defiende b7 y d5 a la vez.' },
  },
  {
    id: 'ck-classical', opening: 'Caro-Kann (negras)', name: 'Variante clásica', side: 'b',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5', 'Ng3', 'Bg6', 'h4', 'h6', 'Nf3', 'Nd7', 'h5', 'Bh7', 'Bd3', 'Bxd3', 'Qxd3', 'e6'],
    notes: { 7: '...Bf5 ataca al caballo y desarrolla el alfil problemático.', 11: '...h6 da aire al alfil antes de que h5 lo encierre.' },
  },
  {
    id: 'ck-twoknights', opening: 'Caro-Kann (negras)', name: 'Dos caballos', side: 'b',
    moves: ['e4', 'c6', 'Nc3', 'd5', 'Nf3', 'Bg4', 'h3', 'Bxf3', 'Qxf3', 'e6'],
    notes: { 5: '...Bg4 clava y prepara el cambio para jugar ...e6 sin encerrar el alfil.' },
  },
  {
    id: 'ck-panov', opening: 'Caro-Kann (negras)', name: 'Ataque Panov', side: 'b',
    moves: ['e4', 'c6', 'd4', 'd5', 'exd5', 'cxd5', 'c4', 'Nf6', 'Nc3', 'e6', 'Nf3', 'Be7', 'cxd5', 'Nxd5'],
    notes: { 9: '...e6 sólido; la estructura se parece a un Gambito de Dama.' },
  },
  // ---------- NEGRAS vs 1.d4: Eslava ----------
  {
    id: 'slav-main', opening: 'Eslava (negras)', name: 'Línea principal', side: 'b',
    moves: ['d4', 'd5', 'c4', 'c6', 'Nf3', 'Nf6', 'Nc3', 'dxc4', 'a4', 'Bf5', 'e3', 'e6', 'Bxc4', 'Bb4', 'O-O', 'O-O'],
    notes: { 3: '...c6 apoya d5 sin encerrar al alfil de c8.', 7: '...dxc4 obliga a a4, que debilita b4.' },
  },
  {
    id: 'slav-exchange', opening: 'Eslava (negras)', name: 'Variante del cambio', side: 'b',
    moves: ['d4', 'd5', 'c4', 'c6', 'cxd5', 'cxd5', 'Nc3', 'Nf6', 'Bf4', 'Nc6', 'e3', 'Bf5'],
    notes: { 11: '...Bf5 iguala: simetría y desarrollo natural.' },
  },
  {
    id: 'slav-london', opening: 'Eslava (negras)', name: 'Contra el Londres', side: 'b',
    moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'c3', 'Nc6', 'Nd2', 'e6', 'Ngf3', 'Bd6'],
    notes: { 5: '...c5 presiona d4 desde el principio.', 11: '...Bd6 reta al alfil de f4.' },
  },
]

export const OPENING_GROUPS = [...new Set(OPENING_LINES.map(l => l.opening))]

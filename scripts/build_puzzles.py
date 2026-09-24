import csv, json, random, collections
random.seed(42)
SRC = "/tmp/claude-0/-home-claude/e2de96d3-2f46-5dc1-8b49-44c8036612ee/scratchpad/puzzles_all.csv"
# temas que queremos cubrir y cuántos puzzles por tema
TARGET = {
 "mateIn1":320,"hangingPiece":320,"fork":320,"pin":300,"backRankMate":260,"skewer":260,
 "discoveredAttack":300,"mateIn2":320,"trappedPiece":260,"deflection":260,"attraction":220,
 "sacrifice":260,"doubleCheck":180,"advancedPawn":220,"promotion":180,"capturingDefender":220,
 "intermezzo":200,"defensiveMove":220,"quietMove":180,"mateIn3":220,"rookEndgame":260,
 "pawnEndgame":220,"queenEndgame":160,"bishopEndgame":140,"knightEndgame":140,
 "smotheredMate":120,"arabianMate":80,"anastasiaMate":80,"bodenMate":60,"hookMate":60,
 "doubleBishopMate":60,"dovetailMate":60,"zugzwang":120,"xRayAttack":140,"interference":120,
 "clearance":140,"exposedKing":200,"kingsideAttack":200,"queensideAttack":140,"attackingF2F7":140,
 "castling":80,"enPassant":60,"underPromotion":40,
}
by_theme = collections.defaultdict(list)
rows = {}
with open(SRC, newline="") as f:
    for r in csv.DictReader(f):
        rating = int(r["Rating"])
        if rating < 550 or rating > 1750: continue
        moves = r["Moves"].split()
        if len(moves) > 10: continue
        themes = r["Themes"].split()
        rows[r["PuzzleId"]] = (r["FEN"], moves, rating, themes)
        for t in themes:
            if t in TARGET: by_theme[t].append(r["PuzzleId"])
chosen = set()
for t, n in TARGET.items():
    ids = by_theme[t]
    # estratificar por bandas de rating para cubrir progresión
    bands = collections.defaultdict(list)
    for i in ids: bands[(rows[i][2]-550)//150].append(i)
    per = max(1, n // max(1,len(bands)))
    for b, lst in bands.items():
        random.shuffle(lst)
        chosen.update(lst[:per])
all_themes = sorted({t for i in chosen for t in rows[i][3]})
tidx = {t:i for i,t in enumerate(all_themes)}
out = []
for i in sorted(chosen, key=lambda k: rows[k][2]):
    fen, moves, rating, themes = rows[i]
    out.append([i, fen, " ".join(moves), rating, [tidx[t] for t in themes]])
json.dump({"themes": all_themes, "puzzles": out}, open("src/data/puzzles.json","w"), separators=(",",":"))
print(len(out), "puzzles;", len(all_themes), "themes")
cov = collections.Counter(t for p in out for t in [all_themes[j] for j in p[4]] if t in TARGET)
for t in TARGET: print(f"{t:20s} {cov[t]:5d} / wanted {TARGET[t]}  available {len(by_theme[t])}")

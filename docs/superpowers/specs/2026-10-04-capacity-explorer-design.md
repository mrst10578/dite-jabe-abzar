# Independent Flow capacity explorer

The user wants the existing capacity dataset to become a native Flow tool on a
separate URL, followed by a fixed snapshot of its source data. The route is
`/capacity/` on the existing `entekhab-reshte` Worker.

Visitors select experimental, mathematics, or humanities before entering the
explorer. Then they choose an alphabetically sorted major and one or more
universities from options that change with the major. Results show declared
capacity, by university, in descending year order: 1405 (coming soon), 1404,
1403, 1402, 1401. Missing historical data is explicitly missing, never zero.
Changing the major/group clears university selections and stale results.

The standalone page reuses Flow colors, artwork, and font. The homepage links
to it instead of embedding the tool. Keyboard-accessible university checkboxes,
search, select-all/clear, loading/retry, and a mobile scrollable table support
the flow. Expandable source rows explain totals, including course, gender,
intake, conditions, and source page. These are announced capacities, not counts
of actual accepted students.

Source of truth is `mrst10578/Entekhab-Reshte/data/capacity`, pinned to a full
Git commit. Use `normalized/<year>/capacities-all.csv` exactly once. Identify
groups from each constituent file's explicit booklet provenance, including
amendment-only records, and verify constituent rows against the final CSV as a
multiset. Chemistry has separate experimental and math source files.

The committed snapshot contains four original final CSVs, the source inventory
and summary, a catalog, lazy major shards with original row metadata, and a
manifest recording source commit/date, row/seat totals, and SHA-256 hashes.
No runtime GitHub credentials or private-repository requests are needed.
Only an explicit sync command refreshes it; ordinary builds verify it.

Tests cover CSV parsing, source classification, preservation of every row,
missing vs zero, exact totals, stale selection/network responses, group changes,
multi-university selection, failure/retry, Persian ordering, and separate-page
routing. Run the repository's full required checks and confirm live publication.

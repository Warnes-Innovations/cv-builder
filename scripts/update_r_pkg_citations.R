#!/usr/bin/env Rscript
# Copyright (C) 2026 Gregory R. Warnes
# SPDX-License-Identifier: AGPL-3.0-or-later
#
# This file is part of CV-Builder.
# For commercial licensing, contact greg@warnes-innovations.com
#
# update_r_pkg_citations.R
#
# Update R-package BibTeX entries in publications.bib using R's citation()
# function.  For each entry whose `note` contains "R package", this script:
#
#   1. Extracts the CRAN/Bioconductor package name from the URL or title.
#   2. Installs the package from CRAN, CRAN archive, or Bioconductor.
#   3. Calls citation(<pkg>) and converts the result to BibTeX.
#   4. Merges the citation data into the existing entry:
#        - doi      : added when missing
#        - author   : replaced when citation() has more co-authors
#        - year     : set to the EARLIER of existing and citation year
#        - note     : augmented with version string when available
#   5. Writes the updated bib file (with a .bak backup by default).
#
# Usage:
#   Rscript scripts/update_r_pkg_citations.R [--bib <path>] [--dry-run] [--no-backup] [--verbose]
#
# Defaults:
#   --bib    ~/src/CV/publications.bib

# ── CLI arguments ─────────────────────────────────────────────────────────────

args       <- commandArgs(trailingOnly = TRUE)
bib_path   <- path.expand("~/src/CV/publications.bib")
dry_run    <- FALSE
do_backup  <- TRUE
verbose    <- FALSE

i <- 1L
while (i <= length(args)) {
  switch(args[i],
    "--bib"       = { i <- i + 1L; bib_path <- args[i] },
    "--dry-run"   = { dry_run  <- TRUE },
    "--no-backup" = { do_backup <- FALSE },
    "--verbose"   = { verbose   <- TRUE },
    message("Unknown argument: ", args[i])
  )
  i <- i + 1L
}

cat(sprintf("Processing: %s\n", bib_path))

# ── Helpers ───────────────────────────────────────────────────────────────────

ensure_pkg <- function(pkg, bioc = FALSE) {
  if (requireNamespace(pkg, quietly = TRUE)) return(invisible(TRUE))
  message("  [install] ", pkg, if (bioc) " (Bioconductor)" else " (CRAN)")
  if (bioc) {
    if (!requireNamespace("BiocManager", quietly = TRUE))
      install.packages("BiocManager", quiet = TRUE, repos = "https://cloud.r-project.org")
    suppressMessages(
      BiocManager::install(pkg, ask = FALSE, update = FALSE, quiet = TRUE)
    )
  } else {
    install.packages(pkg, quiet = TRUE, repos = "https://cloud.r-project.org")
  }
  requireNamespace(pkg, quietly = TRUE)
}

ensure_pkg("httr")
ensure_pkg("jsonlite")

# ── BibTeX parser ─────────────────────────────────────────────────────────────
# Returns a list of entries; each entry is a list with:
#   $raw_text  – original text of the entry (for reconstruction)
#   $type      – e.g. "misc", "manual", "article"
#   $key       – citation key
#   $fields    – named list of field values (unbraced strings)

parse_bib_file <- function(path) {
  lines   <- readLines(path, warn = FALSE, encoding = "UTF-8")
  text    <- paste(lines, collapse = "\n")

  # Split into chunks: comments/whitespace between entries, and entries
  # An entry starts with @type{ and ends with the matching closing brace.
  chunks   <- list()
  pos      <- 1L
  nchar_t  <- nchar(text)

  while (pos <= nchar_t) {
    # Find next @
    at_pos <- regexpr("@", substr(text, pos, nchar_t), fixed = TRUE)
    if (at_pos == -1L) {
      # Remaining text is trailing comment/whitespace
      chunks <- c(chunks, list(list(is_entry = FALSE,
                                    raw_text  = substr(text, pos, nchar_t))))
      break
    }
    abs_at <- pos + at_pos - 1L

    # Text before @ is a comment chunk
    if (abs_at > pos) {
      chunks <- c(chunks, list(list(is_entry = FALSE,
                                    raw_text  = substr(text, pos, abs_at - 1L))))
    }

    # Find the opening brace
    open_brace <- regexpr("\\{", substr(text, abs_at, nchar_t))
    if (open_brace == -1L) {
      # Shouldn't happen in a valid bib file; swallow remainder
      chunks <- c(chunks, list(list(is_entry = FALSE,
                                    raw_text  = substr(text, abs_at, nchar_t))))
      break
    }
    abs_open <- abs_at + open_brace - 1L

    # Walk forward matching braces
    depth   <- 1L
    cur_pos <- abs_open + 1L
    while (cur_pos <= nchar_t && depth > 0L) {
      ch <- substr(text, cur_pos, cur_pos)
      if (ch == "{") depth <- depth + 1L
      if (ch == "}") depth <- depth - 1L
      cur_pos <- cur_pos + 1L
    }
    abs_close <- cur_pos - 1L  # position of final '}'

    entry_text <- substr(text, abs_at, abs_close)
    chunks <- c(chunks, list(list(is_entry  = TRUE,
                                  raw_text  = entry_text,
                                  type      = NA_character_,
                                  key       = NA_character_,
                                  fields    = list())))
    pos <- abs_close + 1L
  }

  # Parse each entry chunk
  for (ci in seq_along(chunks)) {
    if (!chunks[[ci]]$is_entry) next
    raw <- chunks[[ci]]$raw_text

    # Extract type and key
    hdr_m <- regmatches(raw, regexpr(
      "^@([A-Za-z]+)\\{([^,]+),", raw, perl = TRUE))
    if (length(hdr_m) == 0L) next
    type_key <- regmatches(hdr_m, gregexpr("[^@{,]+", hdr_m))[[1L]]
    type_key <- trimws(type_key[nchar(trimws(type_key)) > 0L])
    chunks[[ci]]$type <- tolower(type_key[1L])
    chunks[[ci]]$key  <- type_key[2L]

    # Extract fields: field_name = { ... } or field_name = "..."
    body <- sub("^@[A-Za-z]+\\{[^,]+,", "", raw)
    body <- sub("\\}\\s*$", "", body)

    # Tokenise fields
    fields <- list()
    remaining <- body
    while (nchar(trimws(remaining)) > 0L) {
      # Match: optional_whitespace field_name whitespace = whitespace {value} or "value"
      fm <- regexpr(
        "^[[:space:]]*([A-Za-z_]+)[[:space:]]*=[[:space:]]*", remaining, perl = TRUE)
      if (fm == -1L) break
      fname_m   <- regmatches(remaining, regexpr("[A-Za-z_]+", remaining))
      fname     <- fname_m[1L]
      after_eq  <- substr(remaining, fm + attr(fm, "match.length"), nchar(remaining))

      after_eq_t <- trimws(after_eq, "left")
      if (nchar(after_eq_t) == 0L) break

      first_ch <- substr(after_eq_t, 1L, 1L)
      if (first_ch == "{") {
        # Find matching closing brace
        depth    <- 1L
        cur      <- 2L
        n        <- nchar(after_eq_t)
        while (cur <= n && depth > 0L) {
          ch <- substr(after_eq_t, cur, cur)
          if (ch == "{") depth <- depth + 1L
          if (ch == "}") depth <- depth - 1L
          cur <- cur + 1L
        }
        fval      <- substr(after_eq_t, 2L, cur - 2L)
        remaining <- substr(after_eq_t, cur, nchar(after_eq_t))
        # Strip leading comma
        remaining <- sub("^[[:space:]]*,", "", remaining)
      } else if (first_ch == "\"") {
        end_q <- regexpr("[^\\\\]\"", substr(after_eq_t, 2L, nchar(after_eq_t)))
        if (end_q == -1L) break
        fval      <- substr(after_eq_t, 2L, end_q)
        remaining <- substr(after_eq_t, end_q + 2L, nchar(after_eq_t))
        remaining <- sub("^[[:space:]]*,", "", remaining)
      } else {
        # Bare value (e.g. a number)
        bv_m <- regexpr("^([^,}]+)", after_eq_t, perl = TRUE)
        if (bv_m == -1L) break
        fval      <- trimws(regmatches(after_eq_t, bv_m))
        remaining <- substr(after_eq_t, bv_m + attr(bv_m, "match.length"),
                            nchar(after_eq_t))
        remaining <- sub("^[[:space:]]*,", "", remaining)
      }
      fields[[fname]] <- fval
      remaining <- remaining
    }
    chunks[[ci]]$fields <- fields
  }
  chunks
}

# ── BibTeX serialiser ─────────────────────────────────────────────────────────
# Reconstruct a single entry from its structured form.

entry_to_text <- function(entry) {
  if (!entry$is_entry) return(entry$raw_text)
  header <- sprintf("@%s{%s,\n", entry$type, entry$key)
  fnames <- names(entry$fields)
  lines  <- vapply(fnames, function(f) {
    val <- entry$fields[[f]]
    # Use { } for all values to stay consistent with the original style
    sprintf("  %-10s = {%s}", f, val)
  }, character(1L))
  paste0(header, paste(lines, collapse = ",\n"), "\n}")
}

# ── Package-name extraction ───────────────────────────────────────────────────

extract_pkg_name <- function(fields) {
  # 1. From CRAN URL: package=NAME
  url <- fields[["url"]]
  if (!is.null(url)) {
    m <- regmatches(url, regexpr("(?i)package=([A-Za-z][A-Za-z0-9.]+)", url, perl = TRUE))
    if (length(m) > 0L && nchar(m) > 0L)
      return(sub("(?i)package=", "", m, perl = TRUE))
    # 2. From Bioconductor URL: html/NAME.html
    m2 <- regmatches(url, regexpr("html/([A-Za-z][A-Za-z0-9.]+)\\.html", url, perl = TRUE))
    if (length(m2) > 0L && nchar(m2) > 0L)
      return(sub("html/", "", sub("\\.html$", "", m2)))
  }
  # 3. From title: {NAME}: description  or  {NAME}
  title <- fields[["title"]]
  if (!is.null(title)) {
    m3 <- regmatches(title, regexpr("^\\{([A-Za-z][A-Za-z0-9.]+)\\}", title, perl = TRUE))
    if (length(m3) > 0L && nchar(m3) > 0L)
      return(gsub("[{}]", "", m3))
  }
  NULL
}

# ── CRAN archive helpers ──────────────────────────────────────────────────────

# Returns the URL of the most-recent archived tarball, or NULL.
get_archive_tarball_url <- function(pkg) {
  base_url <- sprintf("https://cran.r-project.org/src/contrib/Archive/%s/", pkg)
  resp <- tryCatch(httr::GET(base_url, httr::timeout(30)), error = function(e) NULL)
  if (is.null(resp) || httr::status_code(resp) != 200L) return(NULL)

  page <- httr::content(resp, as = "text", encoding = "UTF-8")
  # Find all .tar.gz links
  matches <- regmatches(page,
    gregexpr(sprintf('%s_[0-9][^"]+\\.tar\\.gz', pkg), page, perl = TRUE))[[1L]]
  if (length(matches) == 0L) return(NULL)

  latest <- sort(matches)[length(matches)]
  paste0("https://cran.r-project.org/src/contrib/Archive/", pkg, "/", latest)
}

# Fetches the DESCRIPTION file from an archived tarball without fully installing.
# Returns a named character vector of DESCRIPTION fields, or NULL.
get_description_from_archive <- function(pkg) {
  tarball_url <- get_archive_tarball_url(pkg)
  if (is.null(tarball_url)) return(NULL)

  tmp_tar <- tempfile(fileext = ".tar.gz")
  on.exit(unlink(tmp_tar), add = TRUE)

  dl <- tryCatch(
    utils::download.file(tarball_url, tmp_tar, quiet = TRUE, mode = "wb"),
    error = function(e) 1L
  )
  if (dl != 0L) return(NULL)

  tmp_dir <- tempfile()
  dir.create(tmp_dir)
  on.exit(unlink(tmp_dir, recursive = TRUE), add = TRUE)

  tryCatch(
    utils::untar(tmp_tar, files = file.path(pkg, "DESCRIPTION"),
                 exdir = tmp_dir),
    error = function(e) return(NULL)
  )

  desc_path <- file.path(tmp_dir, pkg, "DESCRIPTION")
  if (!file.exists(desc_path)) {
    # Some tarballs version-stamp the top-level dir: pkg_1.0/DESCRIPTION
    all_descs <- list.files(tmp_dir, pattern = "^DESCRIPTION$",
                            recursive = TRUE, full.names = TRUE)
    if (length(all_descs) == 0L) return(NULL)
    desc_path <- all_descs[1L]
  }

  dcf <- tryCatch(read.dcf(desc_path), error = function(e) NULL)
  if (is.null(dcf)) return(NULL)
  d <- as.character(dcf[1L, ])
  names(d) <- colnames(dcf)
  d
}

# ── citation() retrieval ──────────────────────────────────────────────────────

# Attempts to get a bibentry from citation() for a named R package.
# Tries (in order): already installed → CRAN → Bioconductor → CRAN archive.
# Returns a list with elements: bibtex (character vector from toBibtex()),
#   year, doi, authors_bibtex, pkg_version; or NULL on failure.
get_pkg_citation <- function(pkg) {
  attempt <- function() {
    if (!requireNamespace(pkg, quietly = TRUE)) return(NULL)
    cit <- tryCatch(citation(pkg), error = function(e) NULL)
    if (is.null(cit) || length(cit) == 0L) return(NULL)
    # Take the first (usually the package-level) citation
    ce  <- cit[[1L]]
    bib <- tryCatch(toBibtex(ce), error = function(e) NULL)

    year <- tryCatch(as.character(ce$year), error = function(e) NA_character_)
    doi  <- tryCatch(ce$doi, error = function(e) NULL)

    # Authors as BibTeX string
    auths <- tryCatch({
      a <- ce$author
      if (is.null(a)) return(NULL)
      paste(format(a, style = "latex"), collapse = " and ")
    }, error = function(e) NULL)

    # Installed version
    ver <- tryCatch(
      as.character(utils::packageVersion(pkg)),
      error = function(e) NULL
    )
    # Entry type from toBibtex() first line, e.g. "@Manual{" → "manual"
    entry_type <- tryCatch({
      tolower(sub("^@([A-Za-z]+)\\{.*", "\\1", bib[1L]))
    }, error = function(e) NULL)

    list(bibtex = bib, year = year, doi = doi,
         authors_bibtex = auths, pkg_version = ver,
         entry_type = entry_type)
  }

  # 1. Already installed?
  res <- attempt()
  if (!is.null(res)) return(res)

  # 2. Active CRAN
  avail <- tryCatch(rownames(utils::available.packages()), error = function(e) character(0L))
  if (pkg %in% avail) {
    tryCatch(
      install.packages(pkg, quiet = TRUE, repos = "https://cloud.r-project.org"),
      error = function(e) NULL
    )
    res <- attempt()
    if (!is.null(res)) return(res)
  }

  # 3. Bioconductor
  if (!requireNamespace("BiocManager", quietly = TRUE))
    tryCatch(
      install.packages("BiocManager", quiet = TRUE,
                       repos = "https://cloud.r-project.org"),
      error = function(e) NULL
    )
  if (requireNamespace("BiocManager", quietly = TRUE)) {
    tryCatch(
      suppressMessages(
        BiocManager::install(pkg, ask = FALSE, update = FALSE, quiet = TRUE)
      ),
      error = function(e) NULL
    )
    res <- attempt()
    if (!is.null(res)) return(res)
  }

  # 4. CRAN archive – install from tarball
  tarball_url <- get_archive_tarball_url(pkg)
  if (!is.null(tarball_url)) {
    message("  [archive] ", pkg, " <- ", basename(tarball_url))
    tryCatch(
      install.packages(tarball_url, repos = NULL, type = "source", quiet = TRUE),
      error = function(e) NULL
    )
    res <- attempt()
    if (!is.null(res)) {
      # Override version with the actual archived version (from tarball filename)
      ver_m <- sub(paste0("^.*_([0-9][0-9.]+)\\.tar\\.gz$"), "\\1",
                   basename(tarball_url))
      if (ver_m != basename(tarball_url))  # sub matched
        res$pkg_version <- ver_m
      return(res)
    }
  }

  NULL
}

# ── Fallback: build citation from DESCRIPTION ─────────────────────────────────
# Used when citation() cannot be obtained (compile errors on old source, etc.).
# archive_version: if the tarball was already located, pass its version string
#   so we don't have to rely on crandb's possibly-different version.

build_citation_from_description <- function(pkg, archive_version = NULL) {
  # Try crandb API first (works for current and archived packages)
  api_url <- sprintf("https://crandb.r-pkg.org/%s", pkg)
  resp    <- tryCatch(
    httr::GET(api_url, httr::timeout(30)),
    error = function(e) NULL
  )
  meta <- NULL
  if (!is.null(resp) && httr::status_code(resp) == 200L) {
    meta <- tryCatch(
      jsonlite::fromJSON(httr::content(resp, as = "text", encoding = "UTF-8"),
                         simplifyVector = FALSE),
      error = function(e) NULL
    )
  }

  # Alternatively parse DESCRIPTION from archive tarball
  if (is.null(meta)) {
    desc <- get_description_from_archive(pkg)
    if (is.null(desc)) return(NULL)
    meta <- as.list(desc)
    # Rename to crandb field names for uniform access
    if (!is.null(meta[["Date/Publication"]])) meta$date <- meta[["Date/Publication"]]
    if (!is.null(meta[["Date"]]))             meta$date <- meta[["Date"]]
  }

  year <- NULL
  if (!is.null(meta$date))
    year <- sub("^(\\d{4}).*", "\\1", as.character(meta$date))

  # Do NOT use the raw DESCRIPTION Author field – it is human-readable text
  # (often containing disclaimers) and is not a valid BibTeX author list.
  # Author merging is only performed when citation() returns proper bibentry authors.

  doi <- meta[["DOI"]] %||% sprintf("10.32614/CRAN.package.%s", pkg)

  # Prefer the version from the archived tarball filename when available
  version <- archive_version %||% meta[["Version"]]

  # Don't guess the entry type here — we couldn't run citation() so we don't
  # know whether the canonical reference is @Manual, @Article, @Book, etc.
  # Leave entry_type = NULL so merge_citation preserves the existing type.
  list(bibtex = NULL, year = year, doi = doi,
       authors_bibtex = NULL, pkg_version = version,
       entry_type = NULL)
}

`%||%` <- function(a, b) if (!is.null(a) && length(a) > 0L && !is.na(a[1L])) a else b

# ── Author-count helper ───────────────────────────────────────────────────────

count_authors <- function(bib_author_str) {
  if (is.null(bib_author_str) || nchar(trimws(bib_author_str)) == 0L) return(0L)
  length(strsplit(bib_author_str, " and ", fixed = TRUE)[[1L]])
}

# ── Merge citation into a bib entry ──────────────────────────────────────────

merge_citation <- function(entry, cit) {
  f <- entry$fields

  # year: take the earlier
  if (!is.null(cit$year) && !is.na(cit$year)) {
    existing_yr <- suppressWarnings(as.integer(f[["year"]]))
    cit_yr      <- suppressWarnings(as.integer(cit$year))
    if (!is.na(cit_yr)) {
      new_yr      <- min(c(existing_yr, cit_yr), na.rm = TRUE)
      f[["year"]] <- as.character(new_yr)
    }
  }

  # doi: add if missing
  if ((is.null(f[["doi"]]) || nchar(trimws(f[["doi"]])) == 0L) &&
      !is.null(cit$doi) && nchar(trimws(cit$doi)) > 0L) {
    f[["doi"]] <- trimws(cit$doi)
  }

  # author: use citation() authors if they have MORE listed authors
  if (!is.null(cit$authors_bibtex) && nchar(trimws(cit$authors_bibtex)) > 0L) {
    if (count_authors(cit$authors_bibtex) > count_authors(f[["author"]])) {
      f[["author"]] <- cit$authors_bibtex
    }
  }

  # note: append version info when available and not already present
  if (!is.null(cit$pkg_version)) {
    ver_str <- paste0("version ", cit$pkg_version)
    existing_note <- f[["note"]] %||% ""
    if (!grepl("version", existing_note, ignore.case = TRUE)) {
      f[["note"]] <- trimws(paste0(
        if (nchar(existing_note) > 0L) paste0(existing_note, "; ") else "",
        ver_str
      ))
    }
  }

  # entry type: upgrade misc → more specific type from citation() (never downgrade)
  if (!is.null(cit$entry_type) && nchar(cit$entry_type) > 0L &&
      identical(entry$type, "misc")) {
    entry$type <- cit$entry_type
  }

  entry$fields <- f
  entry
}

# ── Diff printer ─────────────────────────────────────────────────────────────

print_diff <- function(old_fields, new_fields) {
  all_names <- union(names(old_fields), names(new_fields))
  for (fn in all_names) {
    ov <- old_fields[[fn]] %||% "<absent>"
    nv <- new_fields[[fn]] %||% "<absent>"
    if (!identical(ov, nv)) {
      cat(sprintf("    %-10s: %s\n               → %s\n",
                  fn,
                  strtrim(ov, 80L),
                  strtrim(nv, 80L)))
    }
  }
}

# ── Main ──────────────────────────────────────────────────────────────────────

chunks <- parse_bib_file(bib_path)

changed   <- 0L
processed <- 0L

for (ci in seq_along(chunks)) {
  ch <- chunks[[ci]]
  if (!ch$is_entry) next

  f <- ch$fields
  note <- tolower(f[["note"]] %||% "")
  if (!grepl("r package", note)) next

  pkg <- extract_pkg_name(f)
  if (is.null(pkg)) {
    message("  [skip] Cannot determine package name for: ", ch$key)
    next
  }

  processed <- processed + 1L
  cat(sprintf("\n[%s] package: %s\n", ch$key, pkg))

  cit <- get_pkg_citation(pkg)

  if (is.null(cit)) {
    # Try to extract version from CRAN archive tarball name for the fallback
    archive_ver <- tryCatch({
      tu <- get_archive_tarball_url(pkg)
      if (is.null(tu)) NULL else {
        m <- sub(paste0("^.*_([0-9][0-9.]+)\\.tar\\.gz$"), "\\1",
                 basename(tu))
        if (m != basename(tu)) m else NULL
      }
    }, error = function(e) NULL)
    cat("  citation() unavailable \u2013 trying DESCRIPTION fallback\n")
    cit <- build_citation_from_description(pkg, archive_version = archive_ver)
  }

  if (is.null(cit)) {
    cat("  No citation data found; skipping\n")
    next
  }

  old_fields <- ch$fields
  old_type   <- ch$type
  updated    <- merge_citation(ch, cit)

  if (!identical(old_fields, updated$fields) || !identical(old_type, updated$type)) {
    changed <- changed + 1L
    cat("  Changes:\n")
    if (!identical(old_type, updated$type))
      cat(sprintf("    %-10s: @%s\n               → @%s\n", "type", old_type, updated$type))
    print_diff(old_fields, updated$fields)
    chunks[[ci]] <- updated
  } else {
    if (verbose) cat("  No changes\n")
  }
}

cat(sprintf("\nSummary: %d package(s) processed, %d updated.\n",
            processed, changed))

if (changed == 0L) {
  cat("Nothing to write.\n")
  quit(status = 0L)
}

if (dry_run) {
  cat("[dry-run] No files written.\n")
  quit(status = 0L)
}

# Backup
if (do_backup) {
  bak_path <- paste0(bib_path, ".bak")
  file.copy(bib_path, bak_path, overwrite = TRUE)
  cat(sprintf("Backup written to: %s\n", bak_path))
}

# Reconstruct file text
out_text <- paste(vapply(chunks, function(ch) {
  if (!ch$is_entry) return(ch$raw_text)
  entry_to_text(ch)
}, character(1L)), collapse = "")

writeLines(out_text, bib_path, useBytes = TRUE)
cat(sprintf("Written: %s\n", bib_path))

# Vimblocks

Vim-style modal editing for [Logseq](https://logseq.com) DB graphs.

Vimblocks gives Logseq a normal mode: motions, counts, composable operators,
text objects, registers, repeat, visual mode, and rendered-view search — over
blocks rather than lines.

---

## Scope — read this first

Vimblocks is deliberately narrow. It supports:

| | |
|---|---|
| **Logseq** | 2.0.1 desktop, **DB graphs only** |
| **Verified on** | macOS |
| **File / Markdown graphs** | **Not supported.** DB properties only; no `property::`, no `TODO`/`SCHEDULED` syntax |
| **Logseq web** | **Not supported.** The modal engine injects a script into the desktop host document |
| **Keyboard layouts** | QWERTY. See [Known limitations](#known-limitations) |

It is an `effect: true` plugin, which means it runs unsandboxed and installs a
key listener on Logseq's own window. That is what makes multi-key Vim chords
possible, and it is also why the escape hatches below exist.

---

## Escape hatches

Vimblocks captures keys. If it ever gets stuck — normal mode won't exit, or
keys stop reaching Logseq — any of these gets your keyboard back:

| | |
|---|---|
| **Ctrl + Alt + Shift + V** | Panic chord. Immediately shuts key capture down. Hardcoded, never captured, works even when everything else is being swallowed. |
| **Command palette → "Vimblocks: Disable key capture"** | Same thing, from the palette. Palette shortcuts use modifiers, which are never captured. |
| **Reload the plugin** | Plugins dashboard → toggle Vimblocks off and on. |

After a panic-stop, reload the plugin to re-enable Vim mode.

---

## Install

Vimblocks is not yet in the Logseq Marketplace.

1. Download `vimblocks-<version>.zip` from
   [Releases](https://github.com/TaylorFinklea/vimblocks/releases).
2. Extract it somewhere permanent. **Keep the folder named `vimblocks`.**
   Logseq identifies a plugin *and its settings* by the folder name, so
   renaming it — or using a version-numbered folder — resets your
   configuration.
3. In Logseq: command palette → **Go to plugins dashboard** → **Load unpacked
   plugin** → select the `vimblocks` folder.

To upgrade, replace the folder's contents in place, keeping the same name.

### Build from source

```bash
pnpm install
pnpm check && pnpm test
pnpm package        # -> release/vimblocks-<version>.zip
```

---

## Modes

| Mode | Enter | Notes |
|---|---|---|
| **Normal** | `Esc` from a block editor | The cursor is a highlight, not a caret. A second `Esc` is idempotent. |
| **Insert** | `i` `I` `a` `A` `o` `O` | This is Logseq's own editor. |
| **Visual** | `v` | Characterwise. |
| **Visual line** | `V` | Whole block, plus its subtree for linewise operators. |
| **Command** | `mod+alt+;` | Ex-style `:` bar — inherited, see [below](#inherited-from-upstream). |

### Boundary profiles

Blocks are not lines, so Vimblocks lets you choose what a "line" means at block
boundaries. Both profiles share one engine; only boundary resolution differs,
and the choice persists across reloads.

| Profile | Behaviour |
|---|---|
| **Logseq-first** *(default)* | Character and word motions stay inside a block. Operators stop at block boundaries. Crossing blocks is explicit: `j`/`k`, `V`, counted linewise operators. |
| **Vim-first** | The rendered block stream reads as one buffer. Word motions, operator ranges, and characterwise visual may cross block boundaries; `j`/`k` preserve the preferred column. |

Change it in Logseq's Vimblocks settings.

---

## Commands

Counts work on motions, operators, and linewise actions, and multiply the way
Vim does — `2d3w` covers six word motions.

### Motions

| Key | Action |
|---|---|
| `h` `j` `k` `l` | Left / down / up / right |
| `w` `b` `e` | Word forward / back / end |
| `0` `^` `$` | Line start / first non-blank / line end |
| `gg` `G` | First / last rendered block |
| `Ctrl-U` `Ctrl-D` | Half viewport up / down |
| `J` `K` | Next / previous sibling block |
| `f` `F` `t` `T` | Find / till character, forward and back |
| `;` `,` | Repeat character search, forward and reverse |

### Operators and text objects

Composable: `c`, `d`, `y` combine with `iw`, `aw`, `w`, `e`, `$`.

| Key | Action |
|---|---|
| `ciw` `diw` `yiw` | Inner word |
| `caw` `daw` `yaw` | A word, with adjacent whitespace |
| `cw` `dw` `yw` | Through next word start |
| `ce` `de` `ye` | Through word end |
| `c$` `d$` `y$` | To line end (`C`, `D` aliases) |
| `cc` / `S` | Change whole block |
| `x` `X` | Cut character / word |
| `r` | Replace character |

### Blocks and registers

| Key | Action |
|---|---|
| `dd` `dj` `dk` | Delete block / with next / with previous sibling |
| `dc` | Delete block content and edit |
| `yy` | Yank block content |
| `p` `P` | Put below / above |
| `Y` | Copy block reference |
| `>` `<` | Indent / outdent |
| `zc` `zC` `zo` `zO` | Collapse / expand, recursive with shift |
| `L` `H` | Zoom into / out of block |

Linewise yank, delete, and put operate on a block **plus its whole subtree**,
preserving hierarchy and sibling order.

### Repeat, history, search

| Key | Action |
|---|---|
| `.` | Repeat last change |
| `u` `Ctrl-R` | Undo / redo |
| `/` `n` `N` | Search, next, previous |
| `s q` | Clear search highlights |

`.` is deterministic for a single contiguous edit: it replays the net content
change, not your keystrokes.

### Other

| Key | Action |
|---|---|
| `Ctrl-A` `Ctrl-X` | Increment / decrement number |
| `mod+shift+u`, `gU`, `gu` | Toggle / upper / lower case |
| `mod+alt+j` | Join next line |
| `mod+shift+enter` | Jump into block reference |

---

## Extra features

Two commands beyond the Vim surface, both DB-native:

- **`Vimblocks: Capture DB task`** (`ctrl+shift+t`) — natural-language task
  capture. `write the thing tom at 8 p1` creates a task with status `Todo`,
  priority `Urgent`, scheduled tomorrow at 08:00. `due` sets a Deadline instead
  of a Scheduled date. Everything is written as real Logseq DB properties, with
  a preview before it commits.
- **`Open selected PDF inline`** (`mod+alt+p`) — opens the PDF referenced by
  the selected block in Logseq's viewer, including `file://` links, which are
  not otherwise keyboard-reachable.

## Settings

Logseq → Settings → Vimblocks:

| Setting | Default |
|---|---|
| Boundary profile | `logseq-first` |
| Cursor colour | `#ffff00` |
| DB task capture shortcut | `ctrl+shift+t` (blank = palette only) |
| PDF shortcut | `mod+alt+p` (blank = palette only) |

Every keybinding is remappable, and individually disableable, from the
Vimblocks key-bindings dialog.

---

## Known limitations

- **Non-QWERTY keyboard layouts are not supported.** Keys are identified by
  physical position, so on AZERTY or Dvorak the wrong commands fire. Tracked
  for a future release.
- **Not implemented:** macros, named registers, blockwise visual (`Ctrl-V`),
  `%`, `{`/`}`.
- A mid-sequence failure during a multi-block delete may leave the operation
  ungrouped for a single `u`; Logseq's own per-step undo still covers it.

### Inherited from upstream

These come from the plugin Vimblocks forked and are **retained but not covered
by its tests or verification**. They work as well as they did upstream; treat
them as experimental here:

- The Ex-style `:` command bar (`mod+alt+;`) and its commands — `:s/`, `:%s/`,
  `:go`, `:marks`, `:sort`, `:bg`, `:lorem`, `:emoji`, `:copy-path`,
  `:open-in-vscode`, and others.
- Marks: `m`, `M`, `'`, `"`, `mod+'`, `mod+shift+'`, and the marks dashboard.
- Emoji picker (`mod+/`) and block background colours.
- Web searches: `s b` Baidu, `s h` GitHub, `s g` Google, `s s` StackOverflow,
  `s e` Wikipedia, `s y` YouTube.

---

## Credits

Vimblocks is a fork of
[vipzhicheng/logseq-plugin-vim-shortcuts](https://github.com/vipzhicheng/logseq-plugin-vim-shortcuts)
at commit `d79d266`, rewritten for Logseq DB graphs. The original plugin's
modal foundation, settings UI, marks, and command bar are that author's work.

If you find Vimblocks useful, consider supporting the upstream author, whose
plugin this is built on: [Buy Me a
Coffee](https://www.buymeacoffee.com/vipzhicheng) ·
[爱发电](https://afdian.com/a/vipzhicheng).

## License

Vimblocks is [AGPL-3.0-only](LICENSE), matching Logseq itself.

The upstream project is MIT licensed; its notice is preserved verbatim in
[UPSTREAM-LICENSE-MIT](UPSTREAM-LICENSE-MIT). Vimblocks' modifications and the
combined distribution are released under the AGPL.

## Contributing

Issues and pull requests welcome at
[TaylorFinklea/vimblocks](https://github.com/TaylorFinklea/vimblocks).

```bash
pnpm check && pnpm test && pnpm package
```

Please include a test with behaviour changes. The host bridge in particular is
the part that can break someone else's Logseq, so it is covered heavily.

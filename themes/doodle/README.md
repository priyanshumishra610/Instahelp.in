# Doodle Theme - copy-paste package

Self-contained folder. Copy **`doodle/`** anywhere and use it.

## Folder structure

```
doodle/
├── README.md                 ← you are here
├── example.html              ← open this to preview (no other files needed)
├── css/
│   └── doodle.css            ← all styles (theme + hero form + utilities)
├── js/
│   └── doodle.js             ← floating stars & strings
├── snippets/
│   └── install.html          ← copy-paste into your pages
└── reference/
    ├── README.md
    └── instahelp-index-doodle.html   ← InstaHelp homepage markup (reference)
```

## Quick start

### 1. Preview (inside this folder)

Open `example.html` in a browser, or:

```bash
cd doodle && python3 -m http.server 8080
# visit http://localhost:8080/example.html
```

### 2. Use in another project

Copy the whole `doodle` folder into your project, then add to any page:

```html
<link rel="stylesheet" href="doodle/css/doodle.css">
<body class="doodle-page">
  ...
  <script src="doodle/js/doodle.js" defer></script>
</body>
```

Change `doodle/` to match where you put the folder.

### 3. InstaHelp site (this repo)

From site root:

```html
<link rel="stylesheet" href="themes/doodle/css/doodle.css">
<body class="doodle-page">
<script src="themes/doodle/js/doodle.js" defer></script>
```

Also link `style.css` for full homepage layout. See `reference/instahelp-index-doodle.html` for markup.

## Utility classes

On any element inside `body.doodle-page`:

| Class | Use |
|-------|-----|
| `.doodle-card` | Paper card with sketch border |
| `.doodle-panel` | Larger panel |
| `.doodle-btn` | Primary button |
| `.doodle-btn-secondary` | Teal button |
| `.doodle-input` / `.doodle-textarea` | Form fields |
| `.doodle-tag` | Chip / pill |
| `.doodle-kicker` | Eyebrow badge |
| `.doodle-heading` | Section title |
| `.doodle-section` | Section with corner star |

## Hero form (InstaHelp)

Uses classes: `hero-form-scene`, `hero-form-deco`, `hero-form-doodle`.  
Full HTML is in `reference/instahelp-index-doodle.html`.

## Disable decorations only

Omit `js/doodle.js` - CSS still works.

## CSS variables

Override on `.doodle-page`:

`--doodle-ink`, `--doodle-paper`, `--doodle-primary`, `--doodle-accent`, etc.

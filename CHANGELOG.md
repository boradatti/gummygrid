# gummygrid

## 2.0.0-next.1

### Minor Changes

- 2b715ea: - allow choosing btw "portable" and "web" output formats for SVGs ("portable" is default, better fit when there's a need for rendering the svg in a non-browser environment, e.g. with the sharp library)
  - allow setting custom svg output size

## 2.0.0-next.0

### Major Changes

- added qr code generator functionality (will only produce scannable codes w/ gutter: 0)

## 1.0.1

### Patch Changes

- bd04538: added readme

## 1.0.0

### Major Changes

- 2e00e54: `SVG.writeFile` (async, runs on server) and `SVG.downloadFile` (sync, runs in browser) are now separate methods

## 0.2.1

### Patch Changes

- fa558e6: grid now clears before each build and returns the SVG object + SVG type is now available to import

## 0.2.0

### Minor Changes

- 1dc8c68: some minor additions:
  - `GummyGridConfig` and `SVGColor` types now available to import
  - `GummyGridConfig` now with recursively optional fields

## 0.1.0

### Minor Changes

- 1f7d9aa: initial release

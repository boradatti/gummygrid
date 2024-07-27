## GummyGrid

![examples](https://github.com/user-attachments/assets/2f0b080a-4415-4c9f-b0c9-9cb39d264db8)

A cool little avatar generator that you can customize to your own liking, with settings like grid dimensions, colors, cell rounding, and more.

### How to use

Start by installing the library:

```
npm install gummygrid
```

```
yarn add gummygrid
```

```
pnpm add gummygrid
```

Next, import and initialize `GummyGrid`, building an avatar from a string like so:

```javascript
import GummyGrid from 'gummygrid';

const gg = new GummyGrid();

const svg = gg.buildFrom('jarvis');

// 👇🏻 some helpful methods

// converting to string
const rawSvgString = svg.toString();
const urlEncodedString = svg.toUrlEncodedString({ withPrefix: true });

// writing to a file on the server
svg.writeFile('./avatar.svg').then(() => {
  console.log('✅ wrote to file');
});

// downloading a file in the browser
svg.downloadFile('avatar.svg');

// converting to other object types
const blob = svg.toBlob();
const buffer = svg.toBuffer();
```

The resulting avatar:

<img src="https://github.com/user-attachments/assets/6835a0c9-455e-4f5f-a337-0e1cee46614c" width="200" alt="example"></img>

### Customization

The default settings are a little boring – let's start by changing the grid size. We can either set a single number (e.g. `size: 10`), or specify separate lengths for rows and columns:

```javascript
const gg = new GummyGrid({
  grid: {
    size: {
      rows: 8,
      columns: 7,
    },
  },
});
```

Result 👇🏻

<img src="https://github.com/user-attachments/assets/35409d49-1269-41e6-bd20-0d27b4216734" width="200" alt="example"></img>

Now let's customize the cells themselves.

Let's say we want a fixed background color and two possible colors for the cells, with darker shades on the cell outlines and shadows. We can achieve this by specifying four arrays of colors and then locking some of them together, so that they aren't picked independently.

Also, let's give the cells some rounding on the outside, as well as in places where filled cells form corners.

```javascript
const gg = new GummyGrid({
  grid: {
    size: {
      rows: 8,
      columns: 7,
    },
  },
  svg: {
    colors: {
      background: ['hsl(216, 28%, 7%)'],
      cellFill: ['hsl(92, 100%, 54%)', 'hsl(211, 100%, 54%)'],
      cellStroke: ['hsl(92, 100%, 20%)', 'hsl(211, 100%, 21%)'],
      dropShadow: ['hsl(92, 100%, 21%)', 'hsl(211, 100%, 21%)'],
    },
    lockColors: ['cellFill', 'cellStroke', 'dropShadow'],
    strokeWidth: 2,
    filters: {
      dropShadow: ['0', '0', '1px'],
    },
    cellRounding: {
      outer: 0.75, // around a filled cell
      inner: 0.25, // where two filled cells form an in-corner
    },
  },
});
```

Result 👇🏻

<img src="https://github.com/user-attachments/assets/834b992d-ccd2-4e22-81a2-d8e2be64c480" width="170" alt="example"></img>

### All configuration options:

##### Grid config

- `size` – number of cells in the grid;
- `verticalSymmetry` – makes the grid vertically symmetrical;
- `ensureFill` – ensures some edge cells are filled to create a sense of balance;

##### SVG config

- `patternAreaRatio` – amount of image space taken up by the grid pattern;
- `colors` – arrays of colors to choose from. The object values can either be strings describing a plain color, or objects describing a gradient;
- `lockColors` – an array describing which colors should be locked together. E.g., with `lockColors: ['cellFill', 'cellStroke']`, if color #2 is picked from `colors.cellFill`, then color #2 will also be picked from `colors.cellStroke`;
- `strokeWidth` – outline thickness;
- `cellRounding` – border radius. `outer` describes the rounding around a filled cell, while `inner` describes the rounding on the in-corners formed by filled cells
- `filters` – applies [CSS filters](https://developer.mozilla.org/en-US/docs/Web/CSS/filter) to grid pattern;
- `gutter` – spacing between filled cells;
- `flow` – only applies `cellRounding.outer` to parts of a cell that aren't touching any other cell (`true` by default);
- `paintOrder` – SVG attribute (see [mdn entry](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/paint-order));
- `strokeLineJoin` – SVG attribute (see [mdn entry](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin));

##### Randomizer config

- `salt` – pre-determines how a grid is generated. With an otherwise unchanged config, changing the salt will change the resulting grid layout;
- `bias.cellFillProbability` – determines how likely a cell is to be filled. Setting to 1 will result in all cells getting filled, while setting to 0 will result in an empty grid, unless either of the `grid.ensureFill` options is enabled;
- `bias.colorWeights` – arrays of weights that describe how likely a given color is be pe picked.

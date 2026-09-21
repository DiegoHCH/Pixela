import type es from './es'

const en: typeof es = {
  'app.name': 'Pixela',
  'app.tagline': 'from picture to pattern',

  'bar.open': 'Open image',
  'bar.cancel': 'Cancel',
  'bar.convert': 'Convert to pattern',
  'bar.back': 'Back to the crop',
  'bar.noFile': 'No pattern',
  'bar.export': 'Export PNG',
  'bar.exportBoard': 'Export board {n}',
  'bar.exporting': 'Exporting…',

  'empty.title': 'Drag an image here',
  'empty.body': 'PNG, JPG or GIF. It is converted inside your browser: the image never leaves this machine.',
  'drop.title': 'Drop it here',
  'drop.hint': 'Drop to convert',

  'stage.crop': 'Crop',
  'stage.handles': 'drag the corners',
  'stage.shape': '{x} × {y} boards',
  'stage.pattern': 'Pattern',
  'stage.isolated': 'Isolated',
  'stage.size': '{cols} × {rows}',
  'stage.boardsMeta': '{n} boards · {x} × {y}',
  'stage.colors': '{n} colours',
  'stage.board': 'Board {n}',

  'strip.title': 'Boards',
  'strip.meta': '{n} boards of {cols} × {rows}',
  'strip.hint': 'Tap one to see it on its own.',

  'box.title': 'Bead box',
  'box.colors': '{n} colours',
  'box.total': 'beads in total',
  'box.isolatedUnit': 'beads of this colour',
  'box.factory': 'Artkal {code}, the closest in the catalogue (deltaE {delta}). For buying, not for matching.',
  'box.hint': 'Tap a compartment to isolate that colour.',
  'box.hint.again': 'Tap it again to see the whole pattern.',

  'rail.measure': 'Measure in',
  'rail.measure.boards': 'Boards',
  'rail.measure.beads': 'Beads',
  'rail.shape': 'How many boards',
  'rail.shape.readout': '{x} × {y} boards · {cols} × {rows} beads',
  'rail.owned': 'you have {n} boards',
  'rail.size': 'Size in beads',
  'rail.size.cols': 'Width',
  'rail.size.rows': 'Height',
  'rail.batches': 'Batches',
  'rail.batches.one.title': 'It fits in one go.',
  'rail.batches.one.body': "It's {boards} boards and you have {owned}: lay it out, iron it, done.",
  'rail.batches.many.title': '{n} batches.',
  'rail.batches.many.body':
    'With {owned} boards you have to iron and unmould before starting the next one.',
  'rail.cost': 'Cost',
  'rail.cost.beads': 'Beads',
  'rail.cost.colors': 'Colours',
  'rail.origin': 'Source',
  'rail.color': 'Colour',
  'rail.image': 'Image',
  'rail.mode.average': 'Average',
  'rail.mode.point': 'Direct',
  'rail.detail.title': 'At this size the drawing is lost.',
  'rail.detail.body':
    'It is flat-shaded artwork, and in {cells} beads the features do not read. More boards and it becomes recognisable.',
  'rail.dither': 'Dithering',
  'rail.maxColors': 'Colour cap',
  'rail.maxColors.none': 'no cap',

  'preview.title': 'Preview',
  'preview.live': 'live',
  'preview.note':
    'The pattern is recomputed as you move the crop, so you choose the framing looking at beads and not at pixels.',
  'preview.total': 'beads',

  'error.type.title': 'That file is not an image',
  'error.type.body': 'Try a PNG, a JPG or a GIF.',
  'error.decode.title': 'The image could not be read',
  'error.decode.body': 'It may be damaged, or in a format this browser does not open.',
  'error.export.title': 'The export failed',
  'error.export.body': 'The pattern is untouched; give it another go.',
  'error.dismiss': 'Got it',

  'theme.day': 'Day',
  'theme.night': 'Night',
  'theme.system': 'Follow the system',
  'lang.label': 'Language',
}

export default en

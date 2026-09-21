import type es from './es'

const en: typeof es = {
  'app.name': 'Pixela',
  'app.tagline': 'from picture to pattern',

  'bar.open': 'Open image',
  'bar.cancel': 'Cancel',
  'bar.convert': 'Convert to pattern',
  'bar.noFile': 'No pattern',

  'empty.title': 'Drag an image here',
  'empty.body': 'PNG, JPG or GIF. It is converted inside your browser: the image never leaves this machine.',
  'drop.title': 'Drop it here',
  'drop.hint': 'Drop to convert',

  'stage.crop': 'Crop',
  'stage.handles': 'drag the corners',
  'stage.shape': '{x} × {y} boards',

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

  'preview.title': 'Preview',
  'preview.live': 'live',
  'preview.note':
    'The pattern is recomputed as you move the crop, so you choose the framing looking at beads and not at pixels.',
  'preview.total': 'beads',

  'error.type.title': 'That file is not an image',
  'error.type.body': 'Try a PNG, a JPG or a GIF.',
  'error.decode.title': 'The image could not be read',
  'error.decode.body': 'It may be damaged, or in a format this browser does not open.',
  'error.dismiss': 'Got it',

  'theme.day': 'Day',
  'theme.night': 'Night',
  'theme.system': 'Follow the system',
  'lang.label': 'Language',
}

export default en

import external from './externalModules.js';
import calculateReferenceLine from './calculateReferenceLine.js';

/**
 * Renders the active reference line.
 *
 * @export @public @method
 * @name renderActiveReferenceLine
 * @param  {Object} context        The canvas context.
 * @param  {Object} targetElement      The data associated with the event.
 * @param  {Object} targetImagePlane    The element on which to render the reference line.
 * @param  {Object} referenceImagePlane
 * @param  {Object} [options={}]
 */
export default function(context, targetElement, targetImagePlane, referenceImagePlane, options = {}) {
  const draw = external.cornerstoneTools.import('drawing/draw');
  const drawLine = external.cornerstoneTools.import('drawing/drawLine');
  const convertToVector3 = external.cornerstoneTools.version[0] === '3' ?
    external.cornerstoneTools.import('util/convertToVectro3') :
    external.cornerstoneTools.import('util/convertToVector3');

  // Target
  const tRowCosines = convertToVector3(targetImagePlane.rowCosines);
  const tColCosines = convertToVector3(targetImagePlane.columnCosines);

  // Reference
  const rRowCosines = convertToVector3(referenceImagePlane.rowCosines);
  const rColCosines = convertToVector3(referenceImagePlane.columnCosines);

  // The image plane normals must be > 30 degrees apart
  const targetNormal = tRowCosines
    .clone()
    .cross(tColCosines);
  const referenceNormal = rRowCosines
    .clone()
    .cross(rColCosines);
  let angleInRadians = targetNormal.angleTo(referenceNormal);

  angleInRadians = Math.abs(angleInRadians);
  if (angleInRadians < 0.5) {
    const angleInDegrees = angleInRadians * (180 / Math.PI)
    console.warn(`${angleInDegrees} angle is to small for reference lines.`)

    return;
  }

  const referenceLine = calculateReferenceLine(
    targetImagePlane,
    referenceImagePlane
  );

  if (!referenceLine) {
    return;
  }

  const color = options.color || external.cornerstoneTools.toolColors.getActiveColor();

  // Draw the referenceLines
  context.setTransform(1, 0, 0, 1, 0, 0);

  draw(context, context => {
    drawLine(
      context,
      targetElement,
      referenceLine.start,
      referenceLine.end,
      {
        color,
        lineWidth: 2
      }
    );
  });
}

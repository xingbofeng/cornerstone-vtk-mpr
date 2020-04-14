import external from './externalModules.js';
import getImageIdFromStackByIppCross from './getImageIdFromStackByIppCross.js';
import appState from './appState.js';
import { vec3 } from 'gl-matrix';

export default function getMprMouseWheelTool() {
    const BaseTool = external.cornerstoneTools.import('base/BaseTool');

    function _updateAllMprEnabledElements(originElement) {
        const elementsGroup = appState.getSeriesElementsGroupByElement(originElement);
        if (elementsGroup) {
            Object.values(elementsGroup).forEach(refElement => {
                const refImage = external.cornerstone.getImage(refElement)

                if (refImage && refImage.imageId.includes('mpr')) {
                    external.cornerstone.updateImage(refElement);
                }
            });
        }
    }
    return class MprMouseWheelTool extends BaseTool {
        constructor(configuration = {}) {
            const defaultConfig = {
                name: 'MprMouseWheel',
                supportedInteractionTypes: ['MouseWheel'],
            };
            const initialConfiguration = Object.assign(defaultConfig, configuration);

            super(initialConfiguration);

            this.initialConfiguration = initialConfiguration;
        }

        mouseWheelCallback(evt) {
            const { direction: images, element } = evt.detail;
            const { invert } = this.configuration;
            const direction = invert ? -images : images;
            const dir = direction > 0 ? 1 : -1;

            const image = external.cornerstone.getImage(element);
            // 针对非mpr的element，执行stackScrollMouseWheelTool的mouseWheelCallback
            if (!image.imageId.includes('mpr')) {
                const stackScrollMouseWheelTool = external.cornerstoneTools.getToolForElement(element, 'StackScrollMouseWheel');
                if (stackScrollMouseWheelTool && stackScrollMouseWheelTool.mouseWheelCallback) {
                    stackScrollMouseWheelTool.mouseWheelCallback(evt);
                }
                return;
            }
            const imagePlane = external.cornerstone.metaData.get('imagePlaneModule', image.imageId);

            const stepSize = imagePlane.sliceThickness;
            const iop = imagePlane.imageOrientationPatient;
            const rowCosines = vec3.fromValues(iop[0], iop[1], iop[2]);
            const colCosines = vec3.fromValues(iop[3], iop[4], iop[5]);
            let zedCosines = vec3.create();

            vec3.cross(zedCosines, rowCosines, colCosines)

            let ipp = imagePlane.imagePositionPatient.slice();
            const dx = (zedCosines[0] * stepSize * dir);
            const dy = (zedCosines[1] * stepSize * dir);
            const dz = (zedCosines[2] * stepSize * dir);

            ipp[0] += dx;
            ipp[1] += dy;
            ipp[2] += dz;

            // // 校验当前Mpr Element 的xyz坐标是否越界
            // if (image.vtkVolume) {
            //     const [xSpacing, ySpacing, zSpacing] = image.vtkVolume.vtkImageData.getSpacing();
            //     const bounds = image.vtkVolume.vtkImageData.getBounds();

            //     const xMin = Math.min(bounds[0], bounds[1]);
            //     const xMax = Math.max(bounds[0], bounds[1]);
            //     const yMin = Math.min(bounds[2], bounds[3]);
            //     const yMax = Math.max(bounds[2], bounds[3]);
            //     const zMin = Math.min(bounds[4], bounds[5]);
            //     const zMax = Math.max(bounds[4], bounds[5]);

            //     if (ipp[0] < xMin - xSpacing ||
            //         ipp[0] > xMax + xSpacing ||
            //         ipp[1] < yMin - ySpacing ||
            //         ipp[1] > yMax + ySpacing ||
            //         ipp[2] < zMin - zSpacing ||
            //         ipp[2] > zMax + zSpacing
            //     ) {
            //         return;
            //     }
            // }

            const { loadImageId, newImageIdIndex } = getImageIdFromStackByIppCross(element, {
                x: ipp[0],
                y: ipp[1],
                z: ipp[2],
            }) || {};
            if (loadImageId) {
                external.cornerstone.loadAndCacheImage(loadImageId).then(image => {
                    external.cornerstone.displayImage(element, image);
                    _updateAllMprEnabledElements();
                    const stack = external.cornerstoneTools.getToolState(element, 'stack');
                    const stackData = stack.data[0];
                    const currentImageIdIndex = stackData.currentImageIdIndex;
                    const eventData = {
                        newImageIdIndex,
                        direction: newImageIdIndex - currentImageIdIndex,
                    };
                    stackData.currentImageIdIndex = newImageIdIndex;
                    external.cornerstone.triggerEvent(element, external.cornerstoneTools.EVENTS.STACK_SCROLL, eventData);
                });
            }
        }
    }
}

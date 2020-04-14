import { vec3 } from 'gl-matrix';
import external from './externalModules.js';
import getImageIdFromStackByIppCross from './getImageIdFromStackByIppCross.js';
import appState from './appState.js';

export default function getMprTool() {
    const BaseTool = external.cornerstoneTools.import('base/BaseTool');

    // Drawing
    const draw = external.cornerstoneTools.import('drawing/draw');
    const getNewContext = external.cornerstoneTools.import('drawing/getNewContext');
    const drawLines = external.cornerstoneTools.import('drawing/drawLines');

    // Util
    const imagePointToPatientPoint = external.cornerstoneTools.import('util/imagePointToPatientPoint');

    return class MprTool extends BaseTool {
        constructor(configuration = {}) {
            const defaultConfig = {
                name: 'Mpr',
                supportedInteractionTypes: ['Mouse', 'Touch'],
                options: {
                    preventHandleOutsideImage: true,
                },
                configuration,
            };
            const initialConfiguration = Object.assign(defaultConfig, configuration);

            super(initialConfiguration);
            this.initialConfiguration = initialConfiguration;
            this.mergeOptions(initialConfiguration.options);
            this.crossPoint = { x: 0, y: 0 };
            this.ippCross = { x: 0, y: 0, z: 0 };
        }

        renderToolData(evt) {
            if (this.options.mouseButtonMask.length === 0) {
                return;
            }
            const { detail } = evt;
            const { element, image, canvasContext } = detail;
            const { canvas } = canvasContext;

            const context = getNewContext(canvas);

            context.setTransform(1, 0, 0, 1, 0, 0);

            const lines = [
                {
                    start: { x: this.crossPoint.x, y: 0 },
                    end: { x: this.crossPoint.x, y: image.height },
                },
                {
                    start: { x: 0, y: this.crossPoint.y },
                    end: { x: image.width, y: this.crossPoint.y },
                }
            ];
            const options = {
                color: '#0496FF',
                lineWidth: 2,
            };

            draw(context, context => {
                drawLines(context, element, lines, options);
            });
        }
        getImagePlaneByOffset(imageId, element) {
            const imagePlane = external.cornerstone.metaData.get('imagePlaneModule', imageId);
            let origin = [0, 0, 0];
            // originElement
            if (!imageId.includes('mpr')) {
                const seriesNumber = appState.getSeriesNumberByElement(element);
                const vtkVolumes = appState.vtkVolumes[seriesNumber];
                if (!vtkVolumes) {
                    return;
                }
                origin = vtkVolumes.zAxis.origin;
            }
            const ipp = imagePlane.imagePositionPatient;
            return {
                ...imagePlane,
                imagePositionPatient: [ipp[0] - origin[0], ipp[1] - origin[1], ipp[2] - origin[2]],
            };
        }
        mouseEventHandler(evt) {
            const eventData = evt.detail;
            evt.stopImmediatePropagation();
            const imagePointXY = eventData.currentPoints.image;
            const element = evt.currentTarget;
            this.updatePoint(element, imagePointXY);
            evt.preventDefault();
            evt.stopPropagation();
        }

        updatePoint(element, imagePointXY) {
            const ippCross = this.getIppCross(element, imagePointXY);
            if (!ippCross) {
                return;
            }
            const elementsGroup = appState.getSeriesElementsGroupByElement(element);
            if (elementsGroup) {
                Object.values(elementsGroup).forEach(targetElement => {
                    this.updateEachElementCrossPoint(targetElement, ippCross);
                });
            }
        }

        newImageCallback(evt) {
            evt.stopImmediatePropagation();
            const element = evt.currentTarget;
            const ippCross = this.getIppCross(element, this.crossPoint);
            if (!ippCross) {
                return;
            }
            const elementsGroup = appState.getSeriesElementsGroupByElement(element);
            if (elementsGroup) {
                Object.values(elementsGroup).forEach(targetElement => {
                    if (targetElement === element) {
                        return;
                    }
                    this.updateEachElementCrossPoint(targetElement, ippCross);
                });
            }
        }

        getIppCross(element, imagePointXY) {
            const enabledElement = external.cornerstone.getEnabledElement(element);
            if (!enabledElement.image) {
                return;
            }
            const imageId = enabledElement.image.imageId;
            const imagePlane = this.getImagePlaneByOffset(imageId, element);
            if (!imagePlane) {
                return;
            }

            const ippCross = imagePointToPatientPoint(imagePointXY, imagePlane);
            return ippCross;
        }

        updateEachElementCrossPoint(targetElement, ippCross) {
            const refTool = external.cornerstoneTools.getToolForElement(targetElement, this.name);
            if (!refTool) {
                return;
            }
            // 避免xyz位置偏移不大时也会重新渲染
            if (
                Math.abs(ippCross.x - refTool.ippCross.x) < 0.1 &&
                Math.abs(ippCross.y - refTool.ippCross.y) < 0.1 &&
                Math.abs(ippCross.z - refTool.ippCross.z) < 0.1
            ) {
                return;
            }
            refTool.ippCross = ippCross;
            const targetImage = external.cornerstone.getImage(targetElement);
            if (!targetImage) {
                return;
            }
            const targetImagePlane = this.getImagePlaneByOffset(targetImage.imageId, targetElement);
            if (!targetImagePlane) {
                return;
            }
            const { loadImageId, newImageIdIndex } = getImageIdFromStackByIppCross(targetElement, ippCross) || {};
            if (!loadImageId) {
                return;
            }
            const ippCrossVec3 = vec3.fromValues(ippCross.x, ippCross.y, ippCross.z);
            const crossPoint = this._projectPatientPointToImagePlane(ippCrossVec3, targetImagePlane);
            refTool.crossPoint = crossPoint;
            const stack = external.cornerstoneTools.getToolState(targetElement, 'stack');
            const stackData = stack.data[0];
            stackData.currentImageIdIndex = newImageIdIndex;

            // 避免相同id情况下还去重新加载图像
            if (targetImage.imageId === loadImageId) {
                external.cornerstone.updateImage(targetElement);
            } else {
                external.cornerstone.loadAndCacheImage(loadImageId).then(image => {
                    external.cornerstone.displayImage(targetElement, image, external.cornerstone.getViewport(targetElement));
                });
            }
        }

        activeCallback(element) {
            element.addEventListener(external.cornerstoneTools.EVENTS.STACK_SCROLL, this.stackScrollCallback);
        }

        disabledCallback(element) {
            element.removeEventListener(external.cornerstoneTools.EVENTS.STACK_SCROLL, this.stackScrollCallback);
        }

        postMouseDownCallback(evt) {
            this.mouseEventHandler(evt);
        }

        mouseDragCallback(evt) {
            this.mouseEventHandler(evt);
        }

        _projectPatientPointToImagePlane(patientPoint, imagePlane) {
            const rowCosines = imagePlane.rowCosines;
            const columnCosines = imagePlane.columnCosines;
            const imagePositionPatient = imagePlane.imagePositionPatient;

            const rowCosinesVec3 = vec3.fromValues(...rowCosines);
            const colCosinesVec3 = vec3.fromValues(...columnCosines);
            const ippVec3 = vec3.fromValues(...imagePositionPatient);

            const point = vec3.create();
            vec3.sub(point, patientPoint, ippVec3);

            let x = Math.min(vec3.dot(rowCosinesVec3, point) / imagePlane.columnPixelSpacing, imagePlane.columns);
            let y = Math.min(vec3.dot(colCosinesVec3, point) / imagePlane.rowPixelSpacing, imagePlane.rows);
            x = Math.max(0, x);
            y = Math.max(0, y);

            return { x, y };
        }
    }
}

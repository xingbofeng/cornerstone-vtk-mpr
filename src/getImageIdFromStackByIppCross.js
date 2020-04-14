import { vec3 } from 'gl-matrix';
import external from './externalModules.js';
import appState from './appState.js';

export default function (element, ippCross) {
    const ippCrossVec3 = vec3.fromValues(ippCross.x, ippCross.y, ippCross.z);
    const stack = external.cornerstoneTools.getToolState(element, 'stack');
    const stackData = stack.data[0];
    const { imageIds } = stackData;
    let loadImageId, newImageIdIndex;
    let offset = Infinity;
    const seriesNumber = appState.getSeriesNumberByElement(element);
    const vtkVolumes = appState.vtkVolumes[seriesNumber];
    for (let i = 0; i < imageIds.length; i++) {
        const [scheme, , , currentIpp, orientation] = imageIds[i].split(':');
        let currentIppXYZ, currentOffset;
        if (orientation === 'axial') {
            currentIppXYZ = parseFloat(currentIpp.split(',')[2]);
            currentOffset = Math.abs(ippCrossVec3[2] - currentIppXYZ);
        } else if (orientation === 'coronal') {
            currentIppXYZ = parseFloat(currentIpp.split(',')[1]);
            currentOffset = Math.abs(ippCrossVec3[1] - currentIppXYZ);
        } else if (orientation === 'sagittal') {
            currentIppXYZ = parseFloat(currentIpp.split(',')[0]);
            currentOffset = Math.abs(ippCrossVec3[0] - currentIppXYZ);
        } else if (scheme !== 'mpr') { // originElement
            const imagePlane = external.cornerstone.metaData.get('imagePlaneModule', imageIds[i]);
            if (!imagePlane) {
                continue;
            }
            currentIppXYZ = imagePlane.imagePositionPatient[2] - vtkVolumes.zAxis.origin[2];
            currentOffset = Math.abs(ippCrossVec3[2] - currentIppXYZ);
        }
        if (currentOffset < offset) {
            loadImageId = imageIds[i];
            newImageIdIndex = i;
            offset = currentOffset;
        }
    }
    if (loadImageId) {
        return {
            loadImageId,
            newImageIdIndex,
        };
    }
    return null;
};

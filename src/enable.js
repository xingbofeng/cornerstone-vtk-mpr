import appState from './appState.js';
import tryGetVtkVolumeForSeriesNumber from './lib/vtk/tryGetVtkVolumeForSeriesNumber.js';

export default async function (elementsGroup, seriesNumber, imageIds) {
    appState.setSeriesElementsGroup(seriesNumber, elementsGroup);
    appState.setSeriesStack(seriesNumber, imageIds);
    try {
        await tryGetVtkVolumeForSeriesNumber(seriesNumber);
    } catch (err) {
        console.error(`cornerstone vtk mpr load image error`, err);
    }
}
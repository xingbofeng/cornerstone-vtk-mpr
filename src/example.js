import external from './externalModules';
import cornerstone from 'cornerstone-core';
import cornerstoneTools from 'cornerstone-tools';
import cornerstoneMath from 'cornerstone-math';

external.cornerstone = cornerstone;
external.cornerstoneTools = cornerstoneTools;
external.cornerstoneMath = cornerstoneMath;
window.cornerstoneTools = cornerstoneTools;

import setupCornerstone from './setupCornerstone.js';

import studies from './studies';
import appState from './appState.js';
import enable from './enable.js';
import getStackUrls from './getStackUrls.js';

appState.series[0] = studies;

async function initMprStacks(element, imageIds) {
    cornerstoneTools.addStackStateManager(element, ['stack']);
    cornerstoneTools.addToolState(element, 'stack', {
        imageIds,
        currentImageIdIndex: parseInt((imageIds.length + 1) / 2),
    });
    const image = await cornerstone.loadAndCacheImage(imageIds[parseInt((imageIds.length + 1) / 2)]);
    cornerstone.displayImage(element, image);
}

async function kickstartApp(){

    // Setup
    const seriesNumber = 0;
    setupCornerstone(seriesNumber);

    const originElement = document.getElementById("cornerstone-target");
    const axialElement = document.getElementById("axial-target");
    const coronalElement = document.getElementById("coronal-target");
    const sagittalElement = document.getElementById("sagittal-target");

    // Display original series
    const seriesImageIds = appState.series[seriesNumber];

    await enable({
        originElement,
        axialElement,
        coronalElement,
        sagittalElement,
    }, seriesNumber, seriesImageIds);

    const mprStackUrls = getStackUrls(seriesNumber);
    await initMprStacks(axialElement, mprStackUrls.axial);
    await initMprStacks(coronalElement, mprStackUrls.coronal);
    await initMprStacks(sagittalElement, mprStackUrls.sagittal);

    cornerstone.loadAndCacheImage(seriesImageIds[0]).then(image => {
        cornerstone.displayImage(originElement, image);
    });
}

kickstartApp();

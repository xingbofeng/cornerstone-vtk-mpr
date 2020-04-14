// Song & dance
import Hammer from "hammerjs";
import dicomParser from "dicom-parser";
import * as cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import external from './externalModules.js';

import appState from './appState.js';
import mprMetaDataProvider from './lib/mprMetadata/mprMetaDataProvider.js';
import mprImageLoader from './mprImageLoader.js'
import getMprTool from './getMprTool.js';
import getMprMouseWheelTool from './getMprMouseWheelTool.js';

export default function(seriesNumber) {
    _setPeerDependencies();
    _initWadoImageLoader();
    _initCornerstoneTools();
    external.cornerstone.registerImageLoader('mpr', mprImageLoader);
    external.cornerstone.metaData.addProvider(mprMetaDataProvider);

    // Enable Elements
    const originalSeriesElement = document.getElementById("cornerstone-target");
    const mprAxialSeriesElement = document.getElementById("axial-target");
    const mprCoronalSeriesElement = document.getElementById("coronal-target");
    const mprSagittalSeriesElement = document.getElementById("sagittal-target");

    external.cornerstone.enable(originalSeriesElement, {
        renderer: "webgl"
    });

    external.cornerstone.enable(mprAxialSeriesElement, {
        renderer: "webgl"
    });

    external.cornerstone.enable(mprCoronalSeriesElement, {
        renderer: "webgl"
    });

    external.cornerstone.enable(mprSagittalSeriesElement, {
        renderer: "webgl"
    });

    _setOriginalSeriesStackState(seriesNumber, originalSeriesElement);

    const MprTool = getMprTool();

    // external.cornerstoneTools.addToolForElement(originalSeriesElement, MprTool);
    external.cornerstoneTools.addToolForElement(mprAxialSeriesElement, MprTool);
    external.cornerstoneTools.addToolForElement(mprCoronalSeriesElement, MprTool);
    external.cornerstoneTools.addToolForElement(mprSagittalSeriesElement, MprTool);


    // external.cornerstoneTools.setToolActiveForElement(originalSeriesElement, "MprMouseWheel", {});
    external.cornerstoneTools.setToolActiveForElement(mprAxialSeriesElement, "MprMouseWheel", {});
    external.cornerstoneTools.setToolActiveForElement(mprCoronalSeriesElement, "MprMouseWheel", {});
    external.cornerstoneTools.setToolActiveForElement(mprSagittalSeriesElement, "MprMouseWheel", {});

    // external.cornerstoneTools.setToolActiveForElement(originalSeriesElement, "Mpr", { mouseButtonMask: 1 });
    external.cornerstoneTools.setToolActiveForElement(mprAxialSeriesElement, "Mpr", { mouseButtonMask: 1 });
    external.cornerstoneTools.setToolActiveForElement(mprCoronalSeriesElement, "Mpr", { mouseButtonMask: 1 });
    external.cornerstoneTools.setToolActiveForElement(mprSagittalSeriesElement, "Mpr", { mouseButtonMask: 1  });
}

function _setPeerDependencies(){
    cornerstoneWADOImageLoader.external.cornerstone = external.cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    external.cornerstoneTools.external.cornerstoneMath = external.cornerstoneMath;
    external.cornerstoneTools.external.cornerstone = external.cornerstone;
    external.cornerstoneTools.external.Hammer = Hammer;
}

function _initWadoImageLoader(){
    const config = {
        webWorkerPath: '/assets/cornerstoneWADOImageLoaderWebWorker.js',
        taskConfiguration: {
            decodeTask: {
            codecsPath: '/assets/cornerstoneWADOImageLoaderCodecs.js'
            }
        }
    };

    cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
}

function _initCornerstoneTools(){
    external.cornerstoneTools.init({
        globalToolSyncEnabled: true
    });

    // Grab Tool Classes
    const WwwcTool = external.cornerstoneTools.WwwcTool;
    const PanTool = external.cornerstoneTools.PanTool;
    const PanMultiTouchTool = external.cornerstoneTools.PanMultiTouchTool;
    const StackScrollMouseWheelTool = external.cornerstoneTools.StackScrollMouseWheelTool;
    const ZoomTool = external.cornerstoneTools.ZoomTool;
    const ZoomTouchPinchTool = external.cornerstoneTools.ZoomTouchPinchTool;
    const ZoomMouseWheelTool = external.cornerstoneTools.ZoomMouseWheelTool;

    // Add them
    external.cornerstoneTools.addTool(PanTool);
    external.cornerstoneTools.addTool(ZoomTool);
    external.cornerstoneTools.addTool(WwwcTool);
    external.cornerstoneTools.addTool(PanMultiTouchTool);
    external.cornerstoneTools.addTool(StackScrollMouseWheelTool);
    external.cornerstoneTools.addTool(ZoomTouchPinchTool);
    external.cornerstoneTools.addTool(ZoomMouseWheelTool);
    external.cornerstoneTools.addTool(getMprMouseWheelTool());

    // Set tool modes
    external.cornerstoneTools.setToolActive("Pan", { mouseButtonMask: 4 }); // Middle
    external.cornerstoneTools.setToolActive("Zoom", { mouseButtonMask: 2 }); // Right
    // external.cornerstoneTools.setToolActive("Wwwc", { mouseButtonMask: 1 }); // Left & Touch
    external.cornerstoneTools.setToolActive("PanMultiTouch", {});
    external.cornerstoneTools.setToolActive("ZoomTouchPinch", {});
}

function _setOriginalSeriesStackState(seriesNumber, originalSeriesElement){
    const seriesImageIds = appState.series[seriesNumber];
    external.cornerstoneTools.addStackStateManager(originalSeriesElement, [
        'stack'
    ])

    const canvasStack = {
        currentImageIdIndex: 0,
        imageIds: seriesImageIds,
    }

    external.cornerstoneTools.clearToolState(originalSeriesElement, 'stack')
    external.cornerstoneTools.addToolState(originalSeriesElement, 'stack', canvasStack)

}
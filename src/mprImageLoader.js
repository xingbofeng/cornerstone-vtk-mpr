import createMprSlice from './lib/vtk/createMprSlice.js';
import mprMetaDataStore from './lib/mprMetadata/mprMetaDataStore.js';
import tryGetVtkVolumeForSeriesNumber from './lib/vtk/tryGetVtkVolumeForSeriesNumber.js';
import mapVtkSliceToCornerstoneImage from './lib/vtk/mapVtkSliceToCornerstoneImage.js';

export default function(imageId){
    const imageLoadObject = {
        promise: undefined,
        cancelFn: undefined,
        decacheData: undefined
    }

    imageLoadObject.promise = createImage(imageId);

    return imageLoadObject;
}

export async function createImage(imageId){
    const [scheme, seriesNumber, imageOrientationPatient, imagePositionPatient, orientation] = imageId.split(':');
    const vtkVolume = await tryGetVtkVolumeForSeriesNumber(seriesNumber);

    const createSliceResult = createMprSlice(vtkVolume, { imageOrientationPatient, imagePositionPatient });
    const mappedSlice = mapVtkSliceToCornerstoneImage(createSliceResult.slice);
    _createMprMetaData(imageId, createSliceResult.metaData);

    const image = {
        imageId,
        color: false,
        columnPixelSpacing: mappedSlice.columnPixelSpacing,
        rowPixelSpacing: mappedSlice.rowPixelSpacing,
        columns: mappedSlice.columns,
        width: mappedSlice.width,
        height: mappedSlice.height,
        rows: mappedSlice.rows,
        intercept: 0,
        invert: false,
        getPixelData: () => mappedSlice.pixelData,
        minPixelValue: mappedSlice.minPixelValue,
        maxPixelValue: mappedSlice.maxPixelValue,
        sizeInBytes: mappedSlice.sizeInBytes,
        slope: 1,
        windowCenter:  mappedSlice.windowCenter,
        windowWidth: mappedSlice.windowWidth,
        decodeTimeInMS: 0,
        floatPixelData: undefined,
        isMpr: true,
        orientation,
      };

    // set the ww/wc to cover the dynamic range of the image if no values are supplied
    if (image.windowCenter === undefined || image.windowWidth === undefined) {
        const maxVoi = image.maxPixelValue * image.slope + image.intercept
        const minVoi = image.minPixelValue * image.slope + image.intercept

        image.windowWidth = maxVoi - minVoi
        image.windowCenter = (maxVoi + minVoi) / 2
    }


    return image;
}

  function _createMprMetaData(imageId, metaData){
    mprMetaDataStore.set(imageId, metaData);
  }
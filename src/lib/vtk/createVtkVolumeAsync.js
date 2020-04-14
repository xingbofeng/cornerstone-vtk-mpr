import external from './../../externalModules.js';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import insertSlice from '../data/insertSlice.js';
import getSliceIndex from '../data/getSliceIndex.js';
import determineOrientation from '../data/determineOrientation.js';
import computeZAxis from '../data/computeZAxis.js';
import computeZAxisByFirst from '../data/computeZAxisByFirst.js';
import crossVectors from '../math/crossVectors.js';
import tryGetMetadataModuleAsync from '../tryGetMetadataModuleAsync.js';
import { createImage } from '../../mprImageLoader.js';
import appState from '../../appState.js';

/**
 * Note: This builds the vtk structure we need to move forward, but it does so using
 * only metadata for image ids in the series we're trying to create a volume for. That
 * mean's it's possible to do this step without having loaded any image data if we have
 * an alternate means for acquiring metadata
 *
 * @export
 * @param {*} seriesImageIds
 * @returns
 */
export default async function (seriesNumber, seriesImageIds) {
    const metaDataMap = await _getSeriesMetaDataMap(seriesImageIds);
    const {
        dimensions,
        orientation,
        multiComponent,
        spacing,
        zAxis,
    } = _calculateDimensions(metaDataMap);
    // const firstImageMetaData = await tryGetMetadataModuleAsync('imagePlaneModule', seriesImageIds[0]);

    // const {
    //     dimensions,
    //     orientation,
    //     multiComponent,
    //     spacing,
    //     zAxis,
    // } = _calculateDimensionsByFirst(firstImageMetaData, seriesImageIds.length);

    if (multiComponent) {
        throw new Error('Multi component image not supported by this plugin.')
    }

    const vtkImageData = await _createVtkVolume(seriesNumber, seriesImageIds, dimensions, spacing, zAxis);

    const imageDataObject = {
        imageIds: seriesImageIds,
        orientation,
        vtkImageData,
        zAxis
    }

    return imageDataObject;
}

function getNewVtkVolume(dimensions, spacing, scalarArray) {
    const vtkVolume = vtkImageData.newInstance();

    vtkVolume.setOrigin([0, 0, 0]);
    vtkVolume.setDimensions(dimensions);
    vtkVolume.setSpacing(spacing);
    vtkVolume.getPointData().setScalars(scalarArray);

    return vtkVolume;
}

async function _createVtkVolume(seriesNumber, seriesImageIds, dimensions, spacing, zAxis) {

    const typedPixelArray = await _getTypedPixelArray(seriesImageIds[0], dimensions);
    const scalarArray = vtkDataArray.newInstance({
        name: 'Pixels',
        numberOfComponents: 1,
        values: typedPixelArray,
    });

    const originTypedPixelArray = await _getTypedPixelArray(seriesImageIds[0], dimensions);
    const originScalarArray = vtkDataArray.newInstance({
        name: 'Pixels',
        numberOfComponents: 1,
        values: originTypedPixelArray,
    });

    const vtkVolume = getNewVtkVolume(dimensions, spacing, scalarArray);

    // 不渐进加载时，加await看起来图像正常
    // 未知具体原因
    // loadSeriesImagesAsync(vtkVolume, originVtkVolume, seriesImageIds, zAxis);
    await loadSeriesImages(vtkVolume, seriesImageIds, zAxis);

    // TODO: We can accidentally create multiple volumes if we try to create one
    // Before a request for the same series has completed.
    // (You'll notice this logs 3x -- one for each initial MPR canvas, but 0x after any load has finished)
    return vtkVolume;
}

async function loadSeriesImages(vtkVolume, seriesImageIds, zAxis) {
    for (let i = 0; i < seriesImageIds.length; i++) {
        const imageId = seriesImageIds[i];
        const image = await external.cornerstone.loadAndCacheImage(imageId);
        // const { imagePositionPatient } = await tryGetMetadataModuleAsync('imagePlaneModule', imageId);
        // const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);
        insertSlice(vtkVolume, image.getPixelData(), i);

        // TODO: Inverting Slice Index: Vertical flips sagittal/coronal
        // const flipped = Math.abs(sliceIndex - seriesImageIds.length);
        // insertSlice(vtkVolume, image.getPixelData().reverse(), flipped);

        // TODO: .reverse() vertically flips axial
        // TODO: Flip x/y spacing because of flip?
        // insertSlice(vtkVolume, image.getPixelData().reverse(), sliceIndex);
    }
}

async function loadSeriesImagesAsync(vtkVolume, seriesImageIds, zAxis) {
    let isLoading = true;
    let timer = null;
    const _updateCachedImages = async () => {
        external.cornerstone.imageCache.cachedImages.forEach(async cachedImage => {
            if (cachedImage.imageId.includes('mpr')) {
                const nextStepImage = await createImage(cachedImage.imageId);
                Object.assign(cachedImage.image, nextStepImage);
                external.cornerstone.getEnabledElements().forEach(enabledElement => {
                    enabledElement.forceRerenderImage = true;
                    if (cachedImage.imageId === enabledElement.image.imageId) {
                        external.cornerstone.updateImage(enabledElement.element);
                    }
                });
            }
        });
    };
    const _timeoutUpdateCachedImages = () => {
        if (isLoading) {
            timer = setTimeout(() => {
                _updateCachedImages();
                _timeoutUpdateCachedImages();
            }, 1000);
        }
    }

    _timeoutUpdateCachedImages();

    for (let i = 0; i < seriesImageIds.length; i++) {
        const imageId = seriesImageIds[i];
        const image = await external.cornerstone.loadAndCacheImage(imageId);
        // const { imagePositionPatient } = await tryGetMetadataModuleAsync('imagePlaneModule', imageId);
        // const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);
        insertSlice(vtkVolume, image.getPixelData(), i);

        // TODO: Inverting Slice Index: Vertical flips sagittal/coronal
        // const flipped = Math.abs(sliceIndex - seriesImageIds.length);
        // insertSlice(vtkVolume, image.getPixelData().reverse(), flipped);

        // TODO: .reverse() vertically flips axial
        // TODO: Flip x/y spacing because of flip?
        // insertSlice(vtkVolume, image.getPixelData().reverse(), sliceIndex);
    }
    isLoading = false;
    clearTimeout(timer);
    _updateCachedImages();
}

async function _getTypedPixelArray(imageId, dimensions) {
    const imagePixelModule = await tryGetMetadataModuleAsync('imagePixelModule', imageId);
    const { bitsAllocated, pixelRepresentation } = imagePixelModule;
    const signed = pixelRepresentation === 1

    if (bitsAllocated === 8) {
        if (signed) {
            throw new Error('8 Bit signed images are not yet supported by this plugin.');
        } else {
            throw new Error('8 Bit unsigned images are not yet supported by this plugin.');
        }
    }

    let typedPixelArray
    if (bitsAllocated === 16) {
        // x, y, z
        typedPixelArray = signed
            ? new Int16Array(dimensions[0] * dimensions[1] * dimensions[2])
            : new Uint16Array(dimensions[0] * dimensions[1] * dimensions[2])
    } else {
        throw new Error(`Unssuported bit: ${bitsAllocated}`)
    }

    return typedPixelArray;
}

/**
 *
 *
 * @param {*} seriesImageIds
 */
async function _getSeriesMetaDataMap(seriesImageIds) {
    const metaDataMap = new Map()

    for (let i = 0; i < seriesImageIds.length; i++) {
        const imageId = seriesImageIds[i];
        const metaData = await tryGetMetadataModuleAsync('imagePlaneModule', imageId);
        metaDataMap.set(imageId, metaData);
    }

    return metaDataMap;
}

function _calculateDimensionsByFirst(imagePlaneModule, size) {
    const { rowCosines, columnCosines } = imagePlaneModule
    const crossProduct = crossVectors(columnCosines, rowCosines)
    const orientation = determineOrientation(crossProduct)
    const zAxis = computeZAxisByFirst(orientation, imagePlaneModule, size)

    const xSpacing = imagePlaneModule.columnPixelSpacing
    const ySpacing = imagePlaneModule.rowPixelSpacing
    const zSpacing = zAxis.spacing
    const xVoxels = imagePlaneModule.columns
    const yVoxels = imagePlaneModule.rows
    const zVoxels = size

    // 3 === RGB?
    const multiComponent = imagePlaneModule.numberOfComponents > 1

    return {
        dimensions: [xVoxels, yVoxels, zVoxels],
        orientation,
        multiComponent,
        spacing: [xSpacing, ySpacing, zSpacing],
        zAxis
    }
}

function _calculateDimensions(metaDataMap) {
    const imagePlaneModule = metaDataMap.values().next().value;

    const { rowCosines, columnCosines } = imagePlaneModule
    const crossProduct = crossVectors(columnCosines, rowCosines)
    const orientation = determineOrientation(crossProduct)
    const zAxis = computeZAxis(orientation, metaDataMap)

    const xSpacing = imagePlaneModule.columnPixelSpacing
    const ySpacing = imagePlaneModule.rowPixelSpacing
    const zSpacing = zAxis.spacing
    const xVoxels = imagePlaneModule.columns
    const yVoxels = imagePlaneModule.rows
    const zVoxels = metaDataMap.size

    // 3 === RGB?
    const multiComponent = imagePlaneModule.numberOfComponents > 1

    return {
        dimensions: [xVoxels, yVoxels, zVoxels],
        orientation,
        multiComponent,
        spacing: [xSpacing, ySpacing, zSpacing],
        zAxis
    }
}

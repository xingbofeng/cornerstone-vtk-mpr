import { mat4, vec3 } from 'gl-matrix';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkImageReslice from 'vtk.js/Sources/Imaging/Core/ImageReslice';
import appState from './../../appState.js';

function _calculateRotationAxes(rowCosines, colCosines) {
    let wCrossProd = vec3.create();
    vec3.cross(wCrossProd, rowCosines, colCosines);

    const axes = mat4.fromValues(
        rowCosines[0], rowCosines[1], rowCosines[2], 0,
        colCosines[0], colCosines[1], colCosines[2], 0,
        wCrossProd[0], wCrossProd[1], wCrossProd[2], 0,
        0, 0, 0, 1
    );

    return axes;
}

export default function createVtkVolumeByPixelArray(element, typedPixelArray, orientation = 'axial') {
    const vtkVolume = vtkImageData.newInstance();
    const scalarArray = vtkDataArray.newInstance({
        name: 'Pixels',
        numberOfComponents: 1,
        values: typedPixelArray,
    });
    const seriesNumber = appState.getSeriesNumberByElement(element);
    if (!seriesNumber) {
        console.error(`origin mpr is not init ${seriesNumber}`);
        return;
    }
    const originVtkImageData = appState.vtkVolumes[seriesNumber];
    if (!originVtkImageData) {
        console.error(`origin mpr is not init`);
        return;
    }
    const dimensions = originVtkImageData.vtkImageData.getDimensions();
    const spacing = originVtkImageData.vtkImageData.getSpacing();
    const extent = originVtkImageData.vtkImageData.getExtent();

    const xMax = extent[1] + 1;
    const yMax = extent[3] + 1;
    const zMax = extent[5] + 1;
    if (orientation === 'axial') {
        return typedPixelArray;
    }
    // 不知道为啥用vtk的矩阵变换就是换算不对，最后还是用手算了。。。
    const result = new Uint16Array(typedPixelArray.length);
    for (let i = 0; i < typedPixelArray.length; i++) {
        const point = typedPixelArray[i];
        if (point === 0) {
            continue;
        }
        const XYZMap = i;
        const indexZ = zMax - 1 - ~~(XYZMap / (xMax * yMax));
        const XYMap = i % (xMax * yMax);
        const indexY = ~~(XYMap / xMax);
        const indexX = XYMap % xMax;
        if (orientation === 'coronal') {
            const offset = indexY * xMax * zMax + indexZ * xMax + indexX;
            result[offset] = point;
        } else if (orientation === 'sagittal') {
            const offset = indexX * yMax * zMax + indexZ * yMax + indexY;
            result[offset] = point;
        }
    }
    return result;

    // vtkVolume.setOrigin([0, 0, 0]);
    // vtkVolume.setDimensions(dimensions);
    // vtkVolume.setSpacing(spacing);
    // vtkVolume.getPointData().setScalars(scalarArray);

    // const imageReslice = vtkImageReslice.newInstance();
    // imageReslice.setInputData(vtkVolume);
    // imageReslice.setOutputDimensionality(3);
    // imageReslice.setBackgroundColor(255, 255, 255, 255);
    // // let axes = [];
    // let rowCosines, colCosines;
    // if (orientation === 'axial') {
    //     rowCosines = [1, 0, 0];
    //     colCosines = [0, 1, 0];
    //     // axes = [
    //     //     1, 0, 0, 0,
    //     //     0, 1, 0, 0,
    //     //     0, 0, 1, 0,
    //     //     0, 0, 0, 1
    //     // ];
    // } else if (orientation === 'coronal') {
    //     rowCosines = [1, 0, 0];
    //     colCosines = [0, 0, -1];
    //     // axes = [
    //     //     1, 0, 0, 0,
    //     //     0, 0, 1, 0,
    //     //     0, -1, 0, 0,
    //     //     0, 0, 0, 1
    //     // ];
    // } else if (orientation === 'sagittal') {
    //     rowCosines = [0, 1, 0];
    //     colCosines = [0, 0, -1];
    //     // axes = [
    //     //     0, 0, -1, 0,
    //     //     1, 0, 0, 0,
    //     //     0, -1, 0, 0,
    //     //     0, 0, 0, 1
    //     // ];
    // }
    // const axes = _calculateRotationAxes(rowCosines, colCosines);
    // console.log(axes);
    // imageReslice.setResliceAxes(axes);
    // return imageReslice.getOutputData().getPointData().getScalars().getData();
}
